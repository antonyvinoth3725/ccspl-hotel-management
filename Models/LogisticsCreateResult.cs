namespace GayatriCateringPortal.Models
{
    public class LogisticsCreateResult
    {
        public int LogisticsId { get; set; }

        public string Mobile { get; set; }

        public string Token { get; set; }

        public string OTP { get; set; }
        public string DriverName { get; set; }

        public bool IsNewDriverSession { get; set; }
    }
}
