import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'services/supabase_service.dart';
import 'services/aspnet_api_service.dart';
import 'services/token_storage_service.dart';
import 'screens/events_list_screen.dart';
import 'screens/my_tickets_screen.dart';
import 'screens/qr_checkin_screen.dart';
import 'screens/agent_task_screen.dart';
import 'screens/organizer_dashboard_screen.dart';
import 'screens/admin_dashboard_screen.dart';
import 'screens/venue_vendor_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  await Supabase.initialize(
    url: 'https://fndjylgegtzjxdkkqjql.supabase.co',
    anonKey: 'sb_publishable_e1z-H7yT8G90cUwHcEKvWQ_t5-MpoPg',
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
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF050811),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF2563EB),
          secondary: Color(0xFF60A5FA),
          surface: Color(0xFF0F172A),
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF0B0F19),
          elevation: 0,
          foregroundColor: Colors.white,
        ),
        navigationBarTheme: NavigationBarThemeData(
          backgroundColor: const Color(0xFF0B0F19),
          indicatorColor: const Color(0x332563EB),
          labelTextStyle: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.selected)) {
              return const TextStyle(color: Color(0xFF60A5FA), fontSize: 11, fontWeight: FontWeight.bold);
            }
            return const TextStyle(color: Color(0xFF64748B), fontSize: 11);
          }),
        ),
        useMaterial3: true,
      ),
      home: const MainNavigationShell(),
    );
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
    final user = service.currentUser;
    final role = user?.role ?? 'Attendee';

    final List<Widget> screens = [];
    final List<NavigationDestination> destinations = [];

    // 1. Explore (Common to all roles)
    screens.add(const EventsListScreen());
    destinations.add(
      const NavigationDestination(
        icon: Icon(Icons.explore_outlined, color: Color(0xFF64748B), size: 22),
        selectedIcon: Icon(Icons.explore, color: Color(0xFF60A5FA), size: 22),
        label: 'Explore',
      ),
    );

    // 2. Role-specific facilities
    if (role == 'Admin') {
      screens.add(const AdminDashboardScreen());
      destinations.add(
        const NavigationDestination(
          icon: Icon(Icons.admin_panel_settings_outlined, color: Color(0xFF64748B), size: 22),
          selectedIcon: Icon(Icons.admin_panel_settings, color: Color(0xFFEC4899), size: 22),
          label: 'Admin',
        ),
      );

      screens.add(const OrganizerDashboardScreen());
      destinations.add(
        const NavigationDestination(
          icon: Icon(Icons.analytics_outlined, color: Color(0xFF64748B), size: 22),
          selectedIcon: Icon(Icons.analytics, color: Color(0xFF8B5CF6), size: 22),
          label: 'Organizer',
        ),
      );

      screens.add(const QrCheckInScreen());
      destinations.add(
        const NavigationDestination(
          icon: Icon(Icons.qr_code_scanner_outlined, color: Color(0xFF64748B), size: 22),
          selectedIcon: Icon(Icons.qr_code_scanner, color: Color(0xFF60A5FA), size: 22),
          label: 'Gate Scanner',
        ),
      );

      screens.add(const VenueVendorScreen());
      destinations.add(
        const NavigationDestination(
          icon: Icon(Icons.location_city_outlined, color: Color(0xFF64748B), size: 22),
          selectedIcon: Icon(Icons.location_city, color: Color(0xFF10B981), size: 22),
          label: 'Venues',
        ),
      );
    } else if (role == 'Organizer') {
      screens.add(const OrganizerDashboardScreen());
      destinations.add(
        const NavigationDestination(
          icon: Icon(Icons.analytics_outlined, color: Color(0xFF64748B), size: 22),
          selectedIcon: Icon(Icons.analytics, color: Color(0xFF8B5CF6), size: 22),
          label: 'Organizer',
        ),
      );

      screens.add(const QrCheckInScreen());
      destinations.add(
        const NavigationDestination(
          icon: Icon(Icons.qr_code_scanner_outlined, color: Color(0xFF64748B), size: 22),
          selectedIcon: Icon(Icons.qr_code_scanner, color: Color(0xFF60A5FA), size: 22),
          label: 'Gate Scanner',
        ),
      );

      screens.add(const MyTicketsScreen());
      destinations.add(
        const NavigationDestination(
          icon: Icon(Icons.confirmation_number_outlined, color: Color(0xFF64748B), size: 22),
          selectedIcon: Icon(Icons.confirmation_number, color: Color(0xFF60A5FA), size: 22),
          label: 'My Passes',
        ),
      );

      screens.add(const AgentTaskScreen());
      destinations.add(
        const NavigationDestination(
          icon: Icon(Icons.psychology_outlined, color: Color(0xFF64748B), size: 22),
          selectedIcon: Icon(Icons.psychology, color: Color(0xFF60A5FA), size: 22),
          label: 'Agent Tasks',
        ),
      );
    } else if (role == 'VendorVenueManager') {
      screens.add(const VenueVendorScreen());
      destinations.add(
        const NavigationDestination(
          icon: Icon(Icons.location_city_outlined, color: Color(0xFF64748B), size: 22),
          selectedIcon: Icon(Icons.location_city, color: Color(0xFF10B981), size: 22),
          label: 'Venues & Vendors',
        ),
      );

      screens.add(const MyTicketsScreen());
      destinations.add(
        const NavigationDestination(
          icon: Icon(Icons.confirmation_number_outlined, color: Color(0xFF64748B), size: 22),
          selectedIcon: Icon(Icons.confirmation_number, color: Color(0xFF60A5FA), size: 22),
          label: 'My Passes',
        ),
      );

      screens.add(const AgentTaskScreen());
      destinations.add(
        const NavigationDestination(
          icon: Icon(Icons.psychology_outlined, color: Color(0xFF64748B), size: 22),
          selectedIcon: Icon(Icons.psychology, color: Color(0xFF60A5FA), size: 22),
          label: 'Agent Tasks',
        ),
      );
    } else {
      // Default: Attendee
      screens.add(const MyTicketsScreen());
      destinations.add(
        const NavigationDestination(
          icon: Icon(Icons.confirmation_number_outlined, color: Color(0xFF64748B), size: 22),
          selectedIcon: Icon(Icons.confirmation_number, color: Color(0xFF60A5FA), size: 22),
          label: 'My Passes',
        ),
      );

      screens.add(const QrCheckInScreen());
      destinations.add(
        const NavigationDestination(
          icon: Icon(Icons.qr_code_scanner_outlined, color: Color(0xFF64748B), size: 22),
          selectedIcon: Icon(Icons.qr_code_scanner, color: Color(0xFF60A5FA), size: 22),
          label: 'Gate Scanner',
        ),
      );

      screens.add(const AgentTaskScreen());
      destinations.add(
        const NavigationDestination(
          icon: Icon(Icons.psychology_outlined, color: Color(0xFF64748B), size: 22),
          selectedIcon: Icon(Icons.psychology, color: Color(0xFF60A5FA), size: 22),
          label: 'Agent Tasks',
        ),
      );
    }

    final safeIndex = _currentIndex >= screens.length ? 0 : _currentIndex;

    return Scaffold(
      body: IndexedStack(
        index: safeIndex,
        children: screens,
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          border: Border(top: BorderSide(color: Colors.white.withValues(alpha: 0.08))),
        ),
        child: NavigationBar(
          selectedIndex: safeIndex,
          onDestinationSelected: (idx) => setState(() => _currentIndex = idx),
          height: 64,
          destinations: destinations,
        ),
      ),
    );
  }
}
