using GayatriCateringPortal.Interfaces;
using Microsoft.AspNetCore.Mvc;
namespace GayatriCateringPortal.Controllers.Admin
{
    [Route("Admin/Dashboard")]
    public class DashboardController : Controller
    {
        private readonly IDashboardRepository _dashboardRepository;

        public DashboardController(IDashboardRepository dashboardRepository)
        {
            _dashboardRepository = dashboardRepository;
        }

        [HttpGet("")]
        public IActionResult Index()
        {
            //var summary = _dashboardRepository.GetSummary();
            //ViewData["Summary"] = summary;
            ViewData["Mode"] = "admin";
            ViewData["Page"] = "dashboard";
            ViewData["Title"] = "Dashboard";
            ViewData["UseOrderPayment"] = true;
            return View("~/Views/Admin/Dashboard.cshtml");
        }

        [HttpGet("get")]
        public IActionResult GetDashboard(DateTime? fromDate, DateTime? toDate)
        {
            var data = _dashboardRepository.GetDashboard(fromDate, toDate);
            return Ok(data);
        }
    }
}
