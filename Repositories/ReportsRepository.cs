using System;
using System.Collections;
using System.Data;
using System.Globalization;
using System.Linq;
using System.Text.Json;
using GayatriCateringPortal.Common;
using GayatriCateringPortal.Data;
using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models.Reports;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Hosting;

namespace GayatriCateringPortal.Repositories;

public class ReportsRepository : IReportsRepository
{
    private readonly IHostEnvironment _environment;
    private readonly IConfiguration _configuration;

    public ReportsRepository(IHostEnvironment environment, IConfiguration configuration)
    {
        _environment = environment;
        _configuration = configuration;
    }

    public object GetReport(string name)
    {
        return new { message = "Use /Admin/Reports endpoints for report catalog and preview." };
    }

    public IEnumerable<object> GetCategories(int roleId)
    {
        if (roleId <= 0)
        {
            return new List<object>();
        }

        IDbConnection? conn = null;
        IDbCommand? cmd = null;
        IDataReader? reader = null;

        try
        {
            conn = DataFactory.CreateConnection();
            cmd = DataFactory.CreateCommand("SP_Report_GetCategories", conn);
            ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
            cmd.Parameters.Add(DataFactory.CreateParameter("@RoleId", roleId));
            conn.Open();
            reader = DataFactory.ExecuteReader(cmd);

            var list = new List<object>();
            while (reader.Read())
            {
                list.Add(new
                {
                    id = reader["Id"] != DBNull.Value ? Convert.ToInt32(reader["Id"]) : 0,
                    name = reader["Name"] != DBNull.Value ? Convert.ToString(reader["Name"]) : string.Empty,
                    displayOrder = reader["DisplayOrder"] != DBNull.Value ? Convert.ToInt32(reader["DisplayOrder"]) : 0,
                    reportCount = reader["ReportCount"] != DBNull.Value ? Convert.ToInt32(reader["ReportCount"]) : 0
                });
            }

            return list;
        }
        catch (SqlException)
        {
            throw new InvalidOperationException("Unable to load report categories.");
        }
        finally
        {
            reader?.Close();
            if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
        }
    }

    public IEnumerable<object> GetReports(int roleId, int? categoryId = null)
    {
        if (roleId <= 0)
        {
            return new List<object>();
        }

        IDbConnection? conn = null;
        IDbCommand? cmd = null;
        IDataReader? reader = null;

        try
        {
            conn = DataFactory.CreateConnection();
            cmd = DataFactory.CreateCommand("SP_Report_GetReports", conn);
            ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
            cmd.Parameters.Add(DataFactory.CreateParameter("@RoleId", roleId));
            cmd.Parameters.Add(DataFactory.CreateParameter("@CategoryId", categoryId.HasValue ? categoryId.Value : DBNull.Value));
            conn.Open();
            reader = DataFactory.ExecuteReader(cmd);

            var list = new List<object>();
            while (reader.Read())
            {
                var templatePath = reader["TemplatePath"] != DBNull.Value ? Convert.ToString(reader["TemplatePath"]) : string.Empty;
                list.Add(new
                {
                    id = reader["Id"] != DBNull.Value ? Convert.ToInt32(reader["Id"]) : 0,
                    categoryId = reader["CategoryId"] != DBNull.Value ? Convert.ToInt32(reader["CategoryId"]) : 0,
                    categoryName = reader["CategoryName"] != DBNull.Value ? Convert.ToString(reader["CategoryName"]) : string.Empty,
                    reportCode = reader["ReportCode"] != DBNull.Value ? Convert.ToString(reader["ReportCode"]) : string.Empty,
                    reportName = reader["ReportName"] != DBNull.Value ? Convert.ToString(reader["ReportName"]) : string.Empty,
                    displayName = reader["DisplayName"] != DBNull.Value ? Convert.ToString(reader["DisplayName"]) : string.Empty,
                    description = reader["Description"] != DBNull.Value ? Convert.ToString(reader["Description"]) : string.Empty,
                    storedProcedure = reader["StoredProcedure"] != DBNull.Value ? Convert.ToString(reader["StoredProcedure"]) : string.Empty,
                    templateName = reader["TemplateName"] != DBNull.Value ? Convert.ToString(reader["TemplateName"]) : string.Empty,
                    templatePath,
                    reportType = reader["ReportType"] != DBNull.Value ? Convert.ToString(reader["ReportType"]) : string.Empty,
                    viewerType = reader["ViewerType"] != DBNull.Value ? Convert.ToString(reader["ViewerType"]) : string.Empty,
                    paperWidth = reader["PaperWidth"] != DBNull.Value ? Convert.ToDecimal(reader["PaperWidth"]) : 0,
                    paperHeight = reader["PaperHeight"] != DBNull.Value ? Convert.ToDecimal(reader["PaperHeight"]) : 0,
                    orientation = reader["Orientation"] != DBNull.Value ? Convert.ToString(reader["Orientation"]) : string.Empty,
                    isThermal = reader["IsThermal"] != DBNull.Value && Convert.ToBoolean(reader["IsThermal"]),
                    isLandscape = reader["IsLandscape"] != DBNull.Value && Convert.ToBoolean(reader["IsLandscape"]),
                    displayOrder = reader["DisplayOrder"] != DBNull.Value ? Convert.ToInt32(reader["DisplayOrder"]) : 0,
                    icon = reader["Icon"] != DBNull.Value ? Convert.ToString(reader["Icon"]) : string.Empty,
                    canView = reader["CanView"] != DBNull.Value && Convert.ToBoolean(reader["CanView"]),
                    canPrint = reader["CanPrint"] != DBNull.Value && Convert.ToBoolean(reader["CanPrint"]),
                    exportPdf = reader["ExportPdf"] != DBNull.Value && Convert.ToBoolean(reader["ExportPdf"]),
                    exportExcel = reader["ExportExcel"] != DBNull.Value && Convert.ToBoolean(reader["ExportExcel"]),
                    templateExists = ReportLayoutAssetHelper.Exists(_environment, _configuration, templatePath)
                });
            }

            return list;
        }
        catch (SqlException)
        {
            throw new InvalidOperationException("Unable to load report list.");
        }
        finally
        {
            reader?.Close();
            if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
        }
    }

