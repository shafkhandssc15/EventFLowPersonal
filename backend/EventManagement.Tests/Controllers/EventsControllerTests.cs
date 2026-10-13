using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using EventManagement.Api.Controllers;
using EventManagement.Api.Models;
using EventManagement.Tests.Common;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace EventManagement.Tests.Controllers;

public class EventsControllerTests
{
    [Fact]
    public async Task Create_WithTicketTypes_ReturnsCreatedAtActionAndPersistsEvent()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var controller = new EventsController(db);
        var organizerId = Guid.NewGuid();
        var req = new EventsController.CreateEventRequest(
            OrganizerId: organizerId,
            Title: "Tech Summit 2027",
            Description: "Flagship Developer Conference",
            Category: "technology",
            StartDate: DateTimeOffset.UtcNow.AddDays(10),
            EndDate: DateTimeOffset.UtcNow.AddDays(12),
            Location: "BMICH Colombo",
            Capacity: 500,
            TicketTypes: new List<EventsController.CreateTicketTypeRequest>
            {
                new("VIP Pass", 15000m, 50),
                new("Standard Pass", 5000m, 450)
            }
        );

        // Act
        var result = await controller.Create(req);

        // Assert
        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var createdEvent = Assert.IsType<Event>(created.Value);
        Assert.Equal("Tech Summit 2027", createdEvent.Title);
        Assert.Equal(EventStatus.Draft, createdEvent.Status);
        Assert.Equal(2, createdEvent.TicketTypes.Count);

