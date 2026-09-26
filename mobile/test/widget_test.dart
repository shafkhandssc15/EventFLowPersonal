import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:event_management_mobile/main.dart';
import 'package:event_management_mobile/screens/my_tickets_screen.dart';
import 'package:event_management_mobile/screens/qr_checkin_screen.dart';
import 'package:event_management_mobile/services/auth_service.dart';

void main() {
  testWidgets('EventFlowMobileApp shows the login screen when there is no stored session', (WidgetTester tester) async {
    await tester.pumpWidget(const EventFlowMobileApp());
    await tester.pumpAndSettle();

    // With no session in secure storage, AuthGate should show LoginScreen
    // rather than the main NavigationBar shell.
    expect(find.text('EventFlow'), findsOneWidget);
    expect(find.text('Sign in'), findsWidgets);
  });

  testWidgets('MyTicketsScreen renders its app bar while loading', (WidgetTester tester) async {
    // No backend is reachable in this test environment, so this only
    // exercises the (loading -> error) states, not a populated ticket list.
    await tester.pumpWidget(const MaterialApp(home: MyTicketsScreen()));

    expect(find.text('My Passes & QR Wallet'), findsOneWidget);
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });

  testWidgets('QrCheckInScreen renders camera header and manual verification input for a check-in-capable role', (WidgetTester tester) async {
    // Gate Scanner only shows the scanner UI for roles the backend allows to
    // call POST /api/checkin (Organizer/VendorVenueManager/Admin) — set one
    // up so this test exercises that UI rather than the permission-denied
    // state an Attendee (or logged-out) session would show.
    AuthService.instance.userNotifier.value = const AuthUser(
      token: 'test-token',
      id: 'organizer-1',
      name: 'Test Organizer',
      email: 'organizer@demo.com',
      role: 'Organizer',
    );
    addTearDown(() => AuthService.instance.userNotifier.value = null);

    await tester.pumpWidget(const MaterialApp(home: QrCheckInScreen()));

    expect(find.text('Gate Entrance QR Scanner'), findsOneWidget);
    expect(find.text('Manual Pass Code Verification'), findsOneWidget);
    expect(find.text('Verify'), findsOneWidget);
  });

  testWidgets('QrCheckInScreen shows a permission-denied state for an Attendee role', (WidgetTester tester) async {
    AuthService.instance.userNotifier.value = const AuthUser(
      token: 'test-token',
      id: 'attendee-1',
      name: 'Test Attendee',
      email: 'attendee@demo.com',
      role: 'Attendee',
    );
    addTearDown(() => AuthService.instance.userNotifier.value = null);

    await tester.pumpWidget(const MaterialApp(home: QrCheckInScreen()));

    expect(find.text('Gate Entrance QR Scanner'), findsOneWidget);
    expect(find.text("Your account doesn't have check-in permission."), findsOneWidget);
    expect(find.text('Manual Pass Code Verification'), findsNothing);
  });
}
