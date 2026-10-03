import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/supabase_service.dart';
import '../models/venue_vendor.dart';

class VenueVendorScreen extends StatefulWidget {
  const VenueVendorScreen({super.key});

  @override
  State<VenueVendorScreen> createState() => _VenueVendorScreenState();
}

class _VenueVendorScreenState extends State<VenueVendorScreen> {
  int _tabIndex = 0; // 0: Venues, 1: Vendors
  late Future<List<VenueModel>> _venuesFuture;
  late Future<List<VendorModel>> _vendorsFuture;

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  void _refresh() {
    final service = context.read<SupabaseService>();
    setState(() {
      _venuesFuture = service.fetchVenues();
      _vendorsFuture = service.fetchVendors();
    });
  }

  void _showAddVenueDialog() {
    final nameCtrl = TextEditingController();
    final locCtrl = TextEditingController(text: 'Colombo, Sri Lanka');
    final capCtrl = TextEditingController(text: '1200');
    final priceCtrl = TextEditingController(text: '45000');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF0F172A),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: const [
            Icon(Icons.add_business, color: Color(0xFF60A5FA), size: 22),
            SizedBox(width: 8),
            Text('Add Venue Space', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildDialogField(nameCtrl, 'Venue Space Name', Icons.business),
              const SizedBox(height: 10),
              _buildDialogField(locCtrl, 'Location Address', Icons.location_on),
              const SizedBox(height: 10),
              _buildDialogField(capCtrl, 'Capacity (Delegates)', Icons.people, isNumber: true),
              const SizedBox(height: 10),
              _buildDialogField(priceCtrl, 'Price Per Hour (LKR)', Icons.payments, isNumber: true),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: Color(0xFF94A3B8))),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF2563EB)),
            onPressed: () {
              if (nameCtrl.text.trim().isEmpty) return;
              final newVenue = VenueModel(
                id: 'v-${DateTime.now().millisecondsSinceEpoch}',
                name: nameCtrl.text.trim(),
                location: locCtrl.text.trim(),
                capacity: int.tryParse(capCtrl.text) ?? 500,
                pricePerHour: double.tryParse(priceCtrl.text) ?? 40000,
                amenities: ['Air Conditioning', 'High-Speed WiFi', 'Backup Power'],
              );
              context.read<SupabaseService>().addVenue(newVenue);
              Navigator.pop(ctx);
              _refresh();
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('🎉 New venue registered and listed on EventFlow!'),
                  backgroundColor: Color(0xFF10B981),
                ),
              );
            },
            child: const Text('Register Space', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Widget _buildDialogField(TextEditingController ctrl, String hint, IconData icon, {bool isNumber = false}) {
    return TextField(
      controller: ctrl,
      keyboardType: isNumber ? TextInputType.number : TextInputType.text,
      style: const TextStyle(color: Colors.white, fontSize: 13),
      decoration: InputDecoration(
        labelText: hint,
        labelStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
        prefixIcon: Icon(icon, color: const Color(0xFF64748B), size: 18),
        filled: true,
        fillColor: const Color(0xFF030712),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<SupabaseService>().currentUser;
    final isVendorOrAdmin = user?.role == 'VendorVenueManager' || user?.role == 'Admin';

    return Scaffold(
      backgroundColor: const Color(0xFF050811),
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const [
            Text('Venue & Vendor Portal', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
            Text('Sri Lanka Venues & Event Service Network', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
          ],
        ),
        backgroundColor: const Color(0xFF0B0F19),
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          if (isVendorOrAdmin)
            IconButton(
              icon: const Icon(Icons.add_circle, color: Color(0xFF60A5FA)),
              tooltip: 'Add Venue Space',
              onPressed: _showAddVenueDialog,
            ),
          IconButton(icon: const Icon(Icons.refresh, color: Color(0xFF94A3B8)), onPressed: _refresh),
        ],
      ),
      body: Column(
        children: [
          // Segmented Switcher
          Padding(
            padding: const EdgeInsets.all(16),
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _tabIndex = 0),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        decoration: BoxDecoration(
                          color: _tabIndex == 0 ? const Color(0xFF2563EB) : Colors.transparent,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        alignment: Alignment.center,
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.location_city, color: _tabIndex == 0 ? Colors.white : const Color(0xFF94A3B8), size: 16),
                            const SizedBox(width: 6),
                            Text(
                              'Venue Spaces',
                              style: TextStyle(
                                color: _tabIndex == 0 ? Colors.white : const Color(0xFF94A3B8),
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _tabIndex = 1),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        decoration: BoxDecoration(
                          color: _tabIndex == 1 ? const Color(0xFF2563EB) : Colors.transparent,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        alignment: Alignment.center,
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.handyman_outlined, color: _tabIndex == 1 ? Colors.white : const Color(0xFF94A3B8), size: 16),
                            const SizedBox(width: 6),
                            Text(
                              'Vendor Services',
                              style: TextStyle(
                                color: _tabIndex == 1 ? Colors.white : const Color(0xFF94A3B8),
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Content List
          Expanded(
            child: _tabIndex == 0 ? _buildVenuesList() : _buildVendorsList(),
          ),
        ],
      ),
    );
  }

  Widget _buildVenuesList() {
    return FutureBuilder<List<VenueModel>>(
      future: _venuesFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator(color: Color(0xFF3B82F6)));
        }
        final venues = snapshot.data ?? [];
        if (venues.isEmpty) {
          return const Center(child: Text('No venues listed', style: TextStyle(color: Color(0xFF64748B))));
        }

        return ListView.builder(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          itemCount: venues.length,
          itemBuilder: (ctx, i) {
            final v = venues[i];
            return Container(
              margin: const EdgeInsets.only(bottom: 14),
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
              ),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          v.name,
                          style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0x3310B981),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.5)),
                        ),
                        child: Text(
                          'Rs. ${v.pricePerHour.toStringAsFixed(0)} / hr',
                          style: const TextStyle(color: Color(0xFF34D399), fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.location_on, color: Color(0xFFFB7185), size: 14),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(v.location, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.people_alt_outlined, color: Color(0xFF60A5FA), size: 14),
                      const SizedBox(width: 4),
                      Text('Max Capacity: ${v.capacity} Delegates', style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 11, fontWeight: FontWeight.w600)),
                    ],
                  ),
                  const SizedBox(height: 12),
                  // Amenities tags
                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: v.amenities.map((a) {
                      return Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.4),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
                        ),
                        child: Text(a, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 10)),
                      );
                    }).toList(),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildVendorsList() {
    return FutureBuilder<List<VendorModel>>(
      future: _vendorsFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator(color: Color(0xFF3B82F6)));
        }
        final vendors = snapshot.data ?? [];
        if (vendors.isEmpty) {
          return const Center(child: Text('No vendors listed', style: TextStyle(color: Color(0xFF64748B))));
        }

        return ListView.builder(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          itemCount: vendors.length,
          itemBuilder: (ctx, i) {
            final vd = vendors[i];
            return Container(
              margin: const EdgeInsets.only(bottom: 14),
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A),
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
              ),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(colors: [Color(0xFF2563EB), Color(0xFF4F46E5)]),
                          borderRadius: BorderRadius.circular(6),
                        ),
                        child: Text(
                          vd.category,
                          style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                      ),
                      Text(
                        'From Rs. ${vd.price.toStringAsFixed(0)}',
                        style: const TextStyle(color: Color(0xFF60A5FA), fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    vd.name,
                    style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.phone, color: Color(0xFF10B981), size: 14),
                      const SizedBox(width: 6),
                      Text(vd.phone, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                      const Spacer(),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF2563EB),
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                        onPressed: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('📞 Contact request sent to ${vd.name} (${vd.phone})'),
                              backgroundColor: const Color(0xFF10B981),
                            ),
                          );
                        },
                        child: const Text('Contact Partner', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}
