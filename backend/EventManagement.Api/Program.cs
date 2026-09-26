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

// Ensure Supabase DB is migrated and seeded with Sri Lanka data
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await DbSeeder.SeedAsync(db);
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowClients");
app.UseAuthorization();
app.MapControllers();

app.MapPost("/api/seed", async (AppDbContext db) =>
{
    await DbSeeder.SeedAsync(db);
    return Results.Ok(new { message = "Supabase PostgreSQL Database successfully populated with Sri Lanka sample data!" });
});

app.Run();
