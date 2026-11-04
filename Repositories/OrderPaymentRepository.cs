using System.Data;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using GayatriCateringPortal.Data;
using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using Microsoft.Data.SqlClient;

namespace GayatriCateringPortal.Repositories;

public class OrderPaymentRepository : IOrderPaymentRepository
{
    private static readonly HashSet<string> PaymentModes = new(StringComparer.OrdinalIgnoreCase)
    {
        "card", "upi", "qr"
    };

    private readonly IConfiguration _configuration;
    private readonly IHttpClientFactory _httpClientFactory;

    public OrderPaymentRepository(IConfiguration configuration, IHttpClientFactory httpClientFactory)
    {
        _configuration = configuration;
        _httpClientFactory = httpClientFactory;
    }

    public OrderPaymentConfigResult GetConfig()
    {
        var publicKey = _configuration["PaymentGateway:Omise:PublicKey"];
        if (string.IsNullOrWhiteSpace(publicKey))
        {
            return new OrderPaymentConfigResult
            {
                Success = false,
                Message = "Omise is not configured.",
                HttpStatusCode = 400
            };
        }

        return new OrderPaymentConfigResult
        {
            Success = true,
            PublicKey = publicKey,
            Currency = (_configuration["PaymentGateway:Omise:Currency"] ?? "SGD").ToUpperInvariant(),
            UpiSourceType = _configuration["PaymentGateway:Omise:UpiSourceType"] ?? "qr_code_upi",
            QrSourceType = _configuration["PaymentGateway:Omise:QrSourceType"] ?? "paynow"
        };
    }

