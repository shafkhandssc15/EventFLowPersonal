import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Roles that are allowed to perform gate check-ins on the backend
/// (POST /api/checkin requires Organizer, VendorVenueManager, or Admin).
const _checkInRoles = {'Organizer', 'VendorVenueManager', 'Admin'};

/// The authenticated user, as returned by /api/auth/login and
/// /api/auth/register, persisted to secure storage between app launches.
class AuthUser {
  final String token;
  final String id;
  final String name;
  final String email;
  final String role;

  const AuthUser({
    required this.token,
    required this.id,
    required this.name,
    required this.email,
    required this.role,
  });

  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(
      token: json['token'] as String,
      id: json['id'] as String,
      name: json['name'] as String,
      email: json['email'] as String,
      role: json['role'] as String,
    );
  }

  Map<String, dynamic> toJson() => {
        'token': token,
        'id': id,
        'name': name,
        'email': email,
        'role': role,
      };

  /// Whether this user's role is allowed to call POST /api/checkin.
  bool get canCheckIn => _checkInRoles.contains(role);
}

/// Persists the logged-in user's JWT + profile in secure storage and
/// exposes the current session to the rest of the app.
///
/// [userNotifier] is the single source of truth the UI listens to: setting
/// it to a non-null [AuthUser] (via [saveUser]) or back to null (via
/// [logout]) is what drives the app between the login screen and the main
/// navigation shell — see AuthGate in main.dart.
class AuthService {
  AuthService._();
  static final AuthService instance = AuthService._();

  static const FlutterSecureStorage _storage = FlutterSecureStorage();
  static const String _storageKey = 'eventflow_auth_user';

  final ValueNotifier<AuthUser?> userNotifier = ValueNotifier<AuthUser?>(null);

  AuthUser? get currentUser => userNotifier.value;

  /// Reads any previously-saved session from secure storage and populates
  /// [userNotifier]. Call once on app start (see AuthGate).
  Future<void> restoreSession() async {
    try {
      final raw = await _storage.read(key: _storageKey);
      if (raw == null) return;
      userNotifier.value =
          AuthUser.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {
      // Corrupt or unreadable entry — treat as logged out.
      await _storage.delete(key: _storageKey);
    }
  }

  Future<void> saveUser(AuthUser user) async {
    await _storage.write(key: _storageKey, value: jsonEncode(user.toJson()));
    userNotifier.value = user;
  }

  /// Clears the stored session and returns the app to the login screen.
  /// Called both for a manual "log out" tap and automatically whenever the
  /// API reports a 401 (expired/invalid token).
  Future<void> logout() async {
    await _storage.delete(key: _storageKey);
    userNotifier.value = null;
  }

  Future<String?> get token async => userNotifier.value?.token;
}
