using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using GayatriCateringPortal.Common;
using Microsoft.AspNetCore.Mvc;

namespace GayatriCateringPortal.Controllers.Admin
{
    [Route("Admin/Chef")]
    public class ChefController : Controller
    {
        private readonly IChefRepository _chefRepository;
        private readonly IChefMenuAssignmentRepository _chefMenuAssignmentRepository;
        private readonly ICommonRepository _commonRepository;
        private readonly IWebHostEnvironment _environment;

        public ChefController(
            IChefRepository chefRepository,
            IChefMenuAssignmentRepository chefMenuAssignmentRepository,
            ICommonRepository commonRepository,
            IWebHostEnvironment environment)
        {
            _chefRepository = chefRepository;
            _chefMenuAssignmentRepository = chefMenuAssignmentRepository;
            _commonRepository = commonRepository;
            _environment = environment;
        }

        [HttpGet("")]
        public IActionResult Index()
        {
            ViewData["Mode"] = "admin";
            ViewData["Page"] = "chef";
            ViewData["Title"] = "Chef";
            return View("~/Views/Admin/Chef.cshtml");
        }

        [HttpGet("get")]
        public IActionResult GetAll()
        {
            var items = _chefRepository.GetAll();
            return Ok(items);
        }

        [HttpGet("get/{id}")]
        public IActionResult Get(int id)
        {
            var item = _chefRepository.GetById(id);
            if (item == null) return NotFound();
            return Ok(item);
        }

        [HttpGet("AssignMenus/{id}")]
        public IActionResult AssignMenus(int id, [FromQuery] int? assignmentId = null)
        {
            var chef = _chefRepository.GetById(id);
            if (chef == null) return NotFound();

            ViewData["Mode"] = "admin";
            ViewData["Page"] = "chef";
            ViewData["Title"] = "Assign Menus";
            ViewData["ChefId"] = chef.Id;
            ViewData["ChefCode"] = chef.Code;
            ViewData["ChefName"] = chef.Name;
            ViewData["ChefType"] = chef.ChefType;
            ViewData["ChefSpecialization"] = chef.Specialization;
            ViewData["ChefMobileNo"] = chef.MobileNo;
            ViewData["ChefEmailId"] = chef.EmailId;
            ViewData["AssignmentId"] = assignmentId;
            return View("~/Views/Admin/ChefAssignMenus.cshtml");
        }

        [HttpGet("assignment/get/{id}")]
        public IActionResult GetAssignment(int id)
        {
            var assignment = _chefMenuAssignmentRepository.GetById(id);
            if (assignment == null) return NotFound();
            return Ok(assignment);
        }

        [HttpGet("assignment/pdf/{id}")]
        public IActionResult DownloadAssignmentPdf(int id)
        {
            var result = BuildAssignmentPdf(id);
            return result == null ? NotFound() : File(result.Value.Bytes, "application/pdf", result.Value.FileName);
        }

        [HttpPost("assignment/email/{id}")]
        public async Task<IActionResult> EmailAssignment(int id)
        {
            var assignment = _chefMenuAssignmentRepository.GetById(id);
            if (assignment == null) return NotFound(new { success = false, message = "Assignment was not found." });
            var chef = _chefRepository.GetById(assignment.ChefId);
            if (chef == null || string.IsNullOrWhiteSpace(chef.EmailId))
                return BadRequest(new { success = false, message = "Chef email ID is not available." });
            var result = BuildAssignmentPdf(id);
            if (result == null) return NotFound(new { success = false, message = "Unable to create assignment PDF." });

            await _commonRepository.SendEmail(chef.EmailId, null,
                $"Menu assignment - {assignment.EventDate:dd MMM yyyy}",
                $"<p>Hello <strong>{System.Net.WebUtility.HtmlEncode(chef.Name)}</strong>,</p><p>Please find your menu assignment PDF attached.</p><p>Gayatri Catering</p>",
                result.Value.Bytes, result.Value.FileName, "application/pdf");
            return Ok(new { success = true, message = "Assignment PDF emailed to chef." });
        }

        private (byte[] Bytes, string FileName)? BuildAssignmentPdf(int id)
        {
            var assignment = _chefMenuAssignmentRepository.GetById(id);
            if (assignment == null) return null;
            var chef = _chefRepository.GetById(assignment.ChefId);
            if (chef == null) return null;
            var logoPath = Path.Combine(_environment.WebRootPath, "images", "logo.jpg");
            var logoBytes = System.IO.File.Exists(logoPath) ? System.IO.File.ReadAllBytes(logoPath) : null;
            return (ChefAssignmentPdfBuilder.Build(chef, assignment, logoBytes), $"Chef-Menu-Assignment-{assignment.EventDate:yyyyMMdd}.pdf");
        }

