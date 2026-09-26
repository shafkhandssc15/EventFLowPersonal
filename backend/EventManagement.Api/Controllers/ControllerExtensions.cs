using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;

namespace EventManagement.Api.Controllers;

public static class ControllerExtensions
{
    // Reads the authenticated user's id from JWT claims (set by JwtTokenService).
    public static Guid GetUserId(this ControllerBase controller)
    {
        var raw = controller.User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(raw, out var id) ? id : Guid.Empty;
    }

    public static string GetUserRole(this ControllerBase controller)
        => controller.User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
}
