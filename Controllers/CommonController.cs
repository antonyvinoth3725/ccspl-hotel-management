using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using GayatriCateringPortal.Models.Reports;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Collections;
using System.Globalization;
using System.IO.Compression;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace GayatriCateringPortal.Controllers
{
    [Route("Common")]
    public class CommonController : Controller
    {
        private readonly ICommonRepository _common;
        private readonly IWebHostEnvironment _environment;
        private readonly IReportsRepository _reports;
        private readonly ILogger<CommonController> _logger;

        public CommonController(ICommonRepository common, IWebHostEnvironment environment, IReportsRepository reports, ILogger<CommonController> logger)
        {
            _common = common;
            _environment = environment;
            _reports = reports;
            _logger = logger;
        }

        [HttpGet("menus")]
        public IActionResult Menus(int roleId)
        {
            if (roleId <= 0)
            {
                return BadRequest(new { success = false, message = "RoleId is required." });
            }

            var items = _common.GetMenuGroups(roleId);
            return Ok(items);
        }

        [HttpGet("GetCountry")]
        public IActionResult GetCountry()
        {
            var items = _common.GetCountry();
            return Ok(items);
        }

        [HttpGet("GetStateByCountryId")]
        public IActionResult GetStateByCountryId(int countryId)
        {
            if (countryId <= 0) return Ok(new List<Models.State>());
            var items = _common.GetStateByCountryId(countryId);
            return Ok(items);
        }

        [HttpGet("GetCityByStateId")]
        public IActionResult GetCityByStateId(int stateId)
        {
            if (stateId <= 0) return Ok(new List<Models.City>());
            var items = _common.GetCityByStateId(stateId);
            return Ok(items);
        }

        [HttpGet("GetEntityMaster")]
        public IActionResult GetEntityMaster()
        {
            var items = _common.GetEntityMaster();
            return Ok(items);
        }

        [HttpPost("CreateRolePermission")]
        public IActionResult CreateRolePermission([FromBody] List<CreateRolePermissionRequest> requests)
        {
            if (requests == null || requests.Count == 0)
            {
                return BadRequest(new { success = false, message = "Invalid request." });
            }

            for (int i = 0; i < requests.Count; i++)
            {
                var request = requests[i];
                if (request == null || request.RoleId <= 0 || request.EntityNo <= 0)
                {
                    return BadRequest(new { success = false, message = "Invalid request." });
                }
            }

            var savedCount = _common.CreateRolePermission(requests);
            return Ok(new { success = savedCount > 0, count = savedCount });
        }

        [HttpGet("GetRolePermissionsByRoleId")]
        public IActionResult GetRolePermissionsByRoleId(int roleId)
        {
            if (roleId <= 0) return Ok(new List<RolePermissionItem>());

            var items = _common.GetRolePermissionsByRoleId(roleId);
            return Ok(items);
        }

        [HttpGet("GetMenuRights")]
        public IActionResult GetMenuRights(int roleId, int entityNo)
        {
            if (roleId <= 0 || entityNo <= 0)
            {
                return Ok(new RolePermissionItem
                {
                    RoleId = roleId,
                    EntityNo = entityNo,
                    View = false,
                    Create = false,
                    Edit = false,
                    Delete = false,
                    ActiveInActive = false,
                    Download = false,
                    Print = false
                });
            }

            var rights = _common.GetMenuRights(roleId, entityNo);
            return Ok(rights);
        }

        [HttpPost("FileUpload")]
        public async Task<IActionResult> FileUpload(string folderName)
        {
            var dict = new Dictionary<string, object>();

            try
            {
                var httpRequest = HttpContext.Request;

                foreach (var file in httpRequest.Form.Files)
                {
                    var result = await _common.FileUpload(file, folderName);
                    return Created(string.Empty, result);
                }

                dict.Add("error", "Please upload an image or voice recording.");
                return NotFound(dict);
            }
            catch (Exception ex)
            {
                dict.Add("error", "Some error occurred.");
                Exception objErr = ex.GetBaseException();
                _logger.LogError(ex, "Error in Common/FileUpload. BaseError={Error}", objErr.Message);
                return NotFound(dict);
            }
        }

        [HttpPost("SendEmail")]
        [RequestFormLimits(MultipartBodyLengthLimit = 262_144_000)]
        [RequestSizeLimit(262_144_000)]
        public async Task<IActionResult> SendEmail([FromForm] SendEmailRequest? request)
        {
            try
            {
                if (request == null)
                {
                    _logger.LogWarning("SendEmail model binding failed. ContentType={ContentType}, FormKeys={FormKeys}",
                        Request.ContentType,
                        Request.HasFormContentType ? string.Join(",", Request.Form.Keys) : "<no-form>");
                    return BadRequest(new
                    {
                        Message = "Invalid email request payload."
                    });
                }

                byte[]? fileBytes = null;
                string? fileName = null;
                string? contentType = null;

                if (request.Attachment != null && request.Attachment.Length > 0)
                {
                    using var memoryStream = new MemoryStream();
                    await request.Attachment.CopyToAsync(memoryStream);
                    fileBytes = memoryStream.ToArray();
                    fileName = request.Attachment.FileName;
                    contentType = request.Attachment.ContentType;
                }

                await _common.SendEmail(
                    request.ToEmail ?? string.Empty,
                    request.CcEmail,
                    request.Subject ?? string.Empty,
                    request.Body ?? string.Empty,
                    fileBytes,
                    fileName,
                    contentType);

                return Ok(new
                {
                    Message = "Mail sent successfully."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error while sending email.");
                return BadRequest(new
                {
                    Message = ex.Message
                });
            }
        }

        [HttpPost("SendReportEmail")]
        [RequestFormLimits(MultipartBodyLengthLimit = 262_144_000)]
        [RequestSizeLimit(262_144_000)]
        public async Task<IActionResult> SendReportEmail([FromForm] SendReportEmailRequest request)
        {
            try
            {
                if (request.ReportId.GetValueOrDefault() <= 0)
                {
                    return BadRequest(new { Message = "ReportId is required." });
                }

                var filters = ParseReportFilters(request.OrderId.GetValueOrDefault(), request.ReportFiltersJson);
                var reportResult = _reports.ExecuteReport(new ReportExecutionRequest
                {
                    RoleId = 0,
                    ReportId = request.ReportId.GetValueOrDefault(),
                    Filters = filters
                });

                var normalizedReportResult = NormalizeInvoiceReportResult(reportResult, request.OrderId.GetValueOrDefault());
                var normalizedRows = GetList(GetValue(ToDictionary(normalizedReportResult), "rows"));

                _logger.LogInformation(
                    "SendReportEmail: ReportId={ReportId}, OrderId={OrderId}, Filters={FiltersJson}, Rows={RowCount}, ToEmail={ToEmail}",
                    request.ReportId,
                    request.OrderId,
                    JsonSerializer.Serialize(filters),
                    normalizedRows.Count,
                    request.ToEmail);

                var emailBody = !string.IsNullOrWhiteSpace(request.EmailBody)
                    ? request.EmailBody
                    : BuildReportEmailBody(normalizedReportResult, GetAbsoluteLogoUrl());
                var emailSubject = ResolveReportEmailSubject(normalizedReportResult, request.Subject);
                var pdfBytes = BuildReportPdf(normalizedReportResult);
                var pdfFileName = BuildReportPdfFileName(normalizedReportResult, request.OrderId.GetValueOrDefault());

                await _common.SendEmail(
                    request.ToEmail ?? string.Empty,
                    request.CcEmail,
                    emailSubject,
                    emailBody,
                    pdfBytes,
                    pdfFileName,
                    "application/pdf");

                return Ok(new
                {
                    Message = "Mail sent successfully."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error while sending report email.");
                return BadRequest(new
                {
                    Message = ex.Message
                });
            }
        }

        [HttpGet("ReportPdf")]
        public IActionResult ReportPdf([FromQuery] int reportId, [FromQuery] int orderId, [FromQuery] string? reportFiltersJson)
        {
            try
            {
                if (reportId <= 0)
                {
                    return BadRequest(new { Message = "ReportId is required." });
                }

                var filters = ParseReportFilters(orderId, reportFiltersJson);
                var reportResult = _reports.ExecuteReport(new ReportExecutionRequest
                {
                    RoleId = 0,
                    ReportId = reportId,
                    Filters = filters
                });

                var normalizedReportResult = NormalizeInvoiceReportResult(reportResult, orderId);
                var pdfBytes = BuildReportPdf(normalizedReportResult);
                var pdfFileName = BuildReportPdfFileName(normalizedReportResult, orderId);

                Response.Headers.ContentDisposition = "inline; filename=\"" + pdfFileName.Replace("\"", string.Empty) + "\"";
                return File(pdfBytes, "application/pdf");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error while generating report PDF. ReportId={ReportId}, OrderId={OrderId}", reportId, orderId);
                return BadRequest(new { Message = ex.Message });
            }
        }

        private static Dictionary<string, object?> ParseReportFilters(int orderId, string? reportFiltersJson)
        {
            var filters = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);

            if (!string.IsNullOrWhiteSpace(reportFiltersJson))
            {
                try
                {
                    using var document = JsonDocument.Parse(reportFiltersJson);
                    if (document.RootElement.ValueKind == JsonValueKind.Object)
                    {
                        foreach (var property in document.RootElement.EnumerateObject())
                        {
                            filters[property.Name] = ConvertJsonValue(property.Value);
                        }
                    }
                }
                catch
                {
                    // Ignore malformed JSON and fall back to the explicit order id filter.
                }
            }

            if (orderId > 0 && !filters.ContainsKey("BillId"))
            {
                filters["BillId"] = orderId;
            }

            // Invoice report SP uses @InvoiceId.
            if (orderId > 0 && !filters.ContainsKey("InvoiceId"))
            {
                filters["InvoiceId"] = orderId;
            }

            // Some report procedures use OrderId instead of BillId.
            if (orderId > 0 && !filters.ContainsKey("OrderId"))
            {
                filters["OrderId"] = orderId;
            }

            return filters;
        }

        private static object? ConvertJsonValue(JsonElement element)
        {
            return element.ValueKind switch
            {
                JsonValueKind.String => element.GetString(),
                JsonValueKind.Number when element.TryGetInt64(out var longValue) => longValue,
                JsonValueKind.Number => element.GetDecimal(),
                JsonValueKind.True => true,
                JsonValueKind.False => false,
                JsonValueKind.Null => null,
                JsonValueKind.Undefined => null,
                _ => element.GetRawText()
            };
        }

        private static object NormalizeInvoiceReportResult(object reportResult, int orderId)
        {
            if (orderId <= 0)
            {
                return reportResult;
            }

            var root = ToDictionary(reportResult);
            var report = ToDictionary(GetValue(root, "report") ?? new Dictionary<string, object?>());
            // Restrict normalization to invoice-style reports only.
            if (!IsInvoiceReport(report))
            {
                return reportResult;
            }

            var rows = GetList(GetValue(root, "rows"));
            if (!rows.Any())
            {
                return reportResult;
            }

            var filteredRows = rows.Where(row => IsMatchingInvoiceRow(row, orderId)).ToList();
            if (!filteredRows.Any())
            {
                // Keep original payload if no rows match to avoid sending an empty invoice unexpectedly.
                return reportResult;
            }

            root["rows"] = filteredRows;
            root["rowCount"] = filteredRows.Count;

            var resultSets = GetList(GetValue(root, "resultSets"));
            if (resultSets.Any())
            {
                var normalizedResultSets = new List<object>();
                foreach (var resultSet in resultSets)
                {
                    var rs = ToDictionary(resultSet);
                    var rsRows = GetList(GetValue(rs, "rows"));
                    if (rsRows.Any())
                    {
                        var rsFilteredRows = rsRows.Where(row => IsMatchingInvoiceRow(row, orderId)).ToList();
                        if (rsFilteredRows.Any())
                        {
                            rs["rows"] = rsFilteredRows;
                            rs["rowCount"] = rsFilteredRows.Count;
                        }
                    }

                    normalizedResultSets.Add(rs);
                }

                root["resultSets"] = normalizedResultSets;
            }

            return root;
        }

        private static bool IsMatchingInvoiceRow(Dictionary<string, object?> row, int orderId)
        {
            if (TryReadInt(row, "InvoiceId", out var invoiceId) && invoiceId == orderId)
            {
                return true;
            }

            if (TryReadInt(row, "BillId", out var billId) && billId == orderId)
            {
                return true;
            }

            if (TryReadInt(row, "OrderId", out var rowOrderId) && rowOrderId == orderId)
            {
                return true;
            }

            return false;
        }

        private static bool TryReadInt(Dictionary<string, object?> row, string key, out int value)
        {
            value = 0;

            var raw = GetValue(row, key);
            if (raw == null || raw == DBNull.Value)
            {
                return false;
            }

            if (raw is int intValue)
            {
                value = intValue;
                return true;
            }

            return int.TryParse(Convert.ToString(raw, CultureInfo.InvariantCulture), NumberStyles.Integer, CultureInfo.InvariantCulture, out value);
        }

        private string BuildReportEmailBody(object reportResult, string logoUrl)
        {
            var root = ToDictionary(reportResult);
            var report = ToDictionary(GetValue(root, "report") ?? new Dictionary<string, object?>());
            var reportName = Convert.ToString(GetValue(report, "displayName"))
                ?? Convert.ToString(GetValue(report, "reportName"))
                ?? "Report";
            var rows = GetList(GetValue(root, "rows"));
            var rowCount = GetList(GetValue(root, "rows")).Count;

            if (IsInvoiceReport(report))
            {
                var firstRow = rows.FirstOrDefault() ?? new Dictionary<string, object?>();
                var orderNumber = Convert.ToString(GetValue(firstRow, "OrderNumber")) ?? "Invoice";
                var customerName = Convert.ToString(GetValue(firstRow, "CustomerName")) ?? "Customer";
                var eventDate = FormatAsDate(GetValue(firstRow, "EventDate"));
                var totalAmount = FormatNumericText(GetValue(firstRow, "TotalAmount"), true);
                var isCancelledInvoice = IsCancelledInvoice(rows);

                if (isCancelledInvoice)
                {
                    return "<p>Dear " + HtmlEncode(customerName) + ",</p>"
                        + "<p>Your order <strong>" + HtmlEncode(orderNumber) + "</strong> has been marked as <strong>Cancelled</strong>. Please find attached the cancelled invoice PDF for your reference.</p>"
                        + "<p><strong>Cancelled Order Summary</strong><br>"
                        + "Event Date: " + HtmlEncode(eventDate) + "<br>"
                        + "Invoice Total: S$" + HtmlEncode(totalAmount) + "<br>"
                        + "Status: Cancelled</p>"
                        + "<p>If you need any clarification regarding this cancellation, please contact our team and we will assist you.</p>"
                        + "<div style='margin-top:16px;padding-top:12px;border-top:1px solid #e4e7eb;'>"
                            + "<div style='margin-bottom:8px;'><img src='" + HtmlEncode(logoUrl) + "' alt='Gayatri Catering' width='180' style='display:block;width:180px;max-width:180px;height:auto;'></div>"
                        + "<div style='font-size:13px;line-height:1.5;color:#1f2937;'><strong>Main Restaurant: 122 Race Course Road #01-01, Singapore 218583</strong><br>"
                        + "Tel: 6291 1011 | Office Tel: 6292 4544 | Fax: 62974850<br>"
                        + "Email: info@gayatrirestaurant.com | Catering Hotline / WhatsApp: +65 6294 6294<br>"
                        + "Website: www.gayatrirestaurant.com | Co. Regn. No. 52817812A</div>"
                        + "</div>";
                }

                return "<p>Dear " + HtmlEncode(customerName) + ",</p>"
                    + "<p>Thank you for choosing <strong>Gayatri Catering</strong>. Please find attached the invoice PDF for your order <strong>" + HtmlEncode(orderNumber) + "</strong>.</p>"
                    + "<p><strong>Invoice Summary</strong><br>"
                    + "Event Date: " + HtmlEncode(eventDate) + "<br>"
                    + "Invoice Total: S$" + HtmlEncode(totalAmount) + "</p>"
                    + "<p>Kindly review the attached invoice and keep it for your reference. If you need any clarification regarding the order details, invoice amount, or payment status, please contact our team and we will assist you.</p>"
                    + "<div style='margin-top:16px;padding-top:12px;border-top:1px solid #e4e7eb;'>"
                        + "<div style='margin-bottom:8px;'><img src='" + HtmlEncode(logoUrl) + "' alt='Gayatri Catering' width='180' style='display:block;width:180px;max-width:180px;height:auto;'></div>"
                    + "<div style='font-size:13px;line-height:1.5;color:#1f2937;'><strong>Main Restaurant: 122 Race Course Road #01-01, Singapore 218583</strong><br>"
                    + "Tel: 6291 1011 | Office Tel: 6292 4544 | Fax: 62974850<br>"
                    + "Email: info@gayatrirestaurant.com | Catering Hotline / WhatsApp: +65 6294 6294<br>"
                    + "Website: www.gayatrirestaurant.com | Co. Regn. No. 52817812A</div>"
                    + "</div>";
            }

            return "<p>Please find attached the <strong>" + HtmlEncode(reportName) + "</strong> PDF.</p>"
                + "<p>Records included: " + rowCount.ToString(CultureInfo.InvariantCulture) + "</p>"
                + "<p>Regards,<br>Gayatri Catering</p>";
        }

        private string ResolveReportEmailSubject(object reportResult, string? requestedSubject)
        {
            var root = ToDictionary(reportResult);
            var report = ToDictionary(GetValue(root, "report") ?? new Dictionary<string, object?>());
            var rows = GetList(GetValue(root, "rows"));

            if (IsInvoiceReport(report))
            {
                var firstRow = rows.FirstOrDefault() ?? new Dictionary<string, object?>();
                var orderNumber = Convert.ToString(GetValue(firstRow, "OrderNumber"));
                if (!string.IsNullOrWhiteSpace(orderNumber))
                {
                    return (IsCancelledInvoice(rows) ? "Cancelled Invoice - " : "Invoice - ") + orderNumber;
                }
            }

            return string.IsNullOrWhiteSpace(requestedSubject)
                ? "Report"
                : requestedSubject;
        }

        private string GetAbsoluteLogoUrl()
        {
            var request = HttpContext?.Request;
            if (request == null || !request.Host.HasValue)
            {
                return "/images/logo.jpg";
            }

            return $"{request.Scheme}://{request.Host}{request.PathBase}/images/logo.jpg";
        }

        private byte[] BuildReportPdf(object reportResult)
        {
            var root = ToDictionary(reportResult);
            var report = ToDictionary(GetValue(root, "report") ?? new Dictionary<string, object?>());
            var reportName = Convert.ToString(GetValue(report, "displayName"))
                ?? Convert.ToString(GetValue(report, "reportName"))
                ?? "Report";
            var rows = GetList(GetValue(root, "rows"));
            var columns = GetList(GetValue(root, "columns"));
            var logoImage = LoadInvoiceLogoData();

            if (IsInvoiceReport(report))
            {
                return BuildInvoicePdf(rows, logoImage);
            }

            return BuildGenericReportPdf(reportName, rows, columns, logoImage);
        }

        private byte[] BuildGenericReportPdf(string reportName, List<Dictionary<string, object?>> rows, List<Dictionary<string, object?>> columns, PdfImageData? logoImage)
        {
            var pageWidth = 595f;
            var pageHeight = 842f;
            var left = 32f;
            var right = 563f;
            var pageTop = 810f;
            var pageBottom = 36f;
            var footerReserve = 112f;
            var pages = new List<string>();
            var stream = new StringBuilder();
            var y = pageTop;
            var colLeft = left;
            var colRight = right;

            void StartNewPage(bool includeHeader)
            {
                stream = new StringBuilder();
                y = pageTop;

                if (logoImage != null)
                {
                    AppendPdfImage(stream, logoImage, left, y - 44f, 112f, 44f);
                    AppendPdfText(stream, right, y, reportName, true, 18, PdfTextAlign.Right);
                }
                else
                {
                    AppendPdfText(stream, left, y, reportName, true, 18);
                    AppendPdfText(stream, right, y, "Gayatri Catering", false, 10, PdfTextAlign.Right);
                }

                AppendPdfText(stream, right, y - 18f, "Generated: " + DateTime.Now.ToString("dd MMM yyyy HH:mm", CultureInfo.InvariantCulture), false, 10, PdfTextAlign.Right);
                AppendPdfText(stream, right, y - 32f, "Row Count: " + rows.Count.ToString(CultureInfo.InvariantCulture), false, 10, PdfTextAlign.Right);
                y -= 62f;

                if (includeHeader)
                {
                    DrawGenericTableHeader(stream, colLeft, colRight, ref y, columns);
                }
                else
                {
                    AppendPdfText(stream, left, y, "Continued Report Rows", true, 11);
                    y -= 18f;
                    DrawGenericTableHeader(stream, colLeft, colRight, ref y, columns);
                }
            }

            void FinishPage()
            {
                pages.Add(stream.ToString());
            }

            StartNewPage(true);

            if (!columns.Any())
            {
                AppendPdfText(stream, left, y, "No data found.", true, 12);
                FinishPage();
                return BuildPdfDocument(pages, pageWidth, pageHeight, logoImage);
            }

            for (var rowIndex = 0; rowIndex < rows.Count; rowIndex++)
            {
                var row = rows[rowIndex];
                var estimatedHeight = EstimateGenericRowHeight(columns, row);

                if (y - estimatedHeight < pageBottom + footerReserve)
                {
                    FinishPage();
                    StartNewPage(false);
                }

                DrawGenericRow(stream, rowIndex + 1, row, columns, colLeft, colRight, ref y);
            }

            DrawGenericFooter(stream, left, right, pageBottom + 24f);
            FinishPage();

            return BuildPdfDocument(pages, pageWidth, pageHeight, logoImage);
        }

        private static void DrawGenericTableHeader(StringBuilder stream, float left, float right, ref float y, List<Dictionary<string, object?>> columns)
        {
            var rowTop = y;
            var rowBottom = y - 24f;
            DrawRect(stream, left, rowBottom, right - left, rowTop - rowBottom);

            var columnWidth = columns.Count > 0 ? (right - left) / columns.Count : right - left;
            var currentX = left;

            foreach (var column in columns)
            {
                DrawVerticalLine(stream, currentX, rowBottom, rowTop);
                var header = Convert.ToString(GetValue(column, "header"))
                    ?? Convert.ToString(GetValue(column, "field"))
                    ?? "Field";
                AppendPdfText(stream, currentX + (columnWidth / 2f), y - 16f, header, true, 9, PdfTextAlign.Center);
                currentX += columnWidth;
            }

            DrawVerticalLine(stream, right, rowBottom, rowTop);
            y = rowBottom;
        }

        private static void DrawGenericRow(StringBuilder stream, int rowNumber, Dictionary<string, object?> row, List<Dictionary<string, object?>> columns, float left, float right, ref float y)
        {
            var rowTop = y;
            var rowHeight = EstimateGenericRowHeight(columns, row);
            var rowBottom = y - rowHeight;
            DrawRect(stream, left, rowBottom, right - left, rowTop - rowBottom);

            var columnWidth = columns.Count > 0 ? (right - left) / columns.Count : right - left;
            var currentX = left;

            foreach (var column in columns)
            {
                DrawVerticalLine(stream, currentX, rowBottom, rowTop);
                var field = Convert.ToString(GetValue(column, "field")) ?? string.Empty;
                var type = Convert.ToString(GetValue(column, "type"));
                var value = GetDisplayValue(GetValue(row, field), type);
                var lines = WrapPlainText(value, 42).ToList();
                var textY = rowTop - 14f;

                foreach (var line in lines)
                {
                    AppendPdfText(stream, currentX + 4f, textY, line, false, 9);
                    textY -= 10f;
                }

                currentX += columnWidth;
            }

            DrawVerticalLine(stream, right, rowBottom, rowTop);
            y = rowBottom;
        }

        private static float EstimateGenericRowHeight(List<Dictionary<string, object?>> columns, Dictionary<string, object?> row)
        {
            if (!columns.Any())
            {
                return 24f;
            }

            var maxLines = 1;
            foreach (var column in columns)
            {
                var field = Convert.ToString(GetValue(column, "field")) ?? string.Empty;
                var type = Convert.ToString(GetValue(column, "type"));
                var value = GetDisplayValue(GetValue(row, field), type);
                var lineCount = Math.Max(1, WrapPlainText(value, 42).Count());
                maxLines = Math.Max(maxLines, lineCount);
            }

            return 18f + ((maxLines - 1) * 10f);
        }

        private static void DrawGenericFooter(StringBuilder stream, float left, float right, float y)
        {
            AppendPdfText(stream, (left + right) / 2f, y + 12f, "Gayatri Catering", true, 10, PdfTextAlign.Center);
            AppendPdfText(stream, (left + right) / 2f, y - 2f, "Email-generated report PDF", false, 9, PdfTextAlign.Center);
        }

        private byte[] BuildInvoicePdf(List<Dictionary<string, object?>> rows, PdfImageData? logoImage)
        {
            var firstRow = rows.FirstOrDefault() ?? new Dictionary<string, object?>();
            var authoriseSignatureImage = LoadInvoiceAuthoriseSignatureData(firstRow);
            var customerSignatureImage = LoadInvoiceCustomerSignatureData(firstRow);
            var isCancelledInvoice = IsCancelledInvoice(rows);
            var orderStatusValue = Convert.ToString(GetValue(firstRow, "OrderStatus"), CultureInfo.InvariantCulture) ?? string.Empty;
            var isQuotationInvoice = orderStatusValue == "5" || orderStatusValue == "6";
            var pageWidth = 595f;
            var pageHeight = 842f;
            var left = 32f;
            var right = 563f;
            var pageTop = 790f;
            var pageBottom = 30f;
            var footerReserve = 100f;
            var pages = new List<string>();
            var stream = new StringBuilder();
            var y = pageTop;
            var isFirstPage = true;
            var totalTableWidth = right - left;
            var colNo = left + 40f;
            var colDesc = left + 300f;
            var colQty = left + 365f;
            var colUnit = left + 450f;

            void StartNewPage(bool includeMeta)
            {
                stream = new StringBuilder();
                y = pageTop;

                if (isCancelledInvoice)
                {
                    DrawInvoiceWatermark(stream, pageWidth, pageHeight, "CANCELLED");
                }

                if (logoImage != null)
                {
                    AppendPdfImage(stream, logoImage, left, y - 44f, 112f, 44f);
                    AppendPdfText(stream, left, y - 56f, "Catering Hotline: +65 6294 6294", false, 10);
                }
                else
                {
                    AppendPdfText(stream, left, y, "Gayatri Restaurant", true, 16);
                    AppendPdfText(stream, left, y - 18f, "Catering Hotline: +65 6294 6294", false, 10);
                }

                var invoiceHeaderRight = right - 8f;
                AppendPdfText(stream, invoiceHeaderRight, y, isQuotationInvoice ? "QUOTATION" : "TAX INVOICE", true, 22, PdfTextAlign.Right);
                AppendPdfText(stream, invoiceHeaderRight, y - 18f, "GST Reg No. 19-9503681-K", false, 10, PdfTextAlign.Right);
                AppendPdfText(stream, invoiceHeaderRight, y - 34f, (isQuotationInvoice ? "QT NO: " : "INV NO: ") + GetString(firstRow, "OrderNumber"), true, 11, PdfTextAlign.Right);
                AppendPdfText(stream, invoiceHeaderRight, y - 50f, (isQuotationInvoice ? "Quotation Date: " : "Invoice Date: ") + FormatAsDate(GetValue(firstRow, "OrderDate")), false, 10, PdfTextAlign.Right);

                y -= 90f;

                if (includeMeta)
                {
                    var partyTopY = y;
                    const float partyGap = 18f;
                    var partyBlockWidth = (right - left - partyGap) / 2f;
                    var eventBlockX = right - partyBlockWidth;
                    const float labelValueOffset = 125f;

                    var customerName = GetString(firstRow, "CustomerName");
                    var customerAddressLines = BuildAddressLines(firstRow).ToList();
                    var telValue = GetString(firstRow, "MobileNo");
                    var customerValueX = left + labelValueOffset;
                    var customerY = partyTopY;

                    AppendPdfText(stream, left, customerY, "Customer Name:", true, 10);
                    AppendPdfText(stream, customerValueX, customerY, customerName, false, 10);
                    customerY -= 17f;

                    AppendPdfText(stream, left, customerY, "Address:", true, 10);
                    if (customerAddressLines.Any())
                    {
                        AppendPdfText(stream, customerValueX, customerY, customerAddressLines[0], false, 10);
                        customerY -= 15f;

                        for (var i = 1; i < customerAddressLines.Count; i++)
                        {
                            AppendPdfText(stream, customerValueX, customerY, customerAddressLines[i], false, 10);
                            customerY -= 13f;
                        }
                    }
                    else
                    {
                        customerY -= 15f;
                    }

                    AppendPdfText(stream, left, customerY, "Tel:", true, 10);
                    AppendPdfText(stream, customerValueX, customerY, telValue, false, 10);

                    var metaX = eventBlockX;
                    var metaY = partyTopY;
                    var consumingTime = GetString(firstRow, "ConsumingTime");
                    var mealPeriodName = GetString(firstRow, "MealPeriodName");
                    var consumingTimeDisplay = string.IsNullOrWhiteSpace(consumingTime)
                        ? mealPeriodName
                        : (string.IsNullOrWhiteSpace(mealPeriodName)
                            ? consumingTime
                            : consumingTime + " (" + mealPeriodName + ")");
                    var eventName = GetString(firstRow, "EventName");
                    var deliveryAddress = GetString(firstRow, "DeliveryAddress");
                    if (string.IsNullOrWhiteSpace(deliveryAddress))
                    {
                        deliveryAddress = GetString(firstRow, "Location");
                    }

                    var eventNameLines = WrapPlainText(eventName, 24).ToList();
                    if (!eventNameLines.Any())
                    {
                        eventNameLines.Add(string.Empty);
                    }

                    var consumingTimeLines = WrapPlainText(consumingTimeDisplay, 24).ToList();
                    if (!consumingTimeLines.Any())
                    {
                        consumingTimeLines.Add(string.Empty);
                    }

                    var deliveryAddressLines = WrapPlainText(deliveryAddress, 24).ToList();
                    if (!deliveryAddressLines.Any())
                    {
                        deliveryAddressLines.Add(string.Empty);
                    }

                    AppendPdfText(stream, metaX, metaY, "Event Name:", true, 10);
                    for (var i = 0; i < eventNameLines.Count; i++)
                    {
                        AppendPdfText(stream, metaX + labelValueOffset, metaY - (i * 12f), eventNameLines[i], false, 10);
                    }

                    var eventDateLabelY = metaY - ((eventNameLines.Count - 1) * 12f) - 16f;
                    AppendPdfText(stream, metaX, eventDateLabelY, "Event Date:", true, 10);
                    AppendPdfText(stream, metaX + labelValueOffset, eventDateLabelY, FormatAsDate(GetValue(firstRow, "EventDate")), false, 10);

                    var consumingLabelY = eventDateLabelY - 16f;
                    AppendPdfText(stream, metaX, consumingLabelY, "Consuming Time:", true, 10);
                    for (var i = 0; i < consumingTimeLines.Count; i++)
                    {
                        AppendPdfText(stream, metaX + labelValueOffset, consumingLabelY - (i * 12f), consumingTimeLines[i], false, 10);
                    }

                    var deliveryLabelY = consumingLabelY - ((consumingTimeLines.Count - 1) * 12f) - 16f;
                    AppendPdfText(stream, metaX, deliveryLabelY, "Delivery Address:", true, 10);
                    for (var i = 0; i < deliveryAddressLines.Count; i++)
                    {
                        AppendPdfText(stream, metaX + labelValueOffset, deliveryLabelY - (i * 12f), deliveryAddressLines[i], false, 10);
                    }

                    var metaBottomY = deliveryLabelY - ((deliveryAddressLines.Count - 1) * 12f);
                    var customerBottomY = customerY;
                    y = Math.Min(customerBottomY - 24f, metaBottomY - 22f);
                }
                else
                {
                    AppendPdfText(stream, left, y, isQuotationInvoice ? "Quotation Items (continued)" : "Invoice Items (continued)", true, 12);
                    y -= 24f;
                }

                DrawInvoiceTableHeader(stream, left, right, ref y, colNo, colDesc, colQty, colUnit);
            }

            void FinishPage()
            {
                pages.Add(stream.ToString());
            }

            StartNewPage(true);

            foreach (var row in rows)
            {
                var descriptionLines = BuildInvoiceDescriptionLines(GetString(row, "Description"));
                var rowLineCount = Math.Max(1, descriptionLines.Count);
                // Keep the break calculation aligned with DrawInvoiceRow's actual cell height.
                var rowHeight = 18f + ((rowLineCount - 1) * 12f);

                if (y - rowHeight < pageBottom + footerReserve)
                {
                    FinishPage();
                    StartNewPage(false);
                }

                DrawInvoiceRow(stream, row, descriptionLines, left, right, ref y, colNo, colDesc, colQty, colUnit);
            }

            var invoiceClosingSectionReserve = GetInvoiceClosingSectionReserve(firstRow, isQuotationInvoice);
            if (y - invoiceClosingSectionReserve < pageBottom)
            {
                FinishPage();
                StartNewPage(false);
            }

            DrawInvoiceSummary(stream, firstRow, left, right, ref y, colUnit, isQuotationInvoice);
            if (!isQuotationInvoice)
            {
                DrawInvoicePaymentBreakup(stream, firstRow, left, right, ref y, colUnit);
            }
            DrawInvoiceTerms(stream, left, ref y);
            y -= 22f;
            var footerBaseY = pageBottom + 8f;
            if (!isQuotationInvoice)
            {
                var signatureMinLineY = pageBottom + 115f;
                DrawInvoiceSignatures(stream, left, right, ref y, signatureMinLineY, authoriseSignatureImage, customerSignatureImage);
            }
            DrawInvoiceFooter(stream, left, right, footerBaseY);
            FinishPage();

            var imageResources = new Dictionary<string, PdfImageData>(StringComparer.Ordinal);
            if (logoImage != null)
            {
                imageResources["Im1"] = logoImage;
            }

            if (!isQuotationInvoice && customerSignatureImage != null)
            {
                imageResources["Im2"] = customerSignatureImage;
            }

            if (!isQuotationInvoice && authoriseSignatureImage != null)
            {
                imageResources["Im3"] = authoriseSignatureImage;
            }

            return BuildPdfDocument(pages, pageWidth, pageHeight, imageResources);
        }

        private static bool IsCancelledInvoice(List<Dictionary<string, object?>> rows)
        {
            foreach (var row in rows)
            {
                if (TryReadInt(row, "OrderStatus", out var orderStatus) && orderStatus == 7)
                {
                    return true;
                }

                if (TryReadInt(row, "Status", out var status) && status == 7)
                {
                    return true;
                }

                var orderStatusName = (GetString(row, "OrderStatusName") ?? string.Empty).Trim();
                if (orderStatusName.Equals("Cancelled", StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }

                var statusName = (GetString(row, "StatusName") ?? string.Empty).Trim();
                if (statusName.Equals("Cancelled", StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }

                var statusText = (GetString(row, "Status") ?? string.Empty).Trim();
                if (statusText.Equals("Cancelled", StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }

            return false;
        }

        private PdfImageData? LoadInvoiceLogoData()
        {
            var webRoot = string.IsNullOrWhiteSpace(_environment.WebRootPath)
                ? Path.Combine(_environment.ContentRootPath, "wwwroot")
                : _environment.WebRootPath;
            var logoPath = Path.Combine(webRoot, "images", "logo.jpg");

            if (!System.IO.File.Exists(logoPath))
            {
                return null;
            }

            var bytes = System.IO.File.ReadAllBytes(logoPath);
            return TryReadJpegDimensions(bytes, out var width, out var height)
                ? new PdfImageData(bytes, width, height)
                : null;
        }

        private static List<Dictionary<string, object?>> GetList(object? value)
        {
            var items = new List<Dictionary<string, object?>>();
            if (value is not IEnumerable enumerable)
            {
                return items;
            }

            foreach (var item in enumerable)
            {
                if (item is null)
                {
                    continue;
                }

                items.Add(ToDictionary(item));
            }

            return items;
        }

        private static string RenderLoops(string template, IDictionary<string, object?> context)
        {
            return Regex.Replace(template, @"{{#\s*([A-Za-z0-9_.]+)\s*}}([\s\S]*?){{/\s*\1\s*}}", match =>
            {
                var collectionPath = match.Groups[1].Value;
                var block = match.Groups[2].Value;
                var rows = ResolvePath(context, collectionPath) as IEnumerable;

                if (rows == null)
                {
                    return string.Empty;
                }

                var output = new System.Text.StringBuilder();
                foreach (var row in rows)
                {
                    if (row == null)
                    {
                        continue;
                    }

                    var rowContext = new Dictionary<string, object?>(context, StringComparer.OrdinalIgnoreCase);
                    foreach (var entry in ToDictionary(row))
                    {
                        rowContext[entry.Key] = entry.Value;
                    }

                    output.Append(RenderTokens(block, rowContext));
                }

                return output.ToString();
            }, RegexOptions.IgnoreCase | RegexOptions.Singleline);
        }

        private static string RenderTokens(string template, IDictionary<string, object?> context)
        {
            return Regex.Replace(template, @"{{\s*([^{}]+?)\s*}}", match =>
            {
                var expr = match.Groups[1].Value.Trim();
                if (string.IsNullOrWhiteSpace(expr) || expr.StartsWith("#") || expr.StartsWith("/"))
                {
                    return match.Value;
                }

                var parts = expr.Split('|');
                var path = parts[0].Trim();
                var format = parts.Length > 1 ? parts[1].Trim() : string.Empty;
                var value = ResolvePath(context, path);
                return FormatValue(value, format);
            }, RegexOptions.IgnoreCase | RegexOptions.Singleline);
        }

        private static object? ResolvePath(object? source, string path)
        {
            if (source == null || string.IsNullOrWhiteSpace(path))
            {
                return null;
            }

            object? current = source;
            foreach (var part in path.Split('.'))
            {
                if (current == null)
                {
                    return null;
                }

                if (int.TryParse(part, out var index) && index >= 0)
                {
                    if (current is IList list && index < list.Count)
                    {
                        current = list[index];
                        continue;
                    }

                    if (current is IEnumerable enumerable && current is not string)
                    {
                        current = enumerable.Cast<object?>().ElementAtOrDefault(index);
                        continue;
                    }
                }

                var dictionary = ToDictionary(current);
                var matchKey = dictionary.Keys.FirstOrDefault(key => string.Equals(key, part, StringComparison.OrdinalIgnoreCase));
                current = matchKey == null ? null : dictionary[matchKey];
            }

            return current;
        }

        private static string FormatValue(object? value, string format)
        {
            if (value == null)
            {
                return string.Empty;
            }

            var hint = format.ToLowerInvariant();
            if (hint == "signature")
            {
                if (value is byte[] bytes && bytes.Length > 0)
                {
                    return "data:image/png;base64," + Convert.ToBase64String(bytes);
                }

                var text = Convert.ToString(value, CultureInfo.InvariantCulture) ?? string.Empty;
                text = text.Trim();
                if (text.Length == 0)
                {
                    return string.Empty;
                }

                if (text.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase))
                {
                    return text;
                }

                return "data:image/png;base64," + text;
            }

            if (hint == "date")
            {
                return DateTime.TryParse(Convert.ToString(value), out var dateValue)
                    ? dateValue.ToString("dd MMM yyyy")
                    : Convert.ToString(value) ?? string.Empty;
            }

            if (hint == "datetime")
            {
                return DateTime.TryParse(Convert.ToString(value), out var dateTimeValue)
                    ? dateTimeValue.ToString("dd MMM yyyy HH:mm")
                    : Convert.ToString(value) ?? string.Empty;
            }

            if (hint == "number")
            {
                return decimal.TryParse(Convert.ToString(value), out var numberValue)
                    ? numberValue.ToString("N0")
                    : Convert.ToString(value) ?? string.Empty;
            }

            if (hint == "currency")
            {
                return decimal.TryParse(Convert.ToString(value), out var currencyValue)
                    ? currencyValue.ToString("N2")
                    : Convert.ToString(value) ?? string.Empty;
            }

            return Convert.ToString(value) ?? string.Empty;
        }

        private static object? GetValue(IDictionary<string, object?> source, string key)
        {
            return source.TryGetValue(key, out var value) ? value : null;
        }

        private static Dictionary<string, object?> ToDictionary(object source)
        {
            if (source is IDictionary<string, object?> typedDictionary)
            {
                return new Dictionary<string, object?>(typedDictionary, StringComparer.OrdinalIgnoreCase);
            }

            if (source is IDictionary dictionary)
            {
                var values = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
                foreach (DictionaryEntry entry in dictionary)
                {
                    values[Convert.ToString(entry.Key) ?? string.Empty] = entry.Value;
                }
                return values;
            }

            var valuesFromObject = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
            foreach (var property in source.GetType().GetProperties())
            {
                valuesFromObject[property.Name] = property.GetValue(source);
            }

            return valuesFromObject;
        }

        private static string HtmlEncode(string value)
        {
            return System.Net.WebUtility.HtmlEncode(value ?? string.Empty);
        }

        private static string GetDisplayValue(object? value, string? typeHint)
        {
            if (value == null || value == DBNull.Value)
            {
                return string.Empty;
            }

            var hint = (typeHint ?? string.Empty).Trim().ToLowerInvariant();
            if (hint is "date" or "datetime")
            {
                if (DateTime.TryParse(Convert.ToString(value), CultureInfo.InvariantCulture, DateTimeStyles.None, out var dateValue))
                {
                    return hint == "date"
                        ? dateValue.ToString("dd MMM yyyy", CultureInfo.InvariantCulture)
                        : dateValue.ToString("dd MMM yyyy HH:mm", CultureInfo.InvariantCulture);
                }
            }

            if (hint is "number" or "currency")
            {
                if (decimal.TryParse(Convert.ToString(value), NumberStyles.Any, CultureInfo.InvariantCulture, out var decimalValue))
                {
                    return hint == "currency"
                        ? decimalValue.ToString("N2", CultureInfo.InvariantCulture)
                        : decimalValue.ToString("N0", CultureInfo.InvariantCulture);
                }
            }

            return Convert.ToString(value, CultureInfo.InvariantCulture) ?? string.Empty;
        }

        private static List<PdfTextLine> BuildWrappedLines(string text, int maxChars)
        {
            var output = new List<PdfTextLine>();
            var remaining = SanitizePdfText(text ?? string.Empty);

            if (string.IsNullOrWhiteSpace(remaining))
            {
                output.Add(new PdfTextLine(string.Empty));
                return output;
            }

            while (remaining.Length > maxChars)
            {
                var split = remaining.LastIndexOf(' ', maxChars);
                if (split <= 0)
                {
                    split = maxChars;
                }

                output.Add(new PdfTextLine(remaining.Substring(0, split).TrimEnd()));
                remaining = remaining.Substring(split).TrimStart();
            }

            output.Add(new PdfTextLine(remaining));
            return output;
        }

        private static string BuildReportPdfFileName(object reportResult, int orderId)
        {
            var root = ToDictionary(reportResult);
            var report = ToDictionary(GetValue(root, "report") ?? new Dictionary<string, object?>());
            var today = DateTime.Now;
            var stamp = today.ToString("dd-MM-yyyy", CultureInfo.InvariantCulture);

            if (IsInvoiceReport(report))
            {
                var rows = GetList(GetValue(root, "rows"));
                var firstRow = rows.FirstOrDefault();
                var orderStatus = firstRow != null
                    ? Convert.ToString(GetValue(firstRow, "OrderStatus"), CultureInfo.InvariantCulture) ?? string.Empty
                    : string.Empty;
                var isQuotation = orderStatus == "5" || orderStatus == "6";
                var documentName = isQuotation ? "Quotation" : "Invoice";
                return $"{documentName}-{stamp}.pdf";
            }

            var reportName = Convert.ToString(GetValue(report, "displayName"))
                ?? Convert.ToString(GetValue(report, "reportName"))
                ?? "Report";
            return $"{SanitizeFileName(reportName)}-{stamp}.pdf";
        }

        private static bool IsInvoiceReport(Dictionary<string, object?> report)
        {
            var reportCode = Convert.ToString(GetValue(report, "reportCode")) ?? string.Empty;
            var reportName = Convert.ToString(GetValue(report, "reportName")) ?? string.Empty;
            var displayName = Convert.ToString(GetValue(report, "displayName")) ?? string.Empty;
            var templateName = Convert.ToString(GetValue(report, "templateName")) ?? string.Empty;
            var templatePath = Convert.ToString(GetValue(report, "templatePath")) ?? string.Empty;

            return ContainsInvoiceToken(reportCode)
                || ContainsInvoiceToken(reportName)
                || ContainsInvoiceToken(displayName)
                || ContainsInvoiceToken(templateName)
                || ContainsInvoiceToken(templatePath);
        }

        private static bool ContainsInvoiceToken(string value)
        {
            return !string.IsNullOrWhiteSpace(value)
                && value.IndexOf("invoice", StringComparison.OrdinalIgnoreCase) >= 0;
        }

        private static string SanitizeFileName(string value)
        {
            var invalid = Path.GetInvalidFileNameChars();
            var cleaned = new string((value ?? string.Empty).Select(ch => invalid.Contains(ch) ? '-' : ch).ToArray());
            return string.IsNullOrWhiteSpace(cleaned) ? "Report.pdf" : cleaned;
        }

        private static string SanitizePdfText(string value)
        {
            if (string.IsNullOrEmpty(value))
            {
                return string.Empty;
            }

            var builder = new StringBuilder(value.Length);
            foreach (var ch in value)
            {
                if (ch == '(' || ch == ')' || ch == '\\')
                {
                    builder.Append('\\').Append(ch);
                }
                else if (ch <= 255)
                {
                    builder.Append(ch);
                }
                else
                {
                    builder.Append('?');
                }
            }

            return builder.ToString();
        }

        private static byte[] BuildSimplePdf(List<PdfTextLine> lines)
        {
            const float pageWidth = 595f;
            const float pageHeight = 842f;
            const float leftMargin = 48f;
            const float topMargin = 48f;
            const float fontSize = 11f;
            const float titleFontSize = 18f;
            const float lineHeight = 15f;
            const int maxLinesPerPage = (int)((pageHeight - (topMargin * 2)) / lineHeight);

            var pages = new List<List<PdfTextLine>>();
            var currentPage = new List<PdfTextLine>();

            foreach (var line in lines)
            {
                var wrapped = string.IsNullOrWhiteSpace(line.Text)
                    ? new List<PdfTextLine> { line }
                    : BuildWrappedPdfLines(line);

                foreach (var wrappedLine in wrapped)
                {
                    if (currentPage.Count >= maxLinesPerPage)
                    {
                        pages.Add(currentPage);
                        currentPage = new List<PdfTextLine>();
                    }

                    currentPage.Add(wrappedLine);
                }
            }

            if (currentPage.Count > 0)
            {
                pages.Add(currentPage);
            }

            var pageStreams = pages
                .Select(page => BuildPageContentStream(page, pageWidth, pageHeight, leftMargin, topMargin, lineHeight, titleFontSize, fontSize))
                .ToList();
            return BuildPdfDocument(pageStreams, pageWidth, pageHeight, (PdfImageData?)null);
        }

        private static byte[] BuildPdfDocument(List<string> pageStreams, float pageWidth, float pageHeight, PdfImageData? image)
        {
            if (image == null)
            {
                return BuildPdfDocument(pageStreams, pageWidth, pageHeight, (IReadOnlyDictionary<string, PdfImageData>?)null);
            }

            return BuildPdfDocument(pageStreams, pageWidth, pageHeight, new Dictionary<string, PdfImageData>(StringComparer.Ordinal)
            {
                ["Im1"] = image
            });
        }

        private static byte[] BuildPdfDocument(List<string> pageStreams, float pageWidth, float pageHeight, IReadOnlyDictionary<string, PdfImageData>? images)
        {
            var objects = new List<string>();
            objects.Add("<< /Type /Catalog /Pages 2 0 R >>");
            objects.Add(string.Empty); // Pages object placeholder (always object 2)
            objects.Add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"); // object 3
            objects.Add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"); // object 4

            var imageObjectNumbers = new Dictionary<string, int>(StringComparer.Ordinal);

            if (images != null)
            {
                foreach (var entry in images.OrderBy(kvp => kvp.Key, StringComparer.Ordinal))
                {
                    var imageName = entry.Key;
                    var imageData = entry.Value;
                    int? softMaskObjectNumber = null;

                    if (imageData.AlphaBytes != null && imageData.AlphaBytes.Length > 0)
                    {
                        softMaskObjectNumber = objects.Count + 1;
                        var alphaHex = Convert.ToHexString(imageData.AlphaBytes) + ">";
                        var alphaInterpolate = imageData.Interpolate ? " /Interpolate true" : string.Empty;
                        objects.Add($"<< /Type /XObject /Subtype /Image /Width {imageData.Width} /Height {imageData.Height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter [/ASCIIHexDecode /FlateDecode]{alphaInterpolate} /Length {alphaHex.Length} >>\nstream\n{alphaHex}\nendstream");
                    }

                    var imageHex = Convert.ToHexString(imageData.Bytes) + ">";
                    var imageFilter = imageData.Filter == "/FlateDecode" ? "/FlateDecode" : "/DCTDecode";
                    var imageObjectNumber = objects.Count + 1;
                    var softMaskClause = softMaskObjectNumber.HasValue ? $" /SMask {softMaskObjectNumber.Value} 0 R" : string.Empty;
                    var interpolateClause = imageData.Interpolate ? " /Interpolate true" : string.Empty;
                    objects.Add($"<< /Type /XObject /Subtype /Image /Width {imageData.Width} /Height {imageData.Height} /ColorSpace {imageData.ColorSpace} /BitsPerComponent {imageData.BitsPerComponent} /Filter [/ASCIIHexDecode {imageFilter}]{softMaskClause}{interpolateClause} /Length {imageHex.Length} >>\nstream\n{imageHex}\nendstream");
                    imageObjectNumbers[imageName] = imageObjectNumber;
                }
            }

            var kids = new StringBuilder();
            var objectNumber = objects.Count + 1;
            for (var i = 0; i < pageStreams.Count; i++)
            {
                kids.Append(objectNumber).Append(" 0 R ");
                objectNumber += 2;
            }

            objects[1] = $"<< /Type /Pages /Kids [{kids}] /Count {pageStreams.Count} >>";

            foreach (var contentStream in pageStreams)
            {
                var contentObjectNumber = objects.Count + 2;
                var xObject = string.Empty;
                if (imageObjectNumbers.Count > 0)
                {
                    var refs = string.Join(" ", imageObjectNumbers
                        .OrderBy(kvp => kvp.Key, StringComparer.Ordinal)
                        .Select(kvp => "/" + kvp.Key + " " + kvp.Value + " 0 R"));
                    xObject = " /XObject << " + refs + " >>";
                }
                objects.Add($"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {pageWidth.ToString(CultureInfo.InvariantCulture)} {pageHeight.ToString(CultureInfo.InvariantCulture)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >>{xObject} >> /Contents {contentObjectNumber} 0 R >>");
                objects.Add($"<< /Length {Encoding.ASCII.GetByteCount(contentStream)} >>\nstream\n{contentStream}\nendstream");
            }

            var pdf = new StringBuilder();
            pdf.Append("%PDF-1.4\n");

            var offsets = new List<int> { 0 };
            for (var i = 0; i < objects.Count; i++)
            {
                offsets.Add(Encoding.ASCII.GetByteCount(pdf.ToString()));
                pdf.Append(i + 1).Append(" 0 obj\n").Append(objects[i]).Append("\nendobj\n");
            }

            var xrefOffset = Encoding.ASCII.GetByteCount(pdf.ToString());
            pdf.Append("xref\n");
            pdf.Append("0 ").Append(objects.Count + 1).Append("\n");
            pdf.Append("0000000000 65535 f \n");
            for (var i = 1; i < offsets.Count; i++)
            {
                pdf.Append(offsets[i].ToString("D10", CultureInfo.InvariantCulture)).Append(" 00000 n \n");
            }

            pdf.Append("trailer\n");
            pdf.Append($"<< /Size {objects.Count + 1} /Root 1 0 R >>\n");
            pdf.Append("startxref\n");
            pdf.Append(xrefOffset.ToString(CultureInfo.InvariantCulture)).Append("\n%%EOF");

            return Encoding.ASCII.GetBytes(pdf.ToString());
        }

        private static List<PdfTextLine> BuildWrappedPdfLines(PdfTextLine line)
        {
            var text = line.Text ?? string.Empty;
            var maxChars = line.Bold ? 78 : 96;
            var wrapped = new List<PdfTextLine>();
            var remaining = SanitizePdfText(text);

            if (remaining.Length == 0)
            {
                wrapped.Add(line);
                return wrapped;
            }

            while (remaining.Length > maxChars)
            {
                var split = remaining.LastIndexOf(' ', maxChars);
                if (split <= 0)
                {
                    split = maxChars;
                }

                wrapped.Add(new PdfTextLine(remaining[..split].TrimEnd(), line.Bold, line.FontSize));
                remaining = remaining[split..].TrimStart();
            }

            wrapped.Add(new PdfTextLine(remaining, line.Bold, line.FontSize));
            return wrapped;
        }

        private static string BuildPageContentStream(List<PdfTextLine> pageLines, float pageWidth, float pageHeight, float leftMargin, float topMargin, float lineHeight, float titleFontSize, float fontSize)
        {
            var builder = new StringBuilder();
            var y = pageHeight - topMargin;

            foreach (var line in pageLines)
            {
                var font = line.Bold ? "/F2" : "/F1";
                var size = line.FontSize > 0 ? line.FontSize : (line.Bold ? titleFontSize : fontSize);
                builder.Append("BT ")
                    .Append(font).Append(' ').Append(size.ToString(CultureInfo.InvariantCulture)).Append(" Tf ")
                    .Append(leftMargin.ToString(CultureInfo.InvariantCulture)).Append(' ')
                    .Append(y.ToString(CultureInfo.InvariantCulture)).Append(" Td (")
                    .Append(SanitizePdfText(line.Text ?? string.Empty))
                    .Append(") Tj ET\n");

                y -= lineHeight;
            }

            return builder.ToString();
        }

        private static void DrawInvoiceTableHeader(StringBuilder stream, float left, float right, ref float y, float colNo, float colDesc, float colQty, float colUnit)
        {
            var rowTop = y;
            var rowBottom = y - 28f;
            DrawRect(stream, left, rowBottom, right - left, rowTop - rowBottom);
            DrawVerticalLine(stream, colNo, rowBottom, rowTop);
            DrawVerticalLine(stream, colDesc, rowBottom, rowTop);
            DrawVerticalLine(stream, colQty, rowBottom, rowTop);
            DrawVerticalLine(stream, colUnit, rowBottom, rowTop);

            AppendPdfText(stream, (left + colNo) / 2f, y - 18f, "NO", true, 10, PdfTextAlign.Center);
            AppendPdfText(stream, (colNo + colDesc) / 2f, y - 18f, "DESCRIPTION", true, 10, PdfTextAlign.Center);
            AppendPdfText(stream, (colDesc + colQty) / 2f, y - 12f, "NO OF", true, 8, PdfTextAlign.Center);
            AppendPdfText(stream, (colDesc + colQty) / 2f, y - 22f, "ITEMS", true, 8, PdfTextAlign.Center);
            AppendPdfText(stream, (colUnit + right) / 2f, y - 18f, "TOTAL", true, 9, PdfTextAlign.Center);
            AppendPdfText(stream, (colQty + colUnit) / 2f, y - 18f, "UNIT PRICE", true, 9, PdfTextAlign.Center);
            y = rowBottom;
        }

        private static void DrawInvoiceRow(StringBuilder stream, Dictionary<string, object?> row, List<string> descriptionLines, float left, float right, ref float y, float colNo, float colDesc, float colQty, float colUnit)
        {
            var rowLineCount = Math.Max(1, descriptionLines.Count);
            var rowTop = y;
            var rowBottom = y - (18f + ((rowLineCount - 1) * 12f));
            DrawRect(stream, left, rowBottom, right - left, rowTop - rowBottom);
            DrawVerticalLine(stream, colNo, rowBottom, rowTop);
            DrawVerticalLine(stream, colDesc, rowBottom, rowTop);
            DrawVerticalLine(stream, colQty, rowBottom, rowTop);
            DrawVerticalLine(stream, colUnit, rowBottom, rowTop);

            AppendPdfText(stream, (left + colNo) / 2f, rowTop - 16f, GetString(row, "No"), false, 10, PdfTextAlign.Center);

            var textY = rowTop - 16f;
            for (var descriptionIndex = 0; descriptionIndex < descriptionLines.Count; descriptionIndex++)
            {
                AppendPdfText(stream, colNo + 6f, textY, descriptionLines[descriptionIndex], descriptionIndex == 0, 10);
                textY -= 12f;
            }

            AppendPdfText(stream, (colDesc + colQty) / 2f, rowTop - 16f, FormatNumericText(GetValue(row, "NoOfItems"), false), false, 10, PdfTextAlign.Center);
            AppendPdfText(stream, colUnit - 8f, rowTop - 16f, "S$" + FormatNumericText(GetValue(row, "UnitPrice"), true), false, 10, PdfTextAlign.Right);
            AppendPdfText(stream, right - 8f, rowTop - 16f, "S$" + FormatNumericText(GetValue(row, "Total"), true), false, 10, PdfTextAlign.Right);
            y = rowBottom;
        }

        private static void DrawInvoiceSummary(StringBuilder stream, Dictionary<string, object?> firstRow, float left, float right, ref float y, float amountColumnLeft, bool isQuotationInvoice)
        {
            var totalAmount = ToDecimalValue(GetValue(firstRow, "TotalAmount"));

            var labels = new List<(string Label, string Amount, bool Bold)>
            {
                ("Sub total", "S$" + FormatNumericText(GetValue(firstRow, "SubTotal"), true), true),
                (FormatNumericText(GetValue(firstRow, "TaxPercentage"), false) + "% GST", "S$" + FormatNumericText(GetValue(firstRow, "TaxAmount"), true), true)
            };

            if (!isQuotationInvoice)
            {
                labels.Add(("Delivery Fee", "S$" + FormatNumericText(GetValue(firstRow, "DeliveryFee"), true), true));
            }

            labels.Add(("Grand Total", "S$" + totalAmount.ToString("N2", CultureInfo.InvariantCulture), true));

            if (!isQuotationInvoice)
            {
                labels.Add(("Paid Amount", "S$" + FormatNumericText(GetValue(firstRow, "PaidAmount"), true), true));
                labels.Add(("Balance Remaining", "S$" + FormatNumericText(GetValue(firstRow, "BalanceRemaining"), true), true));
            }

            foreach (var (label, amount, bold) in labels)
            {
                var rowTop = y;
                var rowBottom = y - 18f;
                DrawRect(stream, left, rowBottom, right - left, rowTop - rowBottom);
                DrawVerticalLine(stream, amountColumnLeft, rowBottom, rowTop);
                AppendPdfText(stream, amountColumnLeft - 10f, rowTop - 12f, label, bold, 9, PdfTextAlign.Right);
                AppendPdfText(stream, right - 12f, rowTop - 12f, amount, false, 9, PdfTextAlign.Right);
                y = rowBottom;
            }

            y -= 12f;
        }

        private static decimal ToDecimalValue(object? value)
        {
            return decimal.TryParse(Convert.ToString(value, CultureInfo.InvariantCulture), NumberStyles.Any, CultureInfo.InvariantCulture, out var number)
                ? number
                : 0m;
        }

        private static float GetInvoiceClosingSectionReserve(Dictionary<string, object?> firstRow, bool isQuotationInvoice)
        {
            if (isQuotationInvoice)
            {
                // Summary rows, terms and a small safety gap before the fixed footer.
                return (3 * 18f) + 12f + 102f;
            }

            var paymentModes = new[]
            {
                ToDecimalValue(GetValue(firstRow, "PaidByCard")),
                ToDecimalValue(GetValue(firstRow, "PaidByUpi")),
                ToDecimalValue(GetValue(firstRow, "PaidByBankTransfer")),
                ToDecimalValue(GetValue(firstRow, "PaidByCash")),
                ToDecimalValue(GetValue(firstRow, "PaidByWallet")),
                ToDecimalValue(GetValue(firstRow, "PaidByOther"))
            };
            var visiblePaymentModes = paymentModes.Count(amount => amount > 0m);
            var paymentBreakupTotal = ToDecimalValue(GetValue(firstRow, "PaidByBreakupTotal"));
            var paymentBreakupHeight = paymentBreakupTotal > 0m && visiblePaymentModes > 0
                ? 32f + ((visiblePaymentModes + 1) * 20f)
                : 0f;

            // Reserve only the space the closing content really consumes. The former fixed reserve
            // was too large and pushed totals to a new page even when the current page could fit them.
            var summaryHeight = (6 * 18f) + 12f;
            const float termsAndSignatureClearance = 212f;
            return summaryHeight + paymentBreakupHeight + termsAndSignatureClearance;
        }

        private static void DrawInvoicePaymentBreakup(StringBuilder stream, Dictionary<string, object?> firstRow, float left, float right, ref float y, float amountColumnLeft)
        {
            var modeRows = new List<(string Label, decimal Amount)>
            {
                ("Card", ToDecimalValue(GetValue(firstRow, "PaidByCard"))),
                ("UPI", ToDecimalValue(GetValue(firstRow, "PaidByUpi"))),
                ("Bank Transfer", ToDecimalValue(GetValue(firstRow, "PaidByBankTransfer"))),
                ("Cash", ToDecimalValue(GetValue(firstRow, "PaidByCash"))),
                ("Wallet", ToDecimalValue(GetValue(firstRow, "PaidByWallet"))),
                ("Other", ToDecimalValue(GetValue(firstRow, "PaidByOther")))
            };

            var visibleModeRows = modeRows.Where(r => r.Amount > 0m).ToList();
            var totalBreakup = ToDecimalValue(GetValue(firstRow, "PaidByBreakupTotal"));
            if (totalBreakup <= 0m || visibleModeRows.Count == 0)
            {
                return;
            }

            var breakupRows = visibleModeRows
                .Select(r => (r.Label, r.Amount, Bold: false))
                .ToList();
            breakupRows.Add(("Total Paid (Breakup)", totalBreakup, true));

            AppendPdfText(stream, left, y, "Payment Breakup:", true, 12);
            y -= 16f;

            foreach (var row in breakupRows)
            {
                var rowTop = y;
                var rowBottom = y - 20f;
                DrawRect(stream, left, rowBottom, right - left, rowTop - rowBottom);
                DrawVerticalLine(stream, amountColumnLeft, rowBottom, rowTop);
                AppendPdfText(stream, left + 8f, rowTop - 14f, row.Label, row.Bold, 10);
                AppendPdfText(stream, right - 8f, rowTop - 14f, "S$" + row.Amount.ToString("N2", CultureInfo.InvariantCulture), row.Bold, 10, PdfTextAlign.Right);
                y = rowBottom;
            }

            y -= 16f;
        }

        private static void DrawInvoiceTerms(StringBuilder stream, float left, ref float y)
        {
            AppendPdfText(stream, left, y, "Terms & Conditions:", true, 11);
            y -= 16f;

            var terms = new[]
            {
                "Deposit paid is not refundable.",
                "Cheque should be made payable to GAYATRI RESTAURANT PTE LTD",
                "For order support, contact Tel: 6291 1011 / Office Tel: 6292 4544 / WhatsApp: +65 6294 6294 / Email: info@gayatrirestaurant.com",
                "Food best consumed within 3 hours from consuming time."
            };

            foreach (var term in terms)
            {
                AppendPdfText(stream, left, y, term, false, 9);
                y -= 13f;
            }

            y -= 12f;
        }

        private static void DrawInvoiceSignatures(StringBuilder stream, float left, float right, ref float y, float minLineY, PdfImageData? authoriseSignatureImage, PdfImageData? customerSignatureImage)
        {
            var lineY = Math.Max(y - 18f, minLineY);
            if (lineY > 700f)
            {
                lineY = 700f;
            }

            stream.Append("1.2 w\n");
            DrawHorizontalLine(stream, left + 70f, left + 210f, lineY);
            DrawHorizontalLine(stream, right - 210f, right - 70f, lineY);
            stream.Append("1 w\n");

            if (authoriseSignatureImage != null && authoriseSignatureImage.Width > 0 && authoriseSignatureImage.Height > 0)
            {
                var maxWidth = 140f;
                var maxHeight = 26f;
                var widthScale = maxWidth / authoriseSignatureImage.Width;
                var heightScale = maxHeight / authoriseSignatureImage.Height;
                var scale = Math.Min(widthScale, heightScale);
                if (!float.IsNaN(scale) && !float.IsInfinity(scale) && scale > 0f)
                {
                    var drawWidth = authoriseSignatureImage.Width * scale;
                    var drawHeight = authoriseSignatureImage.Height * scale;
                    var drawX = (left + 140f) - (drawWidth / 2f);
                    var drawY = lineY + 3f;
                    AppendPdfImage(stream, authoriseSignatureImage, drawX, drawY, drawWidth, drawHeight, "Im3");
                }
            }

            if (customerSignatureImage != null && customerSignatureImage.Width > 0 && customerSignatureImage.Height > 0)
            {
                var maxWidth = 140f;
                var maxHeight = 26f;
                var widthScale = maxWidth / customerSignatureImage.Width;
                var heightScale = maxHeight / customerSignatureImage.Height;
                var scale = Math.Min(widthScale, heightScale);
                if (!float.IsNaN(scale) && !float.IsInfinity(scale) && scale > 0f)
                {
                    var drawWidth = customerSignatureImage.Width * scale;
                    var drawHeight = customerSignatureImage.Height * scale;
                    var drawX = (right - 140f) - (drawWidth / 2f);
                    var drawY = lineY + 3f;
                    AppendPdfImage(stream, customerSignatureImage, drawX, drawY, drawWidth, drawHeight, "Im2");
                }
            }

            AppendPdfText(stream, left + 140f, lineY - 12f, "Authorise Signature", false, 10, PdfTextAlign.Center);
            AppendPdfText(stream, right - 140f, lineY - 12f, "Customer Signature", false, 10, PdfTextAlign.Center);
            y = lineY - 34f;
        }

        private static void DrawInvoiceFooter(StringBuilder stream, float left, float right, float y)
        {
            AppendPdfText(stream, (left + right) / 2f, y + 26f, "Gayatri Restaurant Pte Ltd", true, 11, PdfTextAlign.Center);
            AppendPdfText(stream, (left + right) / 2f, y + 12f, "122 Race Course Road #01-01, Singapore 218583", false, 9, PdfTextAlign.Center);
            AppendPdfText(stream, (left + right) / 2f, y - 2f, "Tel: 6291 1011   Office: 6292 4544   Fax: 62974850   Email: info@gayatrirestaurant.com", false, 9, PdfTextAlign.Center);
            AppendPdfText(stream, (left + right) / 2f, y - 16f, "Co. Regn. No. 52817812A | Website: www.gayatrirestaurant.com", false, 9, PdfTextAlign.Center);
        }

        private static void DrawInvoiceWatermark(StringBuilder stream, float pageWidth, float pageHeight, string text)
        {
            var centerX = pageWidth / 2f;
            var centerY = pageHeight / 2f;
            var angle = -35d * Math.PI / 180d;
            var cos = Math.Cos(angle);
            var sin = Math.Sin(angle);
            var safeText = SanitizePdfText(text ?? string.Empty);
            var fontSize = 52f;
            var textWidth = EstimateTextWidth(text ?? string.Empty, fontSize, true);
            var startX = centerX - (float)(cos * (textWidth / 2f));
            var startY = centerY - (float)(sin * (textWidth / 2f));

            stream.Append("q\n");
            stream.Append("0.92 0.35 0.35 rg\n");
            stream.Append("BT /F2 ").Append(fontSize.ToString(CultureInfo.InvariantCulture)).Append(" Tf ");
            stream.Append(cos.ToString("0.####", CultureInfo.InvariantCulture)).Append(' ');
            stream.Append(sin.ToString("0.####", CultureInfo.InvariantCulture)).Append(' ');
            stream.Append((-sin).ToString("0.####", CultureInfo.InvariantCulture)).Append(' ');
            stream.Append(cos.ToString("0.####", CultureInfo.InvariantCulture)).Append(' ');
            stream.Append(startX.ToString(CultureInfo.InvariantCulture)).Append(' ');
            stream.Append(startY.ToString(CultureInfo.InvariantCulture)).Append(" Tm (");
            stream.Append(safeText);
            stream.Append(") Tj ET\n");
            stream.Append("Q\n");
        }

        private static List<string> BuildInvoiceDescriptionLines(string description)
        {
            var normalized = (description ?? string.Empty).Replace("\r", string.Empty);
            var parts = normalized
                .Split(new[] { "\n" }, StringSplitOptions.RemoveEmptyEntries)
                .SelectMany(line => line.Split(new[] { " - " }, StringSplitOptions.RemoveEmptyEntries))
                .Select(part => part.Trim().TrimStart('-', ' '))
                .Where(part => !string.IsNullOrWhiteSpace(part))
                .ToList();

            if (!parts.Any())
            {
                return new List<string> { string.Empty };
            }

            var lines = new List<string> { parts[0] };
            for (var i = 1; i < parts.Count; i++)
            {
                lines.Add(parts[i]);
            }

            return lines.SelectMany(line => WrapPlainText(line, 52)).ToList();
        }

        private static IEnumerable<string> BuildAddressLines(Dictionary<string, object?> row)
        {
            var customerAddress = GetString(row, "CustomerAddress");
            if (string.IsNullOrWhiteSpace(customerAddress))
            {
                customerAddress = GetString(row, "Address");
            }

            var lines = new[]
            {
                customerAddress,
                GetString(row, "Pincode")
            }
            .Where(line => !string.IsNullOrWhiteSpace(line))
            .SelectMany(line => WrapPlainText(line, 32))
            .ToList();

            var deduplicated = new List<string>();
            string? previousLine = null;
            foreach (var line in lines)
            {
                if (line != previousLine)
                {
                    deduplicated.Add(line);
                    previousLine = line;
                }
            }

            return deduplicated;
        }

        private static IEnumerable<string> WrapPlainText(string text, int maxChars)
        {
            var remaining = (text ?? string.Empty).Trim();
            if (remaining.Length == 0)
            {
                yield return string.Empty;
                yield break;
            }

            while (remaining.Length > maxChars)
            {
                var split = remaining.LastIndexOf(' ', maxChars);
                if (split <= 0)
                {
                    split = maxChars;
                }

                yield return remaining[..split].TrimEnd();
                remaining = remaining[split..].TrimStart();
            }

            yield return remaining;
        }

        private static string GetString(Dictionary<string, object?> row, string key)
        {
            return Convert.ToString(GetValue(row, key), CultureInfo.InvariantCulture) ?? string.Empty;
        }

        private static string FormatAsDate(object? value)
        {
            return DateTime.TryParse(Convert.ToString(value, CultureInfo.InvariantCulture), CultureInfo.InvariantCulture, DateTimeStyles.None, out var dateValue)
                ? dateValue.ToString("dd MMM yyyy", CultureInfo.InvariantCulture)
                : string.Empty;
        }

        private static string FormatNumericText(object? value, bool currency)
        {
            if (decimal.TryParse(Convert.ToString(value, CultureInfo.InvariantCulture), NumberStyles.Any, CultureInfo.InvariantCulture, out var number))
            {
                return number.ToString(currency ? "N2" : "N0", CultureInfo.InvariantCulture);
            }

            return string.Empty;
        }

        private static void AppendPdfText(StringBuilder stream, float x, float y, string text, bool bold, float fontSize, PdfTextAlign align = PdfTextAlign.Left)
        {
            var output = SanitizePdfText(text ?? string.Empty);
            var adjustedX = x;
            if (align != PdfTextAlign.Left)
            {
                var width = EstimateTextWidth(output, fontSize, bold);
                if (align == PdfTextAlign.Right)
                {
                    adjustedX -= width;
                }
                else if (align == PdfTextAlign.Center)
                {
                    adjustedX -= width / 2f;
                }
            }

            stream.Append("BT ")
                .Append(bold ? "/F2 " : "/F1 ")
                .Append(fontSize.ToString(CultureInfo.InvariantCulture)).Append(" Tf ")
                .Append(adjustedX.ToString(CultureInfo.InvariantCulture)).Append(' ')
                .Append(y.ToString(CultureInfo.InvariantCulture)).Append(" Td (")
                .Append(output)
                .Append(") Tj ET\n");
        }

        private static float EstimateTextWidth(string text, float fontSize, bool bold)
        {
            if (string.IsNullOrEmpty(text) || fontSize <= 0)
            {
                return 0f;
            }

            var totalUnits = 0f;
            foreach (var ch in text)
            {
                totalUnits += GetApproxHelveticaWidth(ch, bold);
            }

            return (totalUnits * fontSize) / 1000f;
        }

        private static float GetApproxHelveticaWidth(char ch, bool bold)
        {
            if (ch == ' ')
            {
                return 278f;
            }

            if (char.IsDigit(ch))
            {
                return 556f;
            }

            if (ch is '.' or ',' or ':' or ';' or '!' or '|' or '\'' or '"')
            {
                return 278f;
            }

            if (ch is '-' or '_' or '+' or '=')
            {
                return 333f;
            }

            if (ch is '(' or ')' or '[' or ']' or '{' or '}')
            {
                return 333f;
            }

            if (ch is '/' or '\\')
            {
                return 278f;
            }

            if (ch is 'I' or 'i' or 'l')
            {
                return bold ? 333f : 222f;
            }

            if (ch is 'W' or 'M')
            {
                return bold ? 944f : 833f;
            }

            if (ch is 'w' or 'm')
            {
                return bold ? 833f : 778f;
            }

            if (char.IsUpper(ch))
            {
                return bold ? 722f : 667f;
            }

            if (char.IsLower(ch))
            {
                return bold ? 556f : 500f;
            }

            return bold ? 611f : 556f;
        }

        private static void AppendPdfImage(StringBuilder stream, PdfImageData image, float x, float y, float width, float height, string resourceName = "Im1")
        {
            stream.Append("q ")
                .Append(width.ToString(CultureInfo.InvariantCulture)).Append(" 0 0 ")
                .Append(height.ToString(CultureInfo.InvariantCulture)).Append(' ')
                .Append(x.ToString(CultureInfo.InvariantCulture)).Append(' ')
                .Append(y.ToString(CultureInfo.InvariantCulture)).Append(" cm /")
                .Append(SanitizePdfText(resourceName))
                .Append(" Do Q\n");
        }

        private static PdfImageData? LoadInvoiceCustomerSignatureData(Dictionary<string, object?> firstRow)
        {
            return LoadInvoiceSignatureData(firstRow, "OrderDigitalSignature");
        }

        private static PdfImageData? LoadInvoiceAuthoriseSignatureData(Dictionary<string, object?> firstRow)
        {
            return LoadInvoiceSignatureData(firstRow, "AuthoriseSignature");
        }

        private static PdfImageData? LoadInvoiceSignatureData(Dictionary<string, object?> firstRow, string key)
        {
            var rawSignature = GetValue(firstRow, key);
            if (rawSignature == null || rawSignature is DBNull)
            {
                return null;
            }

            var signatureBytes = TryExtractBinaryBytes(rawSignature);

            if (signatureBytes == null || signatureBytes.Length < 16)
            {
                return null;
            }

            if (TryReadJpegDimensions(signatureBytes, out var jpegWidth, out var jpegHeight))
            {
                return new PdfImageData(signatureBytes, jpegWidth, jpegHeight);
            }

            if (TryBuildPdfImageDataFromPng(signatureBytes, out var pngImage))
            {
                return pngImage;
            }

            return null;
        }

        private static byte[]? TryExtractBinaryBytes(object value)
        {
            if (value is byte[] directBytes && directBytes.Length > 0)
            {
                return directBytes;
            }

            if (value is JsonElement jsonElement)
            {
                if (jsonElement.ValueKind == JsonValueKind.String)
                {
                    var text = jsonElement.GetString() ?? string.Empty;
                    return TryDecodeBinaryString(text);
                }

                if (jsonElement.ValueKind == JsonValueKind.Array)
                {
                    var list = new List<byte>();
                    foreach (var item in jsonElement.EnumerateArray())
                    {
                        if (item.ValueKind == JsonValueKind.Number && item.TryGetInt32(out var b) && b >= 0 && b <= 255)
                        {
                            list.Add((byte)b);
                            continue;
                        }

                        return null;
                    }

                    return list.Count > 0 ? list.ToArray() : null;
                }
            }

            var rawText = Convert.ToString(value, CultureInfo.InvariantCulture) ?? string.Empty;
            return TryDecodeBinaryString(rawText);
        }

        private static byte[]? TryDecodeBinaryString(string raw)
        {
            var signatureText = (raw ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(signatureText))
            {
                return null;
            }

            if (signatureText.StartsWith("0x", StringComparison.OrdinalIgnoreCase))
            {
                var hex = signatureText[2..].Trim();
                if (hex.Length == 0 || hex.Length % 2 != 0)
                {
                    return null;
                }

                try
                {
                    return Convert.FromHexString(hex);
                }
                catch
                {
                    return null;
                }
            }

            var base64Payload = signatureText;
            var dataPrefixIndex = signatureText.IndexOf("base64,", StringComparison.OrdinalIgnoreCase);
            if (dataPrefixIndex >= 0)
            {
                base64Payload = signatureText[(dataPrefixIndex + "base64,".Length)..];
            }

            try
            {
                return Convert.FromBase64String(base64Payload);
            }
            catch (FormatException)
            {
                return null;
            }
        }

        private static bool TryBuildPdfImageDataFromPng(byte[] pngBytes, out PdfImageData image)
        {
            image = default!;
            if (pngBytes.Length < 8)
            {
                return false;
            }

            var pngHeader = new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 };
            for (var i = 0; i < pngHeader.Length; i++)
            {
                if (pngBytes[i] != pngHeader[i])
                {
                    return false;
                }
            }

            var offset = 8;
            var width = 0;
            var height = 0;
            var bitDepth = 0;
            var colorType = 0;
            var interlaceMethod = 0;
            var idatBytes = new List<byte>();

            while (offset + 8 <= pngBytes.Length)
            {
                var length = ReadBigEndianInt(pngBytes, offset);
                offset += 4;
                if (offset + 4 > pngBytes.Length)
                {
                    return false;
                }

                var type = Encoding.ASCII.GetString(pngBytes, offset, 4);
                offset += 4;

                if (length < 0 || offset + length + 4 > pngBytes.Length)
                {
                    return false;
                }

                if (type.Equals("IHDR", StringComparison.Ordinal))
                {
                    if (length < 13)
                    {
                        return false;
                    }

                    width = ReadBigEndianInt(pngBytes, offset);
                    height = ReadBigEndianInt(pngBytes, offset + 4);
                    bitDepth = pngBytes[offset + 8];
                    colorType = pngBytes[offset + 9];
                    interlaceMethod = pngBytes[offset + 12];
                }
                else if (type.Equals("IDAT", StringComparison.Ordinal))
                {
                    for (var i = 0; i < length; i++)
                    {
                        idatBytes.Add(pngBytes[offset + i]);
                    }
                }
                else if (type.Equals("IEND", StringComparison.Ordinal))
                {
                    break;
                }

                offset += length + 4;
            }

            if (width <= 0 || height <= 0 || bitDepth != 8 || interlaceMethod != 0 || idatBytes.Count == 0)
            {
                return false;
            }

            var bytesPerPixel = colorType switch
            {
                2 => 3,
                6 => 4,
                _ => 0
            };

            if (bytesPerPixel == 0)
            {
                return false;
            }

            byte[] filteredData;
            try
            {
                using var compressedStream = new MemoryStream(idatBytes.ToArray());
                using var zlibStream = new ZLibStream(compressedStream, CompressionMode.Decompress);
                using var decompressed = new MemoryStream();
                zlibStream.CopyTo(decompressed);
                filteredData = decompressed.ToArray();
            }
            catch
            {
                return false;
            }

            var rowLength = checked((width * bytesPerPixel) + 1);
            var expectedLength = checked(rowLength * height);
            if (filteredData.Length < expectedLength)
            {
                return false;
            }

            var rgbData = new byte[width * height * 3];
            byte[]? alphaData = bytesPerPixel == 4 ? new byte[width * height] : null;
            var previousRow = new byte[width * bytesPerPixel];
            var currentRow = new byte[width * bytesPerPixel];

            var sourceOffset = 0;
            var rgbOffset = 0;
            var alphaOffset = 0;

            for (var rowIndex = 0; rowIndex < height; rowIndex++)
            {
                var filterType = filteredData[sourceOffset++];
                Buffer.BlockCopy(filteredData, sourceOffset, currentRow, 0, currentRow.Length);
                sourceOffset += currentRow.Length;

                UnfilterPngScanline(currentRow, previousRow, bytesPerPixel, filterType);

                for (var pixel = 0; pixel < width; pixel++)
                {
                    var pixelOffset = pixel * bytesPerPixel;
                    rgbData[rgbOffset++] = currentRow[pixelOffset];
                    rgbData[rgbOffset++] = currentRow[pixelOffset + 1];
                    rgbData[rgbOffset++] = currentRow[pixelOffset + 2];
                    if (alphaData != null)
                    {
                        alphaData[alphaOffset++] = currentRow[pixelOffset + 3];
                    }
                }

                Buffer.BlockCopy(currentRow, 0, previousRow, 0, currentRow.Length);
            }

            var trimmedWidth = width;
            var trimmedHeight = height;
            var trimmedRgbData = rgbData;
            var trimmedAlphaData = alphaData;

            TrimPngInkBounds(rgbData, alphaData, width, height, out trimmedRgbData, out trimmedAlphaData, out trimmedWidth, out trimmedHeight);

            byte[] compressedRgb;
            try
            {
                using var rgbStream = new MemoryStream();
                using (var zlibEncode = new ZLibStream(rgbStream, CompressionLevel.SmallestSize, true))
                {
                    zlibEncode.Write(trimmedRgbData, 0, trimmedRgbData.Length);
                }

                compressedRgb = rgbStream.ToArray();
            }
            catch
            {
                return false;
            }

            byte[]? compressedAlpha = null;
            if (trimmedAlphaData != null)
            {
                try
                {
                    using var alphaStream = new MemoryStream();
                    using (var alphaEncode = new ZLibStream(alphaStream, CompressionLevel.SmallestSize, true))
                    {
                        alphaEncode.Write(trimmedAlphaData, 0, trimmedAlphaData.Length);
                    }

                    compressedAlpha = alphaStream.ToArray();
                }
                catch
                {
                    compressedAlpha = null;
                }
            }

            image = new PdfImageData(compressedRgb, trimmedWidth, trimmedHeight, "/FlateDecode", "/DeviceRGB", 8, compressedAlpha);
            return true;
        }

        private static void TrimPngInkBounds(
            byte[] rgbData,
            byte[]? alphaData,
            int width,
            int height,
            out byte[] trimmedRgbData,
            out byte[]? trimmedAlphaData,
            out int trimmedWidth,
            out int trimmedHeight)
        {
            trimmedRgbData = rgbData;
            trimmedAlphaData = alphaData;
            trimmedWidth = width;
            trimmedHeight = height;

            if (width <= 0 || height <= 0)
            {
                return;
            }

            var minX = width;
            var minY = height;
            var maxX = -1;
            var maxY = -1;

            for (var y = 0; y < height; y++)
            {
                for (var x = 0; x < width; x++)
                {
                    var rgbIndex = ((y * width) + x) * 3;
                    var r = rgbData[rgbIndex];
                    var g = rgbData[rgbIndex + 1];
                    var b = rgbData[rgbIndex + 2];
                    var alpha = alphaData == null ? (byte)255 : alphaData[(y * width) + x];

                    // Treat near-white + transparent pixels as empty margin.
                    var isInkPixel = alpha > 10 && (r < 245 || g < 245 || b < 245 || alpha < 245);
                    if (!isInkPixel)
                    {
                        continue;
                    }

                    if (x < minX) minX = x;
                    if (y < minY) minY = y;
                    if (x > maxX) maxX = x;
                    if (y > maxY) maxY = y;
                }
            }

            if (maxX < minX || maxY < minY)
            {
                return;
            }

            const int padding = 2;
            minX = Math.Max(0, minX - padding);
            minY = Math.Max(0, minY - padding);
            maxX = Math.Min(width - 1, maxX + padding);
            maxY = Math.Min(height - 1, maxY + padding);

            var croppedWidth = maxX - minX + 1;
            var croppedHeight = maxY - minY + 1;

            if (croppedWidth <= 0 || croppedHeight <= 0 || (croppedWidth == width && croppedHeight == height))
            {
                return;
            }

            var croppedRgb = new byte[croppedWidth * croppedHeight * 3];
            byte[]? croppedAlpha = alphaData == null ? null : new byte[croppedWidth * croppedHeight];

            for (var y = 0; y < croppedHeight; y++)
            {
                var srcY = minY + y;
                var srcRgbRowOffset = (srcY * width + minX) * 3;
                var dstRgbRowOffset = y * croppedWidth * 3;
                Buffer.BlockCopy(rgbData, srcRgbRowOffset, croppedRgb, dstRgbRowOffset, croppedWidth * 3);

                if (croppedAlpha != null && alphaData != null)
                {
                    var srcAlphaRowOffset = srcY * width + minX;
                    var dstAlphaRowOffset = y * croppedWidth;
                    Buffer.BlockCopy(alphaData, srcAlphaRowOffset, croppedAlpha, dstAlphaRowOffset, croppedWidth);
                }
            }

            trimmedRgbData = croppedRgb;
            trimmedAlphaData = croppedAlpha;
            trimmedWidth = croppedWidth;
            trimmedHeight = croppedHeight;
        }

        private static void UnfilterPngScanline(byte[] currentRow, byte[] previousRow, int bytesPerPixel, byte filterType)
        {
            switch (filterType)
            {
                case 0:
                    return;
                case 1:
                    for (var i = bytesPerPixel; i < currentRow.Length; i++)
                    {
                        currentRow[i] = unchecked((byte)(currentRow[i] + currentRow[i - bytesPerPixel]));
                    }
                    return;
                case 2:
                    for (var i = 0; i < currentRow.Length; i++)
                    {
                        currentRow[i] = unchecked((byte)(currentRow[i] + previousRow[i]));
                    }
                    return;
                case 3:
                    for (var i = 0; i < currentRow.Length; i++)
                    {
                        var left = i >= bytesPerPixel ? currentRow[i - bytesPerPixel] : (byte)0;
                        var up = previousRow[i];
                        currentRow[i] = unchecked((byte)(currentRow[i] + ((left + up) / 2)));
                    }
                    return;
                case 4:
                    for (var i = 0; i < currentRow.Length; i++)
                    {
                        var left = i >= bytesPerPixel ? currentRow[i - bytesPerPixel] : (byte)0;
                        var up = previousRow[i];
                        var upLeft = i >= bytesPerPixel ? previousRow[i - bytesPerPixel] : (byte)0;
                        currentRow[i] = unchecked((byte)(currentRow[i] + PngPaethPredictor(left, up, upLeft)));
                    }
                    return;
                default:
                    throw new InvalidOperationException("Unsupported PNG filter type.");
            }
        }

        private static int PngPaethPredictor(int a, int b, int c)
        {
            var p = a + b - c;
            var pa = Math.Abs(p - a);
            var pb = Math.Abs(p - b);
            var pc = Math.Abs(p - c);

            if (pa <= pb && pa <= pc)
            {
                return a;
            }

            return pb <= pc ? b : c;
        }

        private static int ReadBigEndianInt(byte[] bytes, int index)
        {
            return (bytes[index] << 24)
                | (bytes[index + 1] << 16)
                | (bytes[index + 2] << 8)
                | bytes[index + 3];
        }

        private static bool TryReadJpegDimensions(byte[] jpegBytes, out int width, out int height)
        {
            width = 0;
            height = 0;

            if (jpegBytes.Length < 4 || jpegBytes[0] != 0xFF || jpegBytes[1] != 0xD8)
            {
                return false;
            }

            var index = 2;
            while (index + 8 < jpegBytes.Length)
            {
                if (jpegBytes[index] != 0xFF)
                {
                    index++;
                    continue;
                }

                var marker = jpegBytes[index + 1];
                index += 2;

                if (marker == 0xD9 || marker == 0xDA)
                {
                    break;
                }

                if (index + 1 >= jpegBytes.Length)
                {
                    break;
                }

                var segmentLength = (jpegBytes[index] << 8) + jpegBytes[index + 1];
                if (segmentLength < 2 || index + segmentLength > jpegBytes.Length)
                {
                    break;
                }

                if (marker is 0xC0 or 0xC1 or 0xC2 or 0xC3 or 0xC5 or 0xC6 or 0xC7 or 0xC9 or 0xCA or 0xCB or 0xCD or 0xCE or 0xCF)
                {
                    height = (jpegBytes[index + 3] << 8) + jpegBytes[index + 4];
                    width = (jpegBytes[index + 5] << 8) + jpegBytes[index + 6];
                    return width > 0 && height > 0;
                }

                index += segmentLength;
            }

            return false;
        }

        private static void DrawRect(StringBuilder stream, float x, float y, float width, float height)
        {
            stream.Append(x.ToString(CultureInfo.InvariantCulture)).Append(' ')
                .Append(y.ToString(CultureInfo.InvariantCulture)).Append(' ')
                .Append(width.ToString(CultureInfo.InvariantCulture)).Append(' ')
                .Append(height.ToString(CultureInfo.InvariantCulture)).Append(" re S\n");
        }

        private static void DrawVerticalLine(StringBuilder stream, float x, float y1, float y2)
        {
            stream.Append(x.ToString(CultureInfo.InvariantCulture)).Append(' ')
                .Append(y1.ToString(CultureInfo.InvariantCulture)).Append(" m ")
                .Append(x.ToString(CultureInfo.InvariantCulture)).Append(' ')
                .Append(y2.ToString(CultureInfo.InvariantCulture)).Append(" l S\n");
        }

        private static void DrawHorizontalLine(StringBuilder stream, float x1, float x2, float y)
        {
            stream.Append(x1.ToString(CultureInfo.InvariantCulture)).Append(' ')
                .Append(y.ToString(CultureInfo.InvariantCulture)).Append(" m ")
                .Append(x2.ToString(CultureInfo.InvariantCulture)).Append(' ')
                .Append(y.ToString(CultureInfo.InvariantCulture)).Append(" l S\n");
        }

        private enum PdfTextAlign
        {
            Left,
            Center,
            Right
        }

        private sealed record PdfImageData(byte[] Bytes, int Width, int Height, string Filter = "/DCTDecode", string ColorSpace = "/DeviceRGB", int BitsPerComponent = 8, byte[]? AlphaBytes = null, bool Interpolate = true);
        private sealed record PdfTextLine(string Text, bool Bold = false, float FontSize = 0);
    }
}
