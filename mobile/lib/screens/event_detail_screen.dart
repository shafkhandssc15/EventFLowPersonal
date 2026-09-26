import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../services/api_service.dart';

const _placeholderAttendeeId = '00000000-0000-0000-0000-000000000001';

class EventDetailScreen extends StatefulWidget {
  final String eventId;
  const EventDetailScreen({super.key, required this.eventId});

  @override
  State<EventDetailScreen> createState() => _EventDetailScreenState();
}

class _EventDetailScreenState extends State<EventDetailScreen> {
  final _api = ApiService();
  Map<String, dynamic>? _event;
  String? _qrCode;
  String? _error;

  @override
  void initState() {
    super.initState();
    _api.getEvent(widget.eventId).then((e) => setState(() => _event = e))
        .catchError((e) => setState(() => _error = e.toString()));
  }

  Future<void> _register(String ticketTypeId) async {
    try {
      final result = await _api.register(
        eventId: widget.eventId,
        attendeeId: _placeholderAttendeeId,
        ticketTypeId: ticketTypeId,
      );
      setState(() => _qrCode = result['ticket']?['qrCode']);
    } catch (e) {
      setState(() => _error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) return Scaffold(body: Center(child: Text(_error!)));
    if (_event == null) return const Scaffold(body: Center(child: CircularProgressIndicator()));

    final ticketTypes = (_event!['ticketTypes'] as List<dynamic>? ?? []);

    return Scaffold(
      appBar: AppBar(title: Text(_event!['title'] ?? '')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(_event!['description'] ?? '', style: const TextStyle(fontSize: 16)),
          const SizedBox(height: 12),
          Text('${_event!['location'] ?? ''}'),
          const Divider(height: 32),
          const Text('Ticket Types', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          ...ticketTypes.map((tt) => Card(
                child: ListTile(
                  title: Text(tt['name'] ?? ''),
                  subtitle: Text('\$${tt['price']} — ${tt['sold']}/${tt['quantity']} sold'),
                  trailing: ElevatedButton(
                    onPressed: (tt['sold'] ?? 0) >= (tt['quantity'] ?? 0)
                        ? null
                        : () => _register(tt['id']),
                    child: const Text('Register'),
                  ),
                ),
              )),
          if (_qrCode != null) ...[
            const SizedBox(height: 24),
            const Text('Your ticket QR code:', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Center(child: QrImageView(data: _qrCode!, size: 200)),
            Center(child: Text(_qrCode!)),
          ],
        ],
      ),
    );
  }
}
