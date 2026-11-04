using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using Microsoft.AspNetCore.Mvc;

namespace GayatriCateringPortal.Controllers.Admin
{
    [Route("Admin/UserRoleMapping")]
    public class UserRoleMappingController : Controller
    {
        private readonly IUserRoleMappingRepository _userRoleMappingRepository;

        public UserRoleMappingController(IUserRoleMappingRepository userRoleMappingRepository)
        {
            _userRoleMappingRepository = userRoleMappingRepository;
        }

        [HttpGet("get")]
        public IActionResult GetByUserId(int userId)
        {
            if (userId <= 0) return BadRequest();
            var items = _userRoleMappingRepository.GetByUserId(userId);
            return Ok(items);
        }

        [HttpPost("save")]
        public IActionResult Save([FromBody] List<UserRoleMapping> items)
        {
            if (items == null || items.Count == 0)
                return BadRequest();

            var success = _userRoleMappingRepository.CreateUserRoleMappings(items);
            return Ok(new { success });
        }

        [HttpDelete("delete/{id}")]
        public IActionResult Delete(int id)
        {
            if (id <= 0) return BadRequest();
            var success = _userRoleMappingRepository.DeleteUserRoleMappingById(id);
            return Ok(new { success });
        }
    }
}
