using EventManagement.Api.Data;
using EventManagement.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EventManagement.Api.Controllers;

// Student 3 — Attendee Registration & Check-in
[ApiController]
[Route("api/registrations")]
[Authorize]
public class RegistrationsController : ControllerBase
{
    private readonly AppDbContext _db;
    public RegistrationsController(AppDbContext db) => _db = db;

    public record RegisterRequest(Guid EventId, Guid TicketTypeId);

    // CREATE — attendee registers, generates QR ticket. AttendeeId comes from the JWT.
    [HttpPost]
    [Authorize(Roles = "Attendee,Admin")]
    public async Task<ActionResult> Register(RegisterRequest req)
    {
        var attendeeId = this.GetUserId();
        var ticketType = await _db.TicketTypes.FindAsync(req.TicketTypeId);
        if (ticketType is null) return NotFound("Ticket type not found");
        if (ticketType.Sold >= ticketType.Quantity)
            return Conflict(new { message = "Sold out", waitlisted = true });

        var ticket = new Ticket
        {
            TicketTypeId = req.TicketTypeId,
            AttendeeId = attendeeId,
            QrCode = $"QR-{Guid.NewGuid():N}"
        };
        _db.Tickets.Add(ticket);

        var registration = new Registration
        {
            EventId = req.EventId,
            AttendeeId = attendeeId,
            Ticket = ticket,
            Status = RegistrationStatus.Registered
        };
        _db.Registrations.Add(registration);

        ticketType.Sold += 1;
        if (ticketType.Sold >= ticketType.Quantity)
        {
            // auto-close handled implicitly: subsequent registers will hit the Conflict branch above
        }

        _db.Notifications.Add(new Notification
        {
            UserId = attendeeId,
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
        if (r is null) return NotFound();
        if (r.AttendeeId != this.GetUserId() && this.GetUserRole() is not ("Admin" or "Organizer")) return Forbid();
        return Ok(r);
    }

    // READ — my registrations (always the caller's own; ignores anything else per JWT)
    [HttpGet("mine")]
    public async Task<ActionResult> MyRegistrations()
        => Ok(await _db.Registrations.Where(r => r.AttendeeId == this.GetUserId()).Include(r => r.Ticket).ToListAsync());

    // READ — organizer's attendee list, searchable/filterable
    [HttpGet("event/{eventId}")]
    [Authorize(Roles = "Organizer,Admin")]
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
        if (r.AttendeeId != this.GetUserId() && this.GetUserRole() != "Admin") return Forbid();
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
        if (r.AttendeeId != this.GetUserId() && this.GetUserRole() != "Admin") return Forbid();
        _db.Registrations.Remove(r);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}

[ApiController]
[Route("api/checkin")]
[Authorize(Roles = "Organizer,VendorVenueManager,Admin")]
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

        var registration = await _db.Registrations.Include(r => r.Attendee).Include(r => r.Event)
            .FirstOrDefaultAsync(r => r.TicketId == ticket.Id);
        if (registration is null) return NotFound(new { message = "No registration found for this ticket" });

        if (registration.Status == RegistrationStatus.CheckedIn)
            return Conflict(new { message = "Already checked in — duplicate scan blocked" });

        registration.Status = RegistrationStatus.CheckedIn;
        registration.UpdatedAt = DateTimeOffset.UtcNow;

        _db.CheckIns.Add(new CheckIn { RegistrationId = registration.Id, Method = "QR" });

        await _db.SaveChangesAsync();
        return Ok(new
        {
            message = "Checked in",
            registration.Id,
            registration.Status,
            holderName = registration.Attendee?.Name,
            eventTitle = registration.Event?.Title
        });
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
