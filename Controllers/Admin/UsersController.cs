using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;

namespace GayatriCateringPortal.Controllers.Admin
{
    [Route("Admin/Users")]
    public class UsersController : Controller
    {
        private readonly IUsersRepository _usersRepository;
        private readonly ICommonRepository _commonRepository;
        private readonly ILogger<UsersController> _logger;

        public UsersController(IUsersRepository usersRepository, ICommonRepository commonRepository, ILogger<UsersController> logger)
        {
            _usersRepository = usersRepository;
            _commonRepository = commonRepository;
            _logger = logger;
        }

        [HttpGet("")]
        public IActionResult Index()
        {
            ViewData["Mode"] = "admin";
            ViewData["Page"] = "users";
            ViewData["Title"] = "Users";
            return View("~/Views/Admin/Users.cshtml");
        }

        [HttpGet("get")]
        public IActionResult GetAll()
        {
            var items = _usersRepository.GetAll();
            return Ok(items);
        }

        [HttpGet("get/{id}")]
        public IActionResult Get(int id)
        {
            var item = _usersRepository.GetById(id);
            if (item == null) return NotFound();
            return Ok(item);
        }

        [HttpPost("create")]
        public async Task<IActionResult> Create([FromForm] SaveUserRequest item)
        {
            if (!ModelState.IsValid)
            {
                var errors = string.Join("; ", ModelState.Values
                    .SelectMany(x => x.Errors)
                    .Select(x => x.ErrorMessage));
            }

            if (item == null) return BadRequest();

            if (item.ImageFile != null && item.ImageFile.Length > 0)
            {
                var uploadResult = await _commonRepository.FileUpload(item.ImageFile, "User");
                item.Image = uploadResult.FileName;
            }

            int newId = _usersRepository.Create(item);

            if (newId == -1)
            {
                return Ok(new { success = false, message = "User already exists" });
            }

            var emailSent = false;
            string? emailError = null;

            if (newId > 0 && !string.IsNullOrWhiteSpace(item.Email))
            {
                try
                {
                    await _commonRepository.SendEmail(
                        item.Email.Trim(),
                        null,
                        "Welcome to Gayatri Catering Portal",
                        BuildUserWelcomeEmailBody(item));

                    emailSent = true;
                }
                catch (Exception ex)
                {
                    emailError = ex.GetBaseException().Message;
                    _logger.LogError(ex, "User created successfully but failed to send welcome email to {Email}.", item.Email);
                }
            }

            return Ok(new { success = newId > 0, id = newId, emailSent, emailError });
        }

        [HttpPost("update")]
        public async Task<IActionResult> Update([FromForm] SaveUserRequest item)
        {
            if (!ModelState.IsValid)
            {
                var errors = string.Join("; ", ModelState.Values
                    .SelectMany(x => x.Errors)
                    .Select(x => x.ErrorMessage));
            }

            if (item == null || item.Id <= 0) return BadRequest();

            if (item.ImageFile != null && item.ImageFile.Length > 0)
            {
                var uploadResult = await _commonRepository.FileUpload(item.ImageFile, "User");
                item.Image = uploadResult.FileName;
            }

            int result = _usersRepository.Update(item);

            if (result == -1)
            {
                return Ok(new { success = false, message = "User already exists" });
            }

            return Ok(new { success = result > 0 });
        }

        [HttpPost("delete/{id}")]
        public IActionResult Delete(int id)
        {
            bool result = _usersRepository.Delete(id);
            return Ok(new { success = result });
        }

        [HttpPost("activeinactive")]
        public IActionResult ActiveInActive([FromQuery] int id, [FromQuery] bool status)
        {
            bool result = _usersRepository.ActiveInActive(id, status);
            return Ok(new { success = result });
        }

        private string BuildUserWelcomeEmailBody(UserMaster item)
        {
            var appUrl = $"{Request.Scheme}://{Request.Host}/";
            var logoUrl = $"{Request.Scheme}://{Request.Host}/images/logo.jpg";
            var userName = string.IsNullOrWhiteSpace(item.Name) ? "User" : item.Name.Trim();
            var userCode = string.IsNullOrWhiteSpace(item.Code) ? "-" : item.Code.Trim();
            var userEmail = string.IsNullOrWhiteSpace(item.Email) ? "-" : item.Email.Trim();

            return $@"
                <div style='font-family:Segoe UI,Arial,sans-serif;background:#f7f5ef;padding:24px;color:#1f2937;'>
                    <div style='max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;'>
                        <div style='background:#124d2b;padding:24px;text-align:center;'>
                            <img src='{logoUrl}' alt='Gayatri Catering' style='height:56px;width:auto;background:#ffffff;border-radius:10px;padding:6px;' />
                            <div style='color:#ffffff;font-size:22px;font-weight:700;margin-top:12px;'>Gayatri Catering Portal</div>
                        </div>
                        <div style='padding:28px;'>
                            <p style='margin:0 0 16px;font-size:16px;'>Dear {System.Net.WebUtility.HtmlEncode(userName)},</p>
                            <p style='margin:0 0 16px;line-height:1.7;'>Your account has been created successfully in the Gayatri Catering Portal.</p>
                            <div style='background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:16px 18px;margin:18px 0;'>
                                <div style='margin-bottom:8px;'><strong>User Code:</strong> {System.Net.WebUtility.HtmlEncode(userCode)}</div>
                                <div style='margin-bottom:8px;'><strong>Email:</strong> {System.Net.WebUtility.HtmlEncode(userEmail)}</div>
                                <div><strong>Application URL:</strong> <a href='{appUrl}' style='color:#1a6e3c;text-decoration:none;'>{appUrl}</a></div>
                            </div>
                            <p style='margin:0 0 16px;line-height:1.7;'>Please use your registered email address to access the application. If you need login credentials or access permissions, contact your administrator.</p>
                            <div style='margin-top:24px;'>
                                <a href='{appUrl}' style='display:inline-block;background:#1a6e3c;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;'>Open Application</a>
                            </div>
                        </div>
                    </div>
                </div>";
        }
    }
}
