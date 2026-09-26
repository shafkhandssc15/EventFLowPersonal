import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';

/// Shows the logged-in user's real tickets, fetched from
/// GET /api/registrations/mine. That endpoint only returns ids, status and
/// the embedded ticket (qrCode etc.) — it does not embed the event's
/// title/location or the ticket type's name/price, so for each distinct
/// eventId we also fetch GET /api/events/{id} and join the ticket type by
/// ticketTypeId to fill those in for display.
class MyTicketsScreen extends StatefulWidget {
  const MyTicketsScreen({super.key});

  @override
  State<MyTicketsScreen> createState() => _MyTicketsScreenState();
}

class _MyTicketsScreenState extends State<MyTicketsScreen> {
  final _api = ApiService();
  List<Map<String, dynamic>> _tickets = [];
  Map<String, dynamic>? _selectedTicket;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final registrations = await _api.myRegistrations();
      final eventCache = <String, Map<String, dynamic>?>{};
      final tickets = <Map<String, dynamic>>[];

      for (final regDynamic in registrations) {
        final reg = regDynamic as Map<String, dynamic>;
        final ticket = reg['ticket'] as Map<String, dynamic>?;
        final eventId = reg['eventId'] as String?;

        Map<String, dynamic>? event;
        if (eventId != null) {
          if (eventCache.containsKey(eventId)) {
            event = eventCache[eventId];
          } else {
            try {
              event = await _api.getEvent(eventId);
            } catch (_) {
              event = null;
            }
            eventCache[eventId] = event;
          }
        }

        final ticketTypes = (event?['ticketTypes'] as List<dynamic>?) ?? [];
        final ticketType = ticketTypes.firstWhere(
          (tt) => tt is Map && tt['id'] == ticket?['ticketTypeId'],
          orElse: () => null,
        );

        tickets.add({
          'id': reg['id'],
          'eventTitle': event?['title'] ?? 'Unknown event',
          'location': event?['location'] ?? '',
          'holderName': AuthService.instance.currentUser?.name ?? 'Attendee',
          'tierName': ticketType?['name'] ?? 'Ticket',
          'qrCode': ticket?['qrCode'] ?? '',
          'status': reg['status'] ?? '',
        });
      }

