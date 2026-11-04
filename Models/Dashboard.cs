namespace GayatriCateringPortal.Models
{
    public class Dashboard
    {
        public DashboardSummary Summary { get; set; } = new DashboardSummary();
        public List<DashboardDetails> RecentOrders { get; set; } = new List<DashboardDetails>();
        public DashboardChart Chart { get; set; } = new();
        public DashboardChart PreviousChart { get; set; } = new();
        public List<int> Years { get; set; } = new();
        public DashboardAlertSummary Alerts { get; set; } = new();
        public DateTime GeneratedAtUtc { get; set; } = DateTime.UtcNow;
        public string SourceNote { get; set; } = "Source: Orders table filtered by CreatedDate range.";
    }
}
