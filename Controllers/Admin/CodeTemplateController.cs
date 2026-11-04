using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using Microsoft.AspNetCore.Mvc;

namespace GayatriCateringPortal.Controllers.Admin
{
    [Route("Admin/CodeTemplate")]
    public class CodeTemplateController : Controller
    {
        private readonly ICodeTemplateRepository _repo;

        public CodeTemplateController(ICodeTemplateRepository repo)
        {
            _repo = repo;
        }

        [HttpGet("")]
        public IActionResult Index()
        {
            ViewData["Mode"] = "admin";
            ViewData["Page"] = "codetemplate";
            ViewData["Title"] = "Code Template";
            return View("~/Views/Admin/CodeTemplate.cshtml");
        }

        [HttpGet("getall")]
        public IActionResult GetAll()
        {
            var items = _repo.GetAll();
            return Ok(items);
        }

        [HttpPost("saveall")]
        public IActionResult SaveAll([FromBody] List<CodeTemplate> items)
        {
            if (items == null || items.Count == 0)
                return BadRequest(new { success = false, message = "No code template rows were provided." });

            int savedCount = _repo.Save(items);

            return Ok(new
            {
                success = savedCount > 0,
                count = savedCount,
                message = savedCount > 0
                    ? "Code templates saved successfully."
                    : "One or more code template rows were not saved."
            });
        }

        [HttpPost("updatecurrentvalue/{entityNo}")]
        public IActionResult UpdateCurrentValue(int entityNo)
        {
            if (entityNo <= 0)
                return BadRequest(new { success = false, message = "Valid Entity No is required." });

            bool result = _repo.UpdateCurrentValue(entityNo);
            return Ok(new
            {
                success = result,
                message = result ? "Current value updated successfully." : "Current value was not updated."
            });
        }

        [HttpGet("latestcode")]
        public IActionResult GetLatestCode(int entityNo)
        {
            if (entityNo <= 0)
                return BadRequest(new { success = false, message = "Valid Entity No is required." });

            var code = _repo.GetLatestCode(entityNo);
            return Ok(new
            {
                success = !string.IsNullOrWhiteSpace(code),
                code = code ?? string.Empty,
                message = !string.IsNullOrWhiteSpace(code) ? "Latest code generated successfully." : "No active code template found."
            });
        }
    }
}
