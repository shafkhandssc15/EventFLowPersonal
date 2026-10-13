using System;
using System.Net;
using System.Threading.Tasks;
using EventManagement.Api.Controllers;
using EventManagement.Api.Models;
using EventManagement.Tests.Common;
using Microsoft.AspNetCore.Mvc;
using Xunit;

namespace EventManagement.Tests.Controllers;

public class AgentWorkflowControllerTests
{
    [Fact]
    public async Task Start_WhenAgentCompletesWithoutPause_StatusIsCompleted()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var agentResponseJson = "{\"status\":\"completed\",\"steps\":[\"plan\",\"rank\",\"reserve\",\"validate\"],\"paused_for_approval\":false}";
        var httpFactory = MockHttpClientHelper.CreateFactory(agentResponseJson, HttpStatusCode.OK);
        var controller = new AgentWorkflowController(db, httpFactory);

        var req = new AgentWorkflowController.StartWorkflowRequest(
            OrganizerId: Guid.NewGuid(),
            Objective: "Annual Tech Conference",
            Capacity: 400,
            Budget: 150000m,
            EventDate: DateTimeOffset.UtcNow.AddDays(30),
            Location: "Colombo"
        );

        // Act
        var result = await controller.Start(req);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        dynamic? body = okResult.Value;
        Assert.NotNull(body);
        WorkflowStatus status = (WorkflowStatus)body.GetType().GetProperty("Status")!.GetValue(body)!;
        Assert.Equal(WorkflowStatus.Completed, status);

