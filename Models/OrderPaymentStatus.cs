namespace GayatriCateringPortal.Models;

public class OrderPaymentStatus
{
    public int OrderId { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; }
    public int PaymentStatus { get; set; }
    public bool IsPaid => PaymentStatus == 2;
}
