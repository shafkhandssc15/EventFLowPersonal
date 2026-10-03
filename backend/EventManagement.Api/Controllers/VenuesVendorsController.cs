using EventManagement.Api.Data;
using EventManagement.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EventManagement.Api.Controllers;

// Student 2 — Venue & Vendor Booking
[ApiController]
[Route("api/venues")]


public class VenuesController : ControllerBase
{
    private readonly AppDbContext _db;
    public VenuesController(AppDbContext db) => _db = db;

    public record CreateVenueRequest(Guid OwnerId, string Name, string? Location, int Capacity, decimal PricePerHour);

    [HttpPost]
    public async Task<ActionResult<Venue>> Create(CreateVenueRequest req)
    {
        var venue = new Venue
        {
            OwnerId = req.OwnerId, Name = req.Name, Location = req.Location,
            Capacity = req.Capacity, PricePerHour = req.PricePerHour
        };
        _db.Venues.Add(venue);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = venue.Id }, venue);
    }


    [HttpGet]
    public async Task<ActionResult> Search(
        [FromQuery] int? minCapacity, [FromQuery] decimal? maxPrice, [FromQuery] string? location,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var query = _db.Venues.Where(v => v.IsActive).AsQueryable();
        if (minCapacity.HasValue) query = query.Where(v => v.Capacity >= minCapacity);
        if (maxPrice.HasValue) query = query.Where(v => v.PricePerHour <= maxPrice);
        if (!string.IsNullOrWhiteSpace(location)) query = query.Where(v => v.Location != null && v.Location.Contains(location));

        var total = await query.CountAsync();
        var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
        return Ok(new { total, page, pageSize, items });
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Venue>> GetById(Guid id)
    {
        var v = await _db.Venues.FindAsync(id);
        return v is null ? NotFound() : Ok(v);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] Venue updated, [FromHeader(Name = "X-User-Id")] Guid userId)
    {
        var v = await _db.Venues.FindAsync(id);
        if (v is null) return NotFound();
        if (v.OwnerId != userId) return Forbid();
        v.PricePerHour = updated.PricePerHour;
        v.Capacity = updated.Capacity;
        v.Location = updated.Location;
        await _db.SaveChangesAsync();
        return Ok(v);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Deactivate(Guid id, [FromHeader(Name = "X-User-Id")] Guid userId)
    {
        var v = await _db.Venues.FindAsync(id);
        if (v is null) return NotFound();
        if (v.OwnerId != userId) return Forbid();
        v.IsPendingDeletion = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // Business op — is this venue free for a given date range?
    [HttpGet("{id}/availability")]
    public async Task<ActionResult> CheckAvailability(Guid id, [FromQuery] DateTimeOffset start, [FromQuery] DateTimeOffset end)
    {
        var conflict = await _db.VendorBookings
            .Where(b => b.VenueId == id && b.Status != BookingStatus.Rejected)
            .Join(_db.Events, b => b.EventId, e => e.Id, (b, e) => new { b, e })
            .AnyAsync(x => x.e.StartDate < end && x.e.EndDate > start);

        return Ok(new { available = !conflict });
    }
}


[ApiController]
[Route("api/vendors")]
public class VendorsController : ControllerBase
{
    private readonly AppDbContext _db;

    public VendorsController(AppDbContext db) => _db = db;
    

    public record CreateVendorRequest(Guid OwnerId, string Name, string? ServiceType, decimal PricePerService);

    [HttpPost]
    public async Task<ActionResult<Vendor>> Create(CreateVendorRequest req)
    {
        var vendor = new Vendor { OwnerId = req.OwnerId, Name = req.Name, ServiceType = req.ServiceType, PricePerService = req.PricePerService };
        _db.Vendors.Add(vendor);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = vendor.Id }, vendor);
    }

    [HttpGet]
    public async Task<ActionResult> Search([FromQuery] string? serviceType, [FromQuery] decimal? maxPrice)
    {
        var query = _db.Vendors.Where(v => v.IsActive).AsQueryable();
        if (!string.IsNullOrWhiteSpace(serviceType)) query = query.Where(v => v.ServiceType == serviceType);
        if (maxPrice.HasValue) query = query.Where(v => v.PricePerService <= maxPrice);
        return Ok(await query.ToListAsync());
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<Vendor>> GetById(Guid id)
    {
        var v = await _db.Vendors.FindAsync(id);
        return v is null ? NotFound() : Ok(v);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Deactivate(Guid id, [FromHeader(Name = "X-User-Id")] Guid userId)
    {
        var v = await _db.Vendors.FindAsync(id);
        if (v is null) return NotFound();
        if (v.OwnerId != userId) return Forbid();
        v.IsPendingDeletion = true;
        await _db.SaveChangesAsync();
        return NoContent();
    }
}

[ApiController]
[Route("api/vendor-bookings")]
public class VendorBookingsController : ControllerBase
{
    private readonly AppDbContext _db;
    public VendorBookingsController(AppDbContext db) => _db = db;

    public record CreateBookingRequest(Guid EventId, Guid? VendorId, Guid? VenueId, decimal Cost);

    // CREATE — with conflict-check business rule
    [HttpPost]
    public async Task<ActionResult> Create(CreateBookingRequest req)
    {
        var ev = await _db.Events.FindAsync(req.EventId);
        if (ev is null) return NotFound("Event not found");

        if (req.VenueId.HasValue)
        {
            var conflict = await _db.VendorBookings
                .Where(b => b.VenueId == req.VenueId && b.Status != BookingStatus.Rejected)
                .Join(_db.Events, b => b.EventId, e => e.Id, (b, e) => e)
                .AnyAsync(e => e.StartDate < ev.EndDate && e.EndDate > ev.StartDate);

            if (conflict)
            {
                var alternates = await _db.Venues
                    .Where(v => v.IsActive && v.Id != req.VenueId && v.Capacity >= ev.Capacity)
                    .Take(3).ToListAsync();
                return Conflict(new { message = "Venue double-booked for overlapping dates", suggestedAlternates = alternates });
            }
        }

        var booking = new VendorBooking
        {
            EventId = req.EventId, VendorId = req.VendorId, VenueId = req.VenueId,
            Cost = req.Cost, Status = BookingStatus.Requested
        };
        _db.VendorBookings.Add(booking);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = booking.Id }, booking);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<VendorBooking>> GetById(Guid id)
    {
        var b = await _db.VendorBookings.FindAsync(id);
        return b is null ? NotFound() : Ok(b);
    }

    [HttpGet]
    public async Task<ActionResult> List([FromQuery] Guid? eventId, [FromQuery] BookingStatus? status)
    {
        var query = _db.VendorBookings.AsQueryable();
        if (eventId.HasValue) query = query.Where(b => b.EventId == eventId);
        if (status.HasValue) query = query.Where(b => b.Status == status);
        return Ok(await query.ToListAsync());
    }

    [HttpPost("{id}/confirm")]
    public async Task<IActionResult> Confirm(Guid id)
    {
        var b = await _db.VendorBookings.FindAsync(id);
        if (b is null) return NotFound();
        b.Status = BookingStatus.Confirmed;
        b.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(b);
    }

    [HttpPost("{id}/reject")]
    public async Task<IActionResult> Reject(Guid id)
    {
        var b = await _db.VendorBookings.FindAsync(id);
        if (b is null) return NotFound();
        b.Status = BookingStatus.Rejected;
        b.UpdatedAt = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(b);
    }
}