        Guid workflowId = (Guid)body.GetType().GetProperty("Id")!.GetValue(body)!;
        var savedWorkflow = await db.AgentWorkflows.FindAsync(workflowId);
        Assert.NotNull(savedWorkflow);
        Assert.Equal(WorkflowStatus.Completed, savedWorkflow.Status);
        Assert.Equal(ApprovalStatus.NotRequired, savedWorkflow.ApprovalStatus);
        Assert.NotNull(savedWorkflow.CompletedAt);
    }

    [Fact]
    public async Task Start_WhenAgentExceedsBudgetThreshold_PausesForHumanApproval()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var agentResponseJson = "{\"status\":\"paused\",\"step\":\"validation\",\"paused_for_approval\":true,\"reason\":\"Estimated cost exceeds budget limit\"}";
        var httpFactory = MockHttpClientHelper.CreateFactory(agentResponseJson, HttpStatusCode.OK);
        var controller = new AgentWorkflowController(db, httpFactory);

        var req = new AgentWorkflowController.StartWorkflowRequest(
            OrganizerId: Guid.NewGuid(),
            Objective: "Mega Stadium Concert",
            Capacity: 5000,
            Budget: 500000m,
            EventDate: DateTimeOffset.UtcNow.AddDays(45),
            Location: "Sugathadasa Stadium"
        );

        // Act
        var result = await controller.Start(req);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        dynamic? body = okResult.Value;
        Assert.NotNull(body);
        WorkflowStatus status = (WorkflowStatus)body.GetType().GetProperty("Status")!.GetValue(body)!;
        Assert.Equal(WorkflowStatus.PausedForApproval, status);

        Guid workflowId = (Guid)body.GetType().GetProperty("Id")!.GetValue(body)!;
        var savedWorkflow = await db.AgentWorkflows.FindAsync(workflowId);
        Assert.NotNull(savedWorkflow);
        Assert.Equal(WorkflowStatus.PausedForApproval, savedWorkflow.Status);
        Assert.Equal(ApprovalStatus.Pending, savedWorkflow.ApprovalStatus);
    }

    [Fact]
    public async Task Approve_WhenPaused_OrganizerApproves_ResumesAndCompletesWorkflow()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var resumeResponseJson = "{\"status\":\"completed\",\"resumed\":true}";
        var httpFactory = MockHttpClientHelper.CreateFactory(resumeResponseJson, HttpStatusCode.OK);
        var controller = new AgentWorkflowController(db, httpFactory);

        var workflow = new AgentWorkflow
        {
            Objective = "Corporate Gala",
            Status = WorkflowStatus.PausedForApproval,
            ApprovalStatus = ApprovalStatus.Pending
        };
        db.AgentWorkflows.Add(workflow);
        await db.SaveChangesAsync();

        // Act: Organizer approves
        var result = await controller.Approve(workflow.Id, approve: true);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        dynamic? body = okResult.Value;
        Assert.NotNull(body);
        WorkflowStatus status = (WorkflowStatus)body.GetType().GetProperty("Status")!.GetValue(body)!;
        Assert.Equal(WorkflowStatus.Completed, status);

        var updated = await db.AgentWorkflows.FindAsync(workflow.Id);
        Assert.Equal(ApprovalStatus.Approved, updated!.ApprovalStatus);
        Assert.Equal(WorkflowStatus.Completed, updated.Status);
    }

    [Fact]
    public async Task Approve_WhenPaused_OrganizerRejects_SetsStatusToFailed()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var resumeResponseJson = "{\"status\":\"rejected\",\"resumed\":false}";
        var httpFactory = MockHttpClientHelper.CreateFactory(resumeResponseJson, HttpStatusCode.OK);
        var controller = new AgentWorkflowController(db, httpFactory);

        var workflow = new AgentWorkflow
        {
            Objective = "Outdoor Festival",
            Status = WorkflowStatus.PausedForApproval,
            ApprovalStatus = ApprovalStatus.Pending
        };
        db.AgentWorkflows.Add(workflow);
        await db.SaveChangesAsync();

        // Act: Organizer rejects
        var result = await controller.Approve(workflow.Id, approve: false);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        dynamic? body = okResult.Value;
        Assert.NotNull(body);
        WorkflowStatus status = (WorkflowStatus)body.GetType().GetProperty("Status")!.GetValue(body)!;
        Assert.Equal(WorkflowStatus.Failed, status);

        var updated = await db.AgentWorkflows.FindAsync(workflow.Id);
        Assert.Equal(ApprovalStatus.Rejected, updated!.ApprovalStatus);
        Assert.Equal(WorkflowStatus.Failed, updated.Status);
    }

    [Fact]
    public async Task Approve_WhenNotPaused_ReturnsBadRequest()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var httpFactory = MockHttpClientHelper.CreateFactory("{}", HttpStatusCode.OK);
        var controller = new AgentWorkflowController(db, httpFactory);

        var workflow = new AgentWorkflow
        {
            Objective = "Completed Event",
            Status = WorkflowStatus.Completed
        };
        db.AgentWorkflows.Add(workflow);
        await db.SaveChangesAsync();

        // Act
        var result = await controller.Approve(workflow.Id, approve: true);

        // Assert
        var badRequest = Assert.IsType<BadRequestObjectResult>(result);
        Assert.Equal("Workflow is not awaiting approval", badRequest.Value);
    }

    [Fact]
    public async Task Logs_ReturnsOrderedExecutionLogsForWorkflow()
    {
        // Arrange
        using var db = TestDbContextFactory.Create();
        var httpFactory = MockHttpClientHelper.CreateFactory("{}", HttpStatusCode.OK);
        var controller = new AgentWorkflowController(db, httpFactory);
        var workflowId = Guid.NewGuid();

        db.AgentExecutionLogs.AddRange(
            new AgentExecutionLog { WorkflowId = workflowId, AgentName = "PlannerAgent", Action = "plan", OutputJson = "Drafted plan", Timestamp = DateTimeOffset.UtcNow.AddMinutes(-5) },
            new AgentExecutionLog { WorkflowId = workflowId, AgentName = "DomainAnalysisAgent", Action = "rank", OutputJson = "Ranked venues", Timestamp = DateTimeOffset.UtcNow.AddMinutes(-3) },
            new AgentExecutionLog { WorkflowId = workflowId, AgentName = "ValidationAgent", Action = "validate", OutputJson = "Budget check", Timestamp = DateTimeOffset.UtcNow.AddMinutes(-1) }
        );
        await db.SaveChangesAsync();

        // Act
        var result = await controller.Logs(workflowId);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result);
        var list = Assert.IsAssignableFrom<System.Collections.Generic.IEnumerable<AgentExecutionLog>>(okResult.Value);
        Assert.Equal(3, System.Linq.Enumerable.Count(list));
    }
}
