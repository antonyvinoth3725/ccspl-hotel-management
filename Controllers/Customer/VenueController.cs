using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace GayatriCateringPortal.Controllers.Customer
{
    [AllowAnonymous]
    [Route("Customer/Venue")]
    public class VenueController : Controller
    {
        private readonly ILocationsRepository _locations;

        public VenueController(ILocationsRepository locations)
        {
            _locations = locations;
        }

        [HttpGet("")]
        public IActionResult Index()
        {
            ViewData["Mode"] = "customer";
            ViewData["Page"] = "venue";
            ViewData["Title"] = "Function Hall";
            return View("~/Views/Customer/Venue.cshtml");
        }

        [HttpGet("get")]
        public IActionResult GetAll()
        {
            var items = _locations.GetAll();
            return Ok(items);
        }

        [HttpGet("get/{id}")]
        public IActionResult Get(int id)
        {
            var item = _locations.GetById(id);
            if (item == null) return NotFound();
            return Ok(item);
        }

        [HttpPost("save")]
        public IActionResult Save([FromBody] LocationMaster item)
        {
            if (item == null) return BadRequest();
            if (item.Id == 0)
            {
                int newId = _locations.Create(item);
                return Ok(new { success = newId > 0, id = newId });
            }

            bool result = _locations.Update(item);
            return Ok(new { success = result });
        }

        [HttpPost("delete/{id}")]
        public IActionResult Delete(int id)
        {
            bool result = _locations.Delete(id);
            return Ok(new { success = result });
        }

        //[HttpPost("activeinactive/{id}")]
        //public IActionResult ActiveInActive(int id)
        //{
        //    bool result = _locations.ActiveInActive(id);
        //    return Ok(new { success = result });
        //}
    }
}
