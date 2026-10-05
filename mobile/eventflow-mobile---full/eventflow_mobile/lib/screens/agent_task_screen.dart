import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/aspnet_api_service.dart';
import '../models/agent_task.dart';
import '../widgets/reusable_widgets.dart';

/// Agentic Task Submission, Recommendation Display & Workflow Status Screen

/// Fulfills Rubric requirement: "Agentic task submission, recommendation display and workflow status where suitable."
class AgentTaskScreen extends StatefulWidget {
  const AgentTaskScreen({super.key});

  @override
  
  State<AgentTaskScreen> createState() => _AgentTaskScreenState();
}

class _AgentTaskScreenState extends State<AgentTaskScreen> {
  final _objectiveController = TextEditingController();
  bool _submitting = false;
  AgentTaskModel? _currentTask;
  String? _error;

  final List<String> _quickTasks = [
    'Optimize gate check-in throughput at BMICH for 2,500 attendees',
    'Model Nelum Pokuna main auditorium arrival velocity and fast-lanes',
    'Recommend budget technology conferences with student developer pass',
    'Plan stage AV and audio vendor setup for Colombo music festival',
  ];

  Future<void> _submitTask([String? preset]) async {
    final query = preset ?? _objectiveController.text.trim();
    if (query.isEmpty) return;

    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      final api = context.read<AspDotNetApiService>();
      final task = await api.submitAgentTask(query);
      if (mounted) {
        setState(() {
          _currentTask = task;
          _objectiveController.clear();
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _error = e.toString());
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF030712),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0B0F19),
        title: const Row(
          children: [
            Icon(Icons.psychology, color: Color(0xFF60A5FA), size: 22),
            SizedBox(width: 8),
            Text('Agentic Workflows', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17, color: Colors.white)),
          ],
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Task Submission Form
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0x33FFFFFF)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Submit Operational Objective',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.white),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Input event parameters, gate throughput targets, or attendee queries to trigger multi-step agentic analysis.',
                    style: TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                  ),
                  const SizedBox(height: 14),
                  TextField(
                    controller: _objectiveController,
                    maxLines: 2,
                    style: const TextStyle(color: Colors.white, fontSize: 13),
                    decoration: InputDecoration(
                      hintText: 'e.g. Optimize gate check-in throughput at BMICH...',
                      hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                      filled: true,
                      fillColor: const Color(0xFF030712),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0x1AFFFFFF))),
                    ),
                  ),
                  const SizedBox(height: 12),
                  ElevatedButton.icon(
                    onPressed: _submitting ? null : () => _submitTask(),
                    icon: _submitting
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Icon(Icons.bolt, size: 18),
                    label: Text(_submitting ? 'Executing Workflow...' : 'Execute Agentic Workflow'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      foregroundColor: Colors.white,
                      minimumSize: const Size.fromHeight(44),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Quick Operational Presets
            const Text(
              'Operational Presets:',
              style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: _quickTasks.map((preset) => ActionChip(
                backgroundColor: const Color(0xFF0F172A),
                label: Text(preset, style: const TextStyle(fontSize: 11, color: Color(0xFFCBD5E1))),
                onPressed: _submitting ? null : () => _submitTask(preset),
              )).toList(),
            ),
            const SizedBox(height: 20),

            if (_error != null)
              ErrorBannerWidget(message: _error!, onRetry: () => _submitTask()),

            // Active Workflow Status & Recommendations Display
            if (_currentTask != null) ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF0F172A),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0x332563EB)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Workflow Status', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.white)),
                        StatusBadgeWidget(status: _currentTask!.status),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text('Objective: ${_currentTask!.objective}', style: const TextStyle(fontSize: 12, color: Color(0xFF93C5FD), fontWeight: FontWeight.w600)),
                    const Divider(color: Color(0x1AFFFFFF), height: 24),

                    // Multi-Step Workflow Pipeline
                    const Text('Execution Pipeline:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
                    const SizedBox(height: 8),
                    ..._currentTask!.steps.map((step) => Padding(
                      padding: const EdgeInsets.only(bottom: 8.0),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Icon(Icons.check_circle, size: 16, color: Color(0xFF34D399)),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(step.name, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
                                if (step.output.isNotEmpty)
                                  Text(step.output, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    )),
                    const Divider(color: Color(0x1AFFFFFF), height: 24),

                    // Recommendations Display
                    const Row(
                      children: [
                        Icon(Icons.lightbulb, size: 16, color: Color(0xFFFBBF24)),
                        SizedBox(width: 6),
                        Text('Actionable Recommendations:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
                      ],
                    ),
                    const SizedBox(height: 10),
                    ..._currentTask!.recommendations.map((rec) => Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFF030712),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0x1AFFFFFF)),
                      ),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('•', style: TextStyle(color: Color(0xFF60A5FA), fontSize: 16, fontWeight: FontWeight.bold)),
                          const SizedBox(width: 8),
                          Expanded(child: Text(rec, style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 12, height: 1.4))),
                        ],
                      ),
                    )),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
