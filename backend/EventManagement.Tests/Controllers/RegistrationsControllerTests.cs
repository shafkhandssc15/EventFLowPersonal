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

public class RegistrationsControllerTests
{
    // =========================================================================
    // RegistrationsController Tests
    // =========================================================================

    [Fact]
    public async Task Register_AvailableTicket_CreatesRegistrationAndDispatchesNotification()
    {
        using var db = TestDbContextFactory.Create();
        var controller = new RegistrationsController(db);
        var eventId = Guid.NewGuid();
        var attendeeId = Guid.NewGuid();

        var ticketType = new TicketType { EventId = eventId, Name = "Early Bird", Price = 2500m, Quantity = 50, Sold = 0 };
        db.TicketTypes.Add(ticketType);
        await db.SaveChangesAsync();

        var req = new RegistrationsController.RegisterRequest(eventId, attendeeId, ticketType.Id);

        var result = await controller.Register(req);

        var created = Assert.IsType<CreatedAtActionResult>(result);
        dynamic? body = created.Value;
        Assert.NotNull(body);
        Registration registration = (Registration)body.GetType().GetProperty("registration")!.GetValue(body)!;
        Ticket ticket = (Ticket)body.GetType().GetProperty("ticket")!.GetValue(body)!;

        Assert.Equal(RegistrationStatus.Registered, registration.Status);
        Assert.StartsWith("QR-", ticket.QrCode);
        Assert.Equal(1, ticketType.Sold);

        // Check confirmation notification created
        var notifications = db.Notifications.Where(n => n.UserId == attendeeId).ToList();
        Assert.Single(notifications);
        Assert.Contains(ticket.QrCode, notifications[0].Body);
    }

    [Fact]
    public async Task Register_SoldOutTicket_ReturnsConflictWithWaitlistHint()
    {
        using var db = TestDbContextFactory.Create();
        var controller = new RegistrationsController(db);
        var eventId = Guid.NewGuid();
        var attendeeId = Guid.NewGuid();

        var ticketType = new TicketType { EventId = eventId, Name = "VIP Pass", Price = 10000m, Quantity = 10, Sold = 10 };
        db.TicketTypes.Add(ticketType);
        await db.SaveChangesAsync();

        var req = new RegistrationsController.RegisterRequest(eventId, attendeeId, ticketType.Id);

        var result = await controller.Register(req);

        var conflict = Assert.IsType<ConflictObjectResult>(result);
        dynamic? body = conflict.Value;
        Assert.NotNull(body);
        string message = (string)body.GetType().GetProperty("message")!.GetValue(body)!;
        Assert.Equal("Sold out", message);
    }

    [Fact]
    public async Task Register_NonExistentTicket_ReturnsNotFound()
    {
        using var db = TestDbContextFactory.Create();
        var controller = new RegistrationsController(db);

        var req = new RegistrationsController.RegisterRequest(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid());

        var result = await controller.Register(req);

        Assert.IsType<NotFoundObjectResult>(result);
    }

    [Fact]
    public async Task Transfer_ExistingRegistration_UpdatesAttendeeIdSuccessfully()
    {
        using var db = TestDbContextFactory.Create();
        var controller = new RegistrationsController(db);
        var originalAttendeeId = Guid.NewGuid();
        var newAttendeeId = Guid.NewGuid();

        var registration = new Registration { AttendeeId = originalAttendeeId, Status = RegistrationStatus.Registered };
        db.Registrations.Add(registration);
        await db.SaveChangesAsync();

        var result = await controller.Transfer(registration.Id, newAttendeeId);

        var okResult = Assert.IsType<OkObjectResult>(result);
        var updated = Assert.IsType<Registration>(okResult.Value);
        Assert.Equal(newAttendeeId, updated.AttendeeId);
    }

    [Fact]
    public async Task Cancel_ExistingRegistration_RemovesRegistrationFromDatabase()
    {
        using var db = TestDbContextFactory.Create();
        var controller = new RegistrationsController(db);
        var registration = new Registration { AttendeeId = Guid.NewGuid(), Status = RegistrationStatus.Registered };
        db.Registrations.Add(registration);
        await db.SaveChangesAsync();

        var result = await controller.Cancel(registration.Id);

        Assert.IsType<NoContentResult>(result);
        var dbReg = await db.Registrations.FindAsync(registration.Id);
        Assert.Null(dbReg);
    }

