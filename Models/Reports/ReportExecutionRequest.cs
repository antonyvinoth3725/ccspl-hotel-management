using System.Collections.Generic;

namespace GayatriCateringPortal.Models.Reports;

public class ReportExecutionRequest
{
    public int RoleId { get; set; }
    public int ReportId { get; set; }
    public Dictionary<string, object?>? Filters { get; set; }
}
