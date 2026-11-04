using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Interfaces.Customer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GayatriCateringPortal.Controllers.Customer;

[AllowAnonymous]
[Route("Customer/MyOrders")]
public class MyOrdersController : Controller
{
    private readonly IMYOrderRepository _myOrders;
    private readonly IViewOrderDetailsRepository _viewOrderDetails;

    public MyOrdersController(IMYOrderRepository myOrders, IViewOrderDetailsRepository viewOrderDetails)
    {
        _myOrders = myOrders;
        _viewOrderDetails = viewOrderDetails;
    }

    [HttpGet("")]
    public IActionResult Index()
    {
        ViewData["Mode"] = "customer";
        ViewData["Page"] = "myorders";
        ViewData["Title"] = "My Orders";
        return View("~/Views/Customer/MyOrders.cshtml");
    }

    [HttpGet("get")]
    public IActionResult GetMyOrders([FromQuery] string phoneNo)
    {
        if (string.IsNullOrWhiteSpace(phoneNo))
            return BadRequest(new { message = "Please enter your phone number." });

        return Ok(_myOrders.GetMyOrders(phoneNo.Trim()));
    }

    [HttpGet("details")]
    public IActionResult GetOrderDetails([FromQuery] int orderId, [FromQuery] string phoneNo)
    {
        if (orderId <= 0)
            return BadRequest(new { success = false, message = "Valid order Id is required." });

        if (string.IsNullOrWhiteSpace(phoneNo))
            return BadRequest(new { success = false, message = "Please enter your phone number." });

        var normalizedPhone = phoneNo.Trim();
        var order = _myOrders.GetMyOrders(normalizedPhone)
            .FirstOrDefault(item => item.Id == orderId);

        if (order == null)
            return NotFound(new { success = false, message = "Order details were not found." });

        try
        {
            var details = _viewOrderDetails.GetByOrderId(orderId);
            if (details == null)
                return NotFound(new { success = false, message = "Order details were not found." });

            return Ok(new { success = true, orderId, details });
        }
        catch (Exception ex)
        {
            return BadRequest(new { success = false, message = ex.Message });
        }
    }

    [HttpPost("convert-to-order")]
    public IActionResult ConvertToOrder(int quotationId, string phoneNo)
    {
        if (quotationId <= 0 || string.IsNullOrWhiteSpace(phoneNo))
            return BadRequest(new { success = false, message = "Invalid quotation." });

        var quotation = _myOrders.GetMyOrders(phoneNo.Trim())
            .FirstOrDefault(item => item.Id == quotationId && item.OrderStatus == 5);

        if (quotation == null)
            return NotFound(new { success = false, message = "Quotation not found." });

        var result = _myOrders.ConvertQuotationToOrder(quotationId);
        if (result == -1)
            return Ok(new { success = false, message = "Order already exists." });

        return Ok(new { success = result > 0, message = "Order created successfully." });
    }
}
