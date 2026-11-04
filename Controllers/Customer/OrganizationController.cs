using GayatriCateringPortal.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace GayatriCateringPortal.Controllers.Customer;

[Route("Customer/Organization")]
public class OrganizationController : Controller
{
    private readonly ISettingsRepository _organizationRepository;

    public OrganizationController(ISettingsRepository organizationRepository)
    {
        _organizationRepository = organizationRepository;
    }

    [HttpGet("gst")]
    public IActionResult GetGstRate()
    {
        var organizations = _organizationRepository.GetAll();
        var organization = organizations.FirstOrDefault(item => item.IsActive && !item.IsDeleted)
            ?? organizations.FirstOrDefault();

        if (organization == null)
        {
            return NotFound(new { message = "Organization GST rate is not configured." });
        }

        var effectiveGstRate = organization.GSTRate;
        var hasUpcomingConfigured = organization.UpcomingGSTRate.HasValue && organization.GSTEffectiveFrom.HasValue;

        if (hasUpcomingConfigured && DateTime.Today >= organization.GSTEffectiveFrom!.Value.Date)
        {
            effectiveGstRate = organization.UpcomingGSTRate!.Value;
        }

        return Ok(new
        {
            name = organization.Name,
            uen = organization.UEN,
            address = organization.Address,
            email = organization.Email,
            hotline = organization.Hotline,
            whatsapp = "+65 6294 6294",
            upiId = organization.UPIId,
            paymentGatewayDetails = organization.PaymentGatwayDetails,
            gstRate = effectiveGstRate,
            currentGstRate = organization.GSTRate,
            upcomingGstRate = organization.UpcomingGSTRate,
            gstEffectiveFrom = organization.GSTEffectiveFrom?.ToString("yyyy-MM-dd")
        });
    }
}
