using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using GayatriCateringPortal.Repositories;
using GayatriCateringPortal.Common;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using System.Text;
namespace GayatriCateringPortal.Controllers.Admin
{
    [Route("Admin/Orders")]
    public class OrdersController : Controller
    {
        private const string ReminderProtectorPurpose = "Gayatri.ReminderPaymentLink.v1";
        private const int ReminderLinkExpiryHours = 2;
        private const int SignatureLinkExpiryDays = 7;
        private readonly IOrdersRepository _orders;
        private readonly IViewOrderDetailsRepository _orderDetails;
        private readonly IDataProtector _reminderProtector;
        private readonly string _signatureSigningKey;


        public OrdersController(IOrdersRepository orders, IViewOrderDetailsRepository orderDetails, IDataProtectionProvider dataProtectionProvider, IConfiguration configuration)
        {
            _orders = orders;
            _orderDetails = orderDetails;
            _reminderProtector = dataProtectionProvider.CreateProtector(ReminderProtectorPurpose);
            _signatureSigningKey = configuration["AppSettings:SignatureLinkSigningKey"] ?? string.Empty;
        }

        [HttpGet("")]
        public IActionResult Index()
        {
            ViewData["Mode"] = "admin";
            ViewData["Page"] = "orders";
            ViewData["Title"] = "Orders";
            ViewData["UseOrderPayment"] = true;
            return View("~/Views/Admin/Orders.cshtml");
        }

        [HttpGet("get")]
        public IActionResult GetAll([FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate, [FromQuery] string Indicator, [FromQuery] int? status, [FromQuery] string eventFilter)
        {
            var items = _orders.GetOrderList(fromDate, toDate, Indicator, status, eventFilter);
            return Ok(items);
        }

        [HttpPost("UpdateOrderStatus")]
        public IActionResult UpdateOrderStatus(int OrderId, int Status)
        {
            var updatedStatus = _orders.UpdateOrderStatus(OrderId, Status);
            return Ok(new
            {
                success = updatedStatus,
                orderStatus = Status,
                message = updatedStatus ? "Order status updated successfully." : "Unable to update order status."
            });
        }

        [HttpPost("UpdateOrderPaymentStatus")]
        public IActionResult UpdateOrderPaymentStatus(int OrderId, int Status)
        {
            var updatedStatus = _orders.UpdateOrderPaymentStatus(OrderId, Status);

            return Ok(new { success = true, orderStatus = updatedStatus, message = "Order payment status updated successfully." });
        }

        [HttpPost("CreateReOrder")]
        public IActionResult CreateReOrder(int OrderId)
        {
            if (OrderId == 0) return BadRequest();
            int result = _orders.CreateReOrder(OrderId);

            if (result == -1)
            {
                return Ok(new { success = false, message = "Order already exists" });
            }

            if (result <= 0)
                return Ok(new { success = false, message = "Unable to create re order." });

            var details = _orderDetails.GetByOrderId(result);
            return Ok(new
            {
                success = true,
                orderStatus = details?.Order?.OrderStatusName ?? string.Empty,
                orderId = result,
                orderNumber = details?.Order?.OrderNumber ?? string.Empty,
                customerName = details?.Order?.CustomerName ?? string.Empty,
                email = details?.Order?.EmailId ?? string.Empty,
                totalAmount = details?.Order?.TotalAmount ?? 0,
                message = "Re order created successfully."
            });
        }



        [HttpPost("CreateAmendmentOrder")]
        public IActionResult CreateAmendmentOrder([FromBody] CreateOrderRequest request)
        {
                if (request?.Order == null)
                    return BadRequest(new { success = false, id = 0, message = "Amendment order details are required." });

                request.PackageDetails ??= new List<OrderPackageDetails>();
                request.ExtraItems ??= new List<OrderExtraItems>();
                request.AddOns ??= new List<OrderAddOnsDetails>();
                request.Utensils ??= new List<OrderUtensilsDetails>();
                // An amendment is a new customer acknowledgement. Never carry the
                // original order's signature into the newly created order.
                request.Order.DigitalSignature = null;

                int amendmentOrderId = _orders.CreateAmendmentOrder(request);

                if (amendmentOrderId <= 0)
                {
                    return BadRequest(new
                    {
                        success = false,
                        id = 0,
                        message = "Unable to create amendment order."
                    });
                }

                var amendmentDetails = _orderDetails.GetByOrderId(amendmentOrderId);
                var amendmentOrder = amendmentDetails?.Order;

                return Ok(new
                {
                    success = true,
                    id = amendmentOrderId,
                    totalAmount = amendmentOrder?.TotalAmount ?? request.Order.TotalAmount,
                    paidAmount = amendmentOrder?.PaidAmount ?? request.Order.PaidAmount,
                    balanceAmount = amendmentOrder?.BalanceAmount ?? request.Order.BalanceAmount,
                    message = "Amendment order created successfully."
                });
        }

        [HttpPost("CreateReminderPaymentLink")]
        public IActionResult CreateReminderPaymentLink([FromBody] ReminderPaymentLinkRequest request)
        {
            var orderId = request?.OrderId ?? 0;
            if (orderId <= 0)
                return BadRequest(new { success = false, message = "Valid order Id is required." });

            var details = _orderDetails.GetByOrderId(orderId);
            var order = details?.Order;
            if (order == null)
                return NotFound(new { success = false, message = "Order was not found." });

            var mobileNo = Convert.ToString(order.MobileNo)?.Trim();
            if (string.IsNullOrWhiteSpace(mobileNo))
                return BadRequest(new { success = false, message = "Customer mobile number is missing for this order." });

            var totalAmount = Convert.ToDecimal(order.TotalAmount);
            var paidAmount = Convert.ToDecimal(order.PaidAmount);
            var balanceAmount = Math.Max(0m, totalAmount - paidAmount);
            if (balanceAmount <= 0)
                return BadRequest(new { success = false, message = "This order has no outstanding balance." });

            var expiryUnix = DateTimeOffset.UtcNow.AddHours(ReminderLinkExpiryHours).ToUnixTimeSeconds();
            var nonce = Guid.NewGuid().ToString("N");
            var payload = orderId + "|" + mobileNo + "|" + expiryUnix + "|" + nonce;
            var protectedPayload = _reminderProtector.Protect(payload);
            var token = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(protectedPayload));

            var paymentUrl = Url.Action("Index", "ReminderPayment", new { token }, Request.Scheme);
            if (string.IsNullOrWhiteSpace(paymentUrl))
                return StatusCode(500, new { success = false, message = "Unable to generate reminder payment link." });

            return Ok(new { success = true, paymentUrl });
        }

