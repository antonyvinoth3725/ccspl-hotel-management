namespace GayatriCateringPortal.Models;

using System.Text.Json.Serialization;

public class OrderPayment
{
    public long Id { get; set; }
    public int OrderId { get; set; }
    public string PaymentMode { get; set; } = string.Empty;
    public string Gateway { get; set; } = "Omise";
    public string? GatewayChargeId { get; set; }
    public string? GatewaySourceId { get; set; }
    public decimal Amount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal BalanceAmount { get; set; }
    public string Currency { get; set; } = "SGD";
    public string Status { get; set; } 
    public string? FailureCode { get; set; }
    public string? FailureMessage { get; set; }
    public string? QrImageUrl { get; set; }
    public string? AuthorizeUrl { get; set; }
    public bool? IsActive { get; set; }
    public bool? IsDeleted { get; set; }
    public int? CreatedBy { get; set; }
    public int? UpdatedBy { get; set; }
}

public class CreateOrderPaymentRequest
{
    public int OrderId { get; set; }
    public decimal Amount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal BalanceAmount { get; set; }
    public string PaymentMode { get; set; } = string.Empty;
    public string PaymentMethodId { get; set; } = string.Empty;
    public string? ReturnPage { get; set; }
    public string? ReturnToken { get; set; }
}

public class OrderPaymentOrderInfo
{
    public int OrderId { get; set; }
    public string? OrderNumber { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public decimal BalanceAmount { get; set; }
    public decimal AmountDue { get; set; }
}

public class OrderPaymentConfigResult
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public string? PublicKey { get; set; }
    public string Currency { get; set; } = "SGD";
    public string UpiSourceType { get; set; } = "qr_code_upi";
    public string QrSourceType { get; set; } = "paynow";
    [JsonIgnore]
    public int HttpStatusCode { get; set; } = 200;
}

public class OrderPaymentResult
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public long PaymentId { get; set; }
    public int OrderId { get; set; }
    public string? ChargeId { get; set; }
    public string? Status { get; set; }
    public string? QrImageUrl { get; set; }
    public string? AuthorizeUrl { get; set; }
    public bool Paid => string.Equals(Status, "successful", StringComparison.OrdinalIgnoreCase);
    [JsonIgnore]
    public int HttpStatusCode { get; set; } = 200;
}
