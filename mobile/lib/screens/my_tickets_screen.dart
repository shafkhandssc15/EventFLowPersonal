import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';

class MyTicketsScreen extends StatefulWidget {
  const MyTicketsScreen({super.key});

  @override
  State<MyTicketsScreen> createState() => _MyTicketsScreenState();
}

class _MyTicketsScreenState extends State<MyTicketsScreen> {
  final List<Map<String, dynamic>> _tickets = [
    {
      'id': 'tkt-lk-001',
      'eventTitle': 'Sri Lanka Autonomous Systems Summit 2027',
      'location': 'BMICH, Colombo 07',
      'startDate': '2027-04-10T09:00:00Z',
      'holderName': 'Sam Taylor',
      'holderNic': '199878901234',
      'tierName': 'VIP Summit All-Access',
      'price': 30000,
      'isChild': false,
      'qrCode': 'EVENTFLOW-LK-SLAS27-VIP-01-1234',
      'status': 'Confirmed',
    },
    {
      'id': 'tkt-lk-002',
      'eventTitle': 'Sri Lanka Autonomous Systems Summit 2027',
      'location': 'BMICH, Colombo 07',
      'startDate': '2027-04-10T09:00:00Z',
      'holderName': 'Kasun Perera (Guest)',
      'holderNic': '199418290384',
      'tierName': 'Standard Delegate Pass',
      'price': 15000,
      'isChild': false,
      'qrCode': 'EVENTFLOW-LK-SLAS27-STD-02-5678',
      'status': 'Confirmed',
    },
    {
      'id': 'tkt-lk-003',
      'eventTitle': 'Colombo AI & Robotics Expo 2027',
      'location': 'Nelum Pokuna, Colombo 07',
      'startDate': '2027-05-18T10:00:00Z',
      'holderName': 'Leo Taylor (Child <5 yrs)',
      'holderNic': '199878901234',
      'tierName': 'Child Pass (Free)',
      'price': 0,
      'isChild': true,
      'qrCode': 'EVENTFLOW-LK-CMF27-CHD-03-9988',
      'status': 'Confirmed',
    }
  ];

  Map<String, dynamic>? _selectedTicket;

  @override
  void initState() {
    super.initState();
    _selectedTicket = _tickets.first;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Passes & QR Wallet'),
        backgroundColor: const Color(0xFF0B0F19),
        foregroundColor: Colors.white,
      ),
      backgroundColor: const Color(0xFF030712),
      body: SingleChildScrollView(
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
                          child: const Text(
                            'Active & Valid',
                            style: TextStyle(color: Color(0xFF34D399), fontSize: 10, fontWeight: FontWeight.bold),
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
                            const Text('NIC / IDENTITY', style: TextStyle(color: Colors.white54, fontSize: 9, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 2),
                            Text(
                              _selectedTicket!['holderNic'],
                              style: const TextStyle(color: Color(0xFF34D399), fontSize: 13, fontFamily: 'monospace', fontWeight: FontWeight.w600),
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
                    tkt['holderName'],
                    style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
                  ),
                  subtitle: Text(
                    '${tkt['tierName']} · NIC: ${tkt['holderNic']}',
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
    );
  }
}