        var dbEvent = await db.Events.FindAsync(createdEvent.Id);
        Assert.NotNull(dbEvent);
        Assert.Equal(500, dbEvent.Capacity);
    }

    [Fact]
    public async Task Create_WithoutTicketTypes_CreatesDraftEventSuccessfully()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var controller = new EventsController(db);
        var req = new EventsController.CreateEventRequest(
            OrganizerId: Guid.NewGuid(),
            Title: "Community Meetup",
            Description: "Casual networking meetup",
            Category: "community",
            StartDate: DateTimeOffset.UtcNow.AddDays(5),
            EndDate: DateTimeOffset.UtcNow.AddDays(5).AddHours(3),
            Location: "Innovation Hub",
            Capacity: 30,
            TicketTypes: null
        );

        // Act
        var result = await controller.Create(req);

        // Assert
        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var createdEvent = Assert.IsType<Event>(created.Value);
        Assert.Equal("Community Meetup", createdEvent.Title);
        Assert.Empty(createdEvent.TicketTypes);
    }

    [Fact]
    public async Task List_WithCategoryAndLocationFilter_ReturnsMatchingEvents()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var controller = new EventsController(db);
        db.Events.AddRange(
            new Event { Title = "Music Fest", Category = "music", Location = "Colombo Stadium", StartDate = DateTimeOffset.UtcNow.AddDays(2), Capacity = 200 },
            new Event { Title = "Rock Show", Category = "music", Location = "Kandy Arena", StartDate = DateTimeOffset.UtcNow.AddDays(3), Capacity = 300 },
            new Event { Title = "Hackathon", Category = "tech", Location = "Colombo Lab", StartDate = DateTimeOffset.UtcNow.AddDays(4), Capacity = 100 }
        );
        await db.SaveChangesAsync();

        // Act
        var result = await controller.List(category: "music", from: null, to: null, location: "Colombo", sortBy: "date", page: 1, pageSize: 10);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        dynamic? data = okResult.Value;
        Assert.NotNull(data);
        var total = (int)data.GetType().GetProperty("total")!.GetValue(data)!;
        Assert.Equal(1, total);
    }

    [Fact]
    public async Task GetById_ExistingEvent_ReturnsOkWithDetails()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var controller = new EventsController(db);
        var ev = new Event { Title = "AI Symposium", Capacity = 150, StartDate = DateTimeOffset.UtcNow.AddDays(1) };
        db.Events.Add(ev);
        await db.SaveChangesAsync();

        // Act
        var result = await controller.GetById(ev.Id);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var returnedEvent = Assert.IsType<Event>(okResult.Value);
        Assert.Equal("AI Symposium", returnedEvent.Title);
    }

    [Fact]
    public async Task GetById_NonExistentEvent_ReturnsNotFound()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var controller = new EventsController(db);

        // Act
        var result = await controller.GetById(Guid.NewGuid());

        // Assert
        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Update_OrganizerUser_UpdatesDetailsAndReturnsOk()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var controller = new EventsController(db);
        var organizerId = Guid.NewGuid();
        var ev = new Event { OrganizerId = organizerId, Title = "Original Title", Capacity = 100 };
        db.Events.Add(ev);
        await db.SaveChangesAsync();

        var updateReq = new EventsController.UpdateEventRequest(
            Title: "Updated Title",
            Description: "New Description",
            Category: "tech",
            StartDate: DateTimeOffset.UtcNow.AddDays(15),
            EndDate: DateTimeOffset.UtcNow.AddDays(16),
            Location: "Galle Face",
            Capacity: 250
        );

        // Act
        var result = await controller.Update(ev.Id, updateReq, organizerId);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var updated = Assert.IsType<Event>(okResult.Value);
        Assert.Equal("Updated Title", updated.Title);
        Assert.Equal(250, updated.Capacity);
        Assert.Equal("Galle Face", updated.Location);
    }

    [Fact]
    public async Task Update_NonOrganizerUser_ReturnsForbid()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var controller = new EventsController(db);
        var organizerId = Guid.NewGuid();
        var unauthorizedUser = Guid.NewGuid();
        var ev = new Event { OrganizerId = organizerId, Title = "Original Title" };
        db.Events.Add(ev);
        await db.SaveChangesAsync();

        var updateReq = new EventsController.UpdateEventRequest("Hack Attempt", null, null, null, null, null, null);

        // Act
        var result = await controller.Update(ev.Id, updateReq, unauthorizedUser);

        // Assert
        Assert.IsType<ForbidResult>(result);
    }

    [Fact]
    public async Task Publish_And_Unpublish_Workflow_UpdatesStatusCorrectly()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var controller = new EventsController(db);
        var organizerId = Guid.NewGuid();
        var ev = new Event { OrganizerId = organizerId, Title = "Draft Event", Status = EventStatus.Draft };
        db.Events.Add(ev);
        await db.SaveChangesAsync();

        // Act 1: Publish
        var publishResult = await controller.Publish(ev.Id, organizerId);
        var pubOk = Assert.IsType<OkObjectResult>(publishResult);
        var pubEvent = Assert.IsType<Event>(pubOk.Value);
        Assert.Equal(EventStatus.Published, pubEvent.Status);

        // Act 2: Unpublish
        var unpublishResult = await controller.Unpublish(ev.Id, organizerId);
        var unpubOk = Assert.IsType<OkObjectResult>(unpublishResult);
        var unpubEvent = Assert.IsType<Event>(unpubOk.Value);
        Assert.Equal(EventStatus.Draft, unpubEvent.Status);
    }

    [Fact]
    public async Task Cancel_OrganizerUser_SetsStatusToPendingDeletionAndNotifiesAttendees()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var controller = new EventsController(db);
        var organizerId = Guid.NewGuid();
        var attendee1 = Guid.NewGuid();
        var attendee2 = Guid.NewGuid();

        var ev = new Event { OrganizerId = organizerId, Title = "Robotics Expo", Status = EventStatus.Published };
        db.Events.Add(ev);
        db.Registrations.AddRange(
            new Registration { EventId = ev.Id, AttendeeId = attendee1 },
            new Registration { EventId = ev.Id, AttendeeId = attendee2 }
        );
        await db.SaveChangesAsync();

        // Act
        var result = await controller.Cancel(ev.Id, organizerId);

        // Assert
        Assert.IsType<NoContentResult>(result);

        var updatedEvent = await db.Events.FindAsync(ev.Id);
        Assert.Equal(EventStatus.PendingDeletion, updatedEvent!.Status);

        var notifications = db.Notifications.ToList();
        Assert.Equal(2, notifications.Count);
        Assert.Contains(notifications, n => n.UserId == attendee1 && n.Subject.Contains("Robotics Expo"));
    }

    [Fact]
    public async Task SalesReport_CalculatesRevenueAndRemainingTicketsAccurately()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var controller = new EventsController(db);
        var ev = new Event { Title = "Concert" };
        db.Events.Add(ev);
        db.TicketTypes.AddRange(
            new TicketType { EventId = ev.Id, Name = "VIP", Price = 100m, Quantity = 50, Sold = 50 },
            new TicketType { EventId = ev.Id, Name = "General", Price = 40m, Quantity = 100, Sold = 30 }
        );
        await db.SaveChangesAsync();

        // Act
        var result = await controller.SalesReport(ev.Id);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        dynamic? report = okResult.Value;
        Assert.NotNull(report);
        decimal totalRevenue = (decimal)report.GetType().GetProperty("totalRevenue")!.GetValue(report)!;
        // VIP: 100 * 50 = 5000, General: 40 * 30 = 1200 => Total = 6200
        Assert.Equal(6200m, totalRevenue);
    }

    [Fact]
    public async Task Waitlist_JoinAndPromote_EndToEndFlow()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var controller = new EventsController(db);
        var attendeeId1 = Guid.NewGuid();
        var attendeeId2 = Guid.NewGuid();

        db.Users.AddRange(
            new User { Id = attendeeId1, Name = "Attendee One", Email = "one@test.com", PasswordHash = "hash1" },
            new User { Id = attendeeId2, Name = "Attendee Two", Email = "two@test.com", PasswordHash = "hash2" }
        );

        var ev = new Event { Title = "Sold Out Masterclass" };
        db.Events.Add(ev);
        var tt = new TicketType { EventId = ev.Id, Name = "Early Bird", Price = 50m, Quantity = 10, Sold = 10 };
        db.TicketTypes.Add(tt);
        await db.SaveChangesAsync();

        // 1. Join Waitlist when Sold Out -> Success (Position #1)
        var joinResult1 = await controller.JoinWaitlist(ev.Id, attendeeId1, tt.Id);
        var okJoin1 = Assert.IsType<OkObjectResult>(joinResult1);
        Assert.NotNull(okJoin1.Value);

        // 2. Second attendee joins -> Position #2
        var joinResult2 = await controller.JoinWaitlist(ev.Id, attendeeId2, tt.Id);
        var okJoin2 = Assert.IsType<OkObjectResult>(joinResult2);
        Assert.NotNull(okJoin2.Value);

        // 3. Duplicate join for attendee 1 -> Conflict
        var dupResult = await controller.JoinWaitlist(ev.Id, attendeeId1, tt.Id);
        Assert.IsType<ConflictObjectResult>(dupResult);

        // 4. Check waitlist count
        var listResult = await controller.GetWaitlist(ev.Id);
        var okList = Assert.IsType<OkObjectResult>(listResult);
        var waitlistItems = Assert.IsAssignableFrom<System.Collections.IEnumerable>(okList.Value);
        Assert.Equal(2, waitlistItems.Cast<object>().Count());

        // 5. Try to promote while still sold out -> Conflict
        var firstEntry = db.WaitlistEntries.First(w => w.AttendeeId == attendeeId1);
        var promoteFail = await controller.PromoteWaitlistEntry(ev.Id, firstEntry.Id);
        Assert.IsType<ConflictObjectResult>(promoteFail);

        // 6. Free up a ticket (e.g. cancellation) and promote
        tt.Sold = 9;
        await db.SaveChangesAsync();
        var promoteSuccess = await controller.PromoteWaitlistEntry(ev.Id, firstEntry.Id);
        Assert.IsType<OkObjectResult>(promoteSuccess);
        Assert.Equal(WaitlistStatus.Notified, firstEntry.Status);
    }
}
