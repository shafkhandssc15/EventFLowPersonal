using EventManagement.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace EventManagement.Api.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(AppDbContext db)
    {
        try
        {
            await db.Database.EnsureCreatedAsync();

            // Remove records inserted by the former demo seeder. New accounts,
            // events, venues, and vendors must be created by users and persisted normally.
            var demoEventIds = Enumerable.Range(1, 6)
                .Select(i => Guid.Parse($"33333333-0000-0000-0000-{i:000000000000}"))
                .ToList();
            var demoVenueIds = Enumerable.Range(1, 6)
                .Select(i => Guid.Parse($"11111111-0000-0000-0000-{i:000000000000}"))
                .ToList();
            var demoVendorIds = Enumerable.Range(1, 5)
                .Select(i => Guid.Parse($"22222222-0000-0000-0000-{i:000000000000}"))
                .ToList();
            var demoUserIds = new[]
            {
                Guid.Parse("00000000-0000-0000-0000-0000000000aa"),
                Guid.Parse("00000000-0000-0000-0000-000000000001"),
                Guid.Parse("00000000-0000-0000-0000-0000000000bb"),
                Guid.Parse("00000000-0000-0000-0000-0000000000cc")
            };

            var oldEvents = await db.Events.Where(e => demoEventIds.Contains(e.Id) || new[]
            {
                "Sri Lanka AI & Tech Innovation Summit 2027",
                "Colombo International Music & Arts Festival",
                "Ceylon Grand Culinary & Tea Masters Forum",
                "Lanka Premier Esports Championship Grand Finals",
                "Galle Heritage & International Design Forum",
                "Sri Lanka Venture & Diaspora Capital Forum"
            }.Contains(e.Title)).ToListAsync();
            var eventIds = oldEvents.Select(e => e.Id).ToList();
            var oldTickets = await db.TicketTypes.Where(t => eventIds.Contains(t.EventId)).ToListAsync();
            var oldBookings = await db.VendorBookings
                .Where(b => eventIds.Contains(b.EventId) || demoVenueIds.Contains(b.VenueId ?? Guid.Empty) || demoVendorIds.Contains(b.VendorId ?? Guid.Empty))
                .ToListAsync();

            db.VendorBookings.RemoveRange(oldBookings);
            db.TicketTypes.RemoveRange(oldTickets);
            db.Events.RemoveRange(oldEvents);
            db.Venues.RemoveRange(await db.Venues.Where(v => demoVenueIds.Contains(v.Id)).ToListAsync());
            db.Vendors.RemoveRange(await db.Vendors.Where(v => demoVendorIds.Contains(v.Id)).ToListAsync());
            db.Users.RemoveRange(await db.Users.Where(u => demoUserIds.Contains(u.Id) || new[]
            {
                "organizer@demo.com", "attendee@demo.com", "vendor@demo.com", "admin@demo.com"
            }.Contains(u.Email.ToLower())).ToListAsync());

            await db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DbSeeder Error]: {ex.Message}");
        }
    }
}
