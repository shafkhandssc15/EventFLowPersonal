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

public class VenuesVendorsControllerTests
{
    // =========================================================================
    // VenuesController Tests
    // =========================================================================

    [Fact]
    public async Task Venues_Create_ValidVenue_ReturnsCreatedAtAction()
    {
        using var db = TestDbContextFactory.Create();
        var controller = new VenuesController(db);
        var ownerId = Guid.NewGuid();
        var req = new VenuesController.CreateVenueRequest(ownerId, "Grand Ballroom", "Cinnamon Grand", 600, 25000m);

        var result = await controller.Create(req);

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var venue = Assert.IsType<Venue>(created.Value);
        Assert.Equal("Grand Ballroom", venue.Name);
        Assert.Equal(600, venue.Capacity);
        Assert.Equal(25000m, venue.PricePerHour);
    }

    [Fact]
    public async Task Venues_Search_FiltersByCapacityAndLocation()
    {
        using var db = TestDbContextFactory.Create();
        var controller = new VenuesController(db);
        var ownerId = Guid.NewGuid();
        db.Venues.AddRange(
            new Venue { OwnerId = ownerId, Name = "Small Hall", Location = "Colombo 03", Capacity = 50, PricePerHour = 5000m, IsActive = true },
            new Venue { OwnerId = ownerId, Name = "Mega Arena", Location = "Colombo 07", Capacity = 1000, PricePerHour = 50000m, IsActive = true },
            new Venue { OwnerId = ownerId, Name = "Kandy Center", Location = "Kandy", Capacity = 500, PricePerHour = 20000m, IsActive = true }
        );
        await db.SaveChangesAsync();

        var result = await controller.Search(minCapacity: 100, maxPrice: 60000m, location: "Colombo", page: 1, pageSize: 10);

        var okResult = Assert.IsType<OkObjectResult>(result);
        dynamic? data = okResult.Value;
        Assert.NotNull(data);
        var total = (int)data.GetType().GetProperty("total")!.GetValue(data)!;
        Assert.Equal(1, total);
    }

    [Fact]
    public async Task Venues_Update_OwnerPermitted_NonOwnerForbidden()
    {
        using var db = TestDbContextFactory.Create();
        var controller = new VenuesController(db);
        var ownerId = Guid.NewGuid();
        var intruderId = Guid.NewGuid();
        var venue = new Venue { OwnerId = ownerId, Name = "Pavilion", Capacity = 200, PricePerHour = 10000m, Location = "Colombo" };
        db.Venues.Add(venue);
        await db.SaveChangesAsync();

        var updatedData = new Venue { PricePerHour = 15000m, Capacity = 250, Location = "Colombo Seaside" };

        // 1. Non-owner tries to update -> Forbid
        var forbidRes = await controller.Update(venue.Id, updatedData, intruderId);
        Assert.IsType<ForbidResult>(forbidRes);

        // 2. Legitimate owner updates -> Ok
        var okRes = await controller.Update(venue.Id, updatedData, ownerId);
        var okObj = Assert.IsType<OkObjectResult>(okRes);
        var resVenue = Assert.IsType<Venue>(okObj.Value);
        Assert.Equal(15000m, resVenue.PricePerHour);
        Assert.Equal(250, resVenue.Capacity);
    }

    [Fact]
    public async Task Venues_Deactivate_MarksPendingDeletion()
    {
        using var db = TestDbContextFactory.Create();
        var controller = new VenuesController(db);
        var ownerId = Guid.NewGuid();
        var venue = new Venue { OwnerId = ownerId, Name = "Old Banquet", IsPendingDeletion = false };
        db.Venues.Add(venue);
        await db.SaveChangesAsync();

        var result = await controller.Deactivate(venue.Id, ownerId);

        Assert.IsType<NoContentResult>(result);
        var updated = await db.Venues.FindAsync(venue.Id);
        Assert.True(updated!.IsPendingDeletion);
    }

    [Fact]
    public async Task Venues_CheckAvailability_DetectsConflictsAccurately()
    {
        using var db = TestDbContextFactory.Create();
        var controller = new VenuesController(db);
        var venue = new Venue { Name = "Lotus Hall", Capacity = 300 };
        db.Venues.Add(venue);

        var baseDate = DateTimeOffset.UtcNow.AddDays(5);
        var ev = new Event { Title = "Existing Event", StartDate = baseDate, EndDate = baseDate.AddHours(5) };
        db.Events.Add(ev);
        var booking = new VendorBooking { VenueId = venue.Id, EventId = ev.Id, Status = BookingStatus.Confirmed };
        db.VendorBookings.Add(booking);
        await db.SaveChangesAsync();

        // Check overlapping slot (e.g. 2 hours inside) -> not available
        var clashRes = await controller.CheckAvailability(venue.Id, baseDate.AddHours(1), baseDate.AddHours(3));
        var clashOk = Assert.IsType<OkObjectResult>(clashRes);
        dynamic? clashData = clashOk.Value;
        bool availableClash = (bool)clashData!.GetType().GetProperty("available")!.GetValue(clashData)!;
        Assert.False(availableClash);

        // Check non-overlapping slot (days later) -> available
        var freeRes = await controller.CheckAvailability(venue.Id, baseDate.AddDays(2), baseDate.AddDays(3));
        var freeOk = Assert.IsType<OkObjectResult>(freeRes);
        dynamic? freeData = freeOk.Value;
        bool availableFree = (bool)freeData!.GetType().GetProperty("available")!.GetValue(freeData)!;
        Assert.True(availableFree);
    }

