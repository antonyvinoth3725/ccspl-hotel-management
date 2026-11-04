namespace GayatriCateringPortal.Models
{
    public class DriverInvoiceVM
    {
        public int LogisticsId { get; set; }

        public int InvoiceId { get; set; }

        public string InvoiceNo { get; set; } = string.Empty;

        public string CustomerName { get; set; } = string.Empty;

        public string DeliveryAddress { get; set; } = string.Empty;

        public DateTime EventDate { get; set; }

        public string Status { get; set; } = string.Empty;
    }
}