        public sealed class ReminderPaymentLinkRequest
        {
            public int OrderId { get; set; }
        }

        [HttpPost("CreateSignatureLink")]
        public IActionResult CreateSignatureLink([FromBody] SignatureLinkRequest request)
        {
            var orderId = request?.OrderId ?? 0;
            if (orderId <= 0)
                return BadRequest(new { success = false, message = "Valid order Id is required." });

            var order = _orderDetails.GetByOrderId(orderId)?.Order;
            if (order == null)
                return NotFound(new { success = false, message = "Order was not found." });

            var email = order.EmailId?.Trim();
            if (string.IsNullOrWhiteSpace(email))
                return BadRequest(new { success = false, message = "Customer email is missing for this order." });

            var expires = DateTimeOffset.UtcNow.AddDays(SignatureLinkExpiryDays).ToUnixTimeSeconds();
            var payload = $"{orderId}|{email.ToLowerInvariant()}|{expires}|{Guid.NewGuid():N}";
            if (string.IsNullOrWhiteSpace(_signatureSigningKey))
                return StatusCode(500, new { success = false, message = "Signature link signing key is not configured." });
            var token = SignatureLinkToken.Create(payload, _signatureSigningKey);
            var signatureUrl = Url.Action("Index", "OrderSignature", new { token }, Request.Scheme);
            if (string.IsNullOrWhiteSpace(signatureUrl))
                return StatusCode(500, new { success = false, message = "Unable to generate signature link." });

            return Ok(new { success = true, signatureUrl });
        }

        public sealed class SignatureLinkRequest
        {
            public int OrderId { get; set; }
        }





    }
}
