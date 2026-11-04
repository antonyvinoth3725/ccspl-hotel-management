using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using Microsoft.AspNetCore.Mvc;

namespace GayatriCateringPortal.Controllers.Admin
{
    [Route("Admin/PackageItems")]
    public class PackageItemsController : Controller
    {
        private readonly IPackageItemsRepository _packageItemsRepository;

        public PackageItemsController(IPackageItemsRepository packageItemsRepository)
        {
            _packageItemsRepository = packageItemsRepository;
        }

        [HttpGet("GetByPackageId")]
        public IActionResult GetByPackageId(int packageId)
        {
            if (packageId <= 0) return BadRequest();
            var items = _packageItemsRepository.GetByPackageId(packageId);
            return Ok(items);
        }

        [HttpPost("save")]
        public IActionResult Save([FromBody] List<PackageItems> items)
        {
            if (items == null || items.Count == 0)
                return BadRequest();

            var success = _packageItemsRepository.CreatePackageItems(items);
            return Ok(new { success });
        }

        [HttpDelete("delete/{id}")]
        public IActionResult Delete(int id)
        {
            if (id <= 0) return BadRequest();
            var success = _packageItemsRepository.DeletePackageItem(id);
            return Ok(new { success });
        }
    }
}
