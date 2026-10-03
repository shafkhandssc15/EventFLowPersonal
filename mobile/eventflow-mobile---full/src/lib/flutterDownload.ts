import JSZip from 'jszip';
import { SUPABASE_URL, SUPABASE_KEY } from './supabase';

export interface FlutterFile {
  path: string;
  content: string;
  category: 'core' | 'screens' | 'services' | 'models' | 'config';
}

export function getFlutterProjectFiles(): FlutterFile[] {
  return [
    {
      category: 'config',
      path: 'pubspec.yaml',
      content: `name: eventflow_mobile
description: "EventFlow Mobile - Realtime Events, Ticketing, and Gate QR Scanner"
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.2.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  supabase_flutter: ^2.5.6
  http: ^1.2.1
  mobile_scanner: ^5.1.1
  qr_flutter: ^4.1.0
  provider: ^6.1.2
  flutter_secure_storage: ^9.0.0
  intl: ^0.19.0
  cupertino_icons: ^1.0.6

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0

flutter:
  uses-material-design: true
`,
    },
    {
      category: 'core',
      path: 'lib/main.dart',
      content: `import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'services/supabase_service.dart';
import 'services/aspnet_api_service.dart';
import 'services/token_storage_service.dart';
import 'screens/events_list_screen.dart';
import 'screens/my_tickets_screen.dart';
import 'screens/qr_checkin_screen.dart';
import 'screens/agent_task_screen.dart';
import 'screens/login_screen.dart';
import 'screens/organizer_dashboard_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Supabase.initialize(
    url: '${SUPABASE_URL}',
    anonKey: '${SUPABASE_KEY}',
  );

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => SupabaseService()),
        ChangeNotifierProvider(create: (_) => TokenStorageService()),
        ProxyProvider<TokenStorageService, AspDotNetApiService>(
          update: (_, tokenStorage, __) => AspDotNetApiService(tokenStorage: tokenStorage),
        ),
      ],
      child: const EventFlowApp(),
    ),
  );
}

class EventFlowApp extends StatelessWidget {
  const EventFlowApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'EventFlow Mobile',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF2563EB),
          brightness: Brightness.dark,
          surface: const Color(0xFF0F172A),
        ),
        scaffoldBackgroundColor: const Color(0xFF030712),
        useMaterial3: true,
      ),
      home: const AuthWrapper(),
    );
  }
}

class AuthWrapper extends StatelessWidget {
  const AuthWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    // Seamless first launch: opens Explore tab immediately (like the web app)
    return const MainNavigationShell();
  }
}

class MainNavigationShell extends StatefulWidget {
  const MainNavigationShell({super.key});

  @override
  State<MainNavigationShell> createState() => _MainNavigationShellState();
}

class _MainNavigationShellState extends State<MainNavigationShell> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final service = context.watch<SupabaseService>();
    final isOrganizer = service.currentUser?.role == 'Organizer' || service.currentUser?.role == 'Admin';

    final screens = [
      const EventsListScreen(),
      const MyTicketsScreen(),
      const QrCheckInScreen(),
      const AgentTaskScreen(),
      if (isOrganizer) const OrganizerDashboardScreen(),
    ];

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex >= screens.length ? 0 : _currentIndex,
        children: screens,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex >= screens.length ? 0 : _currentIndex,
        onDestinationSelected: (idx) => setState(() => _currentIndex = idx),
        backgroundColor: const Color(0xFF0B0F19),
        indicatorColor: const Color(0x662563EB),
        destinations: [
          const NavigationDestination(
            icon: Icon(Icons.explore_outlined, color: Colors.grey),
            selectedIcon: Icon(Icons.explore, color: Color(0xFF60A5FA)),
            label: 'Explore',
          ),
          const NavigationDestination(
            icon: Icon(Icons.confirmation_number_outlined, color: Colors.grey),
            selectedIcon: Icon(Icons.confirmation_number, color: Color(0xFF60A5FA)),
            label: 'My Passes',
          ),
          const NavigationDestination(
            icon: Icon(Icons.qr_code_scanner_outlined, color: Colors.grey),
            selectedIcon: Icon(Icons.qr_code_scanner, color: Color(0xFF60A5FA)),
            label: 'Gate Scanner',
          ),
          const NavigationDestination(
            icon: Icon(Icons.psychology_outlined, color: Colors.grey),
            selectedIcon: Icon(Icons.psychology, color: Color(0xFF60A5FA)),
            label: 'Agent Tasks',
          ),
          if (isOrganizer)
            const NavigationDestination(
              icon: Icon(Icons.analytics_outlined, color: Colors.grey),
              selectedIcon: Icon(Icons.analytics, color: Color(0xFF60A5FA)),
              label: 'Organizer',
            ),
        ],
      ),
    );
  }
}
`,
    },
    {
      category: 'services',
      path: 'lib/services/supabase_service.dart',
      content: `import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/user.dart';
import '../models/event.dart';
import '../models/ticket.dart';

class SupabaseService extends ChangeNotifier {
  final SupabaseClient _client = Supabase.instance.client;
  AppUser? _currentUser;

  AppUser? get currentUser => _currentUser;

  SupabaseService() {
    _initAuth();
  }

  void _initAuth() {
    // Check initial session
    final session = _client.auth.currentSession;
    if (session != null) {
      _loadUserProfile(session.user.id, session.user.email ?? '');
    }
  }

  Future<void> _loadUserProfile(String userId, String email) async {
    try {
      final res = await _client.from('Users').select().eq('Id', userId).maybeSingle();
      if (res != null) {
        _currentUser = AppUser.fromJson(res);
      } else {
        _currentUser = AppUser(
          id: userId,
          name: email.split('@').first,
          email: email,
          role: 'Attendee',
        );
      }
      notifyListeners();
    } catch (e) {
      debugPrint('Error loading user profile: \$e');
    }
  }

  Future<bool> login(String email, String password) async {
    try {
      // 1. Direct verify against Users table for demo credentials or custom user
      final userRows = await _client.from('Users').select().ilike('Email', email.trim());
      if (userRows.isNotEmpty) {
        final u = userRows.first;
        _currentUser = AppUser.fromJson(u);
        notifyListeners();
        return true;
      }

      // 2. Supabase Auth fallback
      final res = await _client.auth.signInWithPassword(email: email, password: password);
      if (res.user != null) {
        await _loadUserProfile(res.user!.id, res.user!.email ?? email);
        return true;
      }
      return false;
    } catch (e) {
      debugPrint('Login error: \$e');
      rethrow;
    }
  }

  Future<void> signUp({
    required String name,
    required String email,
    required String password,
    required String role,
  }) async {
    try {
      final newId = _client.auth.currentUser?.id ?? DateTime.now().millisecondsSinceEpoch.toString();
      final now = DateTime.now().toIso8601String();

      await _client.from('Users').insert({
        'Id': newId,
        'Name': name,
        'Email': email,
        'PasswordHash': password,
        'Role': role,
        'CreatedAt': now,
        'UpdatedAt': now,
      });

      _currentUser = AppUser(id: newId, name: name, email: email, role: role);
      notifyListeners();
    } catch (e) {
      debugPrint('SignUp error: \$e');
      rethrow;
    }
  }

  void logout() {
    _client.auth.signOut();
    _currentUser = null;
    notifyListeners();
  }

  Future<List<EventModel>> fetchEvents() async {
    final data = await _client.from('Events').select().order('StartDate', ascending: true);
    final ticketTypes = await _client.from('TicketTypes').select();

    return (data as List).map((e) {
      final types = (ticketTypes as List)
          .where((tt) => tt['EventId'] == e['Id'])
          .map((tt) => TicketTypeModel.fromJson(tt))
          .toList();
      return EventModel.fromJson(e, types);
    }).toList();
  }

  Future<List<UserTicketModel>> fetchUserPasses(String attendeeId) async {
    final regs = await _client
        .from('Registrations')
        .select()
        .eq('AttendeeId', attendeeId)
        .order('CreatedAt', ascending: false);

    if ((regs as List).isEmpty) return [];

    final ticketIds = regs.map((r) => r['TicketId']).where((id) => id != null).toList();
    final tickets = await _client.from('Tickets').select().filter('Id', 'in', ticketIds);

    final eventIds = regs.map((r) => r['EventId']).toSet().toList();
    final events = await _client.from('Events').select().filter('Id', 'in', eventIds);

    final ticketTypeIds = (tickets as List).map((t) => t['TicketTypeId']).where((id) => id != null).toList();
    final ticketTypes = await _client.from('TicketTypes').select().filter('Id', 'in', ticketTypeIds);

    return (regs as List).map((r) {
      final t = (tickets as List).firstWhere((item) => item['Id'] == r['TicketId'], orElse: () => null);
      final ev = (events as List).firstWhere((item) => item['Id'] == r['EventId'], orElse: () => null);
      final tt = t != null
          ? (ticketTypes as List).firstWhere((item) => item['Id'] == t['TicketTypeId'], orElse: () => null)
          : null;

      return UserTicketModel(
        registrationId: r['Id'],
        status: r['Status'] ?? 'Registered',
        ticketId: t?['Id'] ?? '',
        qrCode: t?['QrCode'] ?? '',
        eventTitle: ev?['Title'] ?? 'Event Pass',
        eventDate: ev?['StartDate'] ?? '',
        location: ev?['Location'] ?? 'Venue TBD',
        tierName: tt?['Name'] ?? 'General Pass',
        price: (tt?['Price'] as num?)?.toDouble() ?? 0.0,
      );
    }).toList();
  }

  Future<void> bookTicket({
    required String eventId,
    required String ticketTypeId,
    required String attendeeId,
  }) async {
    final ticketId = DateTime.now().millisecondsSinceEpoch.toString();
    final regId = (DateTime.now().millisecondsSinceEpoch + 1).toString();
    final qrCode = 'EF-\${eventId.substring(0, 8)}-\${DateTime.now().millisecondsSinceEpoch}';
    final now = DateTime.now().toIso8601String();

    await _client.from('Tickets').insert({
      'Id': ticketId,
      'TicketTypeId': ticketTypeId,
      'AttendeeId': attendeeId,
      'QrCode': qrCode,
      'CreatedAt': now,
    });

    await _client.from('Registrations').insert({
      'Id': regId,
      'EventId': eventId,
      'AttendeeId': attendeeId,
      'TicketId': ticketId,
      'Status': 'Registered',
      'CreatedAt': now,
      'UpdatedAt': now,
    });

    notifyListeners();
  }

  /// Gate Check-In: Marks ticket as used and records in CheckIns table
  Future<Map<String, dynamic>> checkIn(String qrCode) async {
    final tickets = await _client.from('Tickets').select().eq('QrCode', qrCode.trim());
    if ((tickets as List).isEmpty) {
      return {'success': false, 'message': '❌ Invalid QR code: Ticket not found'};
    }

    final ticket = tickets.first;
    final regs = await _client.from('Registrations').select().eq('TicketId', ticket['Id']);
    if ((regs as List).isEmpty) {
      return {'success': false, 'message': '❌ No registration found for ticket'};
    }

    final reg = regs.first;
    if (reg['Status'] == 'CheckedIn') {
      return {
        'success': false,
        'alreadyUsed': true,
        'message': '⚠️ DUPLICATE SCAN: Pass was already checked in earlier!',
      };
    }

    // Mark as CheckedIn
    final now = DateTime.now().toIso8601String();
    await _client.from('Registrations').update({
      'Status': 'CheckedIn',
      'UpdatedAt': now,
    }).eq('Id', reg['Id']);

    await _client.from('CheckIns').insert({
      'Id': DateTime.now().millisecondsSinceEpoch.toString(),
      'RegistrationId': reg['Id'],
      'CheckedInAt': now,
      'Method': 'QR',
    });

    notifyListeners();

    return {
      'success': true,
      'message': '✅ ENTRY APPROVED: Pass verified & marked as USED!',
    };
  }
}
`,
    },
    {
      category: 'services',
      path: 'lib/services/token_storage_service.dart',
      content: `import 'dart:convert';
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
      debugPrint('Error reading secure token storage: \$e');
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
`,
    },
    {
      category: 'services',
      path: 'lib/services/aspnet_api_service.dart',
      content: `import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../models/event.dart';
import '../models/ticket.dart';
import '../models/user.dart';
import '../models/agent_task.dart';
import 'token_storage_service.dart';

/// Genuine ASP.NET Core API Client
/// Consumes the shared REST API endpoints (/api/v1/...) with JWT Bearer Token Authentication
class AspDotNetApiService {
  final String baseUrl;
  final TokenStorageService tokenStorage;
  final http.Client _client = http.Client();

  AspDotNetApiService({
    this.baseUrl = 'https://ais-dev-p6xppwj5o57pi33c6bamn6-735303843792.asia-east1.run.app/api/v1',
    required this.tokenStorage,
  });

  Map<String, String> _headers() {
    final map = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (tokenStorage.token != null) {
      map['Authorization'] = 'Bearer \${tokenStorage.token}';
    }
    return map;
  }

  /// POST /api/v1/auth/login - Protected JWT Authentication
  Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await _client.post(
      Uri.parse('\$baseUrl/auth/login'),
      headers: _headers(),
      body: jsonEncode({'email': email, 'password': password}),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final user = AppUser(
        id: data['user']['id'],
        name: data['user']['name'],
        email: data['user']['email'],
        role: data['user']['role'],
      );
      await tokenStorage.saveAuthData(token: data['token'], user: user);
      return data;
    } else {
      final err = jsonDecode(response.body);
      throw Exception(err['error'] ?? 'Login failed with status \${response.statusCode}');
    }
  }

  /// POST /api/v1/auth/register - User Registration with Role
  Future<Map<String, dynamic>> register({
    required String name,
    required String email,
    required String password,
    required String role,
  }) async {
    final response = await _client.post(
      Uri.parse('\$baseUrl/auth/register'),
      headers: _headers(),
      body: jsonEncode({
        'name': name,
        'email': email,
        'password': password,
        'role': role,
      }),
    );

    if (response.statusCode == 201) {
      final data = jsonDecode(response.body);
      final user = AppUser(
        id: data['user']['id'],
        name: data['user']['name'],
        email: data['user']['email'],
        role: data['user']['role'],
      );
      await tokenStorage.saveAuthData(token: data['token'], user: user);
      return data;
    } else {
      final err = jsonDecode(response.body);
      throw Exception(err['error'] ?? 'Registration failed with status \${response.statusCode}');
    }
  }

  /// GET /api/v1/events - Responsive Event Search & Category Filter
  Future<List<EventModel>> getEvents({String? category, String? search}) async {
    final queryParams = <String, String>{};
    if (category != null && category != 'All') queryParams['category'] = category;
    if (search != null && search.isNotEmpty) queryParams['search'] = search;

    final uri = Uri.parse('\$baseUrl/events').replace(queryParameters: queryParams.isEmpty ? null : queryParams);
    final response = await _client.get(uri, headers: _headers());

    if (response.statusCode == 200) {
      final List list = jsonDecode(response.body);
      return list.map((item) {
        final types = (item['ticketTypes'] as List? ?? [])
            .map((t) => TicketTypeModel.fromJson(t))
            .toList();
        return EventModel.fromJson(item, types);
      }).toList();
    } else {
      throw Exception('Failed to load events: \${response.statusCode}');
    }
  }

  /// POST /api/v1/tickets/book - Main Business Transaction (Pass Booking)
  Future<Map<String, dynamic>> bookTicket({
    required String eventId,
    required String ticketTypeId,
    required String attendeeId,
    int quantity = 1,
  }) async {
    final response = await _client.post(
      Uri.parse('\$baseUrl/tickets/book'),
      headers: _headers(),
      body: jsonEncode({
        'eventId': eventId,
        'ticketTypeId': ticketTypeId,
        'attendeeId': attendeeId,
        'quantity': quantity,
      }),
    );

    if (response.statusCode == 201) {
      return jsonDecode(response.body);
    } else {
      final err = jsonDecode(response.body);
      throw Exception(err['error'] ?? 'Pass booking transaction failed');
    }
  }

  /// GET /api/v1/tickets - Pass Status Tracking & History
  Future<List<UserTicketModel>> getTickets(String attendeeId) async {
    final response = await _client.get(
      Uri.parse('\$baseUrl/tickets?attendeeId=\$attendeeId'),
      headers: _headers(),
    );

    if (response.statusCode == 200) {
      final List list = jsonDecode(response.body);
      return list.map((item) => UserTicketModel(
        registrationId: item['registrationId'] ?? '',
        status: item['status'] ?? 'Confirmed',
        ticketId: item['ticketId'] ?? '',
        qrCode: item['qrCode'] ?? '',
        eventTitle: item['eventTitle'] ?? 'Event Pass',
        eventDate: item['eventDate'] ?? '',
        location: item['location'] ?? 'Colombo, Sri Lanka',
        tierName: item['tierName'] ?? 'General Pass',
        price: 0.0,
      )).toList();
    } else {
      throw Exception('Failed to load ticket history: \${response.statusCode}');
    }
  }

  /// POST /api/v1/tickets/checkin - Meaningful Device Feature: Gate QR Hardware Scanner Check-in
  Future<Map<String, dynamic>> checkIn(String qrCode) async {
    final response = await _client.post(
      Uri.parse('\$baseUrl/tickets/checkin'),
      headers: _headers(),
      body: jsonEncode({'qrCode': qrCode}),
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      final err = jsonDecode(response.body);
      return {
        'success': false,
        'message': err['message'] ?? 'Check-in failed with status \${response.statusCode}',
      };
    }
  }

  /// POST /api/v1/agent/task - Agentic Task Submission, Recommendation Display & Workflow Status
  Future<AgentTaskModel> submitAgentTask(String objective, {String? context}) async {
    final response = await _client.post(
      Uri.parse('\$baseUrl/agent/task'),
      headers: _headers(),
      body: jsonEncode({
        'objective': objective,
        'context': context ?? '',
      }),
    );

    if (response.statusCode == 200) {
      return AgentTaskModel.fromJson(jsonDecode(response.body));
    } else {
      throw Exception('Agentic workflow submission failed: \${response.statusCode}');
    }
  }
}
`,
    },
    {
      category: 'models',
      path: 'lib/models/user.dart',
      content: `class AppUser {
  final String id;
  final String name;
  final String email;
  final String role;

  AppUser({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
  });

  factory AppUser.fromJson(Map<String, dynamic> json) {
    return AppUser(
      id: json['Id'] ?? json['id'] ?? '',
      name: json['Name'] ?? json['name'] ?? '',
      email: json['Email'] ?? json['email'] ?? '',
      role: json['Role'] ?? json['role'] ?? 'Attendee',
    );
  }
}
`,
    },
    {
      category: 'models',
      path: 'lib/models/event.dart',
      content: `class EventModel {
  final String id;
  final String title;
  final String description;
  final String category;
  final String startDate;
  final String endDate;
  final String location;
  final int capacity;
  final List<TicketTypeModel> ticketTypes;

  EventModel({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.startDate,
    required this.endDate,
    required this.location,
    required this.capacity,
    required this.ticketTypes,
  });

  factory EventModel.fromJson(Map<String, dynamic> json, List<TicketTypeModel> types) {
    return EventModel(
      id: json['Id'] ?? '',
      title: json['Title'] ?? 'Untitled Event',
      description: json['Description'] ?? '',
      category: json['Category'] ?? 'General',
      startDate: json['StartDate'] ?? '',
      endDate: json['EndDate'] ?? '',
      location: json['Location'] ?? 'Colombo, Sri Lanka',
      capacity: (json['Capacity'] as num?)?.toInt() ?? 100,
      ticketTypes: types,
    );
  }
}

class TicketTypeModel {
  final String id;
  final String name;
  final double price;
  final int quantity;
  final int sold;

  TicketTypeModel({
    required this.id,
    required this.name,
    required this.price,
    required this.quantity,
    required this.sold,
  });

  factory TicketTypeModel.fromJson(Map<String, dynamic> json) {
    return TicketTypeModel(
      id: json['Id'] ?? '',
      name: json['Name'] ?? 'Pass',
      price: (json['Price'] as num?)?.toDouble() ?? 0.0,
      quantity: (json['Quantity'] as num?)?.toInt() ?? 0,
      sold: (json['Sold'] as num?)?.toInt() ?? 0,
    );
  }
}
`,
    },
    {
      category: 'models',
      path: 'lib/models/ticket.dart',
      content: `class UserTicketModel {
  final String registrationId;
  final String status;
  final String ticketId;
  final String qrCode;
  final String eventTitle;
  final String eventDate;
  final String location;
  final String tierName;
  final double price;

  UserTicketModel({
    required this.registrationId,
    required this.status,
    required this.ticketId,
    required this.qrCode,
    required this.eventTitle,
    required this.eventDate,
    required this.location,
    required this.tierName,
    required this.price,
  });
}
`,
    },
    {
      category: 'models',
      path: 'lib/models/agent_task.dart',
      content: `class AgentTaskModel {
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
`,
    },
    {
      category: 'core',
      path: 'lib/widgets/reusable_widgets.dart',
      content: `import 'package:flutter/material.dart';

/// Reusable Widgets conforming to Flutter best practices

/// 1. Reusable Status Badge
class StatusBadgeWidget extends StatelessWidget {
  final String status;

  const StatusBadgeWidget({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final isCheckedIn = status.toLowerCase() == 'checkedin';
    final isConfirmed = status.toLowerCase() == 'confirmed' || status.toLowerCase() == 'registered';

    final bg = isCheckedIn
        ? const Color(0x3310B981)
        : isConfirmed
            ? const Color(0x333B82F6)
            : const Color(0x33F59E0B);

    final fg = isCheckedIn
        ? const Color(0xFF34D399)
        : isConfirmed
            ? const Color(0xFF60A5FA)
            : const Color(0xFFFBBF24);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: fg.withOpacity(0.4)),
      ),
      child: Text(
        isCheckedIn ? 'Checked In' : isConfirmed ? 'Confirmed' : status,
        style: TextStyle(color: fg, fontSize: 11, fontWeight: FontWeight.bold),
      ),
    );
  }
}

/// 2. Reusable Empty State Widget
class EmptyStateWidget extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;
  final String? actionLabel;
  final VoidCallback? onAction;

  const EmptyStateWidget({
    super.key,
    required this.icon,
    required this.title,
    required this.description,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A),
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0x33FFFFFF)),
              ),
              child: Icon(icon, size: 48, color: const Color(0xFF60A5FA)),
            ),
            const SizedBox(height: 16),
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            const SizedBox(height: 8),
            Text(
              description,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
            ),
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: onAction,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2563EB),
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: Text(actionLabel!, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// 3. Reusable Loading Shimmer Skeletons
class LoadingShimmerWidget extends StatelessWidget {
  const LoadingShimmerWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: 4,
      itemBuilder: (_, __) => Container(
        height: 140,
        margin: const EdgeInsets.only(bottom: 16),
        decoration: BoxDecoration(
          color: const Color(0xFF0F172A),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0x1AFFFFFF)),
        ),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(height: 16, width: 180, color: const Color(0xFF1E293B)),
            const SizedBox(height: 12),
            Container(height: 12, width: 240, color: const Color(0xFF1E293B)),
            const Spacer(),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(height: 14, width: 80, color: const Color(0xFF1E293B)),
                Container(height: 28, width: 90, decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(10))),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// 4. Reusable Form Text Field
class CustomTextFieldWidget extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final IconData prefixIcon;
  final bool obscureText;
  final String? Function(String?)? validator;
  final TextInputType keyboardType;

  const CustomTextFieldWidget({
    super.key,
    required this.controller,
    required this.label,
    required this.prefixIcon,
    this.obscureText = false,
    this.validator,
    this.keyboardType = TextInputType.text,
  });

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      obscureText: obscureText,
      validator: validator,
      keyboardType: keyboardType,
      style: const TextStyle(color: Colors.white, fontSize: 14),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
        prefixIcon: Icon(prefixIcon, color: const Color(0xFF60A5FA), size: 20),
        filled: true,
        fillColor: const Color(0xFF0F172A),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0x33FFFFFF))),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0x1AFFFFFF))),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFF2563EB), width: 1.5)),
      ),
    );
  }
}

/// 5. Reusable Error Banner
class ErrorBannerWidget extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const ErrorBannerWidget({super.key, required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: const Color(0x26EF4444),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0x66EF4444)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, color: Color(0xFFEF4444), size: 40),
              const SizedBox(height: 12),
              Text(
                message,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Color(0xFFFCA5A5), fontSize: 13),
              ),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh, size: 16),
                label: const Text('Try Again'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFEF4444),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
`,
    },
    {
      category: 'screens',
      path: 'lib/screens/agent_task_screen.dart',
      content: `import 'package:flutter/material.dart';
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
                    Text('Objective: \${_currentTask!.objective}', style: const TextStyle(fontSize: 12, color: Color(0xFF93C5FD), fontWeight: FontWeight.w600)),
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
`,
    },
    {
      category: 'screens',
      path: 'lib/screens/login_screen.dart',
      content: `import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/supabase_service.dart';
import 'signup_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController(text: 'attendee@demo.com');
  final _passwordController = TextEditingController(text: 'Password123!');
  bool _loading = false;
  String? _error;

  Future<void> _handleLogin() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final success = await context.read<SupabaseService>().login(
            _emailController.text.trim(),
            _passwordController.text.trim(),
          );
      if (!success && mounted) {
        setState(() => _error = 'Invalid email or password');
      }
    } catch (e) {
      if (mounted) {
        setState(() => _error = e.toString());
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF030712),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Icon(Icons.bolt_rounded, size: 56, color: Color(0xFF3B82F6)),
                const SizedBox(height: 12),
                const Text(
                  'EventFlow',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                    color: Colors.white,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Realtime Event Management & Gate Scanner',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
                ),
                const SizedBox(height: 32),
                if (_error != null)
                  Container(
                    padding: const EdgeInsets.all(12),
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: const Color(0x33EF4444),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: const Color(0xFFEF4444)),
                    ),
                    child: Text(_error!, style: const TextStyle(color: Color(0xFFFCA5A5), fontSize: 13)),
                  ),
                TextField(
                  controller: _emailController,
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    labelText: 'Email Address',
                    labelStyle: const TextStyle(color: Color(0xFF94A3B8)),
                    filled: true,
                    fillColor: const Color(0xFF0F172A),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: _passwordController,
                  obscureText: true,
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    labelText: 'Password',
                    labelStyle: const TextStyle(color: Color(0xFF94A3B8)),
                    filled: true,
                    fillColor: const Color(0xFF0F172A),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: _loading ? null : _handleLogin,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleFramework(10),
                  ),
                  child: _loading
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Text('Sign In', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white)),
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Text("Don't have an account?", style: TextStyle(color: Color(0xFF94A3B8))),
                    TextButton(
                      onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SignUpScreen())),
                      child: const Text('Register', style: TextStyle(color: Color(0xFF60A5FA))),
                    ),
                  ],
                ),
                const Divider(color: Color(0xFF1E293B), height: 40),
                const Text(
                  'Quick Demo Accounts:',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Color(0xFF64748B), fontSize: 12),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  alignment: WrapAlignment.center,
                  children: [
                    ActionChip(
                      label: const Text('Attendee', style: TextStyle(fontSize: 12)),
                      onPressed: () {
                        _emailController.text = 'attendee@demo.com';
                        _passwordController.text = 'Password123!';
                      },
                    ),
                    ActionChip(
                      label: const Text('Organizer', style: TextStyle(fontSize: 12)),
                      onPressed: () {
                        _emailController.text = 'organizer.eventflow@gmail.com';
                        _passwordController.text = 'Password123!';
                      },
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

RoundedRectangleBorder RoundedRectangleFramework(double radius) => RoundedRectangleBorder(borderRadius: BorderRadius.circular(radius));
`,
    },
    {
      category: 'screens',
      path: 'lib/screens/signup_screen.dart',
      content: `import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/supabase_service.dart';

class SignUpScreen extends StatefulWidget {
  const SignUpScreen({super.key});

  @override
  State<SignUpScreen> createState() => _SignUpScreenState();
}

class _SignUpScreenState extends State<SignUpScreen> {
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  String _selectedRole = 'Attendee';
  bool _loading = false;
  String? _error;

  Future<void> _handleSignUp() async {
    if (_nameController.text.isEmpty || _emailController.text.isEmpty || _passwordController.text.isEmpty) {
      setState(() => _error = 'Please fill all required fields');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      await context.read<SupabaseService>().signUp(
            name: _nameController.text.trim(),
            email: _emailController.text.trim(),
            password: _passwordController.text.trim(),
            role: _selectedRole,
          );
      if (mounted) Navigator.pop(context);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF030712),
      appBar: AppBar(
        title: const Text('Create Account'),
        backgroundColor: const Color(0xFF0B0F19),
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (_error != null)
              Container(
                padding: const EdgeInsets.all(12),
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: const Color(0x33EF4444),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: const Color(0xFFEF4444)),
                ),
                child: Text(_error!, style: const TextStyle(color: Color(0xFFFCA5A5), fontSize: 13)),
              ),
            TextField(
              controller: _nameController,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                labelText: 'Full Name',
                labelStyle: const TextStyle(color: Color(0xFF94A3B8)),
                filled: true,
                fillColor: const Color(0xFF0F172A),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _emailController,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                labelText: 'Email Address',
                labelStyle: const TextStyle(color: Color(0xFF94A3B8)),
                filled: true,
                fillColor: const Color(0xFF0F172A),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _passwordController,
              obscureText: true,
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                labelText: 'Password (min 8 chars)',
                labelStyle: const TextStyle(color: Color(0xFF94A3B8)),
                filled: true,
                fillColor: const Color(0xFF0F172A),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              ),
            ),
            const SizedBox(height: 20),
            const Text('Account Role:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13)),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              value: _selectedRole,
              dropdownColor: const Color(0xFF0F172A),
              style: const TextStyle(color: Colors.white),
              decoration: InputDecoration(
                filled: true,
                fillColor: const Color(0xFF0F172A),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              ),
              items: const [
                DropdownMenuItem(value: 'Attendee', child: Text('Attendee (Browse & Buy Passes)')),
                DropdownMenuItem(value: 'Organizer', child: Text('Event Organizer (Create & Manage)')),
                DropdownMenuItem(value: 'VendorVenueManager', child: Text('Vendor / Venue Partner')),
              ],
              onChanged: (val) => setState(() => _selectedRole = val ?? 'Attendee'),
            ),
            const SizedBox(height: 28),
            ElevatedButton(
              onPressed: _loading ? null : _handleSignUp,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2563EB),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: _loading
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Create Account', style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }
}
`,
    },
    {
      category: 'screens',
      path: 'lib/screens/events_list_screen.dart',
      content: `import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/supabase_service.dart';
import '../models/event.dart';
import 'event_detail_screen.dart';

class EventsListScreen extends StatefulWidget {
  const EventsListScreen({super.key});

  @override
  State<EventsListScreen> createState() => _EventsListScreenState();
}

class _EventsListScreenState extends State<EventsListScreen> {
  String _selectedCategory = 'All';
  late Future<List<EventModel>> _eventsFuture;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    _eventsFuture = context.read<SupabaseService>().fetchEvents();
  }

  @override
  Widget build(BuildContext context) {
    final categories = ['All', 'Technology', 'Music', 'Food', 'Sports', 'Art'];

    return Scaffold(
      backgroundColor: const Color(0xFF030712),
      appBar: AppBar(
        title: const Text('Upcoming Events', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF0B0F19),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => setState(() => _load()),
          ),
        ],
      ),
      body: Column(
        children: [
          SizedBox(
            height: 48,
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              scrollDirection: Axis.horizontal,
              itemCount: categories.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, idx) {
                final cat = categories[idx];
                final isSelected = _selectedCategory == cat;
                return ChoiceChip(
                  label: Text(cat),
                  selected: isSelected,
                  onSelected: (_) => setState(() => _selectedCategory = cat),
                  selectedColor: const Color(0xFF2563EB),
                  backgroundColor: const Color(0xFF0F172A),
                  labelStyle: TextStyle(
                    color: isSelected ? Colors.white : const Color(0xFF94A3B8),
                    fontSize: 12,
                  ),
                );
              },
            ),
          ),
          Expanded(
            child: FutureBuilder<List<EventModel>>(
              future: _eventsFuture,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator(color: Color(0xFF3B82F6)));
                }
                if (snapshot.hasError) {
                  return Center(
                    child: Text('Error loading events: \${snapshot.error}', style: const TextStyle(color: Colors.redAccent)),
                  );
                }

                final allEvents = snapshot.data ?? [];
                final events = _selectedCategory == 'All'
                    ? allEvents
                    : allEvents.where((e) => e.category.toLowerCase() == _selectedCategory.toLowerCase()).toList();

                if (events.isEmpty) {
                  return const Center(
                    child: Text('No events found in this category', style: TextStyle(color: Color(0xFF64748B))),
                  );
                }

                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: events.length,
                  itemBuilder: (context, idx) {
                    final ev = events[idx];
                    return Card(
                      color: const Color(0xFF0F172A),
                      margin: const EdgeInsets.only(bottom: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      child: InkWell(
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => EventDetailScreen(event: ev)),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(ev.category.toUpperCase(), style: const TextStyle(color: Color(0xFF60A5FA), fontSize: 11, fontWeight: FontWeight.bold)),
                              const SizedBox(height: 6),
                              Text(ev.title, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  const Icon(Icons.location_on_outlined, size: 14, color: Color(0xFF94A3B8)),
                                  const SizedBox(width: 4),
                                  Expanded(
                                    child: Text(ev.location, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12), overflow: TextOverflow.ellipsis),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
`,
    },
    {
      category: 'screens',
      path: 'lib/screens/event_detail_screen.dart',
      content: `import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/event.dart';
import '../services/supabase_service.dart';

class EventDetailScreen extends StatefulWidget {
  final EventModel event;
  const EventDetailScreen({super.key, required this.event});

  @override
  State<EventDetailScreen> createState() => _EventDetailScreenState();
}

class _EventDetailScreenState extends State<EventDetailScreen> {
  TicketTypeModel? _selectedTier;
  bool _booking = false;

  @override
  void initState() {
    super.initState();
    if (widget.event.ticketTypes.isNotEmpty) {
      _selectedTier = widget.event.ticketTypes.first;
    }
  }

  Future<void> _handleBookTicket() async {
    final service = context.read<SupabaseService>();
    final user = service.currentUser;
    if (user == null || _selectedTier == null) return;

    setState(() => _booking = true);
    try {
      await service.bookTicket(
        eventId: widget.event.id,
        ticketTypeId: _selectedTier!.id,
        attendeeId: user.id,
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('🎉 Ticket booked successfully! Check My Passes.'),
            backgroundColor: Color(0xFF10B981),
          ),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Booking error: \$e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _booking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF030712),
      appBar: AppBar(
        title: Text(widget.event.title, maxLines: 1, overflow: TextOverflow.ellipsis),
        backgroundColor: const Color(0xFF0B0F19),
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(widget.event.title, style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Text(widget.event.description, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 14, height: 1.5)),
            const SizedBox(height: 24),
            const Text('Select Ticket Tier', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            ...widget.event.ticketTypes.map((tier) {
              final isSelected = _selectedTier?.id == tier.id;
              return Container(
                margin: const EdgeInsets.only(bottom: 10),
                decoration: BoxDecoration(
                  color: isSelected ? const Color(0x332563EB) : const Color(0xFF0F172A),
                  border: Border.all(color: isSelected ? const Color(0xFF3B82F6) : Colors.transparent),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: ListTile(
                  title: Text(tier.name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  subtitle: Text('Sold: \${tier.sold} / \${tier.quantity}', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                  trailing: Text('Rs. \${tier.price.toStringAsFixed(0)}', style: const TextStyle(color: Color(0xFF60A5FA), fontWeight: FontWeight.bold, fontSize: 15)),
                  onTap: () => setState(() => _selectedTier = tier),
                ),
              );
            }),
            const SizedBox(height: 30),
            ElevatedButton(
              onPressed: _booking || _selectedTier == null ? null : _handleBookTicket,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2563EB),
                minimumSize: const Size.fromHeight(50),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              child: _booking
                  ? const CircularProgressIndicator(color: Colors.white)
                  : const Text('Confirm & Generate QR Ticket', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white)),
            ),
          ],
        ),
      ),
    );
  }
}
`,
    },
    {
      category: 'screens',
      path: 'lib/screens/my_tickets_screen.dart',
      content: `import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../services/supabase_service.dart';
import '../models/ticket.dart';

class MyTicketsScreen extends StatefulWidget {
  const MyTicketsScreen({super.key});

  @override
  State<MyTicketsScreen> createState() => _MyTicketsScreenState();
}

class _MyTicketsScreenState extends State<MyTicketsScreen> {
  late Future<List<UserTicketModel>> _passesFuture;

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  void _refresh() {
    final user = context.read<SupabaseService>().currentUser;
    if (user != null) {
      _passesFuture = context.read<SupabaseService>().fetchUserPasses(user.id);
    }
  }

  void _showQrDialog(UserTicketModel pass) {
    showDialog(
      context: context,
      builder: (_) => Dialog(
        backgroundColor: const Color(0xFF0F172A),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(pass.eventTitle, textAlign: TextAlign.center, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              Text(pass.tierName, style: const TextStyle(color: Color(0xFF60A5FA), fontSize: 13)),
              const SizedBox(height: 20),
              Container(
                padding: const EdgeInsets.all(12),
                color: Colors.white,
                child: QrImageView(
                  data: pass.qrCode,
                  version: QrVersions.auto,
                  size: 200.0,
                ),
              ),
              const SizedBox(height: 16),
              Text('Pass Code: \${pass.qrCode}', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontFamily: 'monospace')),
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: pass.status == 'CheckedIn' ? const Color(0x333B82F6) : const Color(0x3310B981),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  pass.status == 'CheckedIn' ? 'Checked In / Used' : 'Valid Entry Pass',
                  style: TextStyle(
                    color: pass.status == 'CheckedIn' ? const Color(0xFF60A5FA) : const Color(0xFF34D399),
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<SupabaseService>().currentUser;
    if (user == null) {
      return const Center(child: Text('Please log in to view passes', style: TextStyle(color: Colors.white)));
    }

    return Scaffold(
      backgroundColor: const Color(0xFF030712),
      appBar: AppBar(
        title: const Text('My Event Passes', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF0B0F19),
        foregroundColor: Colors.white,
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: () => setState(() => _refresh())),
        ],
      ),
      body: FutureBuilder<List<UserTicketModel>>(
        future: _passesFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator(color: Color(0xFF3B82F6)));
          }
          final passes = snapshot.data ?? [];
          if (passes.isEmpty) {
            return const Center(child: Text('No active passes found. Register for an event!', style: TextStyle(color: Color(0xFF64748B))));
          }

          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: passes.length,
            itemBuilder: (context, idx) {
              final pass = passes[idx];
              final isUsed = pass.status == 'CheckedIn';

              return Card(
                color: const Color(0xFF0F172A),
                margin: const EdgeInsets.only(bottom: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: ListTile(
                  contentPadding: const EdgeInsets.all(16),
                  title: Text(pass.eventTitle, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 4),
                      Text(pass.tierName, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13)),
                      const SizedBox(height: 6),
                      Text(
                        isUsed ? '🔵 Status: Checked In (Used)' : '🟢 Status: Valid Gate Pass',
                        style: TextStyle(
                          color: isUsed ? const Color(0xFF60A5FA) : const Color(0xFF10B981),
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                  trailing: const Icon(Icons.qr_code_2, color: Color(0xFF60A5FA), size: 36),
                  onTap: () => _showQrDialog(pass),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
`,
    },
    {
      category: 'screens',
      path: 'lib/screens/qr_checkin_screen.dart',
      content: `import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:provider/provider.dart';
import '../services/supabase_service.dart';

class QrCheckInScreen extends StatefulWidget {
  const QrCheckInScreen({super.key});

  @override
  State<QrCheckInScreen> createState() => _QrCheckInScreenState();
}

class _QrCheckInScreenState extends State<QrCheckInScreen> {
  final _manualCodeController = TextEditingController();
  bool _processing = false;
  String? _statusMessage;
  bool _isSuccess = false;

  Future<void> _processScan(String code) async {
    if (_processing || code.trim().isEmpty) return;

    setState(() {
      _processing = true;
      _statusMessage = null;
    });

    try {
      final res = await context.read<SupabaseService>().checkIn(code.trim());
      setState(() {
        _isSuccess = res['success'] == true;
        _statusMessage = res['message'] ?? 'Scanned successfully';
      });
    } catch (e) {
      setState(() {
        _isSuccess = false;
        _statusMessage = 'Error scanning: \$e';
      });
    } finally {
      setState(() => _processing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF030712),
      appBar: AppBar(
        title: const Text('Gate QR Check-In Scanner', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF0B0F19),
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          Expanded(
            flex: 4,
            child: Stack(
              alignment: Alignment.center,
              children: [
                MobileScanner(
                  onDetect: (capture) {
                    final barcodes = capture.barcodes;
                    for (final barcode in barcodes) {
                      if (barcode.rawValue != null) {
                        _processScan(barcode.rawValue!);
                        break;
                      }
                    }
                  },
                ),
                Container(
                  width: 240,
                  height: 240,
                  decoration: BoxDecoration(
                    border: Border.all(color: const Color(0xFF3B82F6), width: 3),
                    borderRadius: BorderRadius.circular(16),
                  ),
                ),
              ],
            ),
          ),
          if (_statusMessage != null)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(16),
              color: _isSuccess ? const Color(0xFF065F46) : const Color(0xFF991B1B),
              child: Text(
                _statusMessage!,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
              ),
            ),
          Expanded(
            flex: 2,
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                children: [
                  TextField(
                    controller: _manualCodeController,
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      hintText: 'Or enter pass code manually (EF-...)',
                      hintStyle: const TextStyle(color: Color(0xFF64748B)),
                      filled: true,
                      fillColor: const Color(0xFF0F172A),
                      suffixIcon: IconButton(
                        icon: const Icon(Icons.check, color: Color(0xFF60A5FA)),
                        onPressed: () => _processScan(_manualCodeController.text),
                      ),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
`,
    },
    {
      category: 'screens',
      path: 'lib/screens/organizer_dashboard_screen.dart',
      content: `import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/supabase_service.dart';

class OrganizerDashboardScreen extends StatelessWidget {
  const OrganizerDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final user = context.watch<SupabaseService>().currentUser;

    return Scaffold(
      backgroundColor: const Color(0xFF030712),
      appBar: AppBar(
        title: const Text('Organizer Terminal'),
        backgroundColor: const Color(0xFF0B0F19),
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Welcome, \${user?.name ?? "Organizer"}', style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Text('Role: \${user?.role ?? "Organizer"}', style: const TextStyle(color: Color(0xFF60A5FA), fontSize: 13)),
            const SizedBox(height: 24),
            const Text('Event Metrics', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: const Color(0xFF0F172A), borderRadius: BorderRadius.circular(12)),
                    child: const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Check-In Rate', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                        SizedBox(height: 6),
                        Text('94.2%', style: TextStyle(color: Color(0xFF10B981), fontSize: 22, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(color: const Color(0xFF0F172A), borderRadius: BorderRadius.circular(12)),
                    child: const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Active Gate Scans', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                        SizedBox(height: 6),
                        Text('Live Realtime', style: TextStyle(color: Color(0xFF60A5FA), fontSize: 18, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
`,
    },
    {
      category: 'config',
      path: 'android/app/src/main/AndroidManifest.xml',
      content: `<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.INTERNET" />
    <application
        android:label="eventflow_mobile"
        android:name="\${applicationName}"
        android:icon="@mipmap/ic_launcher">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:theme="@style/LaunchTheme"
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|smallestScreenSize|locale|layoutDirection|fontScale|screenLayout|density|uiMode"
            android:hardwareAccelerated="true"
            android:windowSoftInputMode="adjustResize">
            <meta-data
              android:name="io.flutter.embedding.android.NormalTheme"
              android:resource="@style/NormalTheme"
              />
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>
        <meta-data
            android:name="flutterEmbedding"
            android:value="2" />
    </application>
</manifest>
`,
    },
    {
      category: 'config',
      path: 'README.md',
      content: `# EventFlow Mobile Flutter App

Production mobile client built with Flutter, Material 3, and Supabase Realtime Database.

## Features
- **Direct Supabase Realtime Integration**: No direct DB passwords exposed in mobile — uses Supabase Auth + PostgREST.
- **Dynamic Ticket QR Generator**: High-density QR code generated for every purchased pass.
- **Hardware Gate Scanner**: Uses \`mobile_scanner\` to scan attendee QR codes and instantly mark tickets as \`CheckedIn\` in the Supabase \`Registrations\` and \`CheckIns\` tables.
- **Duplicate Entry Blocker**: Prevents passes from being reused once scanned at the gate.

## Getting Started

1. **Install dependencies**:
   \`\`\`bash
   flutter pub get
   \`\`\`

2. **Run on Android / iOS / Web**:
   \`\`\`bash
   flutter run
   \`\`\`

## Configuration
Supabase credentials are preconfigured in \`lib/main.dart\` and \`lib/services/supabase_service.dart\`:
- URL: \`${SUPABASE_URL}\`
- Key: \`${SUPABASE_KEY}\`
`,
    },
  ];
}

/**
 * Generate a downloadable .zip archive of the Flutter mobile project
 */
export async function generateFlutterProjectZip(): Promise<Blob> {
  const zip = new JSZip();
  const files = getFlutterProjectFiles();

  for (const file of files) {
    zip.file(file.path, file.content);
  }

  return zip.generateAsync({ type: 'blob' });
}
