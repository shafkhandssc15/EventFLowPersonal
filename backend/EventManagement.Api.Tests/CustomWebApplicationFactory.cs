using EventManagement.Api.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace EventManagement.Api.Tests;

// Boots the real ASP.NET Core pipeline (real JWT auth, real controllers, real
// [Authorize] checks) but swaps Postgres for a per-test-run EF Core InMemory
// database, and disables the Supabase-seeding startup step. This is what lets
// the integration tests below run anywhere with no external DB dependency.
public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    public readonly string DbName = $"eventflow-tests-{Guid.NewGuid()}";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureServices(services =>
        {
            var descriptor = services.SingleOrDefault(
                d => d.ServiceType == typeof(DbContextOptions<AppDbContext>));
            if (descriptor != null) services.Remove(descriptor);

            services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase(DbName));
        });
    }
}
