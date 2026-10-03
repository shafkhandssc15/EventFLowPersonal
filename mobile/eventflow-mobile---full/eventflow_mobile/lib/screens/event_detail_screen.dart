import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
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
  int _quantity = 1;
  bool _booking = false;

  @override
  void initState() {
    super.initState();
    if (widget.event.ticketTypes.isNotEmpty) {
      _selectedTier = widget.event.ticketTypes.first;
    }
  }

  String _formatDate(String isoString) {
    if (isoString.isEmpty) return 'Upcoming';
    try {
      final dt = DateTime.parse(isoString);
      return DateFormat('EEEE, MMMM d, yyyy • h:mm a').format(dt);
    } catch (_) {
      return isoString;
    }
  }

  Future<void> _handleBookTicket() async {
    final service = context.read<SupabaseService>();
    final user = service.currentUser;
    if (user == null || _selectedTier == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please sign in first to book passes.'),
          backgroundColor: Color(0xFFEF4444),
        ),
      );
      return;
    }

    setState(() => _booking = true);
    try {
      for (int i = 0; i < _quantity; i++) {
        await service.bookTicket(
          eventId: widget.event.id,
          ticketTypeId: _selectedTier!.id,
          attendeeId: user.id,
        );
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.check_circle, color: Colors.white, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text('🎉 ${_quantity}x Pass(es) reserved! View in "My Passes".'),
                ),
              ],
            ),
            backgroundColor: const Color(0xFF10B981),
            behavior: SnackBarBehavior.floating,
          ),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Booking error: $e'),
            backgroundColor: const Color(0xFFEF4444),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _booking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final lowestPrice = _selectedTier?.price ?? widget.event.lowestPrice;
    final totalAmount = lowestPrice * _quantity;

    return Scaffold(
      backgroundColor: const Color(0xFF050811),
      appBar: AppBar(
        title: const Text('Event Pass Booking', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        backgroundColor: const Color(0xFF0B0F19),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.only(bottom: 40),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Hero Photo Header
            Stack(
              children: [
                Image.network(
                  widget.event.imageUrl,
                  height: 220,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    height: 220,
                    color: const Color(0xFF1E293B),
                    child: const Icon(Icons.event, color: Colors.white30, size: 50),
                  ),
                ),
                Positioned.fill(
                  child: Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          Colors.black.withValues(alpha: 0.2),
                          const Color(0xFF050811),
                        ],
                      ),
                    ),
                  ),
                ),
                Positioned(
                  bottom: 16,
                  left: 16,
                  right: 16,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(colors: [Color(0xFF2563EB), Color(0xFF4F46E5)]),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Text(
                          widget.event.category.toUpperCase(),
                          style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        widget.event.title,
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 22,
                          fontWeight: FontWeight.w900,
                          letterSpacing: -0.5,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            // Event Details Section
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Meta Info Box
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0F172A),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
                    ),
                    child: Column(
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.calendar_month, color: Color(0xFF60A5FA), size: 18),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                _formatDate(widget.event.startDate),
                                style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            const Icon(Icons.location_on, color: Color(0xFFFB7185), size: 18),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                widget.event.location,
                                style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            const Icon(Icons.people_alt_outlined, color: Color(0xFF34D399), size: 18),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                'Capacity: ${widget.event.capacity} Attendees',
                                style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),
                  const Text('About This Event', style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Text(
                    widget.event.description,
                    style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13, height: 1.5),
                  ),

                  const SizedBox(height: 24),
                  const Text('Select Ticket Tier', style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 10),
                  ...widget.event.ticketTypes.map((tier) {
                    final isSelected = _selectedTier?.id == tier.id;
                    return Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      decoration: BoxDecoration(
                        gradient: isSelected
                            ? const LinearGradient(colors: [Color(0x332563EB), Color(0x1A1D4ED8)])
                            : null,
                        color: isSelected ? null : const Color(0xFF0F172A),
                        border: Border.all(
                          color: isSelected ? const Color(0xFF3B82F6) : Colors.white.withValues(alpha: 0.08),
                          width: isSelected ? 1.5 : 1.0,
                        ),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: ListTile(
                        onTap: () => setState(() => _selectedTier = tier),
                        title: Text(
                          tier.name,
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: isSelected ? FontWeight.w900 : FontWeight.bold,
                            fontSize: 14,
                          ),
                        ),
                        subtitle: Text(
                          'Available: ${tier.quantity - tier.sold} remaining',
                          style: const TextStyle(color: Color(0xFF64748B), fontSize: 11),
                        ),
                        trailing: Text(
                          tier.price > 0 ? 'Rs. ${tier.price.toStringAsFixed(0)}' : 'Free',
                          style: TextStyle(
                            color: isSelected ? const Color(0xFF60A5FA) : const Color(0xFF34D399),
                            fontWeight: FontWeight.w900,
                            fontSize: 15,
                          ),
                        ),
                      ),
                    );
                  }),

                  const SizedBox(height: 16),
                  // Quantity Selector
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: BoxDecoration(
                      color: const Color(0xFF0F172A),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Quantity',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                        Row(
                          children: [
                            IconButton(
                              icon: const Icon(Icons.remove_circle_outline, color: Color(0xFF60A5FA)),
                              onPressed: _quantity > 1 ? () => setState(() => _quantity--) : null,
                            ),
                            Text(
                              '$_quantity',
                              style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                            ),
                            IconButton(
                              icon: const Icon(Icons.add_circle_outline, color: Color(0xFF60A5FA)),
                              onPressed: _quantity < 5 ? () => setState(() => _quantity++) : null,
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 24),
                  // Total and Confirm Button
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Total Price', style: TextStyle(color: Color(0xFF64748B), fontSize: 11)),
                          Text(
                            totalAmount > 0 ? 'Rs. ${totalAmount.toStringAsFixed(0)}' : 'Free',
                            style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w900),
                          ),
                        ],
                      ),
                      ElevatedButton(
                        onPressed: _booking || _selectedTier == null ? null : _handleBookTicket,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF2563EB),
                          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          elevation: 6,
                        ),
                        child: _booking
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                              )
                            : Row(
                                children: const [
                                  Text(
                                    'Confirm & Book',
                                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                                  ),
                                  SizedBox(width: 6),
                                  Icon(Icons.arrow_forward, color: Colors.white, size: 16),
                                ],
                              ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
