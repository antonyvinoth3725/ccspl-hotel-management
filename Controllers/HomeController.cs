using GayatriCateringPortal.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;

namespace GayatriCateringPortal.Controllers
{
    [AllowAnonymous]
    [Route("")]
    public class HomeController : Controller
    {
        [HttpGet("")]
        public IActionResult Index() => Redirect("/Customer/Home");

        [Route("Home/Error")]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