    public async Task<OrderPaymentResult> ProcessPaymentAsync(
        CreateOrderPaymentRequest request,
        int? createdBy,
        string returnBaseUrl)
    {
        if (request == null || request.OrderId <= 0 || !PaymentModes.Contains(request.PaymentMode))
            return Failure("Invalid payment request.", 400);

        if (string.IsNullOrWhiteSpace(request.PaymentMethodId) ||
            !(request.PaymentMethodId.StartsWith("tokn_", StringComparison.OrdinalIgnoreCase) ||
              request.PaymentMethodId.StartsWith("src_", StringComparison.OrdinalIgnoreCase)))
            return Failure("The payment token or source is invalid.", 400);

        var secretKey = _configuration["PaymentGateway:Omise:SecretKey"];
        var currency = (_configuration["PaymentGateway:Omise:Currency"] ?? "SGD").ToUpperInvariant();
        if (string.IsNullOrWhiteSpace(secretKey))
            return Failure("Omise is not configured.", 400);

        var order = GetOrderForPayment(request.OrderId);
        if (order == null)
            return Failure("Order not found.", 404);
        if (order.AmountDue <= 0)
            return Failure("This order has no outstanding amount.", 400);
        if (request.Amount <= 0)
            return Failure("Enter an amount greater than zero.", 400);
        if (request.Amount > order.AmountDue)
            return Failure($"The payment amount cannot exceed the outstanding balance of {currency} {order.AmountDue:0.00}.", 400);

        var requestedAmount = decimal.Round(request.Amount, 2, MidpointRounding.AwayFromZero);
        if (requestedAmount <= 0)
            return Failure("The minimum payment amount is 0.01.", 400);

        // Calculate the cumulative payment summary from the persisted order values.
        // This is required for amendments because their PaidAmount includes payment
        // carried forward from the original order and is not a payment ledger row on
        // the newly created amendment order.
        var totalAmount = decimal.Round(order.TotalAmount, 2, MidpointRounding.AwayFromZero);
        var previouslyPaidAmount = decimal.Round(order.PaidAmount, 2, MidpointRounding.AwayFromZero);
        var paidAmount = Math.Min(totalAmount, previouslyPaidAmount + requestedAmount);
        var balanceAmount = Math.Max(0, totalAmount - paidAmount);

        var payment = new OrderPayment
        {
            OrderId = order.OrderId,
            PaymentMode = request.PaymentMode.ToLowerInvariant(),
            Amount = requestedAmount,
            TotalAmount = totalAmount,
            PaidAmount = paidAmount,
            BalanceAmount = balanceAmount,
            Currency = currency,
            Status = "initiated",
            CreatedBy = createdBy
        };

        payment.Id = Create(payment);
        if (payment.Id <= 0)
            return Failure("Unable to initialize payment.", 500);

        try
        {
            var amount = checked((long)Math.Round(requestedAmount * 100m, MidpointRounding.AwayFromZero));
            var baseUrl = returnBaseUrl.TrimEnd('/');
            var returnUri = $"{baseUrl}/Customer/OrderPayment/complete?orderId={order.OrderId}&paymentId={payment.Id}";
            if (string.Equals(request.ReturnPage, "myorders", StringComparison.OrdinalIgnoreCase))
                returnUri += "&returnPage=myorders";
            else if (string.Equals(request.ReturnPage, "reminderpayment", StringComparison.OrdinalIgnoreCase))
                returnUri += "&returnPage=reminderpayment";
            else if (string.Equals(request.ReturnPage, "adminquotations", StringComparison.OrdinalIgnoreCase))
                returnUri += "&returnPage=adminquotations";
            else if (string.Equals(request.ReturnPage, "adminorders", StringComparison.OrdinalIgnoreCase))
                returnUri += "&returnPage=adminorders";
            else if (string.Equals(request.ReturnPage, "admindashboard", StringComparison.OrdinalIgnoreCase))
                returnUri += "&returnPage=admindashboard";

            if (!string.IsNullOrWhiteSpace(request.ReturnToken))
            {
                returnUri += "&returnToken=" + Uri.EscapeDataString(request.ReturnToken);
            }
            var fields = new List<KeyValuePair<string, string>>
            {
                new("amount", amount.ToString()),
                new("currency", currency),
                new("description", $"Order {order.OrderNumber ?? order.OrderId.ToString()}"),
                new(request.PaymentMode.Equals("card", StringComparison.OrdinalIgnoreCase) ? "card" : "source", request.PaymentMethodId),
                new("return_uri", returnUri),
                new("metadata[order_id]", order.OrderId.ToString()),
                new("metadata[order_payment_id]", payment.Id.ToString())
            };

            var client = CreateOmiseClient(secretKey);
            using var response = await client.PostAsync(
                "https://api.omise.co/charges",
                new FormUrlEncodedContent(fields));
            var body = await response.Content.ReadAsStringAsync();
            using var json = JsonDocument.Parse(body);
            var root = json.RootElement;

            ApplyGatewayResponse(payment, root, response.IsSuccessStatusCode);
            UpdateGatewayResult(payment);

            if (!response.IsSuccessStatusCode)
                return Failure(
                    payment.FailureMessage ?? "Omise rejected the payment.",
                    (int)response.StatusCode);

            return new OrderPaymentResult
            {
                Success = true,
                PaymentId = payment.Id,
                OrderId = payment.OrderId,
                ChargeId = payment.GatewayChargeId,
                Status = payment.Status,
                QrImageUrl = payment.QrImageUrl,
                AuthorizeUrl = payment.AuthorizeUrl
            };
        }
        catch (Exception)
        {
            payment.Status = "failed";
            payment.FailureMessage = "Unable to contact the payment gateway.";
            UpdateGatewayResult(payment);
            return Failure(payment.FailureMessage, 502);
        }
    }

    public async Task<OrderPaymentResult> GetPaymentStatusAsync(string chargeId)
    {
        if (string.IsNullOrWhiteSpace(chargeId))
            return Failure("Invalid payment reference.", 400);

        var payment = GetByChargeId(chargeId);
        if (payment == null)
            return Failure("Payment not found.", 404);

        return await RefreshPaymentStatusAsync(payment);
    }

    public async Task<OrderPaymentResult> GetPaymentStatusByPaymentIdAsync(long paymentId)
    {
        if (paymentId <= 0)
            return Failure("Invalid payment reference.", 400);

        var payment = GetById(paymentId);
        if (payment == null)
            return Failure("Payment not found.", 404);
        if (string.IsNullOrWhiteSpace(payment.GatewayChargeId))
            return Failure("Gateway charge reference was not created.", 400);

        return await RefreshPaymentStatusAsync(payment);
    }

