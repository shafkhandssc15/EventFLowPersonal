import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../services/supabase_service.dart';
import '../models/event.dart';
import 'create_edit_event_screen.dart';
import 'login_screen.dart';

class OrganizerDashboardScreen extends StatefulWidget {
  const OrganizerDashboardScreen({super.key});

  @override
  State<OrganizerDashboardScreen> createState() => _OrganizerDashboardScreenState();
}

class _OrganizerDashboardScreenState extends State<OrganizerDashboardScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  late Future<List<EventModel>> _eventsFuture;
  late Future<Map<String, dynamic>> _metricsFuture;
  String _selectedEventFilter = 'All';
  String? _processingPaymentId;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadData();
  }

  void _loadData() {
    setState(() {
      _eventsFuture = context.read<SupabaseService>().fetchEvents();
      _metricsFuture = context.read<SupabaseService>().fetchOrganizerMetrics();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  String _formatDate(String isoString) {
    if (isoString.isEmpty) return 'TBD';
    try {
      final dt = DateTime.parse(isoString);
      return DateFormat('EEE, MMM d, yyyy · hh:mm a').format(dt);
    } catch (_) {
      return isoString;
    }
  }

  void _confirmDeleteEvent(EventModel event) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF0F172A),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Cancel or Delete Event', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 17)),
        content: Text(
          'Are you sure you want to cancel "${event.title}"? Attendees will be notified and ticket sales will be stopped.',
          style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Dismiss', style: TextStyle(color: Color(0xFF64748B))),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFFDC2626),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await context.read<SupabaseService>().deleteEvent(event.id);
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('🗑️ Event cancelled and updated in Supabase.'),
                      backgroundColor: Color(0xFF10B981),
                    ),
                  );
                  _loadData();
                }
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Error: $e'), backgroundColor: const Color(0xFFDC2626)),
                  );
                }
              }
            },
            child: const Text('Confirm', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  void _showAddTierDialog(EventModel event) {
    final nameCtrl = TextEditingController(text: 'VIP Access Pass');
    final priceCtrl = TextEditingController(text: '7500');
    final qtyCtrl = TextEditingController(text: '50');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF0F172A),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('Add Tier to ${event.title}', style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameCtrl,
              style: const TextStyle(color: Colors.white),
              decoration: const InputDecoration(
                labelText: 'Tier Name',
                labelStyle: TextStyle(color: Color(0xFF94A3B8)),
                enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Color(0xFF334155))),
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: priceCtrl,
              keyboardType: TextInputType.number,
              style: const TextStyle(color: Colors.white),
              decoration: const InputDecoration(
                labelText: 'Price (LKR)',
                labelStyle: TextStyle(color: Color(0xFF94A3B8)),
                enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Color(0xFF334155))),
              ),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: qtyCtrl,
              keyboardType: TextInputType.number,
              style: const TextStyle(color: Colors.white),
              decoration: const InputDecoration(
                labelText: 'Capacity / Quantity',
                labelStyle: TextStyle(color: Color(0xFF94A3B8)),
                enabledBorder: UnderlineInputBorder(borderSide: BorderSide(color: Color(0xFF334155))),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: Color(0xFF94A3B8))),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF2563EB),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            onPressed: () async {
              final name = nameCtrl.text.trim();
              final price = double.tryParse(priceCtrl.text) ?? 0.0;
              final qty = int.tryParse(qtyCtrl.text) ?? 50;
              if (name.isNotEmpty) {
                Navigator.pop(ctx);
                await context.read<SupabaseService>().addTicketType(
                  eventId: event.id,
                  name: name,
                  price: price,
                  quantity: qty,
                );
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('🎉 Tier "$name" added to event!'), backgroundColor: const Color(0xFF10B981)),
                  );
                  _loadData();
                }
              }
            },
            child: const Text('Add Tier', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final service = context.watch<SupabaseService>();
    final user = service.currentUser;
    final isOrganizerOrAdmin = user?.role == 'Organizer' || user?.role == 'Admin';

    return Scaffold(
      backgroundColor: const Color(0xFF030712),
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: const Color(0xFF2563EB).withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.hub, color: Color(0xFF60A5FA), size: 18),
            ),
            const SizedBox(width: 10),
            const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Organizer Terminal', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                Text('Realtime Supabase Sync', style: TextStyle(color: Color(0xFF10B981), fontSize: 10, fontWeight: FontWeight.w600)),
              ],
            ),
          ],
        ),
        backgroundColor: const Color(0xFF0B0F19),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Color(0xFF94A3B8), size: 20),
            onPressed: _loadData,
            tooltip: 'Refresh Data',
          ),
          if (isOrganizerOrAdmin)
            Padding(
              padding: const EdgeInsets.only(right: 12),
              child: ElevatedButton.icon(
                onPressed: () async {
                  final res = await Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const CreateEditEventScreen()),
                  );
                  if (res == true) _loadData();
                },
                icon: const Icon(Icons.add, size: 16, color: Colors.white),
                label: const Text('Add Event', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2563EB),
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ),
        ],
        bottom: isOrganizerOrAdmin
            ? TabBar(
                controller: _tabController,
                indicatorColor: const Color(0xFF2563EB),
                indicatorWeight: 3,
                labelColor: const Color(0xFF60A5FA),
                unselectedLabelColor: const Color(0xFF64748B),
                labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                tabs: const [
                  Tab(icon: Icon(Icons.calendar_month, size: 18), text: 'Manage Events'),
                  Tab(icon: Icon(Icons.analytics, size: 18), text: 'Overview & Approvals'),
                ],
              )
            : null,
      ),
      body: !isOrganizerOrAdmin ? _buildNonOrganizerView() : TabBarView(
        controller: _tabController,
        children: [
          _buildManageEventsTab(),
          _buildOverviewTab(),
        ],
      ),
      floatingActionButton: isOrganizerOrAdmin
          ? FloatingActionButton.extended(
              onPressed: () async {
                final res = await Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const CreateEditEventScreen()),
                );
                if (res == true) _loadData();
              },
              backgroundColor: const Color(0xFF2563EB),
              icon: const Icon(Icons.add_circle, color: Colors.white),
              label: const Text('Host Event', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            )
          : null,
    );
  }

  // Non-organizer prompt with 1-tap demo switch
  Widget _buildNonOrganizerView() {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: const Color(0xFF0F172A),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0xFF1E293B)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFF2563EB).withValues(alpha: 0.15),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.admin_panel_settings, color: Color(0xFF60A5FA), size: 40),
              ),
              const SizedBox(height: 16),
              const Text(
                'Organizer Terminal',
                style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              const Text(
                'To create and manage events, set ticket tiers, and approve attendee payments, switch to an Organizer role or sign in.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Color(0xFF94A3B8), fontSize: 13, height: 1.4),
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: () {
                  context.read<SupabaseService>().switchDemoRole('Organizer');
                  _loadData();
                },
                icon: const Icon(Icons.swap_horiz, color: Colors.white),
                label: const Text('Switch to Demo Organizer', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2563EB),
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  minimumSize: const Size(double.infinity, 48),
                ),
              ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: () {
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const LoginScreen()));
                },
                icon: const Icon(Icons.login, color: Color(0xFF60A5FA)),
                label: const Text('Sign In With Existing Account', style: TextStyle(color: Color(0xFF60A5FA), fontWeight: FontWeight.bold)),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: Color(0xFF334155)),
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  minimumSize: const Size(double.infinity, 48),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Tab 1: Manage Events
  Widget _buildManageEventsTab() {
    return FutureBuilder<List<EventModel>>(
      future: _eventsFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator(color: Color(0xFF2563EB)));
        }
        if (snapshot.hasError) {
          return Center(
            child: Text('Error loading events: ${snapshot.error}', style: const TextStyle(color: Colors.redAccent)),
          );
        }

        final allEvents = snapshot.data ?? [];
        final filteredEvents = _selectedEventFilter == 'All'
            ? allEvents
            : allEvents.where((e) => e.status.toLowerCase() == _selectedEventFilter.toLowerCase()).toList();

        return RefreshIndicator(
          onRefresh: () async => _loadData(),
          color: const Color(0xFF2563EB),
          child: ListView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
            children: [
              // Filter chips bar
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: ['All', 'Published', 'Draft', 'Cancelled'].map((f) {
                    final isSel = _selectedEventFilter == f;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: Text(f),
                        selected: isSel,
                        selectedColor: const Color(0xFF2563EB),
                        backgroundColor: const Color(0xFF0F172A),
                        labelStyle: TextStyle(
                          color: isSel ? Colors.white : const Color(0xFF94A3B8),
                          fontSize: 12,
                          fontWeight: isSel ? FontWeight.bold : FontWeight.normal,
                        ),
                        side: BorderSide(
                          color: isSel ? const Color(0xFF3B82F6) : const Color(0xFF1E293B),
                        ),
                        onSelected: (_) => setState(() => _selectedEventFilter = f),
                      ),
                    );
                  }).toList(),
                ),
              ),
              const SizedBox(height: 14),

              if (filteredEvents.isEmpty)
                Container(
                  padding: const EdgeInsets.all(32),
                  margin: const EdgeInsets.only(top: 20),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F172A),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFF1E293B)),
                  ),
                  child: Column(
                    children: [
                      const Icon(Icons.event_busy, color: Color(0xFF64748B), size: 48),
                      const SizedBox(height: 12),
                      Text('No $_selectedEventFilter events found', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                      const SizedBox(height: 6),
                      const Text('Tap "+ Host Event" below to publish an event.', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                    ],
                  ),
                )
              else
                ...filteredEvents.map((ev) => _buildOrganizerEventCard(ev)),
            ],
          ),
        );
      },
    );
  }

  Widget _buildOrganizerEventCard(EventModel event) {
    Color statusColor;
    switch (event.status.toLowerCase()) {
      case 'published':
        statusColor = const Color(0xFF10B981);
        break;
      case 'draft':
        statusColor = const Color(0xFFF59E0B);
        break;
      case 'cancelled':
        statusColor = const Color(0xFFEF4444);
        break;
      default:
        statusColor = const Color(0xFF60A5FA);
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFF1E293B)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Banner Image & Status Badge
          Stack(
            children: [
              ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(18)),
                child: Image.network(
                  event.imageUrl,
                  height: 140,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    height: 140,
                    color: const Color(0xFF1E293B),
                    child: const Center(child: Icon(Icons.image, color: Color(0xFF64748B), size: 36)),
                  ),
                ),
              ),
              Positioned(
                top: 12,
                left: 12,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.75),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
                  ),
                  child: Text(
                    event.category,
                    style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
              Positioned(
                top: 12,
                right: 12,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusColor.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: statusColor),
                  ),
                  child: Text(
                    event.status.toUpperCase(),
                    style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.w800),
                  ),
                ),
              ),
            ],
          ),

          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Title
                Text(
                  event.title,
                  style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 6),

                // Location & Date
                Row(
                  children: [
                    const Icon(Icons.location_on, color: Color(0xFF60A5FA), size: 14),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        event.location,
                        style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(Icons.schedule, color: Color(0xFFF59E0B), size: 14),
                    const SizedBox(width: 4),
                    Text(
                      _formatDate(event.startDate),
                      style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Ticket Tiers summary
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: event.ticketTypes.map((tt) {
                    return Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFF1E293B),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '${tt.name}: Rs. ${tt.price.toStringAsFixed(0)}',
                        style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 11),
                      ),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 14),
                const Divider(color: Color(0xFF1E293B), height: 1),
                const SizedBox(height: 12),

                // Action Buttons
                Row(
                  children: [
                    // Edit
                    Expanded(
                      child: OutlinedButton.icon(
                        icon: const Icon(Icons.edit, size: 14, color: Color(0xFF60A5FA)),
                        label: const Text('Edit', style: TextStyle(color: Color(0xFF60A5FA), fontSize: 12, fontWeight: FontWeight.bold)),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Color(0xFF334155)),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          padding: const EdgeInsets.symmetric(vertical: 8),
                        ),
                        onPressed: () async {
                          final res = await Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => CreateEditEventScreen(eventToEdit: event)),
                          );
                          if (res == true) _loadData();
                        },
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Add Tier
                    Expanded(
                      child: OutlinedButton.icon(
                        icon: const Icon(Icons.confirmation_number_outlined, size: 14, color: Color(0xFF10B981)),
                        label: const Text('+ Tier', style: TextStyle(color: Color(0xFF10B981), fontSize: 12, fontWeight: FontWeight.bold)),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Color(0xFF334155)),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          padding: const EdgeInsets.symmetric(vertical: 8),
                        ),
                        onPressed: () => _showAddTierDialog(event),
                      ),
                    ),
                    const SizedBox(width: 8),
                    // Cancel / Delete
                    IconButton(
                      icon: const Icon(Icons.delete_outline, color: Color(0xFFEF4444), size: 18),
                      tooltip: 'Cancel / Delete Event',
                      onPressed: () => _confirmDeleteEvent(event),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // Tab 2: Overview & Approvals (matching web OrganizerDashboardView)
  Widget _buildOverviewTab() {
    return FutureBuilder<Map<String, dynamic>>(
      future: _metricsFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator(color: Color(0xFF2563EB)));
        }

        final data = snapshot.data ?? {};
        final passesSold = data['passesSold'] ?? 0;
        final checkedIn = data['checkedInCount'] ?? 0;
        final totalRevenue = (data['totalRevenue'] as num?)?.toDouble() ?? 0.0;
        final awaiting = data['awaitingPaymentCount'] ?? 0;
        final pendingList = (data['pendingPayments'] as List?) ?? [];

        return RefreshIndicator(
          onRefresh: () async => _loadData(),
          color: const Color(0xFF2563EB),
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 80),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 4 KPI Cards in 2x2 Grid (identical to web)
                Row(
                  children: [
                    Expanded(
                      child: _buildKpiCard(
                        title: 'Passes Sold',
                        value: '$passesSold',
                        color: const Color(0xFF3B82F6),
                        icon: Icons.confirmation_number,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _buildKpiCard(
                        title: 'Checked In',
                        value: '$checkedIn',
                        color: const Color(0xFF10B981),
                        icon: Icons.qr_code_scanner,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: _buildKpiCard(
                        title: 'Total Revenue',
                        value: 'Rs. ${NumberFormat('#,##0').format(totalRevenue)}',
                        color: const Color(0xFFA855F7),
                        icon: Icons.payments,
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: _buildKpiCard(
                        title: 'Awaiting Payment',
                        value: '$awaiting',
                        color: const Color(0xFFF59E0B),
                        icon: Icons.pending_actions,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Payments to approve section
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Payments to Approve',
                      style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Text(
                        '${pendingList.length} Pending',
                        style: const TextStyle(color: Color(0xFFF59E0B), fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),

                if (pendingList.isEmpty)
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0F172A),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFF1E293B)),
                    ),
                    child: const Column(
                      children: [
                        Icon(Icons.check_circle_outline, color: Color(0xFF10B981), size: 36),
                        SizedBox(height: 8),
                        Text(
                          'All payments are reviewed & approved!',
                          style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                        ),
                        Text(
                          'No pending offline transfer bookings.',
                          style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                        ),
                      ],
                    ),
                  )
                else
                  ...pendingList.map((item) {
                    final isProcessing = _processingPaymentId == item['id'];
                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0F172A),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFF1E293B)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Text(
                                  item['attendeeName'],
                                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                                ),
                              ),
                              Text(
                                'Rs. ${(item['amount'] as num).toStringAsFixed(0)}',
                                style: const TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold, fontSize: 14),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '${item['eventTitle']} · ${item['ticketTypeName']}',
                            style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            'Booking Ref: ${item['bookingRef']}',
                            style: const TextStyle(color: Color(0xFF64748B), fontSize: 11, fontFamily: 'monospace'),
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton(
                                  onPressed: isProcessing
                                      ? null
                                      : () async {
                                          setState(() => _processingPaymentId = item['id']);
                                          await context.read<SupabaseService>().rejectRegistrationPayment(item['id']);
                                          setState(() => _processingPaymentId = null);
                                          _loadData();
                                        },
                                  style: OutlinedButton.styleFrom(
                                    side: const BorderSide(color: Color(0xFFEF4444)),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                  ),
                                  child: const Text('Reject', style: TextStyle(color: Color(0xFFEF4444), fontSize: 12)),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: ElevatedButton(
                                  onPressed: isProcessing
                                      ? null
                                      : () async {
                                          setState(() => _processingPaymentId = item['id']);
                                          await context.read<SupabaseService>().approveRegistrationPayment(
                                                item['id'],
                                                (item['amount'] as num).toDouble(),
                                                item['bookingRef'],
                                              );
                                          setState(() => _processingPaymentId = null);
                                          _loadData();
                                        },
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF10B981),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                  ),
                                  child: isProcessing
                                      ? const SizedBox(
                                          width: 16,
                                          height: 16,
                                          child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2),
                                        )
                                      : const Text('Approve', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold, fontSize: 12)),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    );
                  }),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildKpiCard({required String title, required String value, required Color color, required IconData icon}) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF1E293B)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(title, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontWeight: FontWeight.w600)),
              Icon(icon, color: color.withValues(alpha: 0.6), size: 16),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(color: color, fontSize: 18, fontWeight: FontWeight.bold),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}
