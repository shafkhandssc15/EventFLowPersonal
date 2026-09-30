import 'package:flutter/material.dart';
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
            Text('Welcome, ${user?.name ?? "Organizer"}', style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Text('Role: ${user?.role ?? "Organizer"}', style: const TextStyle(color: Color(0xFF60A5FA), fontSize: 13)),
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