    private OrderPaymentOrderInfo? GetOrderForPayment(int orderId)
    {
        using var conn = DataFactory.CreateConnection();
        conn.Open();
        using var cmd = DataFactory.CreateCommand("SP_OrderPayment_GetOrder", conn);
        ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
        cmd.Parameters.Add(DataFactory.CreateParameter("@OrderId", orderId));
        using var reader = DataFactory.ExecuteReader(cmd);
        if (!reader.Read()) return null;
        var amountDue = GetDecimal(reader, "AmountDue");
        var totalAmount = HasColumn(reader, "TotalAmount")
            ? GetDecimal(reader, "TotalAmount")
            : amountDue;
        var paidAmount = HasColumn(reader, "PaidAmount")
            ? GetDecimal(reader, "PaidAmount")
            : Math.Max(0, totalAmount - amountDue);
        return new OrderPaymentOrderInfo
        {
            OrderId = Convert.ToInt32(reader["OrderId"]),
            OrderNumber = Convert.ToString(reader["OrderNumber"]),
            TotalAmount = totalAmount,
            PaidAmount = paidAmount,
            BalanceAmount = amountDue,
            AmountDue = amountDue
        };
    }

    private long Create(OrderPayment payment)
    {
        using var conn = DataFactory.CreateConnection();
        conn.Open();
        using var cmd = DataFactory.CreateCommand("SP_OrderPayment_Create", conn);
        ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
        cmd.Parameters.Add(DataFactory.CreateParameter("@OrderId", payment.OrderId));
        cmd.Parameters.Add(DataFactory.CreateParameter("@PaymentMode", payment.PaymentMode));
        cmd.Parameters.Add(DataFactory.CreateParameter("@Amount", payment.Amount));
        cmd.Parameters.Add(DataFactory.CreateParameter("@TotalAmount", payment.TotalAmount));
        cmd.Parameters.Add(DataFactory.CreateParameter("@PaidAmount", payment.PaidAmount));
        cmd.Parameters.Add(DataFactory.CreateParameter("@BalanceAmount", payment.BalanceAmount));
        cmd.Parameters.Add(DataFactory.CreateParameter("@Currency", payment.Currency));
        cmd.Parameters.Add(DataFactory.CreateParameter("@CreatedBy", payment.CreatedBy));
        return Convert.ToInt64(DataFactory.ExecuteScalar(cmd) ?? 0);
    }

    private bool UpdateGatewayResult(OrderPayment payment)
    {
        using var conn = DataFactory.CreateConnection();
        conn.Open();
        using var cmd = DataFactory.CreateCommand("SP_OrderPayment_UpdateGatewayResult", conn);
        ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
        cmd.Parameters.Add(DataFactory.CreateParameter("@Id", payment.Id));
        cmd.Parameters.Add(DataFactory.CreateParameter("@GatewayChargeId", payment.GatewayChargeId));
        cmd.Parameters.Add(DataFactory.CreateParameter("@GatewaySourceId", payment.GatewaySourceId));
        cmd.Parameters.Add(DataFactory.CreateParameter("@Status", payment.Status));
        cmd.Parameters.Add(DataFactory.CreateParameter("@FailureCode", payment.FailureCode));
        cmd.Parameters.Add(DataFactory.CreateParameter("@FailureMessage", payment.FailureMessage));
        cmd.Parameters.Add(DataFactory.CreateParameter("@QrImageUrl", payment.QrImageUrl));
        cmd.Parameters.Add(DataFactory.CreateParameter("@AuthorizeUrl", payment.AuthorizeUrl));
        return DataFactory.ExecuteNonQuery(cmd) > 0;
    }

    private OrderPayment? GetByChargeId(string chargeId)
    {
        using var conn = DataFactory.CreateConnection();
        conn.Open();
        using var cmd = DataFactory.CreateCommand("SP_OrderPayment_GetByChargeId", conn);
        ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
        cmd.Parameters.Add(DataFactory.CreateParameter("@GatewayChargeId", chargeId));
        using var reader = DataFactory.ExecuteReader(cmd);
        if (!reader.Read()) return null;
        return new OrderPayment
        {
            Id = Convert.ToInt64(reader["Id"]), OrderId = Convert.ToInt32(reader["OrderId"]),
            GatewayChargeId = Convert.ToString(reader["GatewayChargeId"]),
            Amount = Convert.ToDecimal(reader["Amount"]), Currency = Convert.ToString(reader["Currency"]) ?? "SGD",
            PaymentMode = Convert.ToString(reader["PaymentMode"]) ?? string.Empty,
            Status = Convert.ToString(reader["Status"]) ?? "pending"
        };
    }

    private OrderPayment? GetById(long paymentId)
    {
        using var conn = DataFactory.CreateConnection();
        conn.Open();
        using var cmd = DataFactory.CreateCommand("SP_OrderPayment_GetById", conn);
        ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
        cmd.Parameters.Add(DataFactory.CreateParameter("@Id", paymentId));
        using var reader = DataFactory.ExecuteReader(cmd);
        return reader.Read() ? MapPayment(reader) : null;
    }

