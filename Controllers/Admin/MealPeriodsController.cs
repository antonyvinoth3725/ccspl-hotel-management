using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using Microsoft.AspNetCore.Mvc;
namespace GayatriCateringPortal.Controllers.Admin
{
    [Route("Admin/MealPeriods")]
    public class MealPeriodsController : Controller
    {
        private readonly IMealPeriodsRepository _mealPeriods;

        public MealPeriodsController(IMealPeriodsRepository mealPeriodsRepository)
        {
            _mealPeriods = mealPeriodsRepository;
        }

        [HttpGet("")]
        public IActionResult Index()
        {
            ViewData["Mode"] = "admin";
            ViewData["Page"] = "mealperiods";
            ViewData["Title"] = "Meal Periods";

            return View("~/Views/Admin/MealPeriods.cshtml");
        }



        [HttpGet("getAll")]
        public IActionResult GetAll()
        {
            var items = _mealPeriods.GetAll();

            return Ok(items);
        }



        [HttpGet("get/{id}")]
        public IActionResult Get(int id)
        {
            var item = _mealPeriods.GetById(id);

            if (item == null)
                return NotFound();

            return Ok(item);
        }


       

        [HttpPost("create")]
        public IActionResult Create([FromBody] MealPeriodMaster item)
        {
            if (item == null)
                return BadRequest(new { success = false, message = "Invalid Meal Period details." });

            int newId = _mealPeriods.Create(item);

            if (newId == -1)
            {
                return Ok(new { success = false, message = "Meal Period Name already exists." });
            }

            if (newId == -2)
            {
                return Ok(new { success = false, message = "Display Order already exists." });
            }

            return Ok(new { success = newId > 0, id = newId });
        }


       

        [HttpPost("update")]
        public IActionResult Update([FromBody] MealPeriodMaster item)
        {
            if (item == null)
                return BadRequest(new { success = false, message = "Invalid Meal Period details." });

            int result = _mealPeriods.Update(item);

            if (result == -1)
            {
                return Ok(new { success = false, message = "Meal Period Name already exists." });
            }

            if (result == -2)
            {
                return Ok(new { success = false, message = "Display Order already exists." });
            }

            return Ok(new { success = result > 0 });
        }



        [HttpPost("delete/{id}")]
        public IActionResult Delete(int id)
        {
            bool result = _mealPeriods.Delete(id);

            return Ok(new
            {
                success = result
            });
        }


        

        [HttpPost("activeinactive")]
        public IActionResult ActiveInActive(int id, bool status)
        {
            bool result = _mealPeriods.ActiveInActive(id, status);

            return Ok(new
            {
                success = result
            });
        }
    }
}