    public IEnumerable<object> GetAutoCompleteOrdersNumbers(string orderNumber)
    {
        var result = new List<object>();
        var searchTerm = (orderNumber ?? string.Empty).Trim();

        IDbConnection? conn = null;
        IDbCommand? cmd = null;
        IDataReader? reader = null;

        try
        {
            conn = DataFactory.CreateConnection();
            conn.Open();

            cmd = DataFactory.CreateCommand("GetAutoCompleteOrdersNumbers", conn);
            ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
            cmd.Parameters.Add(DataFactory.CreateParameter("@OrderNumber", searchTerm));

            reader = DataFactory.ExecuteReader(cmd);
            while (reader.Read())
            {
                result.Add(new
                {
                    id = reader["Id"] != DBNull.Value ? Convert.ToInt32(reader["Id"]) : 0,
                    text = reader["OrderNumber"] != DBNull.Value ? Convert.ToString(reader["OrderNumber"]) : string.Empty,
                    orderNumber = reader["OrderNumber"] != DBNull.Value ? Convert.ToString(reader["OrderNumber"]) : string.Empty,
                    eventDate = reader["EventDate"] != DBNull.Value ? Convert.ToDateTime(reader["EventDate"]) : (DateTime?)null,
                    createdDate = reader["CreatedDate"] != DBNull.Value ? Convert.ToDateTime(reader["CreatedDate"]) : (DateTime?)null
                });
            }

            return result;
        }
        catch (SqlException)
        {
            throw new InvalidOperationException("Unable to load order numbers.");
        }
        finally
        {
            reader?.Close();
            if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
        }
    }

    public IEnumerable<object> GetReportPermissions(int roleId)
    {
        if (roleId <= 0)
        {
            return new List<object>();
        }

        IDbConnection? conn = null;
        IDbCommand? cmd = null;
        IDataReader? reader = null;

        try
        {
            conn = DataFactory.CreateConnection();
            conn.Open();

            cmd = DataFactory.CreateCommand("SP_Report_GetPermissions", conn);
            ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
            cmd.Parameters.Add(DataFactory.CreateParameter("@RoleId", roleId));

            reader = DataFactory.ExecuteReader(cmd);

            var list = new List<object>();
            while (reader.Read())
            {
                list.Add(new
                {
                    id = reader["Id"] != DBNull.Value ? Convert.ToInt32(reader["Id"]) : 0,
                    categoryId = reader["CategoryId"] != DBNull.Value ? Convert.ToInt32(reader["CategoryId"]) : 0,
                    categoryName = reader["CategoryName"] != DBNull.Value ? Convert.ToString(reader["CategoryName"]) : string.Empty,
                    reportCode = reader["ReportCode"] != DBNull.Value ? Convert.ToString(reader["ReportCode"]) : string.Empty,
                    reportName = reader["ReportName"] != DBNull.Value ? Convert.ToString(reader["ReportName"]) : string.Empty,
                    displayName = reader["DisplayName"] != DBNull.Value ? Convert.ToString(reader["DisplayName"]) : string.Empty,
                    canView = reader["CanView"] != DBNull.Value && Convert.ToBoolean(reader["CanView"]),
                    canPrint = reader["CanPrint"] != DBNull.Value && Convert.ToBoolean(reader["CanPrint"]),
                    exportPdf = reader["ExportPdf"] != DBNull.Value && Convert.ToBoolean(reader["ExportPdf"]),
                    exportExcel = reader["ExportExcel"] != DBNull.Value && Convert.ToBoolean(reader["ExportExcel"])
                });
            }

            return list;
        }
        catch (SqlException)
        {
            throw new InvalidOperationException("Unable to load report permissions.");
        }
        finally
        {
            reader?.Close();
            if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
        }
    }

