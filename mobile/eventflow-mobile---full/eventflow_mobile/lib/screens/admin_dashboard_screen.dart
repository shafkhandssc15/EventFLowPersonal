import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/supabase_service.dart';
import '../models/user.dart';

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  late Future<List<AppUser>> _usersFuture;

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  void _refresh() {
    setState(() {
      _usersFuture = context.read<SupabaseService>().fetchAllUsers();
    });
  }

  void _changeRole(AppUser user, String newRole) async {
    await context.read<SupabaseService>().updateUserRole(user.id, newRole);
    _refresh();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Updated ${user.name} role to $newRole'),
          backgroundColor: const Color(0xFF10B981),
        ),
      );
    }
  }

  
  Color _getRoleColor(String role) {
    switch (role) {
      case 'Admin':
        return const Color(0xFFEC4899);
      case 'Organizer':
        return const Color(0xFF8B5CF6);
      case 'VendorVenueManager':
        return const Color(0xFF10B981);
      default:
        return const Color(0xFF3B82F6);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF050811),
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const [
            Text('Admin Platform Console', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
            Text('Global User & System Supervision', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
          ],
        ),
        backgroundColor: const Color(0xFF0B0F19),
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(icon: const Icon(Icons.refresh, color: Color(0xFF94A3B8)), onPressed: _refresh),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Platform Stats Row
            Row(
              children: [
                Expanded(
                  child: _buildMetricCard(
                    title: 'TOTAL USERS',
                    value: '1,420',
                    subtitle: '+18% this month',
                    icon: Icons.people_alt,
                    iconColor: const Color(0xFF60A5FA),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _buildMetricCard(
                    title: 'LIVE SUMMITS',
                    value: '6 Events',
                    subtitle: '100% Operational',
                    icon: Icons.bolt,
                    iconColor: const Color(0xFFF59E0B),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: _buildMetricCard(
                    title: 'GATE SPEED',
                    value: '0.42s',
                    subtitle: 'Average QR Validation',
                    icon: Icons.speed,
                    iconColor: const Color(0xFF34D399),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _buildMetricCard(
                    title: 'PLATFORM GMV',
                    value: 'Rs. 4.8M',
                    subtitle: 'Gross ticket volume',
                    icon: Icons.account_balance_wallet,
                    iconColor: const Color(0xFFA855F7),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 24),

            // System Telemetry Banner
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 10,
                    height: 10,
                    decoration: const BoxDecoration(
                      color: Color(0xFF10B981),
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Text('Supabase PostgreSQL Telemetry: Healthy', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                        Text('Tables: Events, Venues, Users, Registrations, CheckIns', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10)),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // User Management Section
            const Text(
              'User Directory & Role Delegation',
              style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w900),
            ),
            const SizedBox(height: 6),
            const Text(
              'Assign permissions across all 4 system roles (Attendee, Organizer, Admin, Venue & Vendor):',
              style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
            ),
            const SizedBox(height: 12),

            FutureBuilder<List<AppUser>>(
              future: _usersFuture,
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator(color: Color(0xFF3B82F6)));
                }
                final users = snapshot.data ?? [];
                if (users.isEmpty) {
                  return const Text('No users found', style: TextStyle(color: Color(0xFF64748B)));
                }

                return ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: users.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 10),
                  itemBuilder: (ctx, i) {
                    final u = users[i];
                    final roleColor = _getRoleColor(u.role);

                    return Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0F172A),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Text(
                                  u.name,
                                  style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: roleColor.withValues(alpha: 0.15),
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(color: roleColor.withValues(alpha: 0.5)),
                                ),
                                child: Text(
                                  u.role,
                                  style: TextStyle(color: roleColor, fontSize: 10, fontWeight: FontWeight.bold),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(u.email, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                          const SizedBox(height: 10),
                          // Role switcher chips
                          Wrap(
                            spacing: 6,
                            children: ['Attendee', 'Organizer', 'Admin', 'VendorVenueManager'].map((r) {
                              final isSelected = u.role == r;
                              return GestureDetector(
                                onTap: isSelected ? null : () => _changeRole(u, r),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: isSelected ? const Color(0xFF2563EB) : const Color(0xFF030712),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(
                                      color: isSelected ? const Color(0xFF3B82F6) : Colors.white.withValues(alpha: 0.08),
                                    ),
                                  ),
                                  child: Text(
                                    r == 'VendorVenueManager' ? 'Venue/Vendor' : r,
                                    style: TextStyle(
                                      color: isSelected ? Colors.white : const Color(0xFF64748B),
                                      fontSize: 10,
                                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                    ),
                                  ),
                                ),
                              );
                            }).toList(),
                          ),
                        ],
                      ),
                    );
                  },
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMetricCard({
    required String title,
    required String value,
    required String subtitle,
    required IconData icon,
    required Color iconColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(title, style: const TextStyle(color: Color(0xFF64748B), fontSize: 9, fontWeight: FontWeight.bold)),
              Icon(icon, color: iconColor, size: 16),
            ],
          ),
          const SizedBox(height: 6),
          Text(value, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900)),
          const SizedBox(height: 2),
          Text(subtitle, style: TextStyle(color: iconColor, fontSize: 10, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
