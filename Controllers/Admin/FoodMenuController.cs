using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using GayatriCateringPortal.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace GayatriCateringPortal.Controllers.Admin
{
    [Route("Admin/FoodMenus")]
    public class FoodMenuController : Controller
    {
        private readonly IFoodMenuRepository _menusRepository;

        public FoodMenuController(IFoodMenuRepository menusRepository)
        {
            _menusRepository = menusRepository;
        }

        [HttpGet("")]
        public IActionResult Index()
        {
            ViewData["Mode"] = "admin";
            ViewData["Page"] = "menus";
            ViewData["Title"] = "Menus";
            return View("~/Views/Admin/FoodMenus.cshtml");
        }

        [HttpGet("get")]
        public IActionResult GetAll()
        {
            var items = _menusRepository.GetAll();
            return Ok(items);
        }

        [HttpGet("get/{id}")]
        public IActionResult Get(int id)
        {
            var item = _menusRepository.GetById(id);
            if (item == null) return NotFound();
            return Ok(item);
        }

        [HttpPost("create")]
        public IActionResult Create([FromBody] FoodMenu item)
        {
            if (!ModelState.IsValid)
            {
                var errors = string.Join("; ", ModelState.Values
                .SelectMany(x => x.Errors)
                .Select(x => x.ErrorMessage));
            }

            if (item == null) return BadRequest();
            int newId = _menusRepository.Create(item);

            if (newId == -1)
            {
                return Ok(new { success = false, message = "Menu already exists with this category" });
            }

            return Ok(new { success = newId > 0, id = newId });
        }

        [HttpPost("update")]
        public IActionResult Update([FromBody] FoodMenu item)
        {
            if (!ModelState.IsValid)
            {
                var errors = string.Join("; ", ModelState.Values
                .SelectMany(x => x.Errors)
                .Select(x => x.ErrorMessage));
            }

            if (item == null) return BadRequest();
            int result = _menusRepository.Update(item);

            if (result == -1)
            {
                return Ok(new { success = false, message = "Menu already exists with this category" });
            }

            return Ok(new { success = result > 0 });
        }

        [HttpPost("delete/{id}")]
        public IActionResult Delete(int id)
        {
            bool result = _menusRepository.Delete(id);
            return Ok(new { success = result });
        }

        [HttpPost("activeinactive/{id}")]
        public IActionResult ActiveInActive(int id, [FromQuery] bool status)
        {
            bool result = _menusRepository.ActiveInActive(id, status);
            return Ok(new { success = result });
        }
    }
}
