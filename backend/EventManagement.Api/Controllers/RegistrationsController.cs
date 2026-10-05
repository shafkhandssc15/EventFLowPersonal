using EventManagement.Api.Data;
using EventManagement.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EventManagement.Api.Controllers;

// Attendee Registration & Check-in
[ApiController]
[Route("api/registrations")]
public class RegistrationsController : ControllerBase
{
    private readonly AppDbContext _db;
    public RegistrationsController(AppDbContext db) => _db = db;

    public record RegisterRequest(Guid EventId, Guid AttendeeId, Guid TicketTypeId);

    // CREATE — attendee registers, generates QR ticket
    [HttpPost]
    public async Task<ActionResult> Register(RegisterRequest req)
    {
        var ticketType = await _db.TicketTypes.FindAsync(req.TicketTypeId);
        if (ticketType is null) return NotFound("Ticket type not found");
        if (ticketType.Sold >= ticketType.Quantity)
            return Conflict(new { message = "Sold out", waitlisted = true });

        var ticket = new Ticket
        {
            TicketTypeId = req.TicketTypeId,
            AttendeeId = req.AttendeeId,
            QrCode = $"QR-{Guid.NewGuid():N}"
        };
        _db.Tickets.Add(ticket);

        var registration = new Registration
        {
            EventId = req.EventId,
            AttendeeId = req.AttendeeId,
            Ticket = ticket,
            Status = RegistrationStatus.Registered
        };
        _db.Registrations.Add(registration);

        ticketType.Sold += 1;
        if (ticketType.Sold >= ticketType.Quantity)
        {
            // auto-close handled implicitly
        }

        _db.Notifications.Add(new Notification
        {
            UserId = req.AttendeeId,
            Channel = "Email",
            Subject = "You're registered!",
            Body = $"Your QR ticket code is {ticket.QrCode}"
        });

        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = registration.Id }, new { registration, ticket });
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Registration>> GetById(Guid id)
    {
        var r = await _db.Registrations.Include(x => x.Ticket).FirstOrDefaultAsync(x => x.Id == id);
        return r is null ? NotFound() : Ok(r);
    }

    // READ — my registrations
    [HttpGet("mine/{attendeeId}")]
    public async Task<ActionResult> MyRegistrations(Guid attendeeId)
        => Ok(await _db.Registrations.Where(r => r.AttendeeId == attendeeId).Include(r => r.Ticket).ToListAsync());

    // READ — organizer's attendee list, searchable/filterable
    [HttpGet("event/{eventId}")]
    public async Task<ActionResult> ForEvent(Guid eventId, [FromQuery] string? search, [FromQuery] RegistrationStatus? status)
    {
        var query = _db.Registrations.Where(r => r.EventId == eventId).Include(r => r.Attendee).AsQueryable();
        if (status.HasValue) query = query.Where(r => r.Status == status);
        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(r => r.Attendee != null && r.Attendee.Name.Contains(search));
        return Ok(await query.ToListAsync());
    }

    // UPDATE — transfer ticket to another attendee
    [HttpPost("{id}/transfer")]
    public async Task<IActionResult> Transfer(Guid id, [FromQuery] Guid newAttendeeId)
    {
        var r = await _db.Registrations.FindAsync(id);
        if (r is null) return NotFound();
        r.AttendeeId = newAttendeeId;
        r.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(r);
    }

    // DELETE — cancel registration
    [HttpDelete("{id}")]
    public async Task<IActionResult> Cancel(Guid id)
    {
        var r = await _db.Registrations.FindAsync(id);
        if (r is null) return NotFound();
        _db.Registrations.Remove(r);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}

[ApiController]
[Route("api/checkin")]
public class CheckInController : ControllerBase
{
    private readonly AppDbContext _db;
    public CheckInController(AppDbContext db) => _db = db;

    public record CheckInRequest(string QrCode);

    // Business op — QR-based check-in with duplicate prevention
    [HttpPost]
    public async Task<ActionResult> CheckIn(CheckInRequest req)
    {
        var ticket = await _db.Tickets.FirstOrDefaultAsync(t => t.QrCode == req.QrCode);
        if (ticket is null) return NotFound(new { message = "Invalid QR code" });

        var registration = await _db.Registrations.FirstOrDefaultAsync(r => r.TicketId == ticket.Id);
        if (registration is null) return NotFound(new { message = "No registration found for this ticket" });

        if (registration.Status == RegistrationStatus.CheckedIn)
            return Conflict(new { message = "Already checked in — duplicate scan blocked" });

        registration.Status = RegistrationStatus.CheckedIn;
        registration.UpdatedAt = DateTimeOffset.UtcNow;

        _db.CheckIns.Add(new CheckIn { RegistrationId = registration.Id, Method = "QR" });

        await _db.SaveChangesAsync();
        return Ok(new { message = "Checked in", registration.Id, registration.Status });
    }

    [HttpGet("event/{eventId}/export")]
    public async Task<ActionResult> ExportAttendeeList(Guid eventId)
    {
        var data = await _db.Registrations.Where(r => r.EventId == eventId)
            .Include(r => r.Attendee)
            .Select(r => new { r.Attendee!.Name, r.Attendee.Email, r.Status })
            .ToListAsync();
        return Ok(data);
    }
}
