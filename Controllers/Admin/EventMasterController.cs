using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using Microsoft.AspNetCore.Mvc;

namespace GayatriCateringPortal.Controllers.Admin;

[Route("Admin/EventMaster")]
public class EventMasterController : Controller
{
    private readonly IEventMasterRepository _repository;

    public EventMasterController(IEventMasterRepository repository) => _repository = repository;

    [HttpGet("")]
    public IActionResult Index()
    {
        SetViewData("Events");
        return View("~/Views/Admin/EventMaster.cshtml");
    }

    [HttpGet("create")]
    public IActionResult Create()
    {
        SetViewData("Create Event");
        return View("~/Views/Admin/CreateEvent.cshtml");
    }

    [HttpGet("edit")]
    public IActionResult Edit([FromQuery] int eventId)
    {
        SetViewData("Edit Event");
        ViewData["EventId"] = eventId;
        return View("~/Views/Admin/CreateEvent.cshtml");
    }

    [HttpGet("get")]
    public IActionResult GetAll() => Ok(_repository.GetAll());

    [HttpGet("get/{id:int}")]
    public IActionResult Get(int id)
    {
        var item = _repository.GetById(id);
        if (item == null) return NotFound();

        return Ok(new
        {
            item.Id,
            item.Name,
            item.MinPax,
            item.ServiceCharge,
            item.AdvanceBookingDays,
            item.IsActive,
            item.IsDeleted,
            item.CreatedBy,
            item.CreatedDate,
            item.UpdatedBy,
            item.UpdatedDate,
            packageDetails = item.PackageDetails
        });
    }

    [HttpPost("create")]
    public IActionResult Create([FromBody] EventMaster item)
    {
        if (item == null) return BadRequest();
        var id = _repository.Create(item);
        return id == -1
            ? Ok(new { success = false, message = "Event with this name already exists" })
            : Ok(new { success = id > 0, id });
    }

    [HttpPost("update")]
    public IActionResult Update([FromBody] EventMaster item)
    {
        if (item == null || item.Id <= 0) return BadRequest();
        try
        {
            var result = _repository.Update(item);
            return result == -1
                ? Ok(new { success = false, message = "Event with this name already exists" })
                : Ok(new { success = result > 0, message = result > 0 ? null : "Event was not updated." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { success = false, message = ex.Message });
        }
    }

    [HttpPost("delete/{id:int}")]
    public IActionResult Delete(int id) => Ok(new { success = _repository.Delete(id) });

    [HttpPost("activeinactive")]
    public IActionResult ActiveInActive(int id, bool status) =>
        Ok(new { success = _repository.ActiveInActive(id, status) });

    private void SetViewData(string title)
    {
        ViewData["Mode"] = "admin";
        ViewData["Page"] = "eventmaster";
        ViewData["Title"] = title;
    }
}
