using GayatriCateringPortal.Interfaces.Customer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GayatriCateringPortal.Controllers.Customer
{
    [AllowAnonymous]
    [Route("Customer/Packages")]
    public class PackagesController : Controller
    {
        private readonly IPackageRepository _packages;

        public PackagesController(IPackageRepository packages) => _packages = packages;

        [HttpGet("")]
        public IActionResult Index()
        {
            ViewData["Mode"] = "customer";
            ViewData["Page"] = "packages";
            ViewData["Title"] = "Packages";
            return View("~/Views/Customer/Packages.cshtml");
        }

        [HttpGet("get")]
        public IActionResult GetAll() => Ok(_packages.GetAll()
            .Where(item => item.IsActive && !item.IsDeleted)
            .OrderBy(item => item.Name));

        [HttpGet("get/{id:int}")]
        public IActionResult Get(int id)
        {
            var item = _packages.GetById(id);
            return item == null ? NotFound() : Ok(item);
        }

        [HttpGet("get/{id:int}/categories")]
        public IActionResult GetCategories(int id)
        {
            if (id <= 0) return BadRequest(new { message = "A valid package ID is required." });
            try
            {
                return Ok(_packages.GetCategoriesByPackageId(id));
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Unable to load categories for the selected package.", detail = ex.Message });
            }
        }

        [HttpGet("GetFixedMenusByPackageId")]
        public IActionResult GetFixedMenusByPackageId(int packageId)
        {
            if (packageId <= 0) return BadRequest();
            try
            {
                var items = _packages.GetFixedMenusByPackageId(packageId);
                return Ok(items);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Unable to load fixed menus for the selected package.", detail = ex.Message });
            }
        }

        [HttpGet("categories/{categoryId:int}/menus")]
        public IActionResult GetMenus(int categoryId)
        {
            if (categoryId <= 0) return BadRequest(new { message = "A valid category ID is required." });
            try
            {
                return Ok(_packages.GetMenusByCategoryId(categoryId));
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Unable to load menus for the selected category.", detail = ex.Message });
            }
        }

        [HttpGet("additional-menus")]
        public IActionResult GetAdditionalMenus()
        {
            try
            {
                return Ok(_packages.GetAdditionalMenuCategories());
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Unable to load additional menu items.", detail = ex.Message });
            }
        }

        [HttpPost("delete/{id:int}")]
        public IActionResult Delete(int id) => Ok(new { success = _packages.Delete(id) });
    }
}
