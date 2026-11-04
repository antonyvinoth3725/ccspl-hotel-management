using System.Data;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using GayatriCateringPortal.Data;
using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using Microsoft.Data.SqlClient;

namespace GayatriCateringPortal.Repositories;

public class OrderRefundRepository : IOrderRefundRepository
{
    private readonly IConfiguration _configuration;
    private readonly IHttpClientFactory _httpClientFactory;

    public OrderRefundRepository(IConfiguration configuration, IHttpClientFactory httpClientFactory)
    {
        _configuration = configuration;
        _httpClientFactory = httpClientFactory;
    }

    public OrderRefundSummary? GetRefundSummary(int orderId)
    {
        IDbConnection conn = null;
        IDbCommand cmd = null;
        IDataReader reader = null;

        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                conn.Open();
                using (cmd = DataFactory.CreateCommand("SP_OrderRefund_GetSummary", conn))
                {
                    ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                    cmd.Parameters.Add(DataFactory.CreateParameter("@OrderId", orderId));
                    reader = DataFactory.ExecuteReader(cmd);

                    OrderRefundSummary? item = null;
                    while (reader.Read())
                    {
                        item ??= new OrderRefundSummary
                        {
                            OrderId = Convert.ToInt32(reader["OrderId"]),
                            OrderNumber = Convert.ToString(reader["OrderNumber"]) ?? string.Empty,
                            CustomerName = Convert.ToString(reader["CustomerName"]) ?? string.Empty,
                            EmailId = Convert.ToString(reader["EmailId"]) ?? string.Empty,
                            TotalAmount = Convert.ToDecimal(reader["TotalAmount"]),
                            PaidAmount = Convert.ToDecimal(reader["PaidAmount"]),
                            RefundedAmount = Convert.ToDecimal(reader["RefundedAmount"]),
                            RefundableAmount = Convert.ToDecimal(reader["RefundableAmount"]),
                            Currency = Convert.ToString(reader["Currency"]) ?? "SGD"
                        };

                        if (reader["OrderPaymentId"] != DBNull.Value)
                        {
                            item.Charges.Add(new OrderRefundCharge
                            {
                                OrderPaymentId = Convert.ToInt64(reader["OrderPaymentId"]),
                                GatewayChargeId = Convert.ToString(reader["GatewayChargeId"]) ?? string.Empty,
                                PaidAmount = Convert.ToDecimal(reader["ChargePaidAmount"]),
                                RefundedAmount = Convert.ToDecimal(reader["ChargeRefundedAmount"]),
                                RefundableAmount = Convert.ToDecimal(reader["ChargeRefundableAmount"]),
                                Currency = Convert.ToString(reader["Currency"]) ?? "SGD"
                            });
                        }
                    }

                    return item;
                }
            }
        }
        catch (SqlException)
        {
            throw new Exception("Database error");
        }
        finally
        {
            reader?.Dispose();
            if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
        }
    }

    public async Task<OrderRefundResult> ProcessRefundAsync(CreateOrderRefundRequest request, int? createdBy)
    {
        var secretKey = _configuration["PaymentGateway:Omise:SecretKey"];
        if (string.IsNullOrWhiteSpace(secretKey))
            return Failure(request.OrderId, "Omise is not configured.", 400);

        var summary = GetRefundSummary(request.OrderId);
        if (summary == null)
            return Failure(request.OrderId, "Order or successful payment was not found.", 404);

        var requestedAmount = decimal.Round(request.RefundAmount, 2, MidpointRounding.AwayFromZero);
        if (requestedAmount <= 0 || requestedAmount > summary.RefundableAmount)
            return Failure(request.OrderId, $"Refund cannot exceed {summary.Currency} {summary.RefundableAmount:0.00}.", 400);
        if (request.NonRefundableAmount < 0 ||
            decimal.Round(requestedAmount + request.NonRefundableAmount, 2) != decimal.Round(summary.RefundableAmount, 2))
            return Failure(request.OrderId, "Refund and non-refundable amounts must account for the full paid balance.", 400);

        var result = new OrderRefundResult
        {
            OrderId = request.OrderId,
            RequestedAmount = requestedAmount,
            RefundStatus = 2
        };
        var remaining = requestedAmount;

        foreach (var charge in summary.Charges.Where(x => x.RefundableAmount > 0))
        {
            if (remaining <= 0) break;
            var refundAmount = Math.Min(remaining, charge.RefundableAmount);
            var refundId = CreateRefund(request, charge, refundAmount, createdBy);
            if (refundId <= 0)
                return PartialFailure(result, "Unable to initialize the refund record.");

            try
            {
                var client = CreateOmiseClient(secretKey);
                var amount = checked((long)Math.Round(refundAmount * 100m, MidpointRounding.AwayFromZero));
                var fields = new List<KeyValuePair<string, string>>
                {
                    new("amount", amount.ToString()),
                    new("metadata[order_id]", request.OrderId.ToString()),
                    new("metadata[order_refund_id]", refundId.ToString()),
                    new("metadata[reason]", request.Reason.Trim())
                };
                using var response = await client.PostAsync(
                    "https://api.omise.co/charges/" + Uri.EscapeDataString(charge.GatewayChargeId) + "/refunds",
                    new FormUrlEncodedContent(fields));
                var body = await response.Content.ReadAsStringAsync();
                using var json = JsonDocument.Parse(body);
                var root = json.RootElement;
                var gatewayRefundId = GetString(root, "id");
                var gatewayStatus = GetString(root, "status") ?? (response.IsSuccessStatusCode ? "successful" : "failed");
                var failureCode = GetString(root, "code");
                var failureMessage = GetString(root, "message");

                UpdateGatewayResult(refundId, gatewayRefundId, gatewayStatus,
                    response.IsSuccessStatusCode ? refundAmount : 0, failureCode, failureMessage, createdBy);

                if (!response.IsSuccessStatusCode || string.IsNullOrWhiteSpace(gatewayRefundId))
                    return PartialFailure(result, failureMessage ?? "Omise rejected the refund.");

                result.GatewayRefundIds.Add(gatewayRefundId);
                result.RefundedAmount += refundAmount;
                remaining -= refundAmount;
            }
            catch (Exception)
            {
                // A timeout can occur after Omise accepted the request. Keep the
                // amount reserved until an administrator verifies the charge.
                UpdateGatewayResult(refundId, null, "verification_required", 0, "gateway_error",
                    "Gateway result is unknown. Verify the Omise charge before retrying.", createdBy);
                return PartialFailure(result, "Unable to contact Omise. Check the refund history before retrying.");
            }
        }

        if (remaining > 0)
            return PartialFailure(result, "The successful charges do not contain enough refundable value.");

        FinalizeCancellation(request.OrderId, request.Reason, request.NonRefundableAmount, createdBy);
        result.Success = true;
        result.RefundStatus = result.RefundedAmount >= summary.RefundableAmount ? 4 : 3;
        result.Message = $"Order cancelled and {summary.Currency} {result.RefundedAmount:0.00} refunded successfully.";
        return result;
    }

    public OrderRefundResult CancelWithoutRefund(CreateOrderRefundRequest request, int? createdBy)
    {
        var summary = GetRefundSummary(request.OrderId);
        if (summary == null)
            return Failure(request.OrderId, "Order was not found.", 404);

        request.NonRefundableAmount = decimal.Round(request.NonRefundableAmount, 2, MidpointRounding.AwayFromZero);
        if (request.NonRefundableAmount != decimal.Round(summary.RefundableAmount, 2))
            return Failure(request.OrderId, "The non-refundable amount is invalid.", 400);

        using var conn = DataFactory.CreateConnection();
        conn.Open();
        using var cmd = DataFactory.CreateCommand("SP_OrderRefund_CancelWithoutRefund", conn);
        ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
        cmd.Parameters.Add(DataFactory.CreateParameter("@OrderId", request.OrderId));
        cmd.Parameters.Add(DataFactory.CreateParameter("@Reason", request.Reason.Trim()));
        cmd.Parameters.Add(DataFactory.CreateParameter("@NonRefundableAmount", request.NonRefundableAmount));
        cmd.Parameters.Add(DataFactory.CreateParameter("@UpdatedBy", createdBy));
        var updated = Convert.ToInt32(DataFactory.ExecuteScalar(cmd) ?? 0) > 0;

        return new OrderRefundResult
        {
            Success = updated,
            OrderId = request.OrderId,
            RefundStatus = 1,
            Message = updated ? "Order cancelled without an Omise refund." : "Unable to cancel the order.",
            HttpStatusCode = updated ? 200 : 400
        };
    }

    private long CreateRefund(CreateOrderRefundRequest request, OrderRefundCharge charge, decimal amount, int? createdBy)
    {
        using var conn = DataFactory.CreateConnection();
        conn.Open();
        using var cmd = DataFactory.CreateCommand("SP_OrderRefund_Create", conn);
        ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
        cmd.Parameters.Add(DataFactory.CreateParameter("@OrderId", request.OrderId));
        cmd.Parameters.Add(DataFactory.CreateParameter("@OrderPaymentId", charge.OrderPaymentId));
        cmd.Parameters.Add(DataFactory.CreateParameter("@GatewayChargeId", charge.GatewayChargeId));
        cmd.Parameters.Add(DataFactory.CreateParameter("@RequestedAmount", amount));
        cmd.Parameters.Add(DataFactory.CreateParameter("@Currency", charge.Currency));
        cmd.Parameters.Add(DataFactory.CreateParameter("@Reason", request.Reason.Trim()));
        cmd.Parameters.Add(DataFactory.CreateParameter("@CreatedBy", createdBy));
        return Convert.ToInt64(DataFactory.ExecuteScalar(cmd) ?? 0);
    }

    private void UpdateGatewayResult(long id, string? gatewayRefundId, string status, decimal refundedAmount,
        string? failureCode, string? failureMessage, int? updatedBy)
    {
        using var conn = DataFactory.CreateConnection();
        conn.Open();
        using var cmd = DataFactory.CreateCommand("SP_OrderRefund_UpdateGatewayResult", conn);
        ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
        cmd.Parameters.Add(DataFactory.CreateParameter("@Id", id));
        cmd.Parameters.Add(DataFactory.CreateParameter("@GatewayRefundId", gatewayRefundId));
        cmd.Parameters.Add(DataFactory.CreateParameter("@Status", status));
        cmd.Parameters.Add(DataFactory.CreateParameter("@RefundedAmount", refundedAmount));
        cmd.Parameters.Add(DataFactory.CreateParameter("@FailureCode", failureCode));
        cmd.Parameters.Add(DataFactory.CreateParameter("@FailureMessage", failureMessage));
        cmd.Parameters.Add(DataFactory.CreateParameter("@UpdatedBy", updatedBy));
        DataFactory.ExecuteNonQuery(cmd);
    }

    private void FinalizeCancellation(int orderId, string reason, decimal nonRefundableAmount, int? updatedBy)
    {
        using var conn = DataFactory.CreateConnection();
        conn.Open();
        using var cmd = DataFactory.CreateCommand("SP_OrderRefund_FinalizeCancellation", conn);
        ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
        cmd.Parameters.Add(DataFactory.CreateParameter("@OrderId", orderId));
        cmd.Parameters.Add(DataFactory.CreateParameter("@Reason", reason.Trim()));
        cmd.Parameters.Add(DataFactory.CreateParameter("@NonRefundableAmount", nonRefundableAmount));
        cmd.Parameters.Add(DataFactory.CreateParameter("@UpdatedBy", updatedBy));
        DataFactory.ExecuteNonQuery(cmd);
    }

    private HttpClient CreateOmiseClient(string secretKey)
    {
        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Basic", Convert.ToBase64String(Encoding.UTF8.GetBytes(secretKey + ":")));
        return client;
    }

    private static string? GetString(JsonElement element, string property) =>
        element.ValueKind == JsonValueKind.Object && element.TryGetProperty(property, out var value) &&
        value.ValueKind != JsonValueKind.Null ? value.ToString() : null;

    private static OrderRefundResult Failure(int orderId, string message, int statusCode) => new()
    {
        Success = false, OrderId = orderId, Message = message, RefundStatus = 5, HttpStatusCode = statusCode
    };

    private static OrderRefundResult PartialFailure(OrderRefundResult result, string message)
    {
        result.Success = false;
        result.Message = message;
        result.RefundStatus = result.RefundedAmount > 0 ? 3 : 5;
        result.HttpStatusCode = 502;
        return result;
    }
}
