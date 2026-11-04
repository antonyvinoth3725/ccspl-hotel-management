using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using GayatriCateringPortal.Repositories;
using Microsoft.AspNetCore.Mvc;
namespace GayatriCateringPortal.Controllers.Admin
{
    [Route("Admin/Comms")]
    public class CommsController : Controller
    {
        private readonly ICommsRepository _commsRepository;

        public CommsController(ICommsRepository commsRepository)
        {
            _commsRepository = commsRepository;
        }

        [HttpGet("")]
        public IActionResult Index()
        {
            ViewData["Mode"] = "admin";
            ViewData["Page"] = "comms";
            ViewData["Title"] = "Communications";
            return View("~/Views/Admin/Comms.cshtml");
        }

        [HttpGet("get")]
        public IActionResult GetAll()
        {
            var items = _commsRepository.GetAll();
            return Ok(items);
        }

        [HttpGet("get/{id}")]
        public IActionResult Get(int id)
        {
            var item = _commsRepository.GetById(id);
            if (item == null) return NotFound();
            return Ok(item);
        }

        [HttpPost("create")]
        public IActionResult Create([FromBody] CommunicationLog item)
        {
            if (!ModelState.IsValid)
            {
                var errors = string.Join("; ", ModelState.Values
                .SelectMany(x => x.Errors)
                .Select(x => x.ErrorMessage));
            }

            if (item == null) return BadRequest();
            int newId = _commsRepository.Create(item);

            if (newId == -1)
            {
                return Ok(new { success = false, message = "Communication Log already exists" });
            }

            return Ok(new { success = newId > 0, id = newId });
        }

        [HttpPost("update")]
        public IActionResult Update([FromBody] CommunicationLog item)
        {
            if (!ModelState.IsValid)
            {
                var errors = string.Join("; ", ModelState.Values
                .SelectMany(x => x.Errors)
                .Select(x => x.ErrorMessage));
            }

            if (item == null) return BadRequest();
            int result = _commsRepository.Update(item);

            if (result == -1)
            {
                return Ok(new { success = false, message = "Communication Log already exists" });
            }

            return Ok(new { success = result > 0 });
        }

        [HttpPost("delete/{id}")]
        public IActionResult Delete(int id)
        {
            bool result = _commsRepository.Delete(id);
            return Ok(new { success = result });
        }

        [HttpPost("activeinactive/{id}")]
        public IActionResult ActiveInActive(int id, [FromQuery] bool status)
        {
            bool result = _commsRepository.ActiveInActive(id, status);
            return Ok(new { success = result });
        }
    }
}
