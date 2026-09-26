import 'dart:convert';
import 'package:http/http.dart' as http;
import 'auth_service.dart';

/// Thrown for any non-2xx API response. [statusCode] lets callers
/// distinguish an expired/invalid token (401) from a role that simply
/// lacks permission for the action (403) from any other failure.
class ApiException implements Exception {
  final int statusCode;
  final String message;

  ApiException(this.statusCode, this.message);

  bool get isUnauthorized => statusCode == 401;
  bool get isForbidden => statusCode == 403;

  @override
  String toString() => message;
}

/// All calls go through the ASP.NET Core API — the Flutter app never talks
/// to the database or the agent service directly (per Section 7 of the plan).
class ApiService {
  // Use 10.0.2.2 for the Android emulator to reach a host-machine backend.
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:5000/api',
  );

  Future<Map<String, String>> _authHeaders() async {
    final token = await AuthService.instance.token;
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  // ---- Auth (no token attached — these calls establish the token) ----

  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    final res = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );
    _checkOk(res);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  /// Registers a new account. This attendee-facing app only ever creates
  /// `Attendee` accounts, so [role] defaults to that and the UI does not
  /// expose a picker for the other backend-supported roles.
  Future<Map<String, dynamic>> signUp({
    required String name,
    required String email,
    required String password,
    String role = 'Attendee',
  }) async {
    final res = await http.post(
      Uri.parse('$baseUrl/auth/register'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'name': name,
        'email': email,
        'password': password,
        'role': role,
      }),
    );
    _checkOk(res);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  // ---- Everything below attaches the bearer token when one is stored ----

  Future<List<dynamic>> listEvents({String? category}) async {
    final uri = Uri.parse('$baseUrl/events').replace(
      queryParameters: category != null ? {'category': category} : null,
    );
    final res = await http.get(uri, headers: await _authHeaders());
    _checkOk(res);
    final body = jsonDecode(res.body);
    return body['items'] as List<dynamic>;
  }

  Future<Map<String, dynamic>> getEvent(String id) async {
    final res = await http.get(
      Uri.parse('$baseUrl/events/$id'),
      headers: await _authHeaders(),
    );
    _checkOk(res);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  /// Registers the logged-in user (derived from the JWT on the backend —
  /// no attendeeId is sent) for a ticket type on an event.
  Future<Map<String, dynamic>> register({
    required String eventId,
    required String ticketTypeId,
  }) async {
    final res = await http.post(
      Uri.parse('$baseUrl/registrations'),
      headers: await _authHeaders(),
      body: jsonEncode({
        'eventId': eventId,
        'ticketTypeId': ticketTypeId,
      }),
    );
    _checkOk(res);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  /// The logged-in user's own registrations/tickets — no id/path parameter,
  /// the backend derives the attendee from the JWT.
  Future<List<dynamic>> myRegistrations() async {
    final res = await http.get(
      Uri.parse('$baseUrl/registrations/mine'),
      headers: await _authHeaders(),
    );
    _checkOk(res);
    return jsonDecode(res.body) as List<dynamic>;
  }

  /// Core Flutter device feature (Section 8): QR scan drives check-in.
  /// Requires role Organizer, VendorVenueManager, or Admin on the backend —
  /// an Attendee token gets a 403 (see ApiException.isForbidden).
  Future<Map<String, dynamic>> checkIn(String qrCode) async {
    final res = await http.post(
      Uri.parse('$baseUrl/checkin'),
      headers: await _authHeaders(),
      body: jsonEncode({'qrCode': qrCode}),
    );
    _checkOk(res);
    return jsonDecode(res.body) as Map<String, dynamic>;
  }

  void _checkOk(http.Response res) {
    if (res.statusCode < 200 || res.statusCode >= 300) {
      String message = 'API ${res.statusCode}: ${res.body}';
      try {
        final decoded = jsonDecode(res.body);
        if (decoded is Map && decoded['message'] != null) {
          message = decoded['message'].toString();
        }
      } catch (_) {
        // Response body wasn't JSON — fall back to the raw message above.
      }
      if (res.statusCode == 401) {
        // Token missing/invalid/expired — drop the stored session so the
        // app bounces back to the login screen (see AuthGate in main.dart).
        AuthService.instance.logout();
      }
      throw ApiException(res.statusCode, message);
    }
  }
}
