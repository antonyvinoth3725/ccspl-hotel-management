using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using GayatriCateringPortal.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace GayatriCateringPortal.Controllers.Admin
{
    [Route("Admin/FoodMenuCategories")]
    public class FoodMenuCategoriesController : Controller
    {
        private readonly IFoodMenuCategoryRepository _categoryRepository;

        public FoodMenuCategoriesController(IFoodMenuCategoryRepository categoryRepository)
        {
            _categoryRepository = categoryRepository;
        }

        [HttpGet("")]
        [HttpGet("/Admin/FoodCategory")]
        public IActionResult Index()
        {
            ViewData["Mode"] = "admin";
            ViewData["Page"] = "foodCategory";
            ViewData["Title"] = "Food Categories";
            return View("~/Views/Admin/FoodCategory.cshtml");
        }

        [HttpGet("get")]
        public IActionResult GetAll()
        {
            var items = _categoryRepository.GetAll();
            return Ok(items);
        }

        [HttpGet("get/{id}")]
        public IActionResult GetById(string id)
        {
            var item = _categoryRepository.GetById(id);
            if (item == null) return NotFound();
            return Ok(item);
        }

        [HttpPost("create")]
        public IActionResult Create([FromBody] FoodMenuCategory item)
        {
            if (!ModelState.IsValid)
            {
                var errors = string.Join("; ", ModelState.Values
                .SelectMany(x => x.Errors)
                .Select(x => x.ErrorMessage));
            }

            if (item == null) return BadRequest();
            int newId = _categoryRepository.Create(item);

            if (newId == -1)
            {
                return Ok(new { success = false, message = "Category already exists" });
            }

            return Ok(new { success = newId > 0, id = newId });
        }

        [HttpPost("update")]
        public IActionResult Update([FromBody] FoodMenuCategory item)
        {
            if (!ModelState.IsValid)
            {
                var errors = string.Join("; ", ModelState.Values
                .SelectMany(x => x.Errors)
                .Select(x => x.ErrorMessage));
            }

            if (item == null) return BadRequest();
            int result = _categoryRepository.Update(item);

            if (result == -1)
            {
                return Ok(new { success = false, message = "Category already exists" });
            }

            return Ok(new { success = result > 0 });
        }

        [HttpPost("delete/{id}")]
        public IActionResult Delete(string id)
        {
            bool result = _categoryRepository.Delete(id);
            return Ok(new { success = result });
        }

        [HttpPost("activeinactive")]
        public IActionResult ActiveInActive([FromQuery] string id, [FromQuery] bool status)
        {
            bool result = _categoryRepository.ActiveInActive(id, status);
            return Ok(new { success = result });
        }
    }
}
