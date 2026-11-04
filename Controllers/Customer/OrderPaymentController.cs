using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using System.Security.Cryptography;
using System.Text;

namespace GayatriCateringPortal.Controllers.Customer;

[AllowAnonymous]
[Route("Customer/OrderPayment")]
public class OrderPaymentController : Controller
{
    private const string ReminderProtectorPurpose = "Gayatri.ReminderPaymentLink.v1";
    private const string ReminderTokenUsedPrefix = "reminderpay:used:";
    private readonly IOrderPaymentRepository _payments;
    private readonly IDistributedCache _cache;
    private readonly IDataProtector _reminderProtector;

    public OrderPaymentController(IOrderPaymentRepository payments, IDistributedCache cache, IDataProtectionProvider dataProtectionProvider)
    {
        _payments = payments;
        _cache = cache;
        _reminderProtector = dataProtectionProvider.CreateProtector(ReminderProtectorPurpose);
    }

    [HttpGet("")]
    public IActionResult Index() => PartialView("~/Views/Shared/_OrderPayment.cshtml");

    [HttpGet("config")]
    public IActionResult GetConfig()
    {
        var result = _payments.GetConfig();
        return StatusCode(result.HttpStatusCode, result);
    }

    [HttpPost("pay")]
    public async Task<IActionResult> Pay([FromBody] CreateOrderPaymentRequest request)
    {
        if (string.Equals(request?.ReturnPage, "reminderpayment", StringComparison.OrdinalIgnoreCase))
        {
            if (!TryValidateReminderTokenForOrder(request?.ReturnToken, request?.OrderId ?? 0, out var tokenValidationMessage))
                return BadRequest(new OrderPaymentResult { Success = false, Message = tokenValidationMessage, HttpStatusCode = 400 });
        }

        var returnBaseUrl = $"{Request.Scheme}://{Request.Host}";
        var result = await _payments.ProcessPaymentAsync(
            request,
            HttpContext.Session.GetInt32("UserId"),
            returnBaseUrl);

        if (result.Paid && string.Equals(request?.ReturnPage, "reminderpayment", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(request?.ReturnToken))
            await MarkReminderTokenUsedAsync(request.ReturnToken);

        return StatusCode(result.HttpStatusCode, result);
    }

    [HttpGet("status/{chargeId}")]
    public async Task<IActionResult> GetStatus(string chargeId)
    {
        var result = await _payments.GetPaymentStatusAsync(chargeId);
        return StatusCode(result.HttpStatusCode, result);
    }

    [HttpGet("complete")]
    public async Task<IActionResult> Complete(int orderId, long paymentId, string? returnPage, string? returnToken)
    {
        var result = await _payments.GetPaymentStatusByPaymentIdAsync(paymentId);
        if (result.Paid && string.Equals(returnPage, "reminderpayment", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(returnToken))
        {
            if (TryValidateReminderTokenForOrder(returnToken, orderId, out _))
                await MarkReminderTokenUsedAsync(returnToken);
        }

        var targetPage = "/Customer/Order";

        if (string.Equals(returnPage, "myorders", StringComparison.OrdinalIgnoreCase))
            targetPage = "/Customer/MyOrders";
        else if (string.Equals(returnPage, "reminderpayment", StringComparison.OrdinalIgnoreCase))
            targetPage = "/Customer/ReminderPayment";
        else if (string.Equals(returnPage, "adminquotations", StringComparison.OrdinalIgnoreCase))
            targetPage = "/Admin/Quotations";
        else if (string.Equals(returnPage, "adminorders", StringComparison.OrdinalIgnoreCase))
            targetPage = "/Admin/Orders";
        else if (string.Equals(returnPage, "admindashboard", StringComparison.OrdinalIgnoreCase))
            targetPage = "/Admin/Dashboard";

        var queryParts = new List<string>();
        if (string.Equals(returnPage, "reminderpayment", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(returnToken))
            queryParts.Add("token=" + Uri.EscapeDataString(returnToken));

        queryParts.Add("paymentOrderId=" + orderId);
        queryParts.Add("paymentId=" + paymentId);
        queryParts.Add("paymentStatus=" + Uri.EscapeDataString(result.Status ?? string.Empty));

        if (!string.IsNullOrWhiteSpace(result.ChargeId))
            queryParts.Add("paymentChargeId=" + Uri.EscapeDataString(result.ChargeId));

        var redirectUrl = targetPage + "?" + string.Join("&", queryParts);

        return Redirect(redirectUrl);
    }

    private bool TryValidateReminderTokenForOrder(string? token, int orderId, out string message)
    {
        message = "Invalid payment reminder link.";

        if (string.IsNullOrWhiteSpace(token) || orderId <= 0)
            return false;

        if (IsReminderTokenUsed(token))
        {
            message = "This payment link was already used. Please request a new reminder link.";
            return false;
        }

        try
        {
            var protectedPayload = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(token));
            var payload = _reminderProtector.Unprotect(protectedPayload);
            var parts = payload.Split('|');
            if (parts.Length < 4)
                return false;

            if (!int.TryParse(parts[0], out var tokenOrderId) || tokenOrderId <= 0 || tokenOrderId != orderId)
            {
                message = "This payment link is not valid for the selected order.";
                return false;
            }

            if (!long.TryParse(parts[2], out var expiryUnix))
                return false;

            var expiresAtUtc = DateTimeOffset.FromUnixTimeSeconds(expiryUnix);
            if (DateTimeOffset.UtcNow > expiresAtUtc)
            {
                message = "This payment link has expired. Please request a new reminder link.";
                return false;
            }

            return true;
        }
        catch
        {
            return false;
        }
    }

    private bool IsReminderTokenUsed(string token)
    {
        var key = ReminderTokenUsedPrefix + ComputeTokenHash(token);
        return _cache.GetString(key) == "1";
    }

    private async Task MarkReminderTokenUsedAsync(string token)
    {
        var key = ReminderTokenUsedPrefix + ComputeTokenHash(token);
        await _cache.SetStringAsync(key, "1", new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(2)
        });
    }

    private static string ComputeTokenHash(string token)
    {
        using var sha = SHA256.Create();
        var hash = sha.ComputeHash(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

}
