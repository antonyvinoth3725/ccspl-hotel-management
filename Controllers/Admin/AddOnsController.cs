using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using Microsoft.AspNetCore.Mvc;

namespace GayatriCateringPortal.Controllers.Admin
{
    [Route("Admin/AddOns")]
    public class AddOnsController : Controller
    {
        private readonly IAddOnRepository _addOn;

        public AddOnsController(IAddOnRepository addOn)
        {
            _addOn = addOn;
        }

        [HttpGet("")]
        [HttpGet("~/Admin/AddOn")]
        public IActionResult Index()
        {
            ViewData["Mode"] = "admin";
            ViewData["Page"] = "addons";
            ViewData["Title"] = "Add Ons";

            return View("~/Views/Admin/AddOns.cshtml");
        }



        [HttpGet("get")]
        [HttpGet("getAll")]
        public IActionResult GetAll()
        {
            var items = _addOn.GetAll();

            return Ok(items);
        }

        [HttpGet("get/{id:int}")]
        public IActionResult Get(int id)
        {
            var item = _addOn.GetById(id);
            return item == null ? NotFound() : Ok(item);
        }

        [HttpPost("create")]
        public IActionResult Create([FromBody] AddOnMaster item)
        {
            if (item == null) return BadRequest();
            var id = _addOn.Create(item);
            if (id == -1) return Ok(new { success = false, message = "Add On already exists" });
            return Ok(new { success = id > 0, id });
        }

        [HttpPost("update")]
        public IActionResult Update([FromBody] AddOnMaster item)
        {
            if (item == null || item.Id <= 0) return BadRequest();
            var result = _addOn.Update(item);
            if (result == -1) return Ok(new { success = false, message = "Add On already exists" });
            return Ok(new { success = result > 0 });
        }

        [HttpPost("delete/{id:int}")]
        public IActionResult Delete(int id) => Ok(new { success = _addOn.Delete(id) });

        [HttpPost("activeinactive")]
        public IActionResult ActiveInActive([FromQuery] int id, [FromQuery] bool status) =>
            Ok(new { success = _addOn.ActiveInActive(id, status) });
    }
}
