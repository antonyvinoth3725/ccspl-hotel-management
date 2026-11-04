using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using GayatriCateringPortal.Repositories;
using Microsoft.AspNetCore.Mvc;
namespace GayatriCateringPortal.Controllers.Admin
{
    [Route("Admin/Utensils")]
    public class UtensilsController : Controller
    {
        private readonly IUtensilsRepository _repo;

        public UtensilsController(IUtensilsRepository repo)
        {
            _repo = repo;
        }

        [HttpGet("")]
        public IActionResult Index()
        {
            ViewData["Mode"] = "admin";
            ViewData["Page"] = "utensils";
            ViewData["Title"] = "Utensils";
            return View("~/Views/Admin/Utensils.cshtml");
        }

        [HttpGet("get")]
        public IActionResult GetAll()
        {
            var items = _repo.GetAll();
            return Ok(items);
        }

        [HttpGet("get/{id}")]
        public IActionResult Get(int id)
        {
            var item = _repo.GetById(id);
            if (item == null) return NotFound();
            return Ok(item);
        }

        [HttpPost("create")]
        public IActionResult Create([FromBody] UtensilMaster item)
        {
            if (!ModelState.IsValid)
            {
                var errors = string.Join("; ", ModelState.Values
                .SelectMany(x => x.Errors)
                .Select(x => x.ErrorMessage));
            }

            if (item == null) return BadRequest();
            int newId = _repo.Create(item);

            if (newId <= 0)
            {
                string message = newId switch
                {
                    -1 => "Utensil name is required.",
                    -2 => "Utensil already exists.",
                    -3 => "Price and deposit amount cannot be negative.",
                    -4 => "Minimum quantity cannot be negative.",
                    _ => "Utensil was not saved."
                };

                return Ok(new { success = false, message });
            }

            return Ok(new { success = newId > 0, id = newId });
        }

        [HttpPost("update")]
        public IActionResult Update([FromBody] UtensilMaster item)
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
                return Ok(new { success = false, message = "Utensil already exists" });
            }

            return Ok(new { success = result > 0 });
        }

        [HttpPost("delete/{id}")]
        public IActionResult Delete(int id)
        {
            bool result = _repo.Delete(id);
            return Ok(new { success = result });
        }

        [HttpPost("activeinactive/{id}")]
        public IActionResult ActiveInActive(int id, [FromQuery] bool status)
        {
            bool result = _repo.ActiveInActive(id, status);
            return Ok(new { success = result });
        }
    }
}
