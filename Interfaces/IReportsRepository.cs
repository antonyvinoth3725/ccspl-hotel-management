using System.Collections.Generic;
using GayatriCateringPortal.Models.Reports;

namespace GayatriCateringPortal.Interfaces;

public interface IReportsRepository
{
    object GetReport(string name);
    IEnumerable<object> GetCategories(int roleId);
    IEnumerable<object> GetReports(int roleId, int? categoryId = null);
    IEnumerable<object> GetAutoCompleteOrdersNumbers(string orderNumber);
    IEnumerable<object> GetReportPermissions(int roleId);
    string SaveReportPermission(List<ReportPermissionRequest> reportPermissions);
    object? GetReportDefinition(int roleId, int reportId);
    object? GetReportDefinitionById(int reportId);
    object ExecuteReport(ReportExecutionRequest request);
    
    // Column Management
    IEnumerable<object> GetReportColumns(int reportId);
    IEnumerable<object> GetVisibleColumns(int reportId);
    string SaveColumnPreferences(int reportId, string columnVisibilityJson);
    string ResetColumnView(int reportId);
}
