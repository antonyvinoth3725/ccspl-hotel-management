namespace GayatriCateringPortal.Models
{
    public class DriverDeliveryVM
    {
        public int LogisticsId { get; set; }

        public int InvoiceId { get; set; }

        public string InvoiceNo { get; set; } = string.Empty;

        public string CustomerName { get; set; } = string.Empty;

        public string MobileNo { get; set; } = string.Empty;

        public string DeliveryAddress { get; set; } = string.Empty;

        public DateTime EventDate { get; set; }

        public int DriverId { get; set; }
        public string? ParcelPhoto { get; set; }

        public string? CustomerSignature { get; set; }

        public string? Remarks { get; set; }

        public decimal Latitude { get; set; }

        public decimal Longitude { get; set; }

        public string DeliveryStatus { get; set; } = "";
    }
}
