namespace GayatriCateringPortal.Models
{
    public class DriverVerificationVM
    {
        public int DriverId { get; set; }

        public string DriverName { get; set; } = string.Empty;

        public string MobileNo { get; set; } = string.Empty;

        public string Token { get; set; } = string.Empty;
        public int logisticsId { get; set; }

        public DateTime ExpiryDate { get; set; }
    }
}
