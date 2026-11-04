using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using GayatriCateringPortal.Interfaces.Customer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace GayatriCateringPortal.Controllers.Customer
{
    [AllowAnonymous]
    [Route("Customer/Order")]
    public class OrderController : Controller
    {
        private readonly IOrdersRepository _orders;
        private readonly IAddOnRepository _addOns;
        private readonly IEventMasterRepository _events;
        private readonly IPackageRepository _packages;
        private readonly IMealPeriodsRepository _mealPeriods;
        private readonly IUtensilsRepository _utensils;
        private readonly IViewOrderDetailsRepository _orderDetails;
        private readonly ICommonRepository _common;
        private readonly ILocationsRepository _locations;

        public OrderController(IOrdersRepository orders, IAddOnRepository addOns,
            IEventMasterRepository events,
            IPackageRepository packages, IMealPeriodsRepository mealPeriods,
            IUtensilsRepository utensils, IViewOrderDetailsRepository orderDetails,
            ICommonRepository common, ILocationsRepository locations)
        {
            _orders = orders;
            _addOns = addOns;
            _events = events;
            _packages = packages;
            _mealPeriods = mealPeriods;
            _utensils = utensils;
            _orderDetails = orderDetails;
            _common = common;
            _locations = locations;
        }

        [HttpGet("events")]
        public IActionResult GetEvents() => Ok(_events.GetAll()
            .Where(item => item.IsActive && item.IsDeleted != true)
            .OrderBy(item => item.Name)
            .Select(item => new
            {
                id = item.Id,
                name = item.Name,
                minPax = item.MinPax,
                advanceBookingDays = item.AdvanceBookingDays
            }));

        [HttpGet("events/{eventId:int}/packages")]
        public IActionResult GetEventPackages(int eventId)
        {
            if (eventId <= 0) return BadRequest(new { message = "A valid event is required." });
            var selectedEvent = _events.GetById(eventId);
            if (selectedEvent == null || !selectedEvent.IsActive || selectedEvent.IsDeleted)
                return NotFound(new { message = "Event not found." });

            return Ok(_packages.GetByEventId(eventId).Select(item => new
            {
                item.Id,
                item.Name,
                item.Description,
                item.Price,
                item.IsActive,
                item.IsDeleted,
                item.IsEmpty
            }));
        }

        [HttpGet("events/{eventId:int}")]
        public IActionResult GetEvent(int eventId)
        {
            if (eventId <= 0) return BadRequest(new { message = "A valid event is required." });

            var item = _events.GetById(eventId);
            if (item == null || item.IsDeleted)
                return NotFound(new { message = "Event not found." });

            return Ok(new { id = item.Id, name = item.Name });
        }

        [HttpGet("meal-periods")]
        public IActionResult GetMealPeriods()
        {
            try
            {
                var items = _mealPeriods.GetAll()
                    .Where(item => item.IsActive && item.IsDeleted != true)
                    .OrderBy(item => item.DisplayOrder)
                    .Select(item => new
                    {
                        id = item.Id,
                        mealPeriodName = item.MealPeriodName,
                        displayOrder = item.DisplayOrder
                    })
                    .ToList();
                return Ok(items);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Unable to load meal periods.", detail = ex.Message });
            }
        }

        [HttpGet("delivery-zones")]
        public IActionResult GetDeliveryZones()
        {

                var items = _locations.GetAll();
                    return Ok(items);
               
                
            
        }

        [HttpGet("utensils")]
        public IActionResult GetUtensils()
        {
                  
                var items = _utensils.GetAll();
            return Ok(items);

            
        }

        [HttpGet("")]
        public IActionResult Index()
        {
            ViewData["Mode"] = "customer";
            ViewData["Page"] = "order";
            ViewData["Title"] = "Place Order";
            return View("~/Views/Customer/Order.cshtml");
        }



        [HttpGet("addons")]
        public IActionResult GetAddOns()
        {


            var items = _addOns.GetAll();

            return Ok(items);
        }

        [HttpPost("save")]
        public IActionResult Save([FromBody] CreateOrderRequest request)
        {
            try
            {
                var currentUserId = HttpContext.Session.GetInt32("UserId") ?? 0;
                if (currentUserId > 0)
                {
                    request.Customer.CreatedBy = currentUserId;
                    request.Order.CreatedBy = currentUserId;
                }
                int orderId = request.Order.Id > 0
                    ? _orders.UpdateCompleteOrder(request)
                    : _orders.CreateCompleteOrder(request);
                var message = request.Order.Id > 0 ? "Order updated successfully." : "Order submitted successfully.";
                var orderNumber = request.Order.OrderNumber ?? string.Empty;
                if (orderId > 0)
                {
                    try
                    {
                        orderNumber = _orderDetails.GetByOrderId(orderId)?.Order?.OrderNumber ?? orderNumber;
                    }
                    catch
                    {
                        // The order is already committed; keep the submitted number as a safe fallback.
                    }
                }
                return Ok(new { success = orderId > 0, id = orderId, orderNumber, message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        [HttpGet("payment-status")]
        public IActionResult GetPaymentStatus([FromQuery] int orderId)
        {
            if (orderId <= 0)
                return BadRequest(new { success = false, message = "Invalid order id." });

            try
            {
                var status = _orders.GetOrderPaymentStatus(orderId);
                if (status == null)
                    return NotFound(new { success = false, message = "Order not found." });

                return Ok(new
                {
                    success = true,
                    orderId = status.OrderId,
                    totalAmount = status.TotalAmount,
                    paidAmount = status.PaidAmount,
                    paymentStatus = status.PaymentStatus,
                    isPaid = status.IsPaid
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }        

        [HttpPost("SendQuotationWhatsapp")]
        public IActionResult SendQuotationWhatsapp([FromForm] int orderId)
        {
            if (orderId <= 0)
                return BadRequest(new { success = false, message = "Invalid quotation." });

            try
            {
                var order = _orderDetails.GetByOrderId(orderId)?.Order;
                if (order == null)
                    return NotFound(new { success = false, message = "Quotation not found." });

                const string whatsappNumber = "6562946294";

                var message = $"Hello {order.CustomerName}, your quotation {order.OrderNumber} for {order.EventName} is ready. " +
                    $"Event date: {order.EventDate:dd MMM yyyy}. Total: S${order.TotalAmount:N2}.";
                var whatsappUrl = "https://wa.me/" + whatsappNumber + "?text=" + Uri.EscapeDataString(message);
                return Ok(new { success = true, whatsappUrl });
            }
            catch (Exception)
            {
                return StatusCode(500, new { success = false, message = "Unable to prepare the WhatsApp message right now." });
            }
        }      

    }
}
