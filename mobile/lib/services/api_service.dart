import 'dart:convert';
import 'package:http/http.dart' as http;

/// All calls go through the ASP.NET Core API — the Flutter app never talks
/// to the database or the agent service directly (per Section 7 of the plan).
class ApiService {
  // Use 10.0.2.2 for the Android emulator to reach a host-machine backend.
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:5000/api',
  );

  Future<List<dynamic>> listEvents({String? category}) async {
    final uri = Uri.parse('$baseUrl/events').replace(
      queryParameters: category != null ? {'category': category} : null,
    );
    final res = await http.get(uri);
    _checkOk(res);
    final body = jsonDecode(res.body);
    return body['items'] as List<dynamic>;
  }

  Future<Map<String, dynamic>> getEvent(String id) async {
    final res = await http.get(Uri.parse('$baseUrl/events/$id'));
    _checkOk(res);
    return jsonDecode(res.body);
  }

  Future<Map<String, dynamic>> register({
    required String eventId,
    required String attendeeId,
    required String ticketTypeId,
  }) async {
    final res = await http.post(
      Uri.parse('$baseUrl/registrations'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'eventId': eventId,
        'attendeeId': attendeeId,
        'ticketTypeId': ticketTypeId,
      }),
    );
    _checkOk(res);
    return jsonDecode(res.body);
  }

  /// Core Flutter device feature (Section 8): QR scan drives check-in.
  Future<Map<String, dynamic>> checkIn(String qrCode) async {
    final res = await http.post(
      Uri.parse('$baseUrl/checkin'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'qrCode': qrCode}),
    );
    if (res.statusCode == 409) {
      return {'error': 'Already checked in — duplicate scan blocked'};
    }
    _checkOk(res);
    return jsonDecode(res.body);
  }

  void _checkOk(http.Response res) {
    if (res.statusCode < 200 || res.statusCode >= 300) {
      throw Exception('API ${res.statusCode}: ${res.body}');
    }
  }
}
