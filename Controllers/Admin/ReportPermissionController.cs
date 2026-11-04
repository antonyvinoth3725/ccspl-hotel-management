using Microsoft.AspNetCore.Mvc;

namespace GayatriCateringPortal.Controllers.Admin
{
    [Route("Admin/ReportPermission")]
    public class ReportPermissionController : Controller
    {
        /// <summary>
        /// GET: Admin/ReportPermission - Render Report Permission management page
        /// </summary>
        [HttpGet("")]
        public IActionResult Index()
        {
            ViewData["Mode"] = "admin";
            ViewData["Page"] = "reportpermission";
            ViewData["Title"] = "Report Permission";
            return View("~/Views/Admin/ReportPermission.cshtml");
        }
    }
}
