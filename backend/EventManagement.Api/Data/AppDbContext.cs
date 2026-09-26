using EventManagement.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace EventManagement.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Event> Events => Set<Event>();
    public DbSet<TicketType> TicketTypes => Set<TicketType>();
    public DbSet<Ticket> Tickets => Set<Ticket>();
    public DbSet<Venue> Venues => Set<Venue>();
    public DbSet<Vendor> Vendors => Set<Vendor>();
    public DbSet<VendorBooking> VendorBookings => Set<VendorBooking>();
    public DbSet<Registration> Registrations => Set<Registration>();
    public DbSet<CheckIn> CheckIns => Set<CheckIn>();
    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<Budget> Budgets => Set<Budget>();
    public DbSet<Expense> Expenses => Set<Expense>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<ApprovalRequest> ApprovalRequests => Set<ApprovalRequest>();
    public DbSet<AgentWorkflow> AgentWorkflows => Set<AgentWorkflow>();
    public DbSet<AgentExecutionLog> AgentExecutionLogs => Set<AgentExecutionLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>().HasIndex(u => u.Email).IsUnique();
        modelBuilder.Entity<Ticket>().HasIndex(t => t.QrCode).IsUnique();

        modelBuilder.Entity<Event>()
            .HasOne(e => e.Organizer)
            .WithMany()
            .HasForeignKey(e => e.OrganizerId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Event>()
            .HasOne(e => e.Budget)
            .WithOne()
            .HasForeignKey<Event>(e => e.BudgetId);

        modelBuilder.Entity<TicketType>()
            .HasOne(tt => tt.Event)
            .WithMany(e => e.TicketTypes)
            .HasForeignKey(tt => tt.EventId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<VendorBooking>()
            .HasOne(vb => vb.Event)
            .WithMany(e => e.VendorBookings)
            .HasForeignKey(vb => vb.EventId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Expense>()
            .HasOne(ex => ex.Budget)
            .WithMany(b => b.Expenses)
            .HasForeignKey(ex => ex.BudgetId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<AgentExecutionLog>()
            .HasOne(l => l.Workflow)
            .WithMany(w => w.Logs)
            .HasForeignKey(l => l.WorkflowId)
            .OnDelete(DeleteBehavior.Cascade);

        // Store enums as strings for readability in Postgres
        modelBuilder.Entity<User>().Property(u => u.Role).HasConversion<string>();
        modelBuilder.Entity<Event>().Property(e => e.Status).HasConversion<string>();
        modelBuilder.Entity<VendorBooking>().Property(v => v.Status).HasConversion<string>();
        modelBuilder.Entity<Registration>().Property(r => r.Status).HasConversion<string>();
        modelBuilder.Entity<Expense>().Property(e => e.Status).HasConversion<string>();
        modelBuilder.Entity<AgentWorkflow>().Property(w => w.Status).HasConversion<string>();
        modelBuilder.Entity<AgentWorkflow>().Property(w => w.ApprovalStatus).HasConversion<string>();
        modelBuilder.Entity<ApprovalRequest>().Property(a => a.Status).HasConversion<string>();
    }
}
