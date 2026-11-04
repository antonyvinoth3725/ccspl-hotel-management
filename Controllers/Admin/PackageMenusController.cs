using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using Microsoft.AspNetCore.Mvc;

namespace GayatriCateringPortal.Controllers.Admin
{
    [Route("Admin/PackageMenus")]
    public class PackageMenusController : Controller
    {
        private readonly IPackageMenusRepository _packageMenusRepository;

        public PackageMenusController(IPackageMenusRepository packageMenusRepository)
        {
            _packageMenusRepository = packageMenusRepository;
        }

        [HttpGet("GetByPackageId")]
        public IActionResult GetByPackageId(int packageId)
        {
            if (packageId <= 0) return BadRequest();
            var items = _packageMenusRepository.GetByPackageId(packageId);
            return Ok(items);
        }

        [HttpPost("save")]
        public IActionResult Save([FromBody] List<PackageMenus> items)
        {
            if (items == null || items.Count == 0)
                return BadRequest();

            var success = _packageMenusRepository.CreatePackageMenus(items);
            return Ok(new { success });
        }

        [HttpDelete("delete/{id}")]
        public IActionResult Delete(int id)
        {
            if (id <= 0) return BadRequest();
            var success = _packageMenusRepository.DeletePackageMenu(id);
            return Ok(new { success });
        }
    }
}