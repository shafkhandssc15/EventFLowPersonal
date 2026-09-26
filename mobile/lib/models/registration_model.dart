/// Dart model for Registration and CheckIn responses.

class RegistrationModel {
  final String id;
  final String eventId;
  final String attendeeId;
  final String? ticketId;
  final String status;
  final DateTime createdAt;

  const RegistrationModel({
    required this.id,
    required this.eventId,
    required this.attendeeId,
    this.ticketId,
    required this.status,
    required this.createdAt,
  });

  factory RegistrationModel.fromJson(Map<String, dynamic> json) {
    return RegistrationModel(
      id: json['id'] as String,
      eventId: json['eventId'] as String,
      attendeeId: json['attendeeId'] as String,
      ticketId: json['ticketId'] as String?,
      status: json['status'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  bool get isCheckedIn => status == 'CheckedIn';
}

class CheckInResult {
  final bool success;
  final String? error;
  final String? registrationId;
  final DateTime? checkedInAt;

  const CheckInResult({
    required this.success,
    this.error,
    this.registrationId,
    this.checkedInAt,
  });

  factory CheckInResult.fromJson(Map<String, dynamic> json) {
    return CheckInResult(
      success: json['error'] == null,
      error: json['error'] as String?,
      registrationId: json['registrationId'] as String?,
      checkedInAt: json['checkedInAt'] != null
          ? DateTime.parse(json['checkedInAt'] as String)
          : null,
    );
  }
}