      setState(() {
        _tickets = tickets;
        _selectedTicket = tickets.isNotEmpty ? tickets.first : null;
      });
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Passes & QR Wallet'),
        backgroundColor: const Color(0xFF0B0F19),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Log out',
            onPressed: () => AuthService.instance.logout(),
          ),
        ],
      ),
      backgroundColor: const Color(0xFF030712),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _loading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? ListView(
                    children: [
                      Padding(
                        padding: const EdgeInsets.all(32),
                        child: Center(
                          child: Text(
                            'Could not load your passes: $_error',
                            textAlign: TextAlign.center,
                            style: const TextStyle(color: Colors.white70),
                          ),
                        ),
                      ),
                    ],
                  )
                : _tickets.isEmpty
                    ? ListView(
                        children: const [
                          Padding(
                            padding: EdgeInsets.all(32),
                            child: Center(
                              child: Text(
                                "You haven't registered for any events yet.",
                                textAlign: TextAlign.center,
                                style: TextStyle(color: Colors.white70),
                              ),
                            ),
                          ),
                        ],
                      )
                    : SingleChildScrollView(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            // Active QR Badge Card
                            if (_selectedTicket != null)
                              Container(
                                padding: const EdgeInsets.all(20),
                                decoration: BoxDecoration(
                                  gradient: const LinearGradient(
                                    colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
                                    begin: Alignment.topLeft,
                                    end: Alignment.bottomRight,
                                  ),
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(color: const Color(0x663B82F6)),
                                  boxShadow: const [
                                    BoxShadow(
                                      color: Color(0x263B82F6),
                                      blurRadius: 20,
                                      spreadRadius: 2,
                                    ),
                                  ],
                                ),
                                child: Column(
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        const Row(
                                          children: [
                                            Icon(Icons.verified, color: Color(0xFF34D399), size: 18),
                                            SizedBox(width: 6),
                                            Text(
                                              'OFFICIAL ENTRANCE PASS',
                                              style: TextStyle(
                                                color: Color(0xFF93C5FD),
                                                fontSize: 11,
                                                fontWeight: FontWeight.bold,
                                                letterSpacing: 0.8,
                                              ),
                                            ),
                                          ],
                                        ),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                          decoration: BoxDecoration(
                                            color: const Color(0x3310B981),
                                            borderRadius: BorderRadius.circular(8),
                                            border: Border.all(color: const Color(0xFF10B981)),
                                          ),
                                          child: Text(
                                            _selectedTicket!['status'] == ''
                                                ? 'Active & Valid'
                                                : _selectedTicket!['status'],
                                            style: const TextStyle(
                                                color: Color(0xFF34D399),
                                                fontSize: 10,
                                                fontWeight: FontWeight.bold),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 12),
                                    Text(
                                      _selectedTicket!['eventTitle'],
                                      textAlign: TextAlign.center,
                                      style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      _selectedTicket!['location'],
                                      style: TextStyle(color: Colors.grey.shade400, fontSize: 12),
                                    ),
                                    const SizedBox(height: 16),

                                    // High-Definition QR Code
                                    Container(
                                      padding: const EdgeInsets.all(12),
                                      decoration: BoxDecoration(
                                        color: Colors.white,
                                        borderRadius: BorderRadius.circular(12),
                                      ),
                                      child: QrImageView(
                                        data: _selectedTicket!['qrCode'],
                                        version: QrVersions.auto,
                                        size: 160.0,
                                        backgroundColor: Colors.white,
                                      ),
                                    ),
                                    const SizedBox(height: 12),
                                    Text(
                                      'Pass ID: ${_selectedTicket!['qrCode']}',
                                      style: const TextStyle(color: Color(0xFF60A5FA), fontSize: 11, fontFamily: 'monospace', fontWeight: FontWeight.bold),
                                    ),
                                    const Divider(color: Colors.white24, height: 28),

                                    // Holder Details
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            const Text('PASS HOLDER', style: TextStyle(color: Colors.white54, fontSize: 9, fontWeight: FontWeight.bold)),
                                            const SizedBox(height: 2),
                                            Text(
                                              _selectedTicket!['holderName'],
                                              style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600),
                                            ),
                                          ],
                                        ),
                                        Column(
                                          crossAxisAlignment: CrossAxisAlignment.end,
                                          children: [
                                            const Text('TICKET TYPE', style: TextStyle(color: Colors.white54, fontSize: 9, fontWeight: FontWeight.bold)),
                                            const SizedBox(height: 2),
                                            Text(
                                              _selectedTicket!['tierName'],
                                              style: const TextStyle(color: Color(0xFF34D399), fontSize: 13, fontWeight: FontWeight.w600),
                                            ),
                                          ],
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),

                            const SizedBox(height: 24),
                            const Text(
                              'ALL MY PASSES',
                              style: TextStyle(color: Color(0xFF93C5FD), fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 0.8),
                            ),
                            const SizedBox(height: 10),

                            // List of Passes
                            ..._tickets.map((tkt) {
                              final isSelected = _selectedTicket?['id'] == tkt['id'];
                              return Container(
                                margin: const EdgeInsets.only(bottom: 10),
                                decoration: BoxDecoration(
                                  color: isSelected ? const Color(0xFF1E293B) : const Color(0xFF0F172A),
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: isSelected ? const Color(0xFF3B82F6) : Colors.white10,
                                  ),
                                ),
                                child: ListTile(
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                                  leading: Container(
                                    padding: const EdgeInsets.all(8),
                                    decoration: BoxDecoration(
                                      color: isSelected ? const Color(0xFF3B82F6) : Colors.white12,
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: const Icon(Icons.qr_code, color: Colors.white, size: 20),
                                  ),
                                  title: Text(
                                    tkt['eventTitle'],
                                    style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
                                  ),
                                  subtitle: Text(
                                    '${tkt['tierName']} · ${tkt['status']}',
                                    style: TextStyle(color: Colors.grey.shade400, fontSize: 11),
                                  ),
                                  trailing: ElevatedButton(
                                    onPressed: () => setState(() => _selectedTicket = tkt),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: isSelected ? const Color(0xFF3B82F6) : Colors.white12,
                                      foregroundColor: Colors.white,
                                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                      textStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                                    ),
                                    child: Text(isSelected ? 'Viewing' : 'Show QR'),
                                  ),
                                ),
                              );
                            }),
                          ],
                        ),
                      ),
      ),
    );
  }
}
