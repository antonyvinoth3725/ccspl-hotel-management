using GayatriCateringPortal.Interfaces;
using Microsoft.AspNetCore.Mvc;
namespace GayatriCateringPortal.Controllers.Admin
{
    [Route("Admin/Quotations")]
    public class QuotationsController : Controller
    {
        private readonly IQuotationsRepository _quotationsRepository;
        private readonly IViewOrderDetailsRepository _orderDetails;

        public QuotationsController(
            IQuotationsRepository quotationsRepository,
            IViewOrderDetailsRepository orderDetails)
        {
            _quotationsRepository = quotationsRepository;
            _orderDetails = orderDetails;
        }

        [HttpGet("")]
        public IActionResult Index()
        {

            ViewData["Mode"] = "admin";
            ViewData["Page"] = "quotations";
            ViewData["Title"] = "Quotations";
            ViewData["UseOrderPayment"] = true;
            return View("~/Views/Admin/Quotations.cshtml");
        }

        [HttpGet("get")]
        public IActionResult GetAll([FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
        {
            var items = _quotationsRepository.GetAll(fromDate, toDate);

            return Ok(items);
        }

        [HttpGet("get/{id}")]
        public IActionResult Get(int id)
        {
            var item = _quotationsRepository.GetById(id);
            if (item == null) return NotFound();
            return Ok(item);
        }

        [HttpPost("ConvertToOrder")]
        public IActionResult ConvertToOrder(int QuotationId)
        {
            if (QuotationId == 0) return BadRequest();
            int result = _quotationsRepository.ConvertToOrder(QuotationId);

            if (result == -1)
            {
                return Ok(new { success = false, message = "Order already exists" });
            }

            if (result <= 0)
                return Ok(new { success = false, message = "Unable to convert quotation." });

            var details = _orderDetails.GetByOrderId(result);
            return Ok(new
            {
                success = true,
                orderStatus = result,
                orderId = details.Order?.OrderId ?? 0,
                orderNumber = details?.Order?.OrderNumber ?? string.Empty,
                email = details?.Order?.EmailId ?? string.Empty,
                totalAmount = details?.Order?.TotalAmount ?? 0,
                message = "Order created successfully."
            });
        }

        [HttpPost("delete/{id}")]
        public IActionResult Delete(int id)
        {
            bool result = _quotationsRepository.Delete(id);
            return Ok(new { success = result });
        }

        [HttpPost("activeinactive/{id}")]
        public IActionResult ActiveInActive(int id)
        {
            bool result = _quotationsRepository.ActiveInActive(id);
            return Ok(new { success = result });
        }
    }
}
