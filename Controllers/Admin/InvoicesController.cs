using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using Microsoft.AspNetCore.Mvc;
namespace GayatriCateringPortal.Controllers.Admin
{
    [Route("Admin/Invoices")]
    public class InvoicesController : Controller
    {
        private readonly IInvoicesRepository _invoicesRepository;

        public InvoicesController(IInvoicesRepository invoicesRepository)
        {
            _invoicesRepository = invoicesRepository;
        }

        [HttpGet("")]
        public IActionResult Index()
        {
            var items = _invoicesRepository.GetAll();
            ViewData["Items"] = items;
            ViewData["Mode"] = "admin";
            ViewData["Page"] = "invoices";
            ViewData["Title"] = "Invoices";
            return View("~/Views/Admin/Invoices.cshtml");
        }

        [HttpGet("get")]
        public IActionResult GetAll()
        {
            var items = _invoicesRepository.GetAll();
            return Ok(items);
        }

        [HttpGet("get/{id}")]
        public IActionResult Get(int id)
        {
            var item = _invoicesRepository.GetById(id);
            if (item == null) return NotFound();
            return Ok(item);
        }

        [HttpPost("save")]
        public IActionResult Save([FromBody] Orders item)
        {
            if (item == null) return BadRequest();
            var idValue = item.Id;

            if (idValue == 0)
            {
                int newId = _invoicesRepository.Create(item);
                return Ok(new { success = newId > 0, id = newId });
            }

            bool result = _invoicesRepository.Update(item);
            return Ok(new { success = result });
        }

        [HttpPost("delete/{id}")]
        public IActionResult Delete(int id)
        {
            bool result = _invoicesRepository.Delete(id);
            return Ok(new { success = result });
        }

        [HttpPost("activeinactive/{id}")]
        public IActionResult ActiveInActive(int id)
        {
            bool result = _invoicesRepository.ActiveInActive(id);
            return Ok(new { success = result });
        }
    }
}
