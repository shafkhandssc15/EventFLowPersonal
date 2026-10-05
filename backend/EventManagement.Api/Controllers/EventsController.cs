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
            SoldOut = t.Sold >= t.Quantity,
            Remaining = Math.Max(0, t.Quantity - t.Sold)
        });
        return Ok(new { eventId = id, tickets = report, totalRevenue = report.Sum(r => r.Revenue) });
    }

    // Waitlist — join queue when sold out
    [HttpPost("{id}/waitlist")]
    public async Task<ActionResult> JoinWaitlist(Guid id, [FromQuery] Guid attendeeId, [FromQuery] Guid ticketTypeId)
    {
        var ticketType = await _db.TicketTypes.FindAsync(ticketTypeId);
        if (ticketType is null || ticketType.EventId != id) return NotFound("Ticket type not found for this event");

        // Only allow waitlist if actually sold out
        if (ticketType.Sold < ticketType.Quantity)
            return BadRequest(new { message = "Tickets still available — no need to join waitlist", available = ticketType.Quantity - ticketType.Sold });

        // Prevent duplicate waitlist entries
        var existing = await _db.WaitlistEntries
            .FirstOrDefaultAsync(w => w.TicketTypeId == ticketTypeId && w.AttendeeId == attendeeId && w.Status == WaitlistStatus.Waiting);
        if (existing != null)
            return Conflict(new { message = "Already on the waitlist", position = existing.Position, entryId = existing.Id });

        var position = await _db.WaitlistEntries
            .CountAsync(w => w.TicketTypeId == ticketTypeId && w.Status == WaitlistStatus.Waiting) + 1;

        var entry = new WaitlistEntry
        {
            TicketTypeId = ticketTypeId,
            AttendeeId = attendeeId,
            Status = WaitlistStatus.Waiting,
            Position = position
        };
        _db.WaitlistEntries.Add(entry);

        // Notify attendee they are on the waitlist
        _db.Notifications.Add(new Notification
        {
            UserId = attendeeId,
            Channel = "Email",
            Subject = $"You're #{position} on the waitlist",
            Body = $"You've been added to the waitlist for ticket type '{ticketType.Name}'. We'll notify you if a spot opens up."
        });

        await _db.SaveChangesAsync();
        return Ok(new { message = $"Added to waitlist at position #{position}", entryId = entry.Id, position });
    }

    // Waitlist — view queue for an event
    [HttpGet("{id}/waitlist")]
    public async Task<ActionResult> GetWaitlist(Guid id)
    {
        var entries = await _db.WaitlistEntries
            .Include(w => w.Attendee)
            .Include(w => w.TicketType)
            .Where(w => w.TicketType != null && w.TicketType.EventId == id && w.Status == WaitlistStatus.Waiting)
            .OrderBy(w => w.Position)
            .Select(w => new { w.Id, w.Position, w.Status, w.CreatedAt, AttendeeName = w.Attendee!.Name, AttendeeEmail = w.Attendee.Email, TicketTypeName = w.TicketType!.Name })
            .ToListAsync();
        return Ok(entries);
    }

    // Waitlist — promote top entry when a spot opens (e.g., after cancellation)
    [HttpPost("{id}/waitlist/{entryId}/promote")]
    public async Task<ActionResult> PromoteWaitlistEntry(Guid id, Guid entryId)
    {
        var entry = await _db.WaitlistEntries.Include(w => w.TicketType).FirstOrDefaultAsync(w => w.Id == entryId);
        if (entry is null) return NotFound();

        var ticketType = entry.TicketType ?? await _db.TicketTypes.FindAsync(entry.TicketTypeId);
        if (ticketType is null) return NotFound("Ticket type not found");

        if (ticketType.Sold >= ticketType.Quantity)
            return Conflict(new { message = "No seats available yet" });

        entry.Status = WaitlistStatus.Notified;
        entry.NotifiedAt = DateTimeOffset.UtcNow;

        _db.Notifications.Add(new Notification
        {
            UserId = entry.AttendeeId,
            Channel = "Email",
            Subject = "A spot just opened up!",
            Body = $"A seat for '{ticketType.Name}' is now available. Please register before it sells out again."
        });

        await _db.SaveChangesAsync();
        return Ok(new { message = "Waitlist entry promoted and attendee notified", entry });
    }
}
