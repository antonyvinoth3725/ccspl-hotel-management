using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using GayatriCateringPortal.Repositories;
using Microsoft.AspNetCore.Mvc;

namespace GayatriCateringPortal.Controllers.Admin
{
    [Route("Admin/Driver")]
    public class DriverController : Controller
    {
        private readonly IDriverRepository _driverRepository;
        public DriverController(IDriverRepository driverRepository)
        {
            _driverRepository = driverRepository;
        }

        [HttpGet("")]
        public IActionResult Index()
        {
            ViewData["Mode"] = "admin";
            ViewData["Page"] = "driver";
            ViewData["Title"] = "Driver";
            return View("~/Views/Admin/Driver.cshtml");
        }

        [HttpGet("get")]
        public IActionResult GetAll()
        {
            var items = _driverRepository.GetAll();
            return Ok(items);
        }

        [HttpGet("get/{id}")]
        public IActionResult Get(int id)
        {
            var item = _driverRepository.GetById(id);
            if (item == null) return NotFound();
            return Ok(item);
        }

        [HttpPost("create")]
        public IActionResult Create([FromBody] DriverMaster item)
        {
            if (!ModelState.IsValid)
            {
                var errors = string.Join("; ", ModelState.Values
                .SelectMany(x => x.Errors)
                .Select(x => x.ErrorMessage));
            }

            if (item == null) return BadRequest();
            int newId = _driverRepository.Create(item);

            if (newId == -1)
            {
                return Ok(new { success = false, message = "Driver already exists" });
            }

            return Ok(new { success = newId > 0, id = newId });
        }

        [HttpPost("update")]
        public IActionResult Update([FromBody] DriverMaster item)
        {
            if (!ModelState.IsValid)
            {
                var errors = string.Join("; ", ModelState.Values
                .SelectMany(x => x.Errors)
                .Select(x => x.ErrorMessage));
            }

            if (item == null) return BadRequest();
            int result = _driverRepository.Update(item);

            if (result == -1)
            {
                return Ok(new { success = false, message = "Driver already exists" });
            }

            return Ok(new { success = result > 0 });
        }

        [HttpPost("delete/{id}")]
        public IActionResult Delete(int id)
        {
            bool result = _driverRepository.Delete(id);
            return Ok(new { success = result });
        }

        [HttpPost("activeinactive/{id}")]
        public IActionResult ActiveInActive(int id, [FromQuery] bool status)
        {
            bool result = _driverRepository.ActiveInActive(id, status);
            return Ok(new { success = result });
        }
    }
}