    // =========================================================================
    // VendorsController Tests
    // =========================================================================

    [Fact]
    public async Task Vendors_Create_And_Search_Workflow()
    {
        using var db = TestDbContextFactory.Create();
        var controller = new VendorsController(db);
        var ownerId = Guid.NewGuid();
        var req = new VendorsController.CreateVendorRequest(ownerId, "Ceylon Sounds & Lights", "Catering & AV", 75000m);

        var createRes = await controller.Create(req);
        var created = Assert.IsType<CreatedAtActionResult>(createRes.Result);
        var vendor = Assert.IsType<Vendor>(created.Value);
        Assert.Equal("Ceylon Sounds & Lights", vendor.Name);

        // Search by max price
        var searchRes = await controller.Search(serviceType: "Catering & AV", maxPrice: 100000m);
        var okSearch = Assert.IsType<OkObjectResult>(searchRes);
        var list = Assert.IsAssignableFrom<IEnumerable<Vendor>>(okSearch.Value);
        Assert.Single(list);
    }

    // =========================================================================
    // VendorBookingsController Tests
    // =========================================================================

    [Fact]
    public async Task VendorBookings_Create_WhenFree_CreatesBookingSuccessfully()
    {
        using var db = TestDbContextFactory.Create();
        var controller = new VendorBookingsController(db);
        var ev = new Event { Title = "Concert", StartDate = DateTimeOffset.UtcNow.AddDays(10), EndDate = DateTimeOffset.UtcNow.AddDays(11), Capacity = 100 };
        var venue = new Venue { Name = "Main Arena", Capacity = 200, IsActive = true };
        db.Events.Add(ev);
        db.Venues.Add(venue);
        await db.SaveChangesAsync();

        var req = new VendorBookingsController.CreateBookingRequest(ev.Id, null, venue.Id, 50000m);

        var result = await controller.Create(req);

        var created = Assert.IsType<CreatedAtActionResult>(result);
        var booking = Assert.IsType<VendorBooking>(created.Value);
        Assert.Equal(BookingStatus.Requested, booking.Status);
        Assert.Equal(50000m, booking.Cost);
    }

    [Fact]
    public async Task VendorBookings_Create_DoubleBooking_ReturnsConflictWithAlternates()
    {
        using var db = TestDbContextFactory.Create();
        var controller = new VendorBookingsController(db);
        var baseDate = DateTimeOffset.UtcNow.AddDays(20);

        var venue1 = new Venue { Name = "Arena A", Capacity = 300, IsActive = true };
        var venue2 = new Venue { Name = "Alternate Arena B", Capacity = 400, IsActive = true };
        db.Venues.AddRange(venue1, venue2);

        // Event 1 has confirmed booking on Venue 1
        var ev1 = new Event { Title = "Event 1", StartDate = baseDate, EndDate = baseDate.AddDays(1), Capacity = 250 };
        db.Events.Add(ev1);
        var booked = new VendorBooking { EventId = ev1.Id, VenueId = venue1.Id, Status = BookingStatus.Confirmed, Cost = 20000m };
        db.VendorBookings.Add(booked);

        // Event 2 attempts to book Venue 1 for the exact same dates
        var ev2 = new Event { Title = "Event 2", StartDate = baseDate, EndDate = baseDate.AddDays(1), Capacity = 250 };
        db.Events.Add(ev2);
        await db.SaveChangesAsync();

        var clashReq = new VendorBookingsController.CreateBookingRequest(ev2.Id, null, venue1.Id, 25000m);

        var result = await controller.Create(clashReq);

        var conflict = Assert.IsType<ConflictObjectResult>(result);
        dynamic? body = conflict.Value;
        Assert.NotNull(body);
        string message = (string)body.GetType().GetProperty("message")!.GetValue(body)!;
        Assert.Contains("double-booked", message);
    }

    [Fact]
    public async Task VendorBookings_ConfirmAndReject_UpdatesStatusAccurately()
    {
        using var db = TestDbContextFactory.Create();
        var controller = new VendorBookingsController(db);
        var booking = new VendorBooking { Cost = 10000m, Status = BookingStatus.Requested };
        db.VendorBookings.Add(booking);
        await db.SaveChangesAsync();

        // 1. Confirm
        var confirmRes = await controller.Confirm(booking.Id);
        var okConfirm = Assert.IsType<OkObjectResult>(confirmRes);
        var confirmedBooking = Assert.IsType<VendorBooking>(okConfirm.Value);
        Assert.Equal(BookingStatus.Confirmed, confirmedBooking.Status);

        // 2. Reject
        var rejectRes = await controller.Reject(booking.Id);
        var okReject = Assert.IsType<OkObjectResult>(rejectRes);
        var rejectedBooking = Assert.IsType<VendorBooking>(okReject.Value);
        Assert.Equal(BookingStatus.Rejected, rejectedBooking.Status);
    }
}