        [HttpGet("assignment/list/{chefId}")]
        public IActionResult GetAssignments(int chefId)
        {
            return Ok(_chefMenuAssignmentRepository.GetByChef(chefId));
        }

        [HttpGet("assignment/orders")]
        public IActionResult AssignmentOrders(
            [FromQuery] DateTime eventDate,
            [FromQuery] int? assignmentId = null)
        {
            return Ok(_chefMenuAssignmentRepository.GetOrdersForSelection(
                eventDate.Date,
                assignmentId));
        }

        [HttpPost("assignment/menu-summary")]
        public IActionResult AssignmentMenuSummary([FromBody] string? orderIds, [FromQuery] int? assignmentId = null)
        {
            if (string.IsNullOrWhiteSpace(orderIds)) return Ok(Array.Empty<ChefMenuSummary>());
            return Ok(_chefMenuAssignmentRepository.GetMenuSummaryByOrders(orderIds, assignmentId));
        }

        [HttpPost("assignment/save")]
        public IActionResult SaveAssignment([FromBody] ChefMenuAssignmentSaveRequest? request)
        {
            if (request == null || request.ChefId <= 0 || request.EventDate == default
                || string.IsNullOrWhiteSpace(request.OrderIds)
                || string.IsNullOrWhiteSpace(request.MenuIds))
            {
                return BadRequest(new { success = false, message = "Please select orders and at least one menu quantity." });
            }

            if (request.HeaderId.GetValueOrDefault() > 0)
            {
                var existing = _chefMenuAssignmentRepository.GetById(request.HeaderId.Value);
                if (existing == null) return NotFound(new { success = false, message = "Assignment was not found." });
                if (existing.EventDate.Date != request.EventDate.Date)
                    return BadRequest(new { success = false, message = "Event date cannot be changed for an existing assignment. Create a new assignment instead." });
            }

            var userId = HttpContext.Session.GetInt32("UserId");
            var headerId = _chefMenuAssignmentRepository.Save(request, userId);
            return Ok(new { success = headerId > 0, headerId });
        }

        [HttpPost("assignment/delete/{id}")]
        public IActionResult DeleteAssignment(int id)
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            return Ok(new { success = _chefMenuAssignmentRepository.Delete(id, userId) });
        }

        [HttpPost("assignment/delete-menu/{headerId}/{menuId}")]
        public IActionResult DeleteAssignmentMenu(int headerId, int menuId)
        {
            var userId = HttpContext.Session.GetInt32("UserId");
            return Ok(new { success = _chefMenuAssignmentRepository.DeleteMenu(headerId, menuId, userId) });
        }

        [HttpPost("create")]
        public IActionResult Create([FromBody] ChefMaster item)
        {
            if (!ModelState.IsValid)
            {
                var errors = string.Join("; ", ModelState.Values
                .SelectMany(x => x.Errors)
                .Select(x => x.ErrorMessage));
            }

            if (item == null) return BadRequest();
            int newId = _chefRepository.Create(item);

            if (newId == -1)
            {
                return Ok(new { success = false, message = "Chef already exists" });
            }

            return Ok(new { success = newId > 0, id = newId });
        }

        [HttpPost("update")]
        public IActionResult Update([FromBody] ChefMaster item)
        {
            if (!ModelState.IsValid)
            {
                var errors = string.Join("; ", ModelState.Values
                .SelectMany(x => x.Errors)
                .Select(x => x.ErrorMessage));
            }

            if (item == null) return BadRequest();
            int result = _chefRepository.Update(item);

            if (result == -1)
            {
                return Ok(new { success = false, message = "Chef already exists" });
            }

            return Ok(new { success = result > 0 });
        }

        [HttpPost("delete/{id}")]
        public IActionResult Delete(int id)
        {
            bool result = _chefRepository.Delete(id);
            return Ok(new { success = result });
        }

        [HttpPost("activeinactive/{id}")]
        public IActionResult ActiveInActive(int id, [FromQuery] bool status)
        {
            bool result = _chefRepository.ActiveInActive(id, status);
            return Ok(new { success = result });
        }
    }
}
