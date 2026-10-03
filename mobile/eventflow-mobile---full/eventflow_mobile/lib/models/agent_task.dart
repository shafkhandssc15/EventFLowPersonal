class AgentTaskModel {
  final String id;
  final String objective;
  final String status;
  final String currentStep;
  final List<WorkflowStepModel> steps;
  final List<String> recommendations;
  final String createdAt;

  AgentTaskModel({
    required this.id,
    required this.objective,
    required this.status,
    required this.currentStep,
    required this.steps,
    required this.recommendations,
    required this.createdAt,
  });

  factory AgentTaskModel.fromJson(Map<String, dynamic> json) {
    return AgentTaskModel(
      id: json['id'] ?? '',
      objective: json['objective'] ?? '',
      status: json['status'] ?? 'Completed',
      currentStep: json['currentStep'] ?? 'Finished',
      steps: (json['steps'] as List? ?? [])
          .map((s) => WorkflowStepModel.fromJson(s))
          .toList(),
      recommendations: (json['recommendations'] as List? ?? [])
          .map((r) => r.toString())
          .toList(),
      createdAt: json['createdAt'] ?? DateTime.now().toIso8601String(),
    );
  }
}

class WorkflowStepModel {
  final String name;
  final String status;
  final String output;

  WorkflowStepModel({
    required this.name,
    required this.status,
    required this.output,
  });

  factory WorkflowStepModel.fromJson(Map<String, dynamic> json) {
    return WorkflowStepModel(
      name: json['name'] ?? '',
      status: json['status'] ?? 'done',
      output: json['output'] ?? '',
    );
  }
}
