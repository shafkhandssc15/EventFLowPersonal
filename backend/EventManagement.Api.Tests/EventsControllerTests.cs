using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using EventManagement.Api.Models;
using FluentAssertions;

namespace EventManagement.Api.Tests;

// Covers role-based authorization on the Events endpoints — the assignment's
// core "protected endpoints" requirement — plus the basic CRUD/business-rule path.
public class EventsControllerTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public EventsControllerTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    private record RegisterRequest(string Name, string Email, string Password, UserRole Role);
    private record AuthResponse(string Token, Guid Id, string Name, string Email, string Role);
    private record CreateTicketTypeRequest(string Name, decimal Price, int Quantity);
    private record CreateEventRequest(
        string Title, string? Description, string? Category,
        DateTimeOffset StartDate, DateTimeOffset EndDate, string? Location, int Capacity,
        List<CreateTicketTypeRequest>? TicketTypes);

    private async Task<string> RegisterAndGetTokenAsync(UserRole role)
    {
        var email = $"{role}-{Guid.NewGuid():N}@test.com";
        var res = await _client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest($"{role} Tester", email, "Password123", role));
        var body = await res.Content.ReadFromJsonAsync<AuthResponse>();
        return body!.Token;
    }

    [Fact]
    public async Task List_WithoutAuth_IsAllowed()
    {
        var res = await _client.GetAsync("/api/events");
        res.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Create_WithoutToken_ReturnsUnauthorized()
    {
        var res = await _client.PostAsJsonAsync("/api/events", new CreateEventRequest(
            "Unauthorized Event", null, null, DateTimeOffset.UtcNow.AddDays(10), DateTimeOffset.UtcNow.AddDays(11), null, 100, null));

        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Create_AsAttendee_ReturnsForbidden()
    {
        var token = await RegisterAndGetTokenAsync(UserRole.Attendee);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var res = await _client.PostAsJsonAsync("/api/events", new CreateEventRequest(
            "Attendee Cannot Create", null, null, DateTimeOffset.UtcNow.AddDays(10), DateTimeOffset.UtcNow.AddDays(11), null, 100, null));

        res.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        _client.DefaultRequestHeaders.Authorization = null;
    }

    [Fact]
    public async Task Create_AsOrganizer_SucceedsAndOwnershipComesFromToken()
    {
        var token = await RegisterAndGetTokenAsync(UserRole.Organizer);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var res = await _client.PostAsJsonAsync("/api/events", new CreateEventRequest(
            "Organizer Conference", "A test event", "Technology",
            DateTimeOffset.UtcNow.AddDays(10), DateTimeOffset.UtcNow.AddDays(11), "Colombo", 250,
            new List<CreateTicketTypeRequest> { new("General", 1000m, 50) }));

        res.StatusCode.Should().Be(HttpStatusCode.Created);
        var created = await res.Content.ReadFromJsonAsync<Event>();
        created!.Title.Should().Be("Organizer Conference");
        created.Status.Should().Be(EventStatus.Draft);
        created.OrganizerId.Should().NotBe(Guid.Empty);

        _client.DefaultRequestHeaders.Authorization = null;
    }

    [Fact]
    public async Task Publish_ByNonOwnerOrganizer_ReturnsForbidden()
    {
        var ownerToken = await RegisterAndGetTokenAsync(UserRole.Organizer);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", ownerToken);
        var createRes = await _client.PostAsJsonAsync("/api/events", new CreateEventRequest(
            "Owned Event", null, null, DateTimeOffset.UtcNow.AddDays(5), DateTimeOffset.UtcNow.AddDays(6), null, 50, null));
        var created = await createRes.Content.ReadFromJsonAsync<Event>();
        _client.DefaultRequestHeaders.Authorization = null;

        var otherToken = await RegisterAndGetTokenAsync(UserRole.Organizer);
        _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", otherToken);

        var publishRes = await _client.PostAsync($"/api/events/{created!.Id}/publish", null);

        publishRes.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        _client.DefaultRequestHeaders.Authorization = null;
    }
}
