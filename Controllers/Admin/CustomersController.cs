using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using GayatriCateringPortal.Repositories;
using Microsoft.AspNetCore.Mvc;
namespace GayatriCateringPortal.Controllers.Admin
{
    [Route("Admin/Customers")]
    public class CustomersController : Controller
    {
        private readonly ICustomerRepository _customers;

        public CustomersController(ICustomerRepository customers)
        {
            _customers = customers;
        }

        [HttpGet("")]
        public IActionResult Index()
        {
            ViewData["Mode"] = "admin";
            ViewData["Page"] = "customers";
            ViewData["Title"] = "Customers";
            return View("~/Views/Admin/Customers.cshtml");
        }

        [HttpGet("getAll")]
        public IActionResult GetAll()
        {
            var items = _customers.GetAll();
            return Ok(items);
        }

        [HttpGet("get/{id}")]
        public IActionResult Get(int id)
        {
            var item = _customers.GetById(id);
            if (item == null) return NotFound();
            return Ok(item);
        }


        [HttpPost("create")]
        public IActionResult Create([FromBody] CustomerMaster item)
        {
            if (item == null)
                return BadRequest(new { success = false, message = "Invalid Customer details." });

            try
            {
                int newId = _customers.Create(item);
                return Ok(new
                {
                    success = newId > 0,
                    id = newId,
                    message = newId > 0 ? "Customer created successfully." : "Customer was not saved."
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { success = false, message = ex.Message });
            }
        }

        [HttpPost("update")]
        public IActionResult Update([FromBody] CustomerMaster item)
        {
            if (item == null)
                return BadRequest(new { success = false, message = "Invalid Customer details." });

            try
            {
                bool updated = _customers.Update(item);
                return Ok(new
                {
                    success = updated,
                    message = updated ? "Customer updated successfully." : "Customer was not updated."
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
            bool result = _customers.Delete(id);
            return Ok(new { success = result });
        }

        [HttpPost("activeinactive")]
        public IActionResult ActiveInActive(int id,bool status)
        {
            bool result = _customers.ActiveInActive(id,status);
            return Ok(new { success = result });
        }
    }
}