    private async Task<OrderPaymentResult> RefreshPaymentStatusAsync(OrderPayment payment)
    {
        var secretKey = _configuration["PaymentGateway:Omise:SecretKey"];
        if (string.IsNullOrWhiteSpace(secretKey))
            return Failure("Omise is not configured.", 400);

        try
        {
            var client = CreateOmiseClient(secretKey);
            using var response = await client.GetAsync(
                "https://api.omise.co/charges/" + Uri.EscapeDataString(payment.GatewayChargeId!));
            var body = await response.Content.ReadAsStringAsync();
            using var json = JsonDocument.Parse(body);

            ApplyGatewayResponse(payment, json.RootElement, response.IsSuccessStatusCode);
            UpdateGatewayResult(payment);

            return new OrderPaymentResult
            {
                Success = response.IsSuccessStatusCode,
                Message = payment.FailureMessage,
                PaymentId = payment.Id,
                OrderId = payment.OrderId,
                ChargeId = payment.GatewayChargeId,
                Status = payment.Status,
                HttpStatusCode = (int)response.StatusCode
            };
        }
        catch (Exception)
        {
            return Failure("Unable to retrieve payment status.", 502);
        }
    }

    private static OrderPayment MapPayment(IDataRecord reader)
    {
        return new OrderPayment
        {
            Id = Convert.ToInt64(reader["Id"]),
            OrderId = Convert.ToInt32(reader["OrderId"]),
            GatewayChargeId = Convert.ToString(reader["GatewayChargeId"]),
            Amount = Convert.ToDecimal(reader["Amount"]),
            Currency = Convert.ToString(reader["Currency"]) ?? "SGD",
            PaymentMode = Convert.ToString(reader["PaymentMode"]) ?? string.Empty,
            Status = Convert.ToString(reader["Status"]) ?? "pending"
        };
    }

    private static bool HasColumn(IDataRecord reader, string columnName)
    {
        for (var index = 0; index < reader.FieldCount; index++)
        {
            if (string.Equals(reader.GetName(index), columnName, StringComparison.OrdinalIgnoreCase))
                return true;
        }

        return false;
    }

    private static decimal GetDecimal(IDataRecord reader, string columnName)
    {
        return reader[columnName] == DBNull.Value ? 0 : Convert.ToDecimal(reader[columnName]);
    }

    private HttpClient CreateOmiseClient(string secretKey)
    {
        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Basic",
            Convert.ToBase64String(Encoding.UTF8.GetBytes(secretKey + ":")));
        return client;
    }

    private static void ApplyGatewayResponse(
        OrderPayment payment,
        JsonElement root,
        bool isSuccessStatusCode)
    {
        payment.GatewayChargeId = GetString(root, "id") ?? payment.GatewayChargeId;
        payment.GatewaySourceId = GetNestedString(root, "source", "id") ?? payment.GatewaySourceId;
        payment.Status = GetString(root, "status") ?? (isSuccessStatusCode ? payment.Status : "failed");
        payment.FailureCode = GetString(root, "failure_code") ?? GetString(root, "code");
        payment.FailureMessage = GetString(root, "failure_message") ?? GetString(root, "message");
        payment.AuthorizeUrl = GetString(root, "authorize_uri") ?? payment.AuthorizeUrl;
        payment.QrImageUrl =
            GetNestedString(root, "source", "scannable_code", "image", "download_uri") ??
            payment.QrImageUrl;
    }

    private static OrderPaymentResult Failure(string message, int statusCode)
    {
        return new OrderPaymentResult
        {
            Success = false,
            Message = message,
            Status = "failed",
            HttpStatusCode = statusCode
        };
    }

    private static string? GetString(JsonElement element, string property) =>
        element.ValueKind == JsonValueKind.Object &&
        element.TryGetProperty(property, out var value) &&
        value.ValueKind != JsonValueKind.Null
            ? value.ToString()
            : null;

    private static string? GetNestedString(JsonElement element, params string[] path)
    {
        foreach (var property in path)
            if (element.ValueKind != JsonValueKind.Object ||
                !element.TryGetProperty(property, out element))
                return null;

        return element.ValueKind == JsonValueKind.Null ? null : element.ToString();
    }
}
