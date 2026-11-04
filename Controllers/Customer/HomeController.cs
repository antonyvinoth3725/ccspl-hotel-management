using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace GayatriCateringPortal.Controllers.Customer
{
    [AllowAnonymous]
    [Route("Customer/Home")]
    public class HomeController : Controller
    {
        private readonly ICustomerRepository _customerRepository;

        public HomeController(ICustomerRepository customerRepository)
        {
            _customerRepository = customerRepository;
        }

        [HttpGet("")]
        public IActionResult Index()
        {
       
            ViewData["Mode"] = "customer";
            ViewData["Page"] = "home";
            ViewData["Title"] = "Home";
            return View("~/Views/Customer/Home.cshtml");
        }

        [HttpGet("get/{id}")]
        public IActionResult Get(int id)
        {
            var customer = _customerRepository.GetById(id);
            if (customer == null) return NotFound();
            return Ok(customer);
        }

        [HttpPost("save")]
        public IActionResult Save([FromBody] CustomerMaster customer)
        {
            if (customer == null) return BadRequest();
            if (customer.Id == 0)
            {
                int newId = _customerRepository.Create(customer);
                return Ok(new { success = newId > 0, id = newId });
            }

            bool result = _customerRepository.Update(customer);
            return Ok(new { success = result });
        }

        [HttpPost("delete/{id}")]
        public IActionResult Delete(int id)
        {
            bool result = _customerRepository.Delete(id);
            return Ok(new { success = result });
        }

        [HttpPost("activeinactive/{id}")]
        public IActionResult ActiveInActive(int id,bool status)
        {
            bool result = _customerRepository.ActiveInActive(id,status);
            return Ok(new { success = result });
        }
    }
}
