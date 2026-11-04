using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using Microsoft.AspNetCore.Mvc;
namespace GayatriCateringPortal.Controllers.Admin
{
    [Route("Admin/Settings")]
    public class SettingsController : Controller
    {
        private readonly ISettingsRepository _repo;

        public SettingsController(ISettingsRepository repo)
        {
            _repo = repo;
        }

        [HttpGet("")]
        public IActionResult Index()
        {
            ViewData["Mode"] = "admin";
            ViewData["Page"] = "settings";
            ViewData["Title"] = "Settings";
            return View("~/Views/Admin/Settings.cshtml");
        }

        [HttpGet("get")]
        public IActionResult GetAll()
        {
            var items = _repo.GetAll();
            return Ok(items);
        }

        [HttpPost("create")]
        public IActionResult Create([FromBody] Organization item)
        {
            if (!ModelState.IsValid)
            {
                var errors = string.Join("; ", ModelState.Values
                .SelectMany(x => x.Errors)
                .Select(x => x.ErrorMessage));
            }

            if (item == null) return BadRequest();
            int newId = _repo.Create(item);

            if (newId == -1)
            {
                return Ok(new { success = false, message = "Organization already exists" });
            }

            return Ok(new { success = newId > 0, id = newId });
        }

        [HttpPost("update")]
        public IActionResult Update([FromBody] Organization item)
        {
            if (!ModelState.IsValid)
            {
                var errors = string.Join("; ", ModelState.Values
                .SelectMany(x => x.Errors)
                .Select(x => x.ErrorMessage));
            }

            if (item == null) return BadRequest();
            int result = _repo.Update(item);

            if (result == -1)
            {
                return Ok(new { success = false, message = "Organization already exists" });
            }

            return Ok(new { success = result > 0 });
        }
    }
}
