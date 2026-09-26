using EventManagement.Api.Data;
using EventManagement.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EventManagement.Api.Controllers;

// Student 1 — Event Creation & Ticketing
[ApiController]
[Route("api/events")]
public class EventsController : ControllerBase
{
    private readonly AppDbContext _db;
    public EventsController(AppDbContext db) => _db = db;

    public record CreateEventRequest(
        Guid OrganizerId, string Title, string? Description, string? Category,
        DateTimeOffset StartDate, DateTimeOffset EndDate, string? Location, int Capacity,
        List<CreateTicketTypeRequest>? TicketTypes);

    public record CreateTicketTypeRequest(string Name, decimal Price, int Quantity);

    public record UpdateEventRequest(
        string? Title, string? Description, string? Category, DateTimeOffset? StartDate,
        DateTimeOffset? EndDate, string? Location, int? Capacity);

    // CREATE — Organizer creates event + ticket types
    [HttpPost]
    public async Task<ActionResult<Event>> Create(CreateEventRequest req)
    {
        var ev = new Event
        {
            OrganizerId = req.OrganizerId,
            Title = req.Title,
            Description = req.Description,
            Category = req.Category,
            StartDate = req.StartDate,
            EndDate = req.EndDate,
            Location = req.Location,
            Capacity = req.Capacity,
            Status = EventStatus.Draft
        };

        if (req.TicketTypes != null)
        {
            foreach (var tt in req.TicketTypes)
            {
                ev.TicketTypes.Add(new TicketType { Name = tt.Name, Price = tt.Price, Quantity = tt.Quantity });
            }
        }

        _db.Events.Add(ev);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = ev.Id }, ev);
    }

    // READ — list/search/filter/paginate
    [HttpGet]
    public async Task<ActionResult> List(
        [FromQuery] string? category, [FromQuery] DateTimeOffset? from, [FromQuery] DateTimeOffset? to,
        [FromQuery] string? location, [FromQuery] string sortBy = "date",
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var query = _db.Events.Include(e => e.TicketTypes).AsQueryable();

        if (!string.IsNullOrWhiteSpace(category)) query = query.Where(e => e.Category == category);
        if (!string.IsNullOrWhiteSpace(location)) query = query.Where(e => e.Location != null && e.Location.Contains(location));
        if (from.HasValue) query = query.Where(e => e.StartDate >= from);
        if (to.HasValue) query = query.Where(e => e.StartDate <= to);

        query = sortBy switch
        {
            "popularity" => query.OrderByDescending(e => e.TicketTypes.Sum(t => t.Sold)),
            _ => query.OrderBy(e => e.StartDate)
        };

        var total = await query.CountAsync();
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

        return Ok(new { total, page, pageSize, items });
    }

    // READ — single event with ticket availability
    [HttpGet("{id}")]
    public async Task<ActionResult<Event>> GetById(Guid id)
    {
        var ev = await _db.Events.Include(e => e.TicketTypes).Include(e => e.VendorBookings)
            .FirstOrDefaultAsync(e => e.Id == id);
        return ev is null ? NotFound() : Ok(ev);
    }

    // UPDATE — edit details
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, UpdateEventRequest req, [FromHeader(Name = "X-User-Id")] Guid userId)
    {
        var ev = await _db.Events.FindAsync(id);
        if (ev is null) return NotFound();
        if (ev.OrganizerId != userId) return Forbid();

        if (req.Title != null) ev.Title = req.Title;
        if (req.Description != null) ev.Description = req.Description;
        if (req.Category != null) ev.Category = req.Category;
        if (req.StartDate.HasValue) ev.StartDate = req.StartDate.Value;
        if (req.EndDate.HasValue) ev.EndDate = req.EndDate.Value;
        if (req.Location != null) ev.Location = req.Location;
        if (req.Capacity.HasValue) ev.Capacity = req.Capacity.Value;
        ev.UpdatedAt = DateTimeOffset.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(ev);
    }

    // UPDATE — publish/unpublish (status workflow)
    [HttpPost("{id}/publish")]
    public async Task<IActionResult> Publish(Guid id, [FromHeader(Name = "X-User-Id")] Guid userId)
    {
        var ev = await _db.Events.FindAsync(id);
        if (ev is null) return NotFound();
        if (ev.OrganizerId != userId) return Forbid();
        ev.Status = EventStatus.Published;
        ev.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(ev);
    }

    [HttpPost("{id}/unpublish")]
    public async Task<IActionResult> Unpublish(Guid id, [FromHeader(Name = "X-User-Id")] Guid userId)
    {
        var ev = await _db.Events.FindAsync(id);
        if (ev is null) return NotFound();
        if (ev.OrganizerId != userId) return Forbid();
        ev.Status = EventStatus.Draft;
        await _db.SaveChangesAsync();
        return Ok(ev);
    }

    // DELETE — soft cancel, cascades to notify attendees
    [HttpDelete("{id}")]
    public async Task<IActionResult> Cancel(Guid id, [FromHeader(Name = "X-User-Id")] Guid userId)
    {
        var ev = await _db.Events.Include(e => e.TicketTypes)
            .FirstOrDefaultAsync(e => e.Id == id);
        if (ev is null) return NotFound();
        if (ev.OrganizerId != userId) return Forbid();

        ev.Status = EventStatus.PendingDeletion;
        ev.UpdatedAt = DateTimeOffset.UtcNow;


        var registrations = await _db.Registrations.Where(r => r.EventId == id).ToListAsync();
        foreach (var reg in registrations)
        {
            _db.Notifications.Add(new Notification
            {
                UserId = reg.AttendeeId,
                Channel = "Email",
                Subject = $"Event cancelled: {ev.Title}",
                Body = "The event you registered for has been cancelled."
            });
        }

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // Business-specific op — sales report per event
    [HttpGet("{id}/sales-report")]
    public async Task<ActionResult> SalesReport(Guid id)
    {
        var ticketTypes = await _db.TicketTypes.Where(t => t.EventId == id).ToListAsync();
        var report = ticketTypes.Select(t => new
        {
            t.Name,
            t.Price,
            t.Quantity,
            t.Sold,
            Revenue = t.Price * t.Sold,
            SoldOut = t.Sold >= t.Quantity
        });
        return Ok(new { eventId = id, tickets = report, totalRevenue = report.Sum(r => r.Revenue) });
    }
}