    public string SaveReportPermission(List<ReportPermissionRequest> reportPermissions)
    {
        if (reportPermissions == null || reportPermissions.Count == 0)
        {
            return "No records to save.";
        }

        IDbConnection conn = null;
        IDbCommand cmd = null;
        SqlTransaction? tx = null;

        try
        {
            using (conn = DataFactory.CreateConnection())
            {
                conn.Open();
                tx = ((SqlConnection)conn).BeginTransaction();

                foreach (var permission in reportPermissions)
                {
                    using (cmd = DataFactory.CreateCommand("SP_Report_SavePermission", conn))
                    {
                        ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
                        ((SqlCommand)cmd).Transaction = tx;
                        cmd.Parameters.Add(DataFactory.CreateParameter("@RoleId", permission.RoleId));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@ReportId", permission.ReportId));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@CanView", permission.CanView));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@CanPrint", permission.CanPrint));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@ExportPdf", permission.ExportPdf));
                        cmd.Parameters.Add(DataFactory.CreateParameter("@ExportExcel", permission.ExportExcel));
                        DataFactory.ExecuteNonQuery(cmd);
                    }
                }

                tx.Commit();
                return "Success";
            }
        }
        catch (SqlException)
        {
            tx?.Rollback();
            throw new InvalidOperationException("Unable to save report permissions.");
        }
    }

    public object? GetReportDefinition(int roleId, int reportId)
    {
        if (roleId <= 0 || reportId <= 0)
        {
            return null;
        }

        IDbConnection? conn = null;
        IDbCommand? cmd = null;
        IDataReader? reader = null;

        try
        {
            conn = DataFactory.CreateConnection();
            conn.Open();

            cmd = DataFactory.CreateCommand("SP_Report_GetDefinition", conn);
            ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
            cmd.Parameters.Add(DataFactory.CreateParameter("@RoleId", roleId));
            cmd.Parameters.Add(DataFactory.CreateParameter("@ReportId", reportId));

            reader = DataFactory.ExecuteReader(cmd);
            if (!reader.Read())
            {
                return null;
            }

            var templatePath = reader["TemplatePath"] != DBNull.Value ? Convert.ToString(reader["TemplatePath"]) : string.Empty;

            var report = new
            {
                id = reader["Id"] != DBNull.Value ? Convert.ToInt32(reader["Id"]) : 0,
                categoryId = reader["CategoryId"] != DBNull.Value ? Convert.ToInt32(reader["CategoryId"]) : 0,
                categoryName = reader["CategoryName"] != DBNull.Value ? Convert.ToString(reader["CategoryName"]) : string.Empty,
                reportCode = reader["ReportCode"] != DBNull.Value ? Convert.ToString(reader["ReportCode"]) : string.Empty,
                reportName = reader["ReportName"] != DBNull.Value ? Convert.ToString(reader["ReportName"]) : string.Empty,
                displayName = reader["DisplayName"] != DBNull.Value ? Convert.ToString(reader["DisplayName"]) : string.Empty,
                description = reader["Description"] != DBNull.Value ? Convert.ToString(reader["Description"]) : string.Empty,
                storedProcedure = reader["StoredProcedure"] != DBNull.Value ? Convert.ToString(reader["StoredProcedure"]) : string.Empty,
                templateName = reader["TemplateName"] != DBNull.Value ? Convert.ToString(reader["TemplateName"]) : string.Empty,
                templatePath,
                reportType = reader["ReportType"] != DBNull.Value ? Convert.ToString(reader["ReportType"]) : string.Empty,
                viewerType = reader["ViewerType"] != DBNull.Value ? Convert.ToString(reader["ViewerType"]) : string.Empty,
                paperWidth = reader["PaperWidth"] != DBNull.Value ? Convert.ToDecimal(reader["PaperWidth"]) : 0,
                paperHeight = reader["PaperHeight"] != DBNull.Value ? Convert.ToDecimal(reader["PaperHeight"]) : 0,
                orientation = reader["Orientation"] != DBNull.Value ? Convert.ToString(reader["Orientation"]) : string.Empty,
                isThermal = reader["IsThermal"] != DBNull.Value && Convert.ToBoolean(reader["IsThermal"]),
                isLandscape = reader["IsLandscape"] != DBNull.Value && Convert.ToBoolean(reader["IsLandscape"]),
                icon = reader["Icon"] != DBNull.Value ? Convert.ToString(reader["Icon"]) : string.Empty,
                canView = reader["CanView"] != DBNull.Value && Convert.ToBoolean(reader["CanView"]),
                canPrint = reader["CanPrint"] != DBNull.Value && Convert.ToBoolean(reader["CanPrint"]),
                exportPdf = reader["ExportPdf"] != DBNull.Value && Convert.ToBoolean(reader["ExportPdf"]),
                exportExcel = reader["ExportExcel"] != DBNull.Value && Convert.ToBoolean(reader["ExportExcel"]),
                templateExists = ReportLayoutAssetHelper.Exists(_environment, _configuration, templatePath),
                templateKind = ReportLayoutAssetHelper.ResolveTemplateKind(_environment, _configuration, templatePath)
            };

            reader.Close();

            var filterCmd = DataFactory.CreateCommand("SP_Report_GetFilters", conn);
            ((SqlCommand)filterCmd).CommandType = CommandType.StoredProcedure;
            filterCmd.Parameters.Add(DataFactory.CreateParameter("@ReportId", reportId));

            using var filterReader = DataFactory.ExecuteReader(filterCmd);
            var filters = new List<object>();
            while (filterReader.Read())
            {
                filters.Add(new
                {
                    id = filterReader["Id"] != DBNull.Value ? Convert.ToInt32(filterReader["Id"]) : 0,
                    reportId = filterReader["ReportId"] != DBNull.Value ? Convert.ToInt32(filterReader["ReportId"]) : 0,
                    fieldName = filterReader["FieldName"] != DBNull.Value ? Convert.ToString(filterReader["FieldName"]) : string.Empty,
                    displayName = filterReader["DisplayName"] != DBNull.Value ? Convert.ToString(filterReader["DisplayName"]) : string.Empty,
                    controlType = filterReader["ControlType"] != DBNull.Value ? Convert.ToString(filterReader["ControlType"]) : string.Empty,
                    dataType = filterReader["DataType"] != DBNull.Value ? Convert.ToString(filterReader["DataType"]) : string.Empty,
                    isRequired = filterReader["IsRequired"] != DBNull.Value && Convert.ToBoolean(filterReader["IsRequired"]),
                    displayOrder = filterReader["DisplayOrder"] != DBNull.Value ? Convert.ToInt32(filterReader["DisplayOrder"]) : 0,
                    isActive = filterReader["IsActive"] == DBNull.Value || Convert.ToBoolean(filterReader["IsActive"]),
                    isShow = filterReader["IsShow"] != DBNull.Value && Convert.ToBoolean(filterReader["IsShow"])
                });
            }

            return new
            {
                report,
                filters
            };
        }
        catch (SqlException)
        {
            throw new InvalidOperationException("Unable to load report definition.");
        }
        finally
        {
            reader?.Close();
            if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
        }
    }

    public object ExecuteReport(ReportExecutionRequest request)
    {
        if (request.ReportId <= 0)
        {
            throw new ArgumentException("Valid report is required.");
        }

        var definition = GetReportDefinitionById(request.ReportId);
        if (definition == null)
        {
            throw new KeyNotFoundException("Report definition not found.");
        }

        var reportObject = ((IDictionary<string, object?>)ToDictionary(definition))["report"];
        if (reportObject == null)
        {
            throw new KeyNotFoundException("Report definition not found.");
        }

        var report = ToDictionary(reportObject);
        var storedProcedure = Convert.ToString(GetDictionaryValue(report, "storedProcedure")) ?? string.Empty;
        var templatePath = Convert.ToString(GetDictionaryValue(report, "templatePath"));
        var templateKind = ReportLayoutAssetHelper.ResolveTemplateKind(_environment, _configuration, templatePath);
        var layoutAsset = ReportLayoutAssetHelper.LoadJson(_environment, _configuration, templatePath);
        var htmlTemplate = ReportLayoutAssetHelper.LoadHtml(_environment, _configuration, templatePath);

        if (string.IsNullOrWhiteSpace(storedProcedure))
        {
            // Allow newly designed HTML reports to be reviewed before their
            // data source is configured. The normal empty-state table is
            // rendered inside the template and no database command is run.
            if (string.Equals(templateKind, "html", StringComparison.OrdinalIgnoreCase)
                && !string.IsNullOrWhiteSpace(htmlTemplate))
            {
                return new
                {
                    report,
                    templateKind,
                    layoutAsset,
                    htmlTemplate,
                    columns = Array.Empty<object>(),
                    rows = Array.Empty<object>(),
                    header = new Dictionary<string, object?>(),
                    rowCount = 0,
                    resultSets = Array.Empty<object>(),
                    executedAt = DateTime.UtcNow,
                    isDesignPreview = true
                };
            }

            throw new InvalidOperationException("Stored procedure is not configured for this report.");
        }

        var filters = request.Filters ?? new Dictionary<string, object?>();
        var normalizedFilters = new Dictionary<string, object?>(filters, StringComparer.OrdinalIgnoreCase);

        IDbConnection? conn = null;
        SqlCommand? cmd = null;

        try
        {
            conn = DataFactory.CreateConnection();
            conn.Open();

            cmd = (SqlCommand)DataFactory.CreateCommand(storedProcedure, conn);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.CommandTimeout = 180;

            SqlCommandBuilder.DeriveParameters(cmd);

            foreach (SqlParameter parameter in cmd.Parameters)
            {
                if (parameter.Direction == ParameterDirection.ReturnValue)
                {
                    continue;
                }

                var key = parameter.ParameterName.TrimStart('@');
                if (!normalizedFilters.TryGetValue(key, out var value) || value == null || string.IsNullOrWhiteSpace(Convert.ToString(value)))
                {
                    parameter.Value = DBNull.Value;
                    continue;
                }

                parameter.Value = ConvertForSqlType(value, parameter.SqlDbType, key);
            }

            using var reader = cmd.ExecuteReader();
            var resultSets = new List<object>();
            var primaryRows = new List<Dictionary<string, object?>>();
            var primaryColumns = new List<object>();
            var index = 0;

            do
            {
                index++;
                var rows = new List<Dictionary<string, object?>>();
                var columns = new List<object>();

                for (var i = 0; i < reader.FieldCount; i++)
                {
                    columns.Add(new
                    {
                        field = reader.GetName(i),
                        header = ToHeaderText(reader.GetName(i)),
                        type = ResolveColumnType(reader.GetFieldType(i))
                    });
                }

                while (reader.Read())
                {
                    var row = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
                    for (var i = 0; i < reader.FieldCount; i++)
                    {
                        row[reader.GetName(i)] = reader.IsDBNull(i) ? null : reader.GetValue(i);
                    }
                    rows.Add(row);
                }

                resultSets.Add(new
                {
                    name = index == 1 ? "header" : $"result{index}",
                    index,
                    columns,
                    rows,
                    rowCount = rows.Count
                });

                if (rows.Count > primaryRows.Count)
                {
                    primaryRows = rows;
                    primaryColumns = columns;
                }
            } while (reader.NextResult());

            return new
            {
                report,
                templateKind,
                layoutAsset,
                htmlTemplate,
                columns = primaryColumns,
                rows = primaryRows,
                header = primaryRows.FirstOrDefault() ?? new Dictionary<string, object?>(),
                rowCount = primaryRows.Count,
                resultSets,
                executedAt = DateTime.UtcNow
            };
        }
        catch (SqlException)
        {
            throw new InvalidOperationException("Unable to execute report. Please verify report filters and setup.");
        }
        finally
        {
            cmd?.Dispose();
            if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
        }
    }

    public object? GetReportDefinitionById(int reportId)
    {
        if (reportId <= 0)
        {
            return null;
        }

        IDbConnection? conn = null;
        IDbCommand? cmd = null;
        IDataReader? reader = null;

        try
        {
            conn = DataFactory.CreateConnection();
            conn.Open();

            cmd = DataFactory.CreateCommand("SP_Report_GetDefinitionByReportId", conn);
            ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
            cmd.Parameters.Add(DataFactory.CreateParameter("@ReportId", reportId));

            reader = DataFactory.ExecuteReader(cmd);
            if (!reader.Read())
            {
                return null;
            }

            var templatePath = reader["TemplatePath"] != DBNull.Value ? Convert.ToString(reader["TemplatePath"]) : string.Empty;

            var report = new
            {
                id = reader["Id"] != DBNull.Value ? Convert.ToInt32(reader["Id"]) : 0,
                categoryId = reader["CategoryId"] != DBNull.Value ? Convert.ToInt32(reader["CategoryId"]) : 0,
                categoryName = reader["CategoryName"] != DBNull.Value ? Convert.ToString(reader["CategoryName"]) : string.Empty,
                reportCode = reader["ReportCode"] != DBNull.Value ? Convert.ToString(reader["ReportCode"]) : string.Empty,
                reportName = reader["ReportName"] != DBNull.Value ? Convert.ToString(reader["ReportName"]) : string.Empty,
                displayName = reader["DisplayName"] != DBNull.Value ? Convert.ToString(reader["DisplayName"]) : string.Empty,
                description = reader["Description"] != DBNull.Value ? Convert.ToString(reader["Description"]) : string.Empty,
                storedProcedure = reader["StoredProcedure"] != DBNull.Value ? Convert.ToString(reader["StoredProcedure"]) : string.Empty,
                templateName = reader["TemplateName"] != DBNull.Value ? Convert.ToString(reader["TemplateName"]) : string.Empty,
                templatePath,
                reportType = reader["ReportType"] != DBNull.Value ? Convert.ToString(reader["ReportType"]) : string.Empty,
                viewerType = reader["ViewerType"] != DBNull.Value ? Convert.ToString(reader["ViewerType"]) : string.Empty,
                paperWidth = reader["PaperWidth"] != DBNull.Value ? Convert.ToDecimal(reader["PaperWidth"]) : 0,
                paperHeight = reader["PaperHeight"] != DBNull.Value ? Convert.ToDecimal(reader["PaperHeight"]) : 0,
                orientation = reader["Orientation"] != DBNull.Value ? Convert.ToString(reader["Orientation"]) : string.Empty,
                isThermal = reader["IsThermal"] != DBNull.Value && Convert.ToBoolean(reader["IsThermal"]),
                isLandscape = reader["IsLandscape"] != DBNull.Value && Convert.ToBoolean(reader["IsLandscape"]),
                icon = reader["Icon"] != DBNull.Value ? Convert.ToString(reader["Icon"]) : string.Empty,
                canView = reader["CanView"] != DBNull.Value && Convert.ToBoolean(reader["CanView"]),
                canPrint = reader["CanPrint"] != DBNull.Value && Convert.ToBoolean(reader["CanPrint"]),
                exportPdf = reader["ExportPdf"] != DBNull.Value && Convert.ToBoolean(reader["ExportPdf"]),
                exportExcel = reader["ExportExcel"] != DBNull.Value && Convert.ToBoolean(reader["ExportExcel"]),
                templateExists = ReportLayoutAssetHelper.Exists(_environment, _configuration, templatePath),
                templateKind = ReportLayoutAssetHelper.ResolveTemplateKind(_environment, _configuration, templatePath)
            };

            reader.Close();

            var filterCmd = DataFactory.CreateCommand("SP_Report_GetFilters", conn);
            ((SqlCommand)filterCmd).CommandType = CommandType.StoredProcedure;
            filterCmd.Parameters.Add(DataFactory.CreateParameter("@ReportId", reportId));

            using var filterReader = DataFactory.ExecuteReader(filterCmd);
            var filters = new List<object>();
            while (filterReader.Read())
            {
                filters.Add(new
                {
                    id = filterReader["Id"] != DBNull.Value ? Convert.ToInt32(filterReader["Id"]) : 0,
                    reportId = filterReader["ReportId"] != DBNull.Value ? Convert.ToInt32(filterReader["ReportId"]) : 0,
                    fieldName = filterReader["FieldName"] != DBNull.Value ? Convert.ToString(filterReader["FieldName"]) : string.Empty,
                    displayName = filterReader["DisplayName"] != DBNull.Value ? Convert.ToString(filterReader["DisplayName"]) : string.Empty,
                    controlType = filterReader["ControlType"] != DBNull.Value ? Convert.ToString(filterReader["ControlType"]) : string.Empty,
                    dataType = filterReader["DataType"] != DBNull.Value ? Convert.ToString(filterReader["DataType"]) : string.Empty,
                    isRequired = filterReader["IsRequired"] != DBNull.Value && Convert.ToBoolean(filterReader["IsRequired"]),
                    displayOrder = filterReader["DisplayOrder"] != DBNull.Value ? Convert.ToInt32(filterReader["DisplayOrder"]) : 0,
                    isActive = filterReader["IsActive"] == DBNull.Value || Convert.ToBoolean(filterReader["IsActive"]),
                    isShow = filterReader["IsShow"] != DBNull.Value && Convert.ToBoolean(filterReader["IsShow"])
                });
            }

            return new
            {
                report,
                filters
            };
        }
        catch (SqlException)
        {
            throw new InvalidOperationException("Unable to load report definition.");
        }
        finally
        {
            reader?.Close();
            if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
        }
    }

    private static IDictionary<string, object?> ToDictionary(object source)
    {
        if (source is IDictionary<string, object?> dictionary)
        {
            return dictionary;
        }

        return source.GetType().GetProperties()
            .ToDictionary(property => property.Name, property => property.GetValue(source), StringComparer.OrdinalIgnoreCase);
    }

    private static object? GetDictionaryValue(IDictionary<string, object?> source, string key)
    {
        if (source.TryGetValue(key, out var value))
        {
            return value;
        }

        return null;
    }

    private static object ConvertForSqlType(object value, SqlDbType sqlDbType, string parameterName)
    {
        value = NormalizeJsonValue(value);

        switch (sqlDbType)
        {
            case SqlDbType.Int:
                return Convert.ToInt32(value, CultureInfo.InvariantCulture);
            case SqlDbType.BigInt:
                return Convert.ToInt64(value, CultureInfo.InvariantCulture);
            case SqlDbType.Decimal:
            case SqlDbType.Money:
            case SqlDbType.SmallMoney:
                return Convert.ToDecimal(value, CultureInfo.InvariantCulture);
            case SqlDbType.Bit:
                if (value is bool boolValue) return boolValue;
                return Convert.ToString(value)?.Trim() == "1" || Convert.ToString(value)?.Trim().Equals("true", StringComparison.OrdinalIgnoreCase) == true;
            case SqlDbType.Date:
            case SqlDbType.DateTime:
            case SqlDbType.DateTime2:
                return ParseReportDate(value, parameterName);
            default:
                return Convert.ToString(value) ?? string.Empty;
        }
    }

    private static DateTime ParseReportDate(object? value, string parameterName)
    {
        if (value == null)
        {
            throw new ArgumentException($"Date is required for {parameterName}.");
        }

        if (value is DateTime dateTime)
        {
            return dateTime;
        }

        var text = Convert.ToString(value, CultureInfo.InvariantCulture)?.Trim() ?? string.Empty;
        var supportedFormats = new[]
        {
            "yyyy-MM-dd",
            "dd-MM-yyyy",
            "dd/MM/yyyy",
            "dd MMM yyyy",
            "dd-MMM-yyyy",
            "yyyy-MM-ddTHH:mm:ss",
            "yyyy-MM-ddTHH:mm:ss.FFFFFFF"
        };

        if (DateTime.TryParseExact(
                text,
                supportedFormats,
                CultureInfo.InvariantCulture,
                DateTimeStyles.AllowWhiteSpaces,
                out var parsed))
        {
            return parsed;
        }

        throw new ArgumentException($"Invalid date supplied for {parameterName}.");
    }

    private static object? NormalizeJsonValue(object? value)
    {
        if (value is not JsonElement jsonElement)
        {
            return value;
        }

        return jsonElement.ValueKind switch
        {
            JsonValueKind.Undefined or JsonValueKind.Null => null,
            JsonValueKind.String => jsonElement.GetString(),
            JsonValueKind.Number => jsonElement.TryGetInt64(out var longValue)
                ? longValue
                : jsonElement.TryGetDecimal(out var decimalValue)
                    ? decimalValue
                    : jsonElement.GetDouble(),
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            _ => jsonElement.ToString()
        };
    }

    private static string ResolveColumnType(Type fieldType)
    {
        if (fieldType == typeof(DateTime) || fieldType == typeof(DateTimeOffset)) return "date";
        if (fieldType == typeof(decimal) || fieldType == typeof(double) || fieldType == typeof(float)) return "number";
        if (fieldType == typeof(int) || fieldType == typeof(long) || fieldType == typeof(short)) return "number";
        if (fieldType == typeof(bool)) return "boolean";
        return "text";
    }

    private static string ToHeaderText(string fieldName)
    {
        if (string.IsNullOrWhiteSpace(fieldName)) return string.Empty;

        var chars = new List<char>(fieldName.Length + 8);
        for (var i = 0; i < fieldName.Length; i++)
        {
            var current = fieldName[i];
            if (i > 0 && char.IsUpper(current) && !char.IsWhiteSpace(fieldName[i - 1]))
            {
                chars.Add(' ');
            }
            chars.Add(current == '_' ? ' ' : current);
        }

        return new string(chars.ToArray()).Trim();
    }

    // ===== COLUMN MANAGEMENT =====

    public IEnumerable<object> GetReportColumns(int reportId)
    {
        if (reportId <= 0)
        {
            return new List<object>();
        }

        IDbConnection? conn = null;
        IDbCommand? cmd = null;
        IDataReader? reader = null;

        try
        {
            conn = DataFactory.CreateConnection();
            conn.Open();

            cmd = DataFactory.CreateCommand("SP_Report_GetColumns", conn);
            ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
            cmd.Parameters.Add(DataFactory.CreateParameter("@ReportId", reportId));

            reader = DataFactory.ExecuteReader(cmd);
            var list = new List<object>();

            while (reader.Read())
            {
                list.Add(new
                {
                    id = reader["Id"] != DBNull.Value ? Convert.ToInt32(reader["Id"]) : 0,
                    reportId = reader["ReportId"] != DBNull.Value ? Convert.ToInt32(reader["ReportId"]) : 0,
                    columnName = reader["ColumnName"] != DBNull.Value ? Convert.ToString(reader["ColumnName"]) : string.Empty,
                    displayLabel = reader["DisplayLabel"] != DBNull.Value ? Convert.ToString(reader["DisplayLabel"]) : string.Empty,
                    displayOrder = reader["DisplayOrder"] != DBNull.Value ? Convert.ToInt32(reader["DisplayOrder"]) : 0,
                    isVisible = reader["IsVisible"] != DBNull.Value && Convert.ToBoolean(reader["IsVisible"]),
                    isActive = reader["IsActive"] != DBNull.Value && Convert.ToBoolean(reader["IsActive"]),
                    isDeleted = reader["IsDeleted"] != DBNull.Value && Convert.ToBoolean(reader["IsDeleted"]),
                    updatedDate = reader["UpdatedDate"] != DBNull.Value ? Convert.ToDateTime(reader["UpdatedDate"]) : DateTime.MinValue
                });
            }

            return list;
        }
        catch (SqlException)
        {
            throw new InvalidOperationException("Unable to load report columns.");
        }
        finally
        {
            reader?.Close();
            if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
        }
    }

    public IEnumerable<object> GetVisibleColumns(int reportId)
    {
        if (reportId <= 0)
        {
            return new List<object>();
        }

        IDbConnection? conn = null;
        IDbCommand? cmd = null;
        IDataReader? reader = null;

        try
        {
            conn = DataFactory.CreateConnection();
            conn.Open();

            cmd = DataFactory.CreateCommand("SP_Report_GetVisibleColumns", conn);
            ((SqlCommand)cmd).CommandType = CommandType.StoredProcedure;
            cmd.Parameters.Add(DataFactory.CreateParameter("@ReportId", reportId));

            reader = DataFactory.ExecuteReader(cmd);
            var list = new List<object>();

            while (reader.Read())
            {
                list.Add(new
                {
                    columnName = reader["ColumnName"] != DBNull.Value ? Convert.ToString(reader["ColumnName"]) : string.Empty,
                    displayLabel = reader["DisplayLabel"] != DBNull.Value ? Convert.ToString(reader["DisplayLabel"]) : string.Empty,
                    displayOrder = reader["DisplayOrder"] != DBNull.Value ? Convert.ToInt32(reader["DisplayOrder"]) : 0
                });
            }

            return list;
        }
        catch (SqlException)
        {
            throw new InvalidOperationException("Unable to load visible columns.");
        }
        finally
        {
            reader?.Close();
            if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
        }
    }

    public string SaveColumnPreferences(int reportId, string columnVisibilityJson)
    {
        if (reportId <= 0 || string.IsNullOrWhiteSpace(columnVisibilityJson))
        {
            throw new ArgumentException("Invalid report or column data.");
        }

        IDbConnection? conn = null;
        SqlCommand? cmd = null;

        try
        {
            conn = DataFactory.CreateConnection();
            conn.Open();

            cmd = (SqlCommand)DataFactory.CreateCommand("SP_Report_SaveColumnPreferences", conn);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@ReportId", reportId);
            cmd.Parameters.AddWithValue("@ColumnVisibility", columnVisibilityJson);

            using var reader = cmd.ExecuteReader();
            if (reader.Read())
            {
                var success = reader["Success"] != DBNull.Value ? Convert.ToInt32(reader["Success"]) : 0;
                var message = reader["Message"] != DBNull.Value ? Convert.ToString(reader["Message"]) : "Unknown error";

                if (success == 0)
                {
                    throw new InvalidOperationException(message);
                }

                return message ?? "Preferences saved successfully";
            }

            return "Success";
        }
        catch (SqlException ex)
        {
            throw new InvalidOperationException("Unable to save column preferences: " + ex.Message);
        }
        finally
        {
            if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
        }
    }

    public string ResetColumnView(int reportId)
    {
        if (reportId <= 0)
        {
            throw new ArgumentException("Invalid report ID.");
        }

        IDbConnection? conn = null;
        SqlCommand? cmd = null;

        try
        {
            conn = DataFactory.CreateConnection();
            conn.Open();

            cmd = (SqlCommand)DataFactory.CreateCommand("SP_Report_ResetColumnView", conn);
            cmd.CommandType = CommandType.StoredProcedure;
            cmd.Parameters.AddWithValue("@ReportId", reportId);

            using var reader = cmd.ExecuteReader();
            if (reader.Read())
            {
                var success = reader["Success"] != DBNull.Value ? Convert.ToInt32(reader["Success"]) : 0;
                var message = reader["Message"] != DBNull.Value ? Convert.ToString(reader["Message"]) : "Unknown error";

                if (success == 0)
                {
                    throw new InvalidOperationException(message);
                }

                return message ?? "Column view reset successfully";
            }

            return "Success";
        }
        catch (SqlException ex)
        {
            throw new InvalidOperationException("Unable to reset column view: " + ex.Message);
        }
        finally
        {
            if (conn != null && conn.State != ConnectionState.Closed) conn.Close();
        }
    }
}
