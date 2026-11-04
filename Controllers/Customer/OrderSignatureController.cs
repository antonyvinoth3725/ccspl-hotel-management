using System.Text;
using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using GayatriCateringPortal.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Distributed;
using System.Security.Cryptography;

namespace GayatriCateringPortal.Controllers.Customer;

[AllowAnonymous]
[Route("Customer/OrderSignature")]
public class OrderSignatureController : Controller
{
    private const int MaxSignatureBytes = 2 * 1024 * 1024;
    private const string UsedTokenPrefix = "ordersignature:used:";
    private readonly IOrdersRepository _orders;
    private readonly IViewOrderDetailsRepository _orderDetails;
    private readonly string _signatureSigningKey;
    private readonly IDistributedCache _cache;

    public OrderSignatureController(IOrdersRepository orders, IViewOrderDetailsRepository orderDetails, IDistributedCache cache, IConfiguration configuration)
    {
        _orders = orders;
        _orderDetails = orderDetails;
        _cache = cache;
        _signatureSigningKey = configuration["AppSettings:SignatureLinkSigningKey"] ?? string.Empty;
    }

    [HttpGet("")]
    public IActionResult Index(string token)
    {
        if (!TryReadToken(token, out var orderId, out var email, out var error))
            return SignatureView(new OrderSignatureViewModel { Status = "invalid", Message = error });

        var order = _orderDetails.GetByOrderId(orderId)?.Order;
        if (order == null || !string.Equals(order.EmailId?.Trim(), email, StringComparison.OrdinalIgnoreCase))
            return SignatureView(new OrderSignatureViewModel { Status = "invalid", Message = "This signature request is no longer valid." });

        if (order.HasDigitalSignature || IsTokenUsed(token))
        {
            return SignatureView(new OrderSignatureViewModel
            {
                Status = "signed",
                Message = "Your signature for this order has already been submitted.",
                Order = order
            });
        }

        return SignatureView(new OrderSignatureViewModel
        {
            IsValid = true,
            Status = "ready",
            Token = token,
            Order = order
        });
    }

    [HttpPost("Submit")]
    [ValidateAntiForgeryToken]
    public IActionResult Submit([FromForm] SubmitOrderSignatureRequest request)
    {
        if (!TryReadToken(request.Token, out var orderId, out var email, out var error))
            return BadRequest(new { success = false, message = error });

        if (IsTokenUsed(request.Token))
            return Conflict(new { success = false, alreadySigned = true, message = "Your signature for this order has already been submitted." });

        var order = _orderDetails.GetByOrderId(orderId)?.Order;
        if (order == null || !string.Equals(order.EmailId?.Trim(), email, StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { success = false, message = "This signature request is no longer valid." });

        if (!TryDecodeSignature(request.Signature, out var bytes, out error))
            return BadRequest(new { success = false, message = error });

        if (!_orders.UpdateDigitalSignature(orderId, bytes))
            return Conflict(new { success = false, alreadySigned = true, message = "Your signature for this order has already been submitted." });

        MarkTokenUsed(request.Token);

        return Ok(new { success = true, message = "Your signature was submitted successfully.", orderNumber = order.OrderNumber });
    }

    private IActionResult SignatureView(OrderSignatureViewModel model)
    {
        return View("~/Views/Customer/OrderSignature.cshtml", model);
    }

    private bool IsTokenUsed(string token)
    {
        return _cache.GetString(UsedTokenPrefix + HashToken(token)) == "1";
    }

    private void MarkTokenUsed(string token)
    {
        _cache.SetString(
            UsedTokenPrefix + HashToken(token),
            "1",
            new DistributedCacheEntryOptions { AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(7) });
    }

    private static string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token ?? string.Empty));
        return Convert.ToHexString(bytes);
    }

    private bool TryReadToken(string? token, out int orderId, out string email, out string error)
    {
        orderId = 0; email = string.Empty; error = "The signature link is invalid.";
        try
        {
            if (string.IsNullOrWhiteSpace(_signatureSigningKey) ||
                !SignatureLinkToken.TryRead(token, _signatureSigningKey, out var payload)) return false;
            var parts = payload.Split('|');
            if (parts.Length != 4 || !int.TryParse(parts[0], out orderId) || orderId <= 0 ||
                !long.TryParse(parts[2], out var expiry) || DateTimeOffset.UtcNow.ToUnixTimeSeconds() > expiry)
            {
                error = "The signature link is invalid or has expired.";
                return false;
            }
            email = parts[1];
            return !string.IsNullOrWhiteSpace(email);
        }
        catch { return false; }
    }

    private static bool TryDecodeSignature(string? value, out byte[] bytes, out string error)
    {
        bytes = Array.Empty<byte>(); error = "Please draw your signature before submitting.";
        const string prefix = "data:image/png;base64,";
        if (string.IsNullOrWhiteSpace(value) || !value.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)) return false;
        try { bytes = Convert.FromBase64String(value[prefix.Length..]); }
        catch (FormatException) { error = "The signature image is invalid."; return false; }
        if (bytes.Length == 0 || bytes.Length > MaxSignatureBytes) { error = "The signature image is empty or too large."; return false; }
        return true;
    }
}
