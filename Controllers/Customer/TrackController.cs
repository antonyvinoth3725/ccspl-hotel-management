using GayatriCateringPortal.Interfaces.Customer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GayatriCateringPortal.Controllers.Customer
{
    [AllowAnonymous]
    [Route("Customer/Track")]
    public class TrackController : Controller
    {
        private readonly IMYOrderRepository _myOrders;

        public TrackController(IMYOrderRepository myOrders)
        {
            _myOrders = myOrders;
        }

        [HttpGet("")]
        public IActionResult Index()
        {
            ViewData["Mode"] = "customer";
            ViewData["Page"] = "track";
            ViewData["Title"] = "Track Order";
            ViewData["ActiveNav"] = "Track";
            ViewData["HideTopActions"] = true;
            return View("~/Views/Customer/Track.cshtml");
        }

        [HttpGet("get")]
        public IActionResult Get([FromQuery] string reference)
        {
            if (string.IsNullOrWhiteSpace(reference))
            {
                return BadRequest(new { message = "Please enter an order reference." });
            }

            try
            {
                var searchValue = reference.Trim();
                var matches = _myOrders.GetMyOrders(searchValue);
                var order = matches.FirstOrDefault(x =>
                                string.Equals(x.OrderNumber, searchValue, StringComparison.OrdinalIgnoreCase))
                            ?? matches.FirstOrDefault();

                if (order == null)
                {
                    return NotFound(new { message = "No order was found for this reference." });
                }

                return Ok(order);
            }
            catch (Exception)
            {
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new { message = "Unable to track the order right now. Please try again." });
            }
        }
    }
}
