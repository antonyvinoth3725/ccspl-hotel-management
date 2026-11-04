using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using Microsoft.AspNetCore.Mvc;
namespace GayatriCateringPortal.Controllers.Admin
{
    [Route("Admin/Kitchen")]
    public class KitchenController : Controller
    {
        private readonly IKitchenRepository _kitchenRepository;

        public KitchenController(IKitchenRepository kitchenRepository)
        {
            _kitchenRepository = kitchenRepository;
        }

        [HttpGet("")]
        public IActionResult Index()
        {
            ViewData["Mode"] = "admin";
            ViewData["Page"] = "kitchen";
            ViewData["Title"] = "Kitchen";
            return View("~/Views/Admin/Kitchen.cshtml");
        }

        [HttpGet("GetKitchenQueueOrders")]
        public IActionResult GetKitchenQueueOrders(int Status, string Fromdate , string ToDate )
        {
            var items = _kitchenRepository.GetKitchenQueueOrders(Status, Fromdate, ToDate);
            return Ok(items);
        }

    }
}
