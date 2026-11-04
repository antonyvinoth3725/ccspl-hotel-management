using System;
using System.Collections.Generic;
using System.Net.Mail;
using System.Threading.Tasks;
using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace GayatriCateringPortal.Controllers
{
    [Route("Login")]
    public class LoginController : Controller
    {
        private readonly ILoginRepository _loginRepository;
        private readonly ICommonRepository _commonRepository;
        private readonly ILogger<LoginController> _logger;
        private readonly IConfiguration _configuration;

        public LoginController(ILoginRepository loginRepository, ICommonRepository commonRepository, ILogger<LoginController> logger, IConfiguration configuration)
        {
            _loginRepository = loginRepository;
            _commonRepository = commonRepository;
            _logger = logger;
            _configuration = configuration;
        }

        [HttpPost("SendCode")]
        public async Task<IActionResult> SendCode([FromBody] LoginSendCodeRequest request)
        {
            var email = (request?.Email ?? string.Empty).Trim();
            if (!IsValidEmail(email))
            {
                return Ok(new { success = false, message = "Please enter valid email." });
            }

            var user = _loginRepository.GetUserByEmail(email);
            if (user == null)
            {
                return Ok(new { success = false, message = "User not found with this email." });
            }

            if (!user.IsActive || user.IsDeleted)
            {
                return Ok(new { success = false, message = "User is inactive. Please contact administrator." });
            }

            try
            {
                const int expirySeconds = 60;
                var otp = _loginRepository.CreateOtp(email, expirySeconds);

                await _commonRepository.SendEmail(
                    email,
                    null,
                    "Your Gayatri Login OTP",
                    BuildOtpEmailBody(user.Name, otp.Code, expirySeconds));

                return Ok(new
                {
                    success = true,
                    message = "OTP sent successfully.",
                    expiresInSeconds = otp.ExpiresInSeconds,
                    expiresAtUtc = otp.ExpiresAtUtc
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send OTP to {Email}", email);
                return Ok(new { success = false, message = "Unable to send OTP. Please try again." });
            }
        }

        [HttpPost("VerifyCode")]
        public IActionResult VerifyCode([FromBody] LoginVerifyCodeRequest request)
        {
            var email = (request?.Email ?? string.Empty).Trim();
            var code = (request?.Code ?? string.Empty).Trim();

            if (!IsValidEmail(email))
            {
                return Ok(new { success = false, message = "Please enter valid email." });
            }

            if (string.IsNullOrWhiteSpace(code))
            {
                return Ok(new { success = false, message = "Please enter OTP code." });
            }

            var user = _loginRepository.GetUserByEmail(email);
            if (user == null)
            {
                return Ok(new { success = false, message = "User not found with this email." });
            }

            if (!user.IsActive || user.IsDeleted)
            {
                return Ok(new { success = false, message = "User is inactive. Please contact administrator." });
            }

            var allowTempOtp = _configuration.GetValue<bool>("Login:TempOtp:Enabled");
            var tempOtpCode = (_configuration["Login:TempOtp:Code"] ?? string.Empty).Trim();

            OtpVerifyResult verifyResult;
            if (allowTempOtp && !string.IsNullOrWhiteSpace(tempOtpCode) && string.Equals(code, tempOtpCode, StringComparison.Ordinal))
            {
                verifyResult = new OtpVerifyResult { IsValid = true, Message = "Temporary OTP accepted." };
            }
            else
            {
                verifyResult = _loginRepository.VerifyOtp(email, code);
            }

            if (!verifyResult.IsValid)
            {
                return Ok(new { success = false, message = verifyResult.Message });
            }

            var roles = _loginRepository.GetUserRolesByUserId(user.Id);
            if (roles == null || roles.Count == 0)
            {
                return Ok(new { success = false, message = "No role is mapped for this user." });
            }

            return Ok(new
            {
                success = true,
                message = "OTP validated successfully.",
                email,
                userId = user.Id,
                userName = user.Name ?? "User",
                roles
            });
        }

        [HttpPost("CompleteLogin")]
        public IActionResult CompleteLogin([FromBody] LoginCompleteRequest request)
        {
            var email = (request?.Email ?? string.Empty).Trim();
            var roleId = request?.RoleId ?? 0;

            if (!IsValidEmail(email))
            {
                return Ok(new { success = false, message = "Please enter valid email." });
            }

            if (roleId <= 0)
            {
                return Ok(new { success = false, message = "Please select role." });
            }

            var user = _loginRepository.GetUserByEmail(email);
            if (user == null)
            {
                return Ok(new { success = false, message = "User not found with this email." });
            }

            if (!user.IsActive || user.IsDeleted)
            {
                return Ok(new { success = false, message = "User is inactive. Please contact administrator." });
            }

            var roles = _loginRepository.GetUserRolesByUserId(user.Id);
            var selectedRole = roles.Find(r => r.RoleId == roleId);
            if (selectedRole == null)
            {
                return Ok(new { success = false, message = "Selected role is not assigned to user." });
            }

            _loginRepository.ClearOtp(email);

            var roleLabel = selectedRole.RoleName;
            var redirectUrl = roleId > 0 ? "/Admin/Dashboard" : "/Customer/Home";

            HttpContext.Session.SetInt32("UserId", user.Id);
            HttpContext.Session.SetInt32("RoleId", roleId);
            HttpContext.Session.SetString("RoleName", roleLabel ?? string.Empty);
            HttpContext.Session.SetString("UserEmail", email);

            return Ok(new
            {
                success = true,
                message = "Login successful.",
                email,
                userId = user.Id,
                roleId,
                roleLabel,
                userName = user.Name ?? "User",
                userImage = BuildUserImageUrl(user.Image),
                redirectUrl
            });
        }

        [HttpPost("Logout")]
        public IActionResult Logout()
        {
            HttpContext.Session.Clear();
            return Ok(new { success = true });
        }

        [HttpGet("SessionStatus")]
        public IActionResult SessionStatus()
        {
            var userId = HttpContext.Session.GetInt32("UserId") ?? 0;
            var roleId = HttpContext.Session.GetInt32("RoleId") ?? 0;
            var roleLabel = HttpContext.Session.GetString("RoleName") ?? string.Empty;
            var email = HttpContext.Session.GetString("UserEmail") ?? string.Empty;

            return Ok(new
            {
                isLoggedIn = userId > 0 && roleId > 0,
                userId,
                roleId,
                roleLabel,
                email
            });
        }

        private static bool IsValidEmail(string email)
        {
            try
            {
                _ = new MailAddress(email);
                return true;
            }
            catch
            {
                return false;
            }
        }

        private string BuildOtpEmailBody(string? userName, string otpCode, int expirySeconds)
        {
            var appUrl = $"{Request.Scheme}://{Request.Host}/";
            var logoUrl = $"{Request.Scheme}://{Request.Host}/images/logo.jpg";
            var name = string.IsNullOrWhiteSpace(userName) ? "User" : userName.Trim();

            return $@"
                <div style='font-family:Segoe UI,Arial,sans-serif;background:#f7f5ef;padding:24px;color:#1f2937;'>
                    <div style='max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;'>
                        <div style='background:#124d2b;padding:24px;text-align:center;'>
                            <img src='{logoUrl}' alt='Gayatri Restaurant' style='height:56px;width:auto;background:#ffffff;border-radius:10px;padding:6px;' />
                            <div style='color:#ffffff;font-size:22px;font-weight:700;margin-top:12px;'>Gayatri Backend Login</div>
                        </div>
                        <div style='padding:28px;'>
                            <p style='margin:0 0 12px;'>Dear {System.Net.WebUtility.HtmlEncode(name)},</p>
                            <p style='margin:0 0 16px;'>Use the OTP below to login:</p>
                            <div style='font-size:30px;font-weight:800;letter-spacing:6px;color:#124d2b;background:#f2fbf6;border:1px dashed #8bc7a5;border-radius:12px;padding:14px 20px;text-align:center;margin-bottom:14px;'>{otpCode}</div>
                            <p style='margin:0 0 18px;'>This OTP expires in <strong>{expirySeconds} seconds</strong>.</p>
                            <p style='margin:0;'>Open application: <a href='{appUrl}' style='color:#1a6e3c;text-decoration:none;'>{appUrl}</a></p>
                        </div>
                    </div>
                </div>";
        }

        private string? BuildUserImageUrl(string? imageFileName)
        {
            var fileName = (imageFileName ?? string.Empty).Trim();
            if (string.IsNullOrWhiteSpace(fileName))
            {
                return null;
            }

            return $"/FileUpload/User/{fileName}";
        }
    }
}
