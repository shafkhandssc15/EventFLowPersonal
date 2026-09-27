"""Quick end-to-end test of all 4 LLM-powered agents."""
import orchestrator

res = orchestrator.run_workflow(
    workflow_id='full-4-agent-test',
    objective='Launch Sri Lanka AI and Autonomous Systems Expo 2027 in Colombo',
    capacity=350,
    budget=1600000.0,
    event_date='2027-11-20T09:00:00Z',
    location='Colombo'
)

print('=== 4-AGENT LLM WORKFLOW EXECUTION SUMMARY ===')
print('Workflow Status:', res['status'])
print('Paused for Approval:', res['paused_for_approval'])
print('Total Agent Execution Logs:', len(res['logs']))
print()

for i, log in enumerate(res['logs'], 1):
    agent_name = log['agent_name']
    engine = log['output'].get('llm_engine', 'N/A')
    tools = log['tool_calls']
    print(f'[{i}] Agent: {agent_name}')
    print(f'    LLM Engine: {engine}')
    print(f'    Tool Calls: {tools}')

    if agent_name == 'PlannerCoordinatorAgent':
        draft_title = log['output']['draft_event']['title']
        summary = log['output'].get('summary', '')
        milestones = log['output'].get('milestones', [])
        print(f'    Title: {draft_title}')
        print(f'    Summary: {summary}')
        print(f'    Milestones: {len(milestones)} phases generated')

    elif agent_name == 'DomainAnalysisAgent':
        data_source = log['output'].get('data_source', '')
        top_v = log['output']['ranked_venues'][0]
        print(f'    Data Source: {data_source}')
        print(f'    Top Venue: {top_v["name"]} (Score: {top_v["matchScore"]})')
        print(f'    Reason: {top_v["reason"]}')

    elif agent_name == 'ActionToolUseAgent':
        booking_cost = log['output']['booking']['cost']
        ticket_type = log['output']['ticket_draft']['ticket_type']
        notif_subject = log['output']['notification']['subject']
        tiers = log['output'].get('ticket_tiers', [])
        print(f'    Estimated Cost: Rs. {booking_cost:,.0f} LKR')
        print(f'    Primary Ticket: {ticket_type}')
        print(f'    Ticket Tiers Generated: {len(tiers)}')
        print(f'    Notification: {notif_subject}')

    elif agent_name == 'ValidationSafetyAgent':
        decision = log['output']['decision']
        risk_level = log['output'].get('risk_level', '')
        audit_summary = log['output'].get('audit_summary', '')
        recommended = log['output'].get('recommended_action', '')
        print(f'    Decision: {decision}')
        print(f'    Risk Level: {risk_level}')
        print(f'    Audit: {audit_summary}')
        print(f'    Action: {recommended}')

    print()
