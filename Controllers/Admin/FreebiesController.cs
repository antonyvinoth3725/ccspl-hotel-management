using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using Microsoft.AspNetCore.Mvc;
namespace GayatriCateringPortal.Controllers.Admin
{
    [Route("Admin/Freebies")]
    public class FreebiesController : Controller
    {
        private readonly IFreebiesRepository _popularFreebies;

        public FreebiesController(IFreebiesRepository freebiesRepository)
        {
            _popularFreebies = freebiesRepository;
        }

        [HttpGet("")]
        public IActionResult Index()
        {
                      
            ViewData["Mode"] = "admin";
            ViewData["Page"] = "freebies";
            ViewData["Title"] = "Popular & Freebies";
            return View("~/Views/Admin/Freebies.cshtml");
        }

        [HttpGet("getAll")]
        public IActionResult GetAll()
        {
            try
            {
                var items = _popularFreebies.GetAll();

                return Ok(items);
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }


        [HttpGet("get/{id:int}")]
        public IActionResult Get(int id)
        {
            if (id <= 0)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Invalid Popular Freebie Id."
                });
            }

            try
            {
                var item = _popularFreebies.GetById(id);

                if (item == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Popular Freebie not found."
                    });
                }

                return Ok(item);
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }


        [HttpPost("create")]
        public IActionResult Create(
            [FromBody] PopularFreebieMaster item)
        {
            if (item == null)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Invalid Popular Freebie details."
                });
            }

            try
            {
                item.Id = 0;
                item.IsDeleted = false;
                item.CreatedDate = DateTime.Now;
                item.UpdatedBy = null;
                item.UpdatedDate = null;

                int newId = _popularFreebies.Create(item);

                return Ok(new
                {
                    success = newId > 0,
                    id = newId,
                    message = newId > 0
                        ? "Popular Freebie created successfully."
                        : "Popular Freebie was not saved."
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }


        [HttpPost("update")]
        public IActionResult Update(
            [FromBody] PopularFreebieMaster item)
        {
            if (item == null)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Invalid Popular Freebie details."
                });
            }

            if (item.Id <= 0)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Valid Popular Freebie Id is required."
                });
            }

            try
            {
                var existing = _popularFreebies.GetById(item.Id);

                if (existing == null)
                {
                    return NotFound(new
                    {
                        success = false,
                        message = "Popular Freebie not found."
                    });
                }

                item.CreatedBy = existing.CreatedBy;
                item.CreatedDate = existing.CreatedDate;
                item.UpdatedDate = DateTime.Now;

                bool updated = _popularFreebies.Update(item);

                return Ok(new
                {
                    success = updated,
                    message = updated
                        ? "Popular Freebie updated successfully."
                        : "Popular Freebie was not updated."
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }


        [HttpPost("delete/{id:int}")]
        public IActionResult Delete(int id)
        {
            if (id <= 0)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Invalid Popular Freebie Id."
                });
            }

            try
            {
                bool result = _popularFreebies.Delete(id);

                return Ok(new
                {
                    success = result,
                    message = result
                        ? "Popular Freebie deleted successfully."
                        : "Popular Freebie was not deleted."
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }


        [HttpPost("activeinactive")]
        public IActionResult ActiveInActive(
            int id,
            bool status)
        {
            if (id <= 0)
            {
                return BadRequest(new
                {
                    success = false,
                    message = "Invalid Popular Freebie Id."
                });
            }

            try
            {
                bool result =
                    _popularFreebies.ActiveInActive(id, status);

                return Ok(new
                {
                    success = result,
                    message = result
                        ? status
                            ? "Popular Freebie activated successfully."
                            : "Popular Freebie marked inactive successfully."
                        : "Popular Freebie status was not updated."
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }
    }
}
