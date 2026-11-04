namespace GayatriCateringPortal.Models.Reports
{
    public class ReportColumnPreferenceRequest
    {
        public int ReportId { get; set; }
        public string ColumnVisibilityJson { get; set; } = string.Empty;
    }
}
