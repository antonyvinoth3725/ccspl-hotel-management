namespace GayatriCateringPortal.Models.Reports;

public class ReportPermissionRequest
{
    public int ReportId { get; set; }
    public int RoleId { get; set; }
    public bool CanView { get; set; }
    public bool CanPrint { get; set; }
    public bool ExportPdf { get; set; }
    public bool ExportExcel { get; set; }
}
