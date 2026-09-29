using EventManagement.Api.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowClients", policy =>
        policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod());
});

// Typed HttpClient used to call the internal Agentic AI service.
// Per spec: React/Flutter never call the agent service directly — only this API does.
builder.Services.AddHttpClient("AgentService", client =>
{
    client.BaseAddress = new Uri(builder.Configuration["AgentServiceUrl"] ?? "http://localhost:8000");
    client.Timeout = TimeSpan.FromSeconds(30);
});

var app = builder.Build();

// Ensure Supabase DB is initialized and remove legacy demo events
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await DbSeeder.SeedAsync(db);
}

// Enable Swagger in all environments (including Production) for easy testing
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "EventFlow API v1");
    c.RoutePrefix = "swagger";
});

app.UseCors("AllowClients");
app.UseAuthorization();

// Root endpoint so visiting the base URL does not return 404
app.MapGet("/", () => Results.Ok(new
{
    status = "Online",
    service = "EventFlow Management API",
    version = "1.0",
    docs = "/swagger",
    endpoints = new[]
    {
        "/api/events",
        "/api/venues",
        "/api/vendors",
        "/api/registrations",
        "/swagger"
    }
}));

app.MapControllers();

app.MapPost("/api/seed", async (AppDbContext db) =>
{
    await DbSeeder.SeedAsync(db);
    return Results.Ok(new { message = "Legacy demo events removed; no sample events were added." });
});

app.Run();
