using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using Microsoft.AspNetCore.Mvc;
namespace GayatriCateringPortal.Controllers.Admin
{
    [Route("Admin/Logistics")]
    public class LogisticsController : Controller
    {
        private readonly ILogisticsRepository _logisticsRepository;
        private readonly IOrdersRepository _OrderRepository;

        public LogisticsController(ILogisticsRepository logisticsRepository, IOrdersRepository OrderRepository)
        {
            _logisticsRepository = logisticsRepository;
            _OrderRepository = OrderRepository;
        }

        [HttpGet("")]
        public IActionResult Index()
        {
            ViewData["Mode"] = "admin";
            ViewData["Page"] = "logistics";
            ViewData["Title"] = "Logistics";
            return View("~/Views/Admin/Logistics.cshtml");
        }

        [HttpGet("get")]
        public IActionResult GetAll([FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate, [FromQuery] string Indicator)
        {
            var items = _logisticsRepository.GetAll(fromDate, toDate, Indicator);
            return Ok(items);
        }

        [HttpGet("getDelivered")]
        public IActionResult GetDelivered()
        {
            var items = _logisticsRepository.GetDelivered();
            return Ok(items);
        }

        [HttpGet("get/{id}")]
        public IActionResult Get(int id)
        {
            var item = _logisticsRepository.GetById(id);
            if (item == null) return NotFound();
            return Ok(item);
        }

        [HttpPost("Create")]
        public IActionResult create([FromBody] LogisticsDetails item)
        {
            if (!ModelState.IsValid)
            {
                var errors = string.Join("; ", ModelState.Values
                .SelectMany(x => x.Errors)
                .Select(x => x.ErrorMessage));
            }

            if (item == null) return BadRequest();
            var result = _logisticsRepository.Create(item);

            //if (result == -1)
            //{
            //    return Ok(new { success = false, message = "Order already exists" });
            //}


            var updatedStatus = _OrderRepository.UpdateOrderStatus(item.Id, 3);
            if (!updatedStatus)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Order was not found or could not be updated."
                });
            }

            string baseUrl = $"{Request.Scheme}://{Request.Host}";

            string url = $"{baseUrl}/DriverDelivery/Verify?token={result.Token}";

            string message =
$@"Gayatri Catering - Delivery Assignment

Hi {result.DriverName} Your delivery access for today is ready.

OTP : {result.OTP}

Tap to Start:

{url}

This link and OTP are valid until midnight and show all of today's assigned deliveries.";

            var whatsappPhone = NormalizeWhatsAppPhone(result.Mobile);
            string whatsappUrl =
$"https://api.whatsapp.com/send?phone={whatsappPhone}&text={Uri.EscapeDataString(message)}";

            //return Ok(new { success = true, orderStatus = updatedStatus, message = "Driver Assigned successfully." });

            return Json(new
            {
                success = true,
                orderStatus = updatedStatus,
                message = result.IsNewDriverSession
                    ? "Driver assigned successfully. Send the daily access link and OTP."
                    : "Driver assigned successfully. The driver already has today's access link; no new link or OTP is required.",
                mobile = result.Mobile,
                token = result.Token,
                otp = result.OTP,
                url = url,
                whatsappUrl = result.IsNewDriverSession ? whatsappUrl : null,
                sendDriverAccessMessage = result.IsNewDriverSession
            });
        }

        [HttpPost("delete/{id}")]
        public IActionResult Delete(int id)
        {
            bool result = _logisticsRepository.Delete(id);
            return Ok(new { success = result });
        }

        [HttpPost("activeinactive/{id}")]
        public IActionResult ActiveInActive(int id)
        {
            bool result = _logisticsRepository.ActiveInActive(id);
            return Ok(new { success = result });
        }

        private static string NormalizeWhatsAppPhone(string? rawMobile)
        {
            if (string.IsNullOrWhiteSpace(rawMobile))
            {
                return string.Empty;
            }

            var digits = new string(rawMobile.Where(char.IsDigit).ToArray());

            if (string.IsNullOrEmpty(digits))
            {
                return string.Empty;
            }

            // Normalize common India formats.
            while (digits.StartsWith("0"))
            {
                digits = digits.Substring(1);
            }

            // If the number is local 10-digit, prefix country code 91.
            if (digits.Length == 10)
            {
                return "91" + digits;
            }

            // If already prefixed with 91, keep as-is.
            if (digits.StartsWith("91") && digits.Length >= 12)
            {
                return digits;
            }

            // Fallback: return available digits without decoration.
            return digits;
        }
    }
}
