using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using Microsoft.AspNetCore.Mvc;

namespace GayatriCateringPortal.Controllers.Admin
{
    [Route("Admin/Locations")]
    public class LocationsController : Controller
    {
        private readonly ILocationsRepository _locations;

        public LocationsController(ILocationsRepository locations)
        {
            _locations = locations;
        }

        [HttpGet("")]
        public IActionResult Index()
        {
            ViewData["Mode"] = "admin";
            ViewData["Page"] = "locations";
            ViewData["Title"] = "Locations";

            return View("~/Views/Admin/Locations.cshtml");
        }

              

        [HttpGet("getAll")]
        public IActionResult GetAll()
        {
            var items = _locations.GetAll();

            return Ok(items);
        }

        [HttpGet("get/{id}")]
        public IActionResult Get(int id)
        {
            var item = _locations.GetById(id);

            if (item == null)
                return NotFound();

            return Ok(item);
        }

        [HttpPost("create")]
        public IActionResult Create([FromBody] LocationMaster item)
        {
            if (item == null)
                return BadRequest(new { success = false, message = "Invalid Location details." });

            try
            {
                int newId = _locations.Create(item);
                return Ok(new
                {
                    success = newId > 0,
                    id = newId,
                    message = newId > 0 ? "Location created successfully." : "Location was not saved."
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpPost("update")]
        public IActionResult Update([FromBody] LocationMaster item)
        {
            if (item == null)
                return BadRequest(new { success = false, message = "Invalid Location details." });

            try
            {
                bool updated = _locations.Update(item);
                return Ok(new
                {
                    success = updated,
                    message = updated ? "Location updated successfully." : "Location was not updated."
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }


      

        [HttpPost("delete/{id}")]
        public IActionResult Delete(int id)
        {
            bool result = _locations.Delete(id);

            return Ok(new
            {
                success = result
            });
        }



        [HttpPost("activeinactive")]
        public IActionResult ActiveInActive(int id, bool status)
        {
            bool result = _locations.ActiveInActive(id, status);

            return Ok(new
            {
                success = result
            });
        }
    }
}
