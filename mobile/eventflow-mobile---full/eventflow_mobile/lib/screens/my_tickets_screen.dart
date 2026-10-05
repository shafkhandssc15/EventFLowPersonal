import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../services/supabase_service.dart';
import '../models/ticket.dart';
import 'login_screen.dart';

class MyTicketsScreen extends StatefulWidget {
  const MyTicketsScreen({super.key});

  @override
  State<MyTicketsScreen> createState() => _MyTicketsScreenState();
}

class _MyTicketsScreenState extends State<MyTicketsScreen> {
  late Future<List<UserTicketModel>> _passesFuture;

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  void _refresh() {
    final user = context.read<SupabaseService>().currentUser;
    if (user != null) {
      setState(() {
        _passesFuture = context.read<SupabaseService>().fetchUserPasses(user.id);
      });
    }
  }

  void _showTransferDialog(UserTicketModel pass) {
    final emailCtrl = TextEditingController();
    bool transferring = false;
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0F172A),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx2, setSheetState) => Padding(
          padding: EdgeInsets.fromLTRB(24, 20, 24, MediaQuery.of(ctx2).viewInsets.bottom + 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 36, height: 36,
                    decoration: BoxDecoration(color: const Color(0xFF2563EB).withValues(alpha: 0.15), shape: BoxShape.circle),
                    child: const Icon(Icons.swap_horiz, color: Color(0xFF60A5FA), size: 18),
                  ),
                  const SizedBox(width: 12),
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Transfer Ticket', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                      Text('Transfer this pass to another attendee', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF030712),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.07)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.confirmation_number_outlined, color: Color(0xFF60A5FA), size: 16),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(pass.eventTitle, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600), overflow: TextOverflow.ellipsis),
                    ),
                    Text(pass.tierName, style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                  ],
                ),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: emailCtrl,
                keyboardType: TextInputType.emailAddress,
                style: const TextStyle(color: Colors.white, fontSize: 13),
                decoration: InputDecoration(
                  labelText: 'Recipient Email Address',
                  labelStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                  prefixIcon: const Icon(Icons.email_outlined, color: Color(0xFF64748B), size: 18),
                  filled: true,
                  fillColor: const Color(0xFF030712),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 14),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                  onPressed: transferring ? null : () async {
                    if (emailCtrl.text.trim().isEmpty) return;
                    setSheetState(() => transferring = true);
                    final res = await context.read<SupabaseService>().transferTicket(
                      registrationId: pass.registrationId,
                      newAttendeeEmail: emailCtrl.text.trim(),
                    );
                    if (ctx2.mounted) Navigator.pop(ctx2);
                    if (mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                        content: Text(res['success'] == true
                            ? '✅ ${res['message']}'
                            : '❌ ${res['message']}'),
                        backgroundColor: res['success'] == true ? const Color(0xFF10B981) : const Color(0xFFDC2626),
                        duration: const Duration(seconds: 4),
                      ));
                      if (res['success'] == true) _refresh();
                    }
                  },
                  child: transferring
                      ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Text('Confirm Transfer', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showQrDialog(UserTicketModel pass) {
    final isUsed = pass.status == 'CheckedIn';

    showDialog(
      context: context,
      builder: (_) => Dialog(
        backgroundColor: const Color(0xFF0F172A),
        insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 40),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(24),
          side: BorderSide(color: Colors.white.withValues(alpha: 0.1)),
        ),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: isUsed ? const Color(0x333B82F6) : const Color(0x3310B981),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: isUsed ? const Color(0xFF3B82F6) : const Color(0xFF10B981),
                      ),
                    ),
                    child: Text(
                      isUsed ? 'USED' : 'READY FOR ENTRANCE',
                      style: TextStyle(
                        color: isUsed ? const Color(0xFF60A5FA) : const Color(0xFF34D399),
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white70, size: 20),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                pass.eventTitle,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              Text(
                pass.tierName,
                style: const TextStyle(color: Color(0xFF60A5FA), fontSize: 13, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 20),
              // QR Canvas
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.3),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: QrImageView(
                  data: pass.qrCode,
                  version: QrVersions.auto,
                  size: 190.0,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                pass.qrCode,
                style: const TextStyle(
                  color: Color(0xFF94A3B8),
                  fontSize: 11,
                  fontFamily: 'monospace',
                  letterSpacing: 1.0,
                ),
              ),
              const SizedBox(height: 6),
              const Text(
                'Present this QR at the venue entrance gate for instant check-in verification.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Color(0xFF64748B), fontSize: 11, height: 1.4),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<SupabaseService>().currentUser;

    if (user == null) {
      return Scaffold(
        backgroundColor: const Color(0xFF050811),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Container(
              padding: const EdgeInsets.all(28),
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.confirmation_number_outlined, size: 48, color: Color(0xFF60A5FA)),
                  const SizedBox(height: 16),
                  const Text('Sign In to View Passes', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  const Text(
                    'Access your reserved event passes, entry QR codes, and seat details.',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                  ),
                  const SizedBox(height: 20),
                  ElevatedButton(
                    onPressed: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const LoginScreen())),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF2563EB),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                    ),
                    child: const Text('Sign In Now', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFF050811),
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const [
            Text('My Tickets', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
            Text('Passes for your upcoming events', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
          ],
        ),
        backgroundColor: const Color(0xFF0B0F19),
        foregroundColor: Colors.white,
        actions: [
          IconButton(icon: const Icon(Icons.refresh, color: Color(0xFF94A3B8)), onPressed: _refresh),
        ],
        elevation: 0,
      ),
      body: FutureBuilder<List<UserTicketModel>>(
        future: _passesFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator(color: Color(0xFF3B82F6)));
          }
          final passes = snapshot.data ?? [];
          if (passes.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.wallet_outlined, size: 56, color: Color(0xFF64748B)),
                    const SizedBox(height: 16),
                    const Text('Your Wallet is Empty', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    const Text(
                      "You haven't reserved any passes yet. Explore upcoming summits to get yours!",
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                    ),
                  ],
                ),
              ),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: passes.length,
            itemBuilder: (context, idx) {
              final pass = passes[idx];
              final isUsed = pass.status == 'CheckedIn';

              return Container(
                margin: const EdgeInsets.only(bottom: 14),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: isUsed
                        ? [const Color(0xFF0F172A), const Color(0xFF1E1B4B).withValues(alpha: 0.3)]
                        : [const Color(0xFF0F172A), const Color(0xFF020617)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isUsed
                        ? const Color(0xFF3B82F6).withValues(alpha: 0.3)
                        : Colors.white.withValues(alpha: 0.08),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.3),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: InkWell(
                  onTap: () => _showQrDialog(pass),
                  borderRadius: BorderRadius.circular(20),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                              decoration: BoxDecoration(
                                color: isUsed ? const Color(0x333B82F6) : const Color(0x3310B981),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: isUsed ? const Color(0xFF3B82F6).withValues(alpha: 0.4) : const Color(0xFF10B981).withValues(alpha: 0.4),
                                ),
                              ),
                              child: Row(
                                children: [
                                  Icon(
                                    isUsed ? Icons.check_circle : Icons.shield_outlined,
                                    size: 12,
                                    color: isUsed ? const Color(0xFF60A5FA) : const Color(0xFF34D399),
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    isUsed ? 'Used' : 'Ready for Entrance',
                                    style: TextStyle(
                                      color: isUsed ? const Color(0xFF60A5FA) : const Color(0xFF34D399),
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              width: 32,
                              height: 32,
                              decoration: BoxDecoration(
                                color: const Color(0xFF2563EB).withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Icon(Icons.qr_code, color: Color(0xFF60A5FA), size: 18),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Text(
                          pass.eventTitle,
                          style: const TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 12),
                        // Ticket Inset Box
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.4),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: Colors.white.withValues(alpha: 0.05)),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('PASS', style: TextStyle(color: Color(0xFF64748B), fontSize: 9, fontWeight: FontWeight.bold)),
                                  Text(pass.tierName, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                                ],
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  const Text('TICKET NO', style: TextStyle(color: Color(0xFF64748B), fontSize: 9, fontWeight: FontWeight.bold)),
                                  Text(
                                    pass.qrCode.length > 14 ? '${pass.qrCode.substring(0, 14)}...' : pass.qrCode,
                                    style: const TextStyle(color: Color(0xFF60A5FA), fontSize: 11, fontFamily: 'monospace'),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Tap to show ticket QR code', style: TextStyle(color: Color(0xFF60A5FA), fontSize: 11, fontWeight: FontWeight.bold)),
                            if (!isUsed)
                              GestureDetector(
                                onTap: () => _showTransferDialog(pass),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF2563EB).withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: const Color(0xFF2563EB).withValues(alpha: 0.4)),
                                  ),
                                  child: const Row(
                                    children: [
                                      Icon(Icons.swap_horiz, color: Color(0xFF60A5FA), size: 13),
                                      SizedBox(width: 4),
                                      Text('Transfer', style: TextStyle(color: Color(0xFF60A5FA), fontSize: 10, fontWeight: FontWeight.bold)),
                                    ],
                                  ),
                                ),
                              )
                            else
                              const Icon(Icons.chevron_right, color: Color(0xFF60A5FA), size: 16),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
