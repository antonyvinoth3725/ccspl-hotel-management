using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using Microsoft.AspNetCore.Mvc;
namespace GayatriCateringPortal.Controllers.Admin
{
    [Route("Admin/Finance")]
    public class FinanceController : Controller
    {
        private readonly IFinanceRepository _financeRepository;

        public FinanceController(IFinanceRepository financeRepository)
        {
            _financeRepository = financeRepository;
        }

        [HttpGet("")]
        public IActionResult Index()
        {
            try
            {
                ViewData["Items"] = _financeRepository.GetAll();
            }
            catch
            {
                ViewData["Items"] = new List<Orders>();
                TempData["ErrorMessage"] = "Unable to load finance data right now.";
            }
            ViewData["Mode"] = "admin";
            ViewData["Page"] = "finance";
            ViewData["Title"] = "Finance";
            return View("~/Views/Admin/Finance.cshtml");
        }

        [HttpGet("get")]
        public IActionResult GetAll()
        {
            try
            {
                var items = _financeRepository.GetAll();
                return Ok(items);
            }
            catch
            {
                return Ok(new List<Orders>());
            }
        }

        [HttpGet("get/{id}")]
        public IActionResult Get(int id)
        {
            try
            {
                var item = _financeRepository.GetById(id);
                if (item == null) return NotFound();
                return Ok(item);
            }
            catch
            {
                return NotFound();
            }
        }

        [HttpPost("save")]
        public IActionResult Save([FromBody] Orders item)
        {
            try
            {
                if (item == null) return BadRequest();
                var idValue = item.Id;

                if (idValue == 0)
                {
                    int newId = _financeRepository.Create(item);
                    return Ok(new { success = newId > 0, id = newId });
                }

                bool result = _financeRepository.Update(item);
                return Ok(new { success = result });
            }
            catch
            {
                return Ok(new { success = false });
            }
        }

        [HttpPost("delete/{id}")]
        public IActionResult Delete(int id)
        {
            try
            {
                bool result = _financeRepository.Delete(id);
                return Ok(new { success = result });
            }
            catch
            {
                return Ok(new { success = false });
            }
        }

        [HttpPost("activeinactive/{id}")]
        public IActionResult ActiveInActive(int id)
        {
            try
            {
                bool result = _financeRepository.ActiveInActive(id);
                return Ok(new { success = result });
            }
            catch
            {
                return Ok(new { success = false });
            }
        }
    }
}
