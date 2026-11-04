using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using Microsoft.AspNetCore.Mvc;

namespace GayatriCateringPortal.Controllers.Admin
{
    [Route("Admin/OrderRefund")]
    public class OrderRefundController : Controller
    {
        private readonly IOrderRefundRepository _orderRefund;

        public OrderRefundController(IOrderRefundRepository orderRefund)
        {
            _orderRefund = orderRefund;
        }

        [HttpGet("summary/{orderId}")]
        public IActionResult GetSummary(int orderId)
        {
            if (orderId <= 0)
                return BadRequest(new { success = false, message = "Invalid order." });

            var item = _orderRefund.GetRefundSummary(orderId);
            if (item == null)
                return NotFound(new { success = false, message = "Order or successful payment was not found." });

            return Ok(new { success = true, data = item });
        }

        [HttpPost("process")]
        public async Task<IActionResult> Process([FromBody] CreateOrderRefundRequest request)
        {
            if (request == null || request.OrderId <= 0 || request.RefundAmount <= 0 || string.IsNullOrWhiteSpace(request.Reason))
                return BadRequest(new { success = false, message = "Order, refund amount and cancellation reason are required." });

            var result = await _orderRefund.ProcessRefundAsync(request, HttpContext.Session.GetInt32("UserId"));
            return StatusCode(result.HttpStatusCode, result);
        }

        [HttpPost("cancel-without-refund")]
        public IActionResult CancelWithoutRefund([FromBody] CreateOrderRefundRequest request)
        {
            if (request == null || request.OrderId <= 0 || string.IsNullOrWhiteSpace(request.Reason))
                return BadRequest(new { success = false, message = "Order and cancellation reason are required." });

            var result = _orderRefund.CancelWithoutRefund(request, HttpContext.Session.GetInt32("UserId"));
            return StatusCode(result.HttpStatusCode, result);
        }
    }
}
