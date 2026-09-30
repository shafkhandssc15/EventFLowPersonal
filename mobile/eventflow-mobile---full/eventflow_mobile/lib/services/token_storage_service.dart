import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/user.dart';

/// Secure token storage service using flutter_secure_storage
/// Encrypts JWT bearer tokens on Android Keystore and iOS Keychain
class TokenStorageService extends ChangeNotifier {
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  static const String _keyToken = 'ef_auth_token';
  static const String _keyUser = 'ef_auth_user';

  String? _token;
  AppUser? _user;

  String? get token => _token;
  AppUser? get user => _user;
  bool get isAuthenticated => _token != null && _token!.isNotEmpty;

  TokenStorageService() {
    _loadFromStorage();
  }

  Future<void> _loadFromStorage() async {
    try {
      _token = await _storage.read(key: _keyToken);
      final userJson = await _storage.read(key: _keyUser);
      if (userJson != null) {
        _user = AppUser.fromJson(jsonDecode(userJson));
      }
      notifyListeners();
    } catch (e) {
      debugPrint('Error reading secure token storage: $e');
    }
  }

  Future<void> saveAuthData({required String token, required AppUser user}) async {
    _token = token;
    _user = user;
    await _storage.write(key: _keyToken, value: token);
    await _storage.write(key: _keyUser, value: jsonEncode({
      'Id': user.id,
      'Name': user.name,
      'Email': user.email,
      'Role': user.role,
    }));
    notifyListeners();
  }

  Future<void> clear() async {
    _token = null;
    _user = null;
    await _storage.delete(key: _keyToken);
    await _storage.delete(key: _keyUser);
    notifyListeners();
  }
}
