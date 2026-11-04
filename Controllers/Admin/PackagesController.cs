using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using Microsoft.AspNetCore.Mvc;
namespace GayatriCateringPortal.Controllers.Admin
{
    [Route("Admin/Packages")]
    public class PackagesController : Controller
    {
        private readonly IPackagesRepository _packagesRepository;
        private readonly IPackageItemsRepository _packageItemsRepository;
        private readonly IFoodMenuCategoryRepository _categoryRepository;

        public PackagesController(IPackagesRepository packagesRepository, IPackageItemsRepository packageItemsRepository, IFoodMenuCategoryRepository categoryRepository)
        {
            _packagesRepository = packagesRepository;
            _packageItemsRepository = packageItemsRepository;
            _categoryRepository = categoryRepository;
        }

        [HttpGet("")]
        public IActionResult Index()
        {
            ViewData["Mode"] = "admin";
            ViewData["Page"] = "packages";
            ViewData["Title"] = "Packages";
            return View("~/Views/Admin/Packages.cshtml");
        }

        [HttpGet("create")]
        public IActionResult Create()
        {
            var categories = _categoryRepository.GetAll();
            ViewData["Mode"] = "admin";
            ViewData["Page"] = "packages";
            ViewData["Title"] = "Create Package";
            ViewData["Categories"] = categories;
            return View("~/Views/Admin/CreatePackage.cshtml");
        }

        [HttpGet("edit")]
        public IActionResult Edit([FromQuery] int packageId)
        {
            var categories = _categoryRepository.GetAll();
            ViewData["Mode"] = "admin";
            ViewData["Page"] = "packages";
            ViewData["Title"] = "Edit Package";
            ViewData["Categories"] = categories;
            ViewData["PackageId"] = packageId;
            return View("~/Views/Admin/CreatePackage.cshtml");
        }

        [HttpGet("get")]
        public IActionResult GetAll()
        {
            var items = _packagesRepository.GetAll();
            return Ok(items);
        }

        [HttpGet("get/{id}")]
        public IActionResult Get(int id)
        {
            var item = _packagesRepository.GetById(id);
            if (item == null) return NotFound();
            return Ok(item);
        }

        [HttpPost("create")]
        public IActionResult Create([FromBody] Packages item)
        {
            if (!ModelState.IsValid)
            {
                var errors = string.Join("; ", ModelState.Values
                    .SelectMany(x => x.Errors)
                    .Select(x => x.ErrorMessage));
            }

            if (item == null) return BadRequest();

            int newId = _packagesRepository.Create(item);
            
            if (newId == -1)
            {
                return Ok(new { success = false, message = "Package with this name already exists" });
            }
            
            return Ok(new { success = newId > 0, id = newId });
        }

        [HttpPost("update")]
        public IActionResult Update([FromBody] Packages item)
        {
            if (!ModelState.IsValid)
            {
                var errors = string.Join("; ", ModelState.Values
                    .SelectMany(x => x.Errors)
                    .Select(x => x.ErrorMessage));
            }

            if (item == null || item.Id <= 0) return BadRequest();
            
            int result = _packagesRepository.Update(item);
            
            if (result == -1)
            {
                return Ok(new { success = false, message = "Package with this name already exists" });
            }
            
            return Ok(new { success = result > 0 });
        }

        [HttpPost("delete/{id}")]
        public IActionResult Delete(int id)
        {
            bool result = _packagesRepository.Delete(id);
            return Ok(new { success = result });
        }

        [HttpPost("activeinactive")]
        public IActionResult ActiveInActive(int id, bool status)
        {
            bool result = _packagesRepository.ActiveInActive(id, status);
            return Ok(new { success = result });
        }
    }
}
