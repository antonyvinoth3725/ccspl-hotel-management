using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.WebUtilities;

namespace GayatriCateringPortal.Common;

public static class SignatureLinkToken
{
    public static string Create(string payload, string signingKey)
    {
        var payloadBytes = Encoding.UTF8.GetBytes(payload);
        var signature = HMACSHA256.HashData(Encoding.UTF8.GetBytes(signingKey), payloadBytes);
        return WebEncoders.Base64UrlEncode(payloadBytes) + "." + WebEncoders.Base64UrlEncode(signature);
    }

    public static bool TryRead(string? token, string signingKey, out string payload)
    {
        payload = string.Empty;
        try
        {
            var parts = (token ?? string.Empty).Split('.');
            if (parts.Length != 2) return false;

            var payloadBytes = WebEncoders.Base64UrlDecode(parts[0]);
            var suppliedSignature = WebEncoders.Base64UrlDecode(parts[1]);
            var expectedSignature = HMACSHA256.HashData(Encoding.UTF8.GetBytes(signingKey), payloadBytes);
            if (!CryptographicOperations.FixedTimeEquals(suppliedSignature, expectedSignature)) return false;

            payload = Encoding.UTF8.GetString(payloadBytes);
            return true;
        }
        catch
        {
            return false;
        }
    }
}
