namespace GayatriCateringPortal.Models
{
    public class DashboardChart
    {
        public List<string> Labels { get; set; } = new();

        public List<decimal> OrderValue { get; set; } = new();

        public List<decimal> Deposit { get; set; } = new();

        public List<decimal> FullPayment { get; set; } = new();

        public List<decimal> Outstanding { get; set; } = new();
    }
}
