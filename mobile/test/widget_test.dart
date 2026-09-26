import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:event_management_mobile/main.dart';
import 'package:event_management_mobile/screens/my_tickets_screen.dart';
import 'package:event_management_mobile/screens/qr_checkin_screen.dart';

void main() {
  testWidgets('EventFlowMobileApp renders MainNavigationShell with 3 destinations', (WidgetTester tester) async {
    await tester.pumpWidget(const EventFlowMobileApp());

    // Verify app starts and renders NavigationBar
    expect(find.byType(NavigationBar), findsOneWidget);
    expect(find.text('Explore'), findsOneWidget);
    expect(find.text('My Passes'), findsOneWidget);
    expect(find.text('Gate Scanner'), findsOneWidget);
  });

  testWidgets('MyTicketsScreen renders active pass and QR badge header', (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: MyTicketsScreen()));

    expect(find.text('My Passes & QR Wallet'), findsOneWidget);
    expect(find.text('OFFICIAL ENTRANCE PASS'), findsOneWidget);
    expect(find.text('Active & Valid'), findsOneWidget);
    expect(find.text('ALL MY PASSES'), findsOneWidget);
  });

  testWidgets('QrCheckInScreen renders camera header and manual verification input', (WidgetTester tester) async {
    await tester.pumpWidget(const MaterialApp(home: QrCheckInScreen()));

    expect(find.text('Gate Entrance QR Scanner'), findsOneWidget);
    expect(find.text('Manual Pass Code Verification'), findsOneWidget);
    expect(find.text('Verify'), findsOneWidget);
  });
}
