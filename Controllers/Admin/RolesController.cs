using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using Microsoft.AspNetCore.Mvc;
namespace GayatriCateringPortal.Controllers.Admin
{
    [Route("Admin/Roles")]
    public class RolesController : Controller
    {
        private readonly IRolesRepository _rolesRepository;

        public RolesController(IRolesRepository rolesRepository)
        {
            _rolesRepository = rolesRepository;
        }

        [HttpGet("")]
        public IActionResult Index()
        {
            ViewData["Mode"] = "admin";
            ViewData["Page"] = "roles";
            ViewData["Title"] = "Roles & Permissions";
            return View("~/Views/Admin/Roles.cshtml");
        }

        [HttpGet("RolePermission")]
        [HttpGet("~/Admin/RolePermission")]
        public IActionResult RolePermission([FromQuery(Name = "RoleId")] int roleId = 0)
        {
            var role = roleId > 0 ? _rolesRepository.GetById(roleId) : null;
            var roleCode = role?.Code ?? string.Empty;
            var roleName = role?.Name ?? string.Empty;
            var roleDisplay = !string.IsNullOrWhiteSpace(roleCode) && !string.IsNullOrWhiteSpace(roleName)
                ? roleCode + " - " + roleName
                : (!string.IsNullOrWhiteSpace(roleName) ? roleName : (!string.IsNullOrWhiteSpace(roleCode) ? roleCode : roleId.ToString()));

            ViewData["Mode"] = "admin";
            ViewData["Page"] = "roles";
            ViewData["Title"] = "Role Permission";
            ViewData["RoleId"] = roleId;
            ViewData["SelectedRoleCode"] = roleCode;
            ViewData["SelectedRoleTitle"] = roleName;
            ViewData["SelectedRoleDisplay"] = roleDisplay;

            return View("~/Views/Admin/RolePermission.cshtml");
        }

        [HttpGet("get")]
        public IActionResult GetAll()
        {
            var items = _rolesRepository.GetAll();
            return Ok(items);
        }

        [HttpGet("get/{id}")]
        public IActionResult Get(int id)
        {
            var item = _rolesRepository.GetById(id);
            if (item == null) return NotFound();
            return Ok(item);
        }

        [HttpPost("create")]
        public IActionResult Create([FromBody] RoleMaster item)
        {
            if (!ModelState.IsValid)
            {
                var errors = string.Join("; ", ModelState.Values
                .SelectMany(x => x.Errors)
                .Select(x => x.ErrorMessage));
            }

            if (item == null) return BadRequest();
            int newId = _rolesRepository.Create(item);
            
            if (newId == -1)
            {
                return Ok(new { success = false, message = "Role already exists" });
            }
            
            return Ok(new { success = newId > 0, id = newId });
        }

        [HttpPost("update")]
        public IActionResult Update([FromBody] RoleMaster item)
        {
            if (!ModelState.IsValid)
            {
                var errors = string.Join("; ", ModelState.Values
                .SelectMany(x => x.Errors)
                .Select(x => x.ErrorMessage));
            }

            if (item == null) return BadRequest();
            int result = _rolesRepository.Update(item);
            
            if (result == -1)
            {
                return Ok(new { success = false, message = "Role already exists" });
            }
            
            return Ok(new { success = result > 0 });
        }

        [HttpPost("delete/{id}")]
        public IActionResult Delete(int id)
        {
            bool result = _rolesRepository.Delete(id);
            return Ok(new { success = result });
        }

        [HttpPost("activeinactive")]
        public IActionResult ActiveInActive([FromQuery] int id, [FromQuery] bool status)
        {
            bool result = _rolesRepository.ActiveInActive(id, status);
            return Ok(new { success = result });
        }
    }
}
