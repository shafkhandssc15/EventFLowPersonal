using System.Net;
using System.Net.Http.Json;
using EventManagement.Api.Models;
using FluentAssertions;

namespace EventManagement.Api.Tests;

public class AuthControllerTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    public AuthControllerTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    private record RegisterRequest(string Name, string Email, string Password, UserRole Role);
    private record LoginRequest(string Email, string Password);
    private record AuthResponse(string Token, Guid Id, string Name, string Email, string Role);

    [Fact]
    public async Task Register_WithValidData_ReturnsTokenAndUser()
    {
        var email = $"user{Guid.NewGuid():N}@test.com";
        var res = await _client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("Test User", email, "Password123", UserRole.Attendee));

        res.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await res.Content.ReadFromJsonAsync<AuthResponse>();
        body!.Token.Should().NotBeNullOrWhiteSpace();
        body.Email.Should().Be(email.ToLowerInvariant());
        body.Role.Should().Be("Attendee");
    }

    [Fact]
    public async Task Register_WithDuplicateEmail_ReturnsConflict()
    {
        var email = $"dup{Guid.NewGuid():N}@test.com";
        var req = new RegisterRequest("First", email, "Password123", UserRole.Attendee);

        (await _client.PostAsJsonAsync("/api/auth/register", req)).StatusCode.Should().Be(HttpStatusCode.OK);
        var second = await _client.PostAsJsonAsync("/api/auth/register", req with { Name = "Second" });

        second.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task Register_WithShortPassword_ReturnsBadRequest()
    {
        var res = await _client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("Test", $"short{Guid.NewGuid():N}@test.com", "123", UserRole.Attendee));

        res.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Login_WithCorrectPassword_ReturnsToken()
    {
        var email = $"login{Guid.NewGuid():N}@test.com";
        await _client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("Login User", email, "CorrectHorse1", UserRole.Organizer));

        var res = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, "CorrectHorse1"));

        res.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await res.Content.ReadFromJsonAsync<AuthResponse>();
        body!.Role.Should().Be("Organizer");
    }

    [Fact]
    public async Task Login_WithWrongPassword_ReturnsUnauthorized()
    {
        var email = $"wrongpw{Guid.NewGuid():N}@test.com";
        await _client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("User", email, "CorrectHorse1", UserRole.Attendee));

        var res = await _client.PostAsJsonAsync("/api/auth/login", new LoginRequest(email, "WrongPassword"));

        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Login_WithUnknownEmail_ReturnsUnauthorized()
    {
        var res = await _client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest($"nobody{Guid.NewGuid():N}@test.com", "whatever123"));

        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Me_WithoutToken_ReturnsUnauthorized()
    {
        var res = await _client.GetAsync("/api/auth/me");
        res.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Me_WithValidToken_ReturnsCurrentUser()
    {
        var email = $"me{Guid.NewGuid():N}@test.com";
        var register = await _client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest("Me User", email, "Password123", UserRole.Attendee));
        var auth = await register.Content.ReadFromJsonAsync<AuthResponse>();

        _client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", auth!.Token);
        var res = await _client.GetAsync("/api/auth/me");

        res.StatusCode.Should().Be(HttpStatusCode.OK);
        _client.DefaultRequestHeaders.Authorization = null;
    }
}