    // =========================================================================
    // CheckInController Tests
    // =========================================================================

    [Fact]
    public async Task CheckIn_ValidQR_UpdatesStatusToCheckedInAndLogsEntry()
    {
        using var db = TestDbContextFactory.Create();
        var controller = new CheckInController(db);

        var ticket = new Ticket { QrCode = "QR-SECURE-12345" };
        db.Tickets.Add(ticket);
        var registration = new Registration { TicketId = ticket.Id, Status = RegistrationStatus.Registered };
        db.Registrations.Add(registration);
        await db.SaveChangesAsync();

        var req = new CheckInController.CheckInRequest("QR-SECURE-12345");

        var result = await controller.CheckIn(req);

        var okResult = Assert.IsType<OkObjectResult>(result);
        dynamic? body = okResult.Value;
        Assert.NotNull(body);
        string message = (string)body.GetType().GetProperty("message")!.GetValue(body)!;
        Assert.Equal("Checked in", message);

        var updatedReg = await db.Registrations.FindAsync(registration.Id);
        Assert.Equal(RegistrationStatus.CheckedIn, updatedReg!.Status);

        var checkIns = db.CheckIns.Where(c => c.RegistrationId == registration.Id).ToList();
        Assert.Single(checkIns);
        Assert.Equal("QR", checkIns[0].Method);
    }

    [Fact]
    public async Task CheckIn_DuplicateScan_ReturnsConflictBlockingDuplicateEntry()
    {
        using var db = TestDbContextFactory.Create();
        var controller = new CheckInController(db);

        var ticket = new Ticket { QrCode = "QR-SCANNED-999" };
        db.Tickets.Add(ticket);
        var registration = new Registration { TicketId = ticket.Id, Status = RegistrationStatus.CheckedIn };
        db.Registrations.Add(registration);
        await db.SaveChangesAsync();

        var req = new CheckInController.CheckInRequest("QR-SCANNED-999");

        var result = await controller.CheckIn(req);

        var conflict = Assert.IsType<ConflictObjectResult>(result);
        dynamic? body = conflict.Value;
        Assert.NotNull(body);
        string message = (string)body.GetType().GetProperty("message")!.GetValue(body)!;
        Assert.Contains("duplicate scan blocked", message);
    }

    [Fact]
    public async Task CheckIn_InvalidQRCode_ReturnsNotFound()
    {
        using var db = TestDbContextFactory.Create();
        var controller = new CheckInController(db);

        var req = new CheckInController.CheckInRequest("QR-DOES-NOT-EXIST");

        var result = await controller.CheckIn(req);

        var notFound = Assert.IsType<NotFoundObjectResult>(result);
        dynamic? body = notFound.Value;
        Assert.NotNull(body);
        string message = (string)body.GetType().GetProperty("message")!.GetValue(body)!;
        Assert.Equal("Invalid QR code", message);
    }

    [Fact]
    public async Task ExportAttendeeList_ReturnsAttendeeRosterForEvent()
    {
        using var db = TestDbContextFactory.Create();
        var controller = new CheckInController(db);
        var eventId = Guid.NewGuid();

        var user1 = new User { Name = "Kasun Perera", Email = "kasun@example.com", PasswordHash = "hashed_pw_1" };
        var user2 = new User { Name = "Nimal Silva", Email = "nimal@example.com", PasswordHash = "hashed_pw_2" };
        db.Users.AddRange(user1, user2);

        db.Registrations.AddRange(
            new Registration { EventId = eventId, Attendee = user1, Status = RegistrationStatus.Registered },
            new Registration { EventId = eventId, Attendee = user2, Status = RegistrationStatus.CheckedIn }
        );
        await db.SaveChangesAsync();

        var result = await controller.ExportAttendeeList(eventId);

        var okResult = Assert.IsType<OkObjectResult>(result);
        var list = Assert.IsAssignableFrom<System.Collections.IEnumerable>(okResult.Value);
        Assert.Equal(2, list.Cast<object>().Count());
    }
}
