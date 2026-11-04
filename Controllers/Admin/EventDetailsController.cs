using GayatriCateringPortal.Interfaces;
using GayatriCateringPortal.Models;
using Microsoft.AspNetCore.Mvc;

namespace GayatriCateringPortal.Controllers.Admin;

[Route("Admin/EventDetails")]
public class EventDetailsController : Controller
{
    private readonly IEventDetailsRepository _repository;

    public EventDetailsController(IEventDetailsRepository repository) => _repository = repository;

    [HttpGet("get")]
    public IActionResult GetByEventId(int eventId)
    {
        if (eventId <= 0) return BadRequest();
        try
        {
            return Ok(_repository.GetByEventId(eventId));
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Unable to load configured event packages: " + ex.Message });
        }
    }

    [HttpPost("save")]
    public IActionResult Save([FromBody] List<EventDetails> items)
    {
        if (items == null || items.Count == 0) return BadRequest();
        return Ok(new { success = _repository.Save(items) });
    }

    [HttpPost("update")]
    public IActionResult Update([FromBody] EventDetails item)
    {
        if (item == null || item.Id <= 0 || item.EventId <= 0 || item.PackageId <= 0)
            return BadRequest();
        return Ok(new { success = _repository.Update(item) });
    }

    [HttpDelete("delete/{id:int}")]
    public IActionResult Delete(int id)
    {
        if (id <= 0) return BadRequest();
        return Ok(new { success = _repository.Delete(id) });
    }
}
