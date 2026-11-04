namespace GayatriCateringPortal.Models;

public class OrderSignatureViewModel
{
    public bool IsValid { get; set; }
    public string Status { get; set; } = "invalid";
    public string Message { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
    public ViewOrderHeader Order { get; set; } = new();
}

public class SubmitOrderSignatureRequest
{
    public string Token { get; set; } = string.Empty;
    public string Signature { get; set; } = string.Empty;
}
