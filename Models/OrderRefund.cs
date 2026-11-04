using System.Text.Json.Serialization;

namespace GayatriCateringPortal.Models;

public class OrderRefundSummary
{
    public int OrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string CustomerName { get; set; } = string.Empty;
    public string EmailId { get; set; } = string.Empty;
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal RefundedAmount { get; set; }
    public decimal RefundableAmount { get; set; }
    public string Currency { get; set; } = "SGD";
    public List<OrderRefundCharge> Charges { get; set; } = new();
}

public class OrderRefundCharge
{
    public long OrderPaymentId { get; set; }
    public string GatewayChargeId { get; set; } = string.Empty;
    public decimal PaidAmount { get; set; }
    public decimal RefundedAmount { get; set; }
    public decimal RefundableAmount { get; set; }
    public string Currency { get; set; } = "SGD";
}

public class CreateOrderRefundRequest
{
    public int OrderId { get; set; }
    public decimal RefundAmount { get; set; }
    public decimal NonRefundableAmount { get; set; }
    public string Reason { get; set; } = string.Empty;
}

public class OrderRefundResult
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public int OrderId { get; set; }
    public decimal RequestedAmount { get; set; }
    public decimal RefundedAmount { get; set; }
    public int RefundStatus { get; set; }
    public List<string> GatewayRefundIds { get; set; } = new();
    [JsonIgnore]
    public int HttpStatusCode { get; set; } = 200;
}
