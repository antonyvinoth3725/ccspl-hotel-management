using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Interfaces.Customer;
using Microsoft.AspNetCore.Mvc;

namespace GayatriCateringPortal.Controllers.Admin;

[Route("Admin/ViewOrderDetails")]
public class ViewOrderDetailsController : Controller
{
    private readonly IViewOrderDetailsRepository _repository;
    private readonly IPackageRepository _packages;

    public ViewOrderDetailsController(IViewOrderDetailsRepository repository, IPackageRepository packages)
    {
        _repository = repository;
        _packages = packages;
    }

    [HttpGet("")]
    public IActionResult Index([FromQuery] int orderId)
    {
        ViewData["Mode"] = "admin";
        ViewData["Page"] = "orders";
        ViewData["Title"] = "View Order Details";
        ViewData["OrderId"] = orderId;
        return View("~/Views/Admin/ViewOrderDetails.cshtml");
    }

    [HttpGet("get")]
    public IActionResult Get([FromQuery] int orderId)
    {
        if (orderId <= 0)
            return BadRequest(new { success = false, message = "Valid order Id is required." });
        try
        {
            var details = _repository.GetByOrderId(orderId);
            if (details == null)
                return NotFound(new { success = false, message = "Order details were not found." });

            if (details.Package != null && details.Package.PackageId > 0)
            {
                var package = _packages.GetById(details.Package.PackageId);
                details.Package.IsEmpty = package?.IsEmpty == true;
            }

            return Ok(new { success = true, orderId, details });
        }
        catch (Exception ex) { return BadRequest(new { success = false, message = ex.Message }); }
    }
}
