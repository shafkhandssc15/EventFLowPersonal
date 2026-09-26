import 'package:flutter/material.dart';
import 'screens/events_list_screen.dart';
import 'screens/my_tickets_screen.dart';
import 'screens/qr_checkin_screen.dart';

void main() => runApp(const EventFlowMobileApp());

class EventFlowMobileApp extends StatelessWidget {
  const EventFlowMobileApp({super.key});

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
        fontFamily: 'sans-serif',
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

  final List<Widget> _screens = const [
    EventsListScreen(),
    MyTicketsScreen(),
    QrCheckInScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (idx) => setState(() => _currentIndex = idx),
        backgroundColor: const Color(0xFF0B0F19),
        indicatorColor: const Color(0x662563EB),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.explore_outlined, color: Colors.grey),
            selectedIcon: Icon(Icons.explore, color: Color(0xFF60A5FA)),
            label: 'Explore',
          ),
          NavigationDestination(
            icon: Icon(Icons.confirmation_number_outlined, color: Colors.grey),
            selectedIcon: Icon(Icons.confirmation_number, color: Color(0xFF60A5FA)),
            label: 'My Passes',
          ),
          NavigationDestination(
            icon: Icon(Icons.qr_code_scanner_outlined, color: Colors.grey),
            selectedIcon: Icon(Icons.qr_code_scanner, color: Color(0xFF60A5FA)),
            label: 'Gate Scanner',
          ),
        ],
      ),
    );
  }
}
