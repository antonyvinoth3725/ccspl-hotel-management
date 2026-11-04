namespace GayatriCateringPortal.Models
{
    public class DeliveryProofVM
    {
        public int LogisticsId { get; set; }

        public int DriverId { get; set; }

        public IFormFile? ParcelPhoto { get; set; }

        public string CustomerSignature { get; set; } = string.Empty;

        public string? Remarks { get; set; }

        public decimal? Latitude { get; set; }

        public decimal? Longitude { get; set; }

        public int UpdatedBy { get; set; }
    }
}
