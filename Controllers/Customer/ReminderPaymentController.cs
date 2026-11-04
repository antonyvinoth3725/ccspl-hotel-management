using GayatriCateringPortal.Interfaces.Customer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.WebUtilities;
using System.Security.Cryptography;
using System.Text;

namespace GayatriCateringPortal.Controllers.Customer;

[AllowAnonymous]
[Route("Customer/ReminderPayment")]
public class ReminderPaymentController : Controller
{
    private const string ReminderProtectorPurpose = "Gayatri.ReminderPaymentLink.v1";
    private const string ReminderTokenUsedPrefix = "reminderpay:used:";
    private readonly IMYOrderRepository _myOrders;
    private readonly IDataProtector _reminderProtector;
    private readonly IDistributedCache _cache;

    public ReminderPaymentController(IMYOrderRepository myOrders, IDataProtectionProvider dataProtectionProvider, IDistributedCache cache)
    {
        _myOrders = myOrders;
        _reminderProtector = dataProtectionProvider.CreateProtector(ReminderProtectorPurpose);
        _cache = cache;
    }

    [HttpGet("")]
    public IActionResult Index([FromQuery] string token)
    {
        ViewData["Mode"] = "customer";
        ViewData["Page"] = "reminderpayment";
        ViewData["Title"] = "Complete Payment";

        var model = new ReminderPaymentViewModel
        {
            Token = token ?? string.Empty,
            IsValid = false,
            Message = "This payment link is invalid or expired."
        };

        if (string.IsNullOrWhiteSpace(token))
            return View("~/Views/Customer/ReminderPayment.cshtml", model);

        if (!TryDecodeToken(token, out var orderId, out var mobileNo, out var expiresAtUtc))
            return View("~/Views/Customer/ReminderPayment.cshtml", model);

        if (IsTokenUsed(token))
        {
            model.Message = "This payment link was already used. Please request a new reminder link if payment is still pending.";
            model.Status = "used";
            return View("~/Views/Customer/ReminderPayment.cshtml", model);
        }

        if (DateTimeOffset.UtcNow > expiresAtUtc)
        {
            model.Message = "This payment link has expired. Please request a new reminder link.";
            model.Status = "expired";
            return View("~/Views/Customer/ReminderPayment.cshtml", model);
        }

        var order = _myOrders.GetMyOrders(mobileNo)
            .FirstOrDefault(item => item.Id == orderId);

        if (order == null)
        {
            model.Message = "The linked order was not found.";
            model.Status = "invalid";
            return View("~/Views/Customer/ReminderPayment.cshtml", model);
        }

        var totalAmount = Convert.ToDecimal(order.TotalAmount);
        var paidAmount = Convert.ToDecimal(order.PaidAmount);
        var balanceAmount = Math.Max(0m, totalAmount - paidAmount);

        if (balanceAmount <= 0)
        {
            model.Message = "This order is already fully paid.";
            model.Status = "paid";
            return View("~/Views/Customer/ReminderPayment.cshtml", model);
        }

        model.IsValid = true;
        model.OrderId = order.Id;
        model.OrderNumber = order.OrderNumber ?? ("#" + order.Id);
        model.CustomerName = order.CustomerName ?? "Customer";
        model.EmailId = order.EmailId ?? string.Empty;
        model.TotalAmount = totalAmount;
        model.PaidAmount = paidAmount;
        model.BalanceAmount = balanceAmount;
        model.ExpiresAtUtc = expiresAtUtc;
        model.Message = string.Empty;
        model.Status = "ready";

        return View("~/Views/Customer/ReminderPayment.cshtml", model);
    }

    private bool IsTokenUsed(string token)
    {
        var key = ReminderTokenUsedPrefix + ComputeTokenHash(token);
        return _cache.GetString(key) == "1";
    }

    private static string ComputeTokenHash(string token)
    {
        using var sha = SHA256.Create();
        var hash = sha.ComputeHash(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(hash).ToLowerInvariant();
    }

    private bool TryDecodeToken(string token, out int orderId, out string mobileNo, out DateTimeOffset expiresAtUtc)
    {
        orderId = 0;
        mobileNo = string.Empty;
        expiresAtUtc = DateTimeOffset.MinValue;

        try
        {
            var protectedPayload = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(token));
            var payload = _reminderProtector.Unprotect(protectedPayload);
            var parts = payload.Split('|');
            if (parts.Length < 4)
                return false;

            if (!int.TryParse(parts[0], out orderId) || orderId <= 0)
                return false;

            mobileNo = (parts[1] ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(mobileNo))
                return false;

            if (!long.TryParse(parts[2], out var expiryUnix))
                return false;

            expiresAtUtc = DateTimeOffset.FromUnixTimeSeconds(expiryUnix);
            return true;
        }
        catch
        {
            return false;
        }
    }

    public sealed class ReminderPaymentViewModel
    {
        public bool IsValid { get; set; }
        public string Message { get; set; } = string.Empty;
        public string Status { get; set; } = "invalid";
        public string Token { get; set; } = string.Empty;
        public int OrderId { get; set; }
        public string OrderNumber { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public string EmailId { get; set; } = string.Empty;
        public decimal TotalAmount { get; set; }
        public decimal PaidAmount { get; set; }
        public decimal BalanceAmount { get; set; }
        public DateTimeOffset ExpiresAtUtc { get; set; }
    }
}
