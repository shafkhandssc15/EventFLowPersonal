using EventManagement.Api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace EventManagement.Api.Data;

public static class DbSeeder
{
    // Demo accounts all use this password (hashed below, never stored in plaintext).
    public const string DemoPassword = "Demo@12345";

    public static async Task SeedAsync(AppDbContext db)
    {
        try
        {
            // Ensure schema is created / migrated in Supabase PostgreSQL
            await db.Database.EnsureCreatedAsync();

            var hasher = new PasswordHasher<User>();

            // 1. Seed Users if not present
            var organizerId = Guid.Parse("00000000-0000-0000-0000-0000000000aa");
            var attendeeId  = Guid.Parse("00000000-0000-0000-0000-000000000001");
            var vendorId    = Guid.Parse("00000000-0000-0000-0000-0000000000bb");
            var adminId     = Guid.Parse("00000000-0000-0000-0000-0000000000cc");

            if (!await db.Users.AnyAsync(u => u.Id == organizerId))
            {
                var u = new User
                {
                    Id = organizerId,
                    Name = "Alex Chen",
                    Email = "organizer@demo.com",
                    Role = UserRole.Organizer
                };
                u.PasswordHash = hasher.HashPassword(u, DemoPassword);
                db.Users.Add(u);
            }

            if (!await db.Users.AnyAsync(u => u.Id == attendeeId))
            {
                var u = new User
                {
                    Id = attendeeId,
                    Name = "Sam Taylor",
                    Email = "attendee@demo.com",
                    Role = UserRole.Attendee
                };
                u.PasswordHash = hasher.HashPassword(u, DemoPassword);
                db.Users.Add(u);
            }

            if (!await db.Users.AnyAsync(u => u.Id == vendorId))
            {
                var u = new User
                {
                    Id = vendorId,
                    Name = "Jordan Lee",
                    Email = "vendor@demo.com",
                    Role = UserRole.VendorVenueManager
                };
                u.PasswordHash = hasher.HashPassword(u, DemoPassword);
                db.Users.Add(u);
            }

            if (!await db.Users.AnyAsync(u => u.Id == adminId))
            {
                var u = new User
                {
                    Id = adminId,
                    Name = "Riley Park",
                    Email = "admin@demo.com",
                    Role = UserRole.Admin
                };
                u.PasswordHash = hasher.HashPassword(u, DemoPassword);
                db.Users.Add(u);
            }

            await db.SaveChangesAsync();

            // 2. Seed Sri Lanka Venues
            var venues = new List<Venue>
            {
                new Venue
                {
                    Id = Guid.Parse("11111111-0000-0000-0000-000000000001"),
                    OwnerId = vendorId,
                    Name = "BMICH (Bandaranaike Memorial International Conference Hall)",
                    Location = "Bauddhaloka Mawatha, Colombo 00700",
                    Capacity = 3500,
                    PricePerHour = 85000,
                    IsActive = true
                },
                new Venue
                {
                    Id = Guid.Parse("11111111-0000-0000-0000-000000000002"),
                    OwnerId = vendorId,
                    Name = "Nelum Pokuna Mahinda Rajapaksa Theatre",
                    Location = "110 Ananda Coomaraswamy Mawatha, Colombo 00700",
                    Capacity = 1288,
                    PricePerHour = 120000,
                    IsActive = true
                },
                new Venue
                {
                    Id = Guid.Parse("11111111-0000-0000-0000-000000000003"),
                    OwnerId = vendorId,
                    Name = "Port City Marina Promenade & Pavilion",
                    Location = "Port City Coastal Drive, Colombo 00100",
                    Capacity = 4500,
                    PricePerHour = 150000,
                    IsActive = true
                },
                new Venue
                {
                    Id = Guid.Parse("11111111-0000-0000-0000-000000000004"),
                    OwnerId = vendorId,
                    Name = "The Grand Kandyan Convention Center",
                    Location = "89 Lady Gordon's Drive, Kandy 20000",
                    Capacity = 1500,
                    PricePerHour = 65000,
                    IsActive = true
                },
                new Venue
                {
                    Id = Guid.Parse("11111111-0000-0000-0000-000000000005"),
                    OwnerId = vendorId,
                    Name = "Jetwing Lighthouse Ocean Pavilion",
                    Location = "Dadella, Galle 80000",
                    Capacity = 950,
                    PricePerHour = 75000,
                    IsActive = true
                },
                new Venue
                {
                    Id = Guid.Parse("11111111-0000-0000-0000-000000000006"),
                    OwnerId = vendorId,
                    Name = "Waters Edge Grand Ballroom & Parkland",
                    Location = "316 Pannipitiya Road, Battaramulla 10120",
                    Capacity = 2200,
                    PricePerHour = 95000,
                    IsActive = true
                }
            };

            foreach (var v in venues)
            {
                if (!await db.Venues.AnyAsync(x => x.Id == v.Id || x.Name == v.Name))
                {
                    db.Venues.Add(v);
                }
            }
            await db.SaveChangesAsync();

            // 3. Seed Sri Lanka Vendors
            var vendorEntities = new List<Vendor>
            {
                new Vendor
                {
                    Id = Guid.Parse("22222222-0000-0000-0000-000000000001"),
                    OwnerId = vendorId,
                    Name = "Ceylon Sound & Stage Dynamics",
                    ServiceType = "Audio/Visual",
                    PricePerService = 350000,
                    IsActive = true
                },
                new Vendor
                {
                    Id = Guid.Parse("22222222-0000-0000-0000-000000000002"),
                    OwnerId = vendorId,
                    Name = "Spice Symphony Haute Sri Lankan Catering",
                    ServiceType = "Catering",
                    PricePerService = 280000,
                    IsActive = true
                },
                new Vendor
                {
                    Id = Guid.Parse("22222222-0000-0000-0000-000000000003"),
                    OwnerId = vendorId,
                    Name = "Lanka Cinematic 8K & Aerial Drone Media",
                    ServiceType = "Photography",
                    PricePerService = 195000,
                    IsActive = true
                },
                new Vendor
                {
                    Id = Guid.Parse("22222222-0000-0000-0000-000000000004"),
                    OwnerId = vendorId,
                    Name = "Lion Guard Executive Protocol & Security",
                    ServiceType = "Security",
                    PricePerService = 140000,
                    IsActive = true
                },
                new Vendor
                {
                    Id = Guid.Parse("22222222-0000-0000-0000-000000000005"),
                    OwnerId = vendorId,
                    Name = "Lotus & Fern Botanical Stage Styling",
                    ServiceType = "Decoration",
                    PricePerService = 220000,
                    IsActive = true
                }
            };

            foreach (var vnd in vendorEntities)
            {
                if (!await db.Vendors.AnyAsync(x => x.Id == vnd.Id || x.Name == vnd.Name))
                {
                    db.Vendors.Add(vnd);
                }
            }
            await db.SaveChangesAsync();

            // 4. Seed Sri Lanka Events & Ticket Types
            var ev1Id = Guid.Parse("33333333-0000-0000-0000-000000000001");
            var ev2Id = Guid.Parse("33333333-0000-0000-0000-000000000002");
            var ev3Id = Guid.Parse("33333333-0000-0000-0000-000000000003");
            var ev4Id = Guid.Parse("33333333-0000-0000-0000-000000000004");
            var ev5Id = Guid.Parse("33333333-0000-0000-0000-000000000005");
            var ev6Id = Guid.Parse("33333333-0000-0000-0000-000000000006");

            var events = new List<Event>
            {
                new Event
                {
                    Id = ev1Id,
                    OrganizerId = organizerId,
                    Title = "Sri Lanka AI & Tech Innovation Summit 2027",
                    Description = "Uniting Sri Lanka's leading software architects, Silicon Valley diasporas, and AI pioneers to accelerate digital transformation, FinTech innovation, and autonomous systems.",
                    Category = "Technology",
                    Location = "BMICH, Colombo 07",
                    Capacity = 2500,
                    Status = EventStatus.Published,
                    StartDate = DateTimeOffset.UtcNow.AddDays(12),
                    EndDate = DateTimeOffset.UtcNow.AddDays(14)
                },
                new Event
                {
                    Id = ev2Id,
                    OrganizerId = organizerId,
                    Title = "Colombo International Music & Arts Festival",
                    Description = "An electrifying multi-genre music gala blending classical Ceylon oriental symphonies, modern fusion jazz, electronic soundscapes, and international guest DJs.",
                    Category = "Music",
                    Location = "Nelum Pokuna Theatre, Colombo 07",
                    Capacity = 1288,
                    Status = EventStatus.Published,
                    StartDate = DateTimeOffset.UtcNow.AddDays(20),
                    EndDate = DateTimeOffset.UtcNow.AddDays(21)
                },
                new Event
                {
                    Id = ev3Id,
                    OrganizerId = organizerId,
                    Title = "Ceylon Grand Culinary & Tea Masters Forum",
                    Description = "An exclusive culinary exhibition celebrating pure Ceylon single-estate teas, Michelin-curated coastal dining, spice pairing masterclasses, and chocolate artistry.",
                    Category = "Food",
                    Location = "Waters Edge Grand Ballroom, Battaramulla",
                    Capacity = 1800,
                    Status = EventStatus.Published,
                    StartDate = DateTimeOffset.UtcNow.AddDays(28),
                    EndDate = DateTimeOffset.UtcNow.AddDays(30)
                },
                new Event
                {
                    Id = ev4Id,
                    OrganizerId = organizerId,
                    Title = "Lanka Premier Esports Championship Grand Finals",
                    Description = "Sri Lanka's biggest competitive gaming spectacle featuring top regional teams competing in Valorant, DOTA 2, and PUBG Mobile on 360-degree giant LED screens.",
                    Category = "Sports",
                    Location = "Port City Marina Pavilion, Colombo",
                    Capacity = 3500,
                    Status = EventStatus.Published,
                    StartDate = DateTimeOffset.UtcNow.AddDays(35),
                    EndDate = DateTimeOffset.UtcNow.AddDays(37)
                },
                new Event
                {
                    Id = ev5Id,
                    OrganizerId = organizerId,
                    Title = "Galle Heritage & International Design Forum",
                    Description = "An inspiring gathering of international architects, product creators, and typographers exploring tropical modernism, sustainable architecture, and spatial interface design.",
                    Category = "Art",
                    Location = "Jetwing Lighthouse, Galle",
                    Capacity = 950,
                    Status = EventStatus.Published,
                    StartDate = DateTimeOffset.UtcNow.AddDays(42),
                    EndDate = DateTimeOffset.UtcNow.AddDays(44)
                },
                new Event
                {
                    Id = ev6Id,
                    OrganizerId = organizerId,
                    Title = "Sri Lanka Venture & Diaspora Capital Forum",
                    Description = "High-level closed-door investment forum connecting global Sri Lankan diaspora investors, regional VC funds, and high-growth Sri Lankan startups.",
                    Category = "Business",
                    Location = "The Grand Kandyan, Kandy",
                    Capacity = 1500,
                    Status = EventStatus.Published,
                    StartDate = DateTimeOffset.UtcNow.AddDays(50),
                    EndDate = DateTimeOffset.UtcNow.AddDays(52)
                }
            };

            foreach (var ev in events)
            {
                if (!await db.Events.AnyAsync(x => x.Id == ev.Id || x.Title == ev.Title))
                {
                    db.Events.Add(ev);
                }
            }
            await db.SaveChangesAsync();

            // 5. Seed Ticket Types
            var ticketTypes = new List<TicketType>
            {
                new TicketType { EventId = ev1Id, Name = "Full Summit Delegate Pass", Price = 15000, Quantity = 1800, Sold = 1350 },
                new TicketType { EventId = ev1Id, Name = "VIP Innovation & Speaker Dinner Pass", Price = 45000, Quantity = 400, Sold = 380 },
                new TicketType { EventId = ev1Id, Name = "Student / Developer Pass", Price = 5000, Quantity = 300, Sold = 290 },

                new TicketType { EventId = ev2Id, Name = "Auditorium Standard Tier", Price = 7500, Quantity = 800, Sold = 680 },
                new TicketType { EventId = ev2Id, Name = "VIP Royal Balcony Lounge", Price = 20000, Quantity = 488, Sold = 450 },

                new TicketType { EventId = ev3Id, Name = "Grand Tasting Day Pass", Price = 9500, Quantity = 1400, Sold = 1100 },
                new TicketType { EventId = ev3Id, Name = "Master Chef VIP Workshop Table", Price = 32000, Quantity = 400, Sold = 375 },

                new TicketType { EventId = ev4Id, Name = "Arena General Access", Price = 3500, Quantity = 2800, Sold = 2400 },
                new TicketType { EventId = ev4Id, Name = "VIP Gamer Pit & Meet-and-Greet", Price = 12000, Quantity = 700, Sold = 680 },

                new TicketType { EventId = ev5Id, Name = "Full Conference Pass", Price = 18000, Quantity = 750, Sold = 620 },
                new TicketType { EventId = ev5Id, Name = "Bawa Heritage Tour & Gala Dinner", Price = 42000, Quantity = 200, Sold = 195 },

                new TicketType { EventId = ev6Id, Name = "Executive Delegate Pass", Price = 35000, Quantity = 1200, Sold = 980 },
                new TicketType { EventId = ev6Id, Name = "Investor Roundtable & Kandy Gala", Price = 85000, Quantity = 300, Sold = 290 }
            };

            foreach (var tt in ticketTypes)
            {
                if (!await db.TicketTypes.AnyAsync(x => x.EventId == tt.EventId && x.Name == tt.Name))
                {
                    db.TicketTypes.Add(tt);
                }
            }
            await db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[DbSeeder Error]: {ex.Message}");
        }
    }
}
