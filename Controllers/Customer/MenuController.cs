using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace GayatriCateringPortal.Controllers.Customer
{
    [AllowAnonymous]
    [Route("Customer/Menu")]
    public class MenuController : Controller
    {
        private readonly IMenusRepository _menusRepository;
        private readonly IFoodMenuRepository _foodMenusRepository;

        public MenuController(IMenusRepository menusRepository, IFoodMenuRepository foodMenusRepository)
        {
            _menusRepository = menusRepository;
            _foodMenusRepository = foodMenusRepository;
        }

        [HttpGet("get")]
        public IActionResult GetAll()
        {
            return Ok(_foodMenusRepository.GetAllMenusByCategory());
        }

        [HttpGet("")]
        public IActionResult Index()
        {
            ViewData["Mode"] = "customer";
            ViewData["Page"] = "menu";
            ViewData["Title"] = "Full Indian Menu";
            return View("~/Views/Customer/Menu.cshtml");
        }

        [HttpGet("get/{id}")]
        public IActionResult Get(int id)
        {
            var item = _menusRepository.GetById(id);
            if (item == null) return NotFound();
            return Ok(item);
        }

        [HttpPost("save")]
        public IActionResult Save([FromBody] Menu item)
        {
            if (item == null) return BadRequest();
            var idValue = 0;
            if (!string.IsNullOrWhiteSpace(item.Id)) int.TryParse(item.Id, out idValue);

            if (idValue == 0)
            {
                int newId = _menusRepository.Create(item);
                return Ok(new { success = newId > 0, id = newId });
            }

            bool result = _menusRepository.Update(item);
            return Ok(new { success = result });
        }

        [HttpPost("delete/{id}")]
        public IActionResult Delete(int id)
        {
            bool result = _menusRepository.Delete(id);
            return Ok(new { success = result });
        }

        [HttpPost("activeinactive/{id}")]
        public IActionResult ActiveInActive(int id)
        {
            bool result = _menusRepository.ActiveInActive(id);
            return Ok(new { success = result });
        }
    }
}
