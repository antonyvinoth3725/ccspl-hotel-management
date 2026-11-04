using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models.Reports;
using Microsoft.AspNetCore.Mvc;
namespace GayatriCateringPortal.Controllers.Admin
{
    [Route("Admin/Reports")]
    public class ReportsController : Controller
    {
        private readonly IReportsRepository _reportsRepository;

        public ReportsController(IReportsRepository reportsRepository)
        {
            _reportsRepository = reportsRepository;
        }

        [HttpGet("")]
        public IActionResult Index()
        {
            ViewData["Mode"] = "admin";
            ViewData["Page"] = "reports";
            ViewData["Title"] = "Reports";
            return View("~/Views/Admin/Reports.cshtml");
        }

        [HttpGet("categories")]
        public IActionResult Categories([FromQuery] int roleId)
        {
            var result = _reportsRepository.GetCategories(roleId);
            return Ok(result);
        }

        [HttpGet("list")]
        public IActionResult List([FromQuery] int roleId, [FromQuery] int? categoryId)
        {
            var result = _reportsRepository.GetReports(roleId, categoryId);
            return Ok(result);
        }

        [HttpGet("GetAutoCompleteOrdersNumbers")]
        public IActionResult GetAutoCompleteOrdersNumbers([FromQuery] string? orderNumber)
        {
            var result = _reportsRepository.GetAutoCompleteOrdersNumbers(orderNumber ?? string.Empty);
            return Ok(result);
        }

        [HttpGet("definition")]
        public IActionResult Definition([FromQuery] int roleId, [FromQuery] int reportId)
        {
            var definition = _reportsRepository.GetReportDefinition(roleId, reportId);
            if (definition == null)
            {
                return NotFound(new { message = "Report definition not found or access denied." });
            }

            return Ok(definition);
        }

        [HttpGet("permissions")]
        public IActionResult Permissions([FromQuery] int roleId)
        {
            var result = _reportsRepository.GetReportPermissions(roleId);
            return Ok(result);
        }

        [HttpPost("permissions/save")]
        public IActionResult SavePermissions([FromBody] List<ReportPermissionRequest> permissions)
        {
            try
            {
                var result = _reportsRepository.SaveReportPermission(permissions ?? new List<ReportPermissionRequest>());
                return Ok(new { message = result });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch
            {
                return StatusCode(500, new { message = "Unable to save report permissions." });
            }
        }

        [HttpPost("preview")]
        public IActionResult Preview([FromBody] ReportExecutionRequest request)
        {
            if (request == null)
            {
                return BadRequest(new { message = "Invalid report request." });
            }

            try
            {
                var result = _reportsRepository.ExecuteReport(request);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch
            {
                return StatusCode(500, new { message = "Unable to execute report." });
            }
        }

        [HttpGet("get/{name}")]
        public IActionResult Get(string name)
        {
            var report = _reportsRepository.GetReport(name);
            if (report == null) return NotFound();
            return Ok(report);
        }

        [HttpGet("columns")]
        public IActionResult Columns([FromQuery] int reportId)
        {
            try
            {
                var result = _reportsRepository.GetReportColumns(reportId);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("columns/visible")]
        public IActionResult VisibleColumns([FromQuery] int reportId)
        {
            try
            {
                var result = _reportsRepository.GetVisibleColumns(reportId);
                return Ok(result);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("columns/save")]
        public IActionResult SaveColumnPreferences([FromBody] ReportColumnPreferenceRequest request)
        {
            if (request == null || request.ReportId <= 0)
            {
                return BadRequest(new { message = "Invalid report ID." });
            }

            try
            {
                var result = _reportsRepository.SaveColumnPreferences(request.ReportId, request.ColumnVisibilityJson);
                return Ok(new { message = result });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("columns/reset")]
        public IActionResult ResetColumnView([FromBody] ReportColumnResetRequest request)
        {
            if (request == null || request.ReportId <= 0)
            {
                return BadRequest(new { message = "Invalid report ID." });
            }

            try
            {
                var result = _reportsRepository.ResetColumnView(request.ReportId);
                return Ok(new { message = result });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

    }
}
