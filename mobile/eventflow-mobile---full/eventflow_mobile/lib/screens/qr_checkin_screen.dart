import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:provider/provider.dart';
import '../services/supabase_service.dart';
import '../models/user.dart';
import '../models/event.dart';
import 'login_screen.dart';

class QrCheckInScreen extends StatefulWidget {
  const QrCheckInScreen({super.key});

  @override
  State<QrCheckInScreen> createState() => _QrCheckInScreenState();
}

class _QrCheckInScreenState extends State<QrCheckInScreen> {
  final _manualCodeController = TextEditingController();
  final MobileScannerController _scannerController = MobileScannerController();

  bool _processing = false;
  String? _statusMessage;
  bool _isSuccess = false;
  bool _isAlreadyUsed = false;
  String? _lastRegistrationId;
  String? _lastScannedCode;
  DateTime? _lastScanTime;
  bool _torchOn = false;

  @override
  void dispose() {
    _manualCodeController.dispose();
    _scannerController.dispose();
    super.dispose();
  }

  Future<void> _processScan(String code) async {
    final clean = code.trim();
    if (clean.isEmpty || _processing) return;

    // Security Gatekeeper: User MUST be logged in as an Organizer or Admin
    final service = context.read<SupabaseService>();
    final user = service.currentUser;
    if (user == null || (user.role != 'Organizer' && user.role != 'Admin')) {
      setState(() {
        _isSuccess = false;
        _isAlreadyUsed = false;
        _statusMessage = '🔒 Gate Pass scanning not permitted: You must be logged in as an Organizer.';
      });
      return;
    }

    // Debounce duplicate scans of the same code within 3 seconds
    if (_lastScannedCode == clean && _lastScanTime != null) {
      if (DateTime.now().difference(_lastScanTime!).inSeconds < 3) {
        return;
      }
    }

    _lastScannedCode = clean;
    _lastScanTime = DateTime.now();

    setState(() {
      _processing = true;
      _statusMessage = null;
    });

    try {
      final res = await service.checkIn(clean);
      if (mounted) {
        setState(() {
          _isSuccess = res['success'] == true;
          _isAlreadyUsed = res['alreadyUsed'] == true;
          _lastRegistrationId = res['registrationId']?.toString();
          _statusMessage = res['message'] ?? 'Scan processed';
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSuccess = false;
          _isAlreadyUsed = false;
          _lastRegistrationId = null;
          _statusMessage = '❌ Error verifying ticket: $e';
        });
      }
    } finally {
      if (mounted) {
        setState(() => _processing = false);
      }
    }
  }

  void _resetScanner() {
    setState(() {
      _statusMessage = null;
      _lastScannedCode = null;
      _lastScanTime = null;
      _manualCodeController.clear();
    });
  }

  void _showExportAttendeesDialog(BuildContext context) async {
    final service = context.read<SupabaseService>();
    List<EventModel> events = [];
    bool loadingEvents = true;
    EventModel? selectedEvent;
    List<Map<String, dynamic>> attendees = [];
    bool loadingAttendees = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF0F172A),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx2, setSheetState) {
          if (loadingEvents) {
            service.fetchEvents().then((ev) {
              if (ctx2.mounted) setSheetState(() { events = ev; loadingEvents = false; });
            });
          }

          return DraggableScrollableSheet(
            expand: false,
            initialChildSize: 0.75,
            maxChildSize: 0.92,
            builder: (ctx3, scrollCtrl) => Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
                  child: Row(
                    children: [
                      Container(
                        width: 36, height: 36,
                        decoration: BoxDecoration(color: const Color(0xFF10B981).withValues(alpha: 0.15), shape: BoxShape.circle),
                        child: const Icon(Icons.download, color: Color(0xFF34D399), size: 18),
                      ),
                      const SizedBox(width: 12),
                      const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Export Attendee List', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                          Text('Download check-in status for any event', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                if (loadingEvents)
                  const Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator(color: Color(0xFF10B981)))
                else ...[
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 14),
                      decoration: BoxDecoration(
                        color: const Color(0xFF030712),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
                      ),
                      child: DropdownButtonHideUnderline(
                        child: DropdownButton<EventModel>(
                          value: selectedEvent,
                          hint: const Text('Select Event', style: TextStyle(color: Color(0xFF64748B), fontSize: 13)),
                          dropdownColor: const Color(0xFF0F172A),
                          isExpanded: true,
                          style: const TextStyle(color: Colors.white, fontSize: 13),
                          icon: const Icon(Icons.keyboard_arrow_down, color: Color(0xFF60A5FA)),
                          items: events.map((e) => DropdownMenuItem<EventModel>(value: e, child: Text(e.title, overflow: TextOverflow.ellipsis))).toList(),
                          onChanged: (e) async {
                            if (e == null) return;
                            setSheetState(() { selectedEvent = e; loadingAttendees = true; attendees = []; });
                            final list = await service.exportAttendeesForEvent(e.id);
                            if (ctx2.mounted) setSheetState(() { attendees = list; loadingAttendees = false; });
                          },
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  if (loadingAttendees)
                    const Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator(color: Color(0xFF10B981)))
                  else if (selectedEvent != null && attendees.isEmpty)
                    const Padding(
                      padding: EdgeInsets.all(24),
                      child: Text('No attendees found for this event.', style: TextStyle(color: Color(0xFF64748B))),
                    )
                  else if (attendees.isNotEmpty) ...[
                    Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 20),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('${attendees.length} Attendees', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12, fontWeight: FontWeight.bold)),
                          Text(
                            '${attendees.where((a) => a['checkedIn'] == true).length} checked in',
                            style: const TextStyle(color: Color(0xFF34D399), fontSize: 12, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 8),
                    Expanded(
                      child: ListView.builder(
                        controller: scrollCtrl,
                        padding: const EdgeInsets.symmetric(horizontal: 20),
                        itemCount: attendees.length,
                        itemBuilder: (ctx4, i) {
                          final a = attendees[i];
                          final checkedIn = a['checkedIn'] == true;
                          return Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                            decoration: BoxDecoration(
                              color: const Color(0xFF030712),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: checkedIn
                                  ? const Color(0xFF10B981).withValues(alpha: 0.3)
                                  : Colors.white.withValues(alpha: 0.06)),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  width: 32, height: 32,
                                  decoration: BoxDecoration(
                                    color: checkedIn ? const Color(0xFF10B981).withValues(alpha: 0.15) : const Color(0xFF334155),
                                    shape: BoxShape.circle,
                                  ),
                                  child: Icon(
                                    checkedIn ? Icons.check_circle : Icons.radio_button_unchecked,
                                    color: checkedIn ? const Color(0xFF34D399) : const Color(0xFF64748B),
                                    size: 16,
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(a['name']?.toString() ?? 'Unknown', style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w600)),
                                      Text(a['email']?.toString() ?? '', style: const TextStyle(color: Color(0xFF64748B), fontSize: 10)),
                                    ],
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: checkedIn ? const Color(0xFF10B981).withValues(alpha: 0.15) : const Color(0xFF334155).withValues(alpha: 0.5),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: Text(
                                    checkedIn ? 'Checked In' : (a['status']?.toString() ?? 'Registered'),
                                    style: TextStyle(color: checkedIn ? const Color(0xFF34D399) : const Color(0xFF94A3B8), fontSize: 10, fontWeight: FontWeight.bold),
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ],
              ],
            ),
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final service = context.watch<SupabaseService>();
    final user = service.currentUser;
    final isOrganizerOrAdmin = user != null && (user.role == 'Organizer' || user.role == 'Admin');

    // If not logged in as Organizer/Admin, lock scanner and show prompt
    if (!isOrganizerOrAdmin) {
      return _buildAccessDeniedScreen(context, user);
    }

    return Scaffold(
      backgroundColor: const Color(0xFF030712),
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Gate QR Check-In Scanner',
              style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
            ),
            Text(
              'Operator: ${user.name} (${user.role}) · Gate 1',
              style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
            ),
          ],
        ),
        backgroundColor: const Color(0xFF0F172A),
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: Icon(
              _torchOn ? Icons.flash_on : Icons.flash_off,
              color: _torchOn ? const Color(0xFFFBBF24) : Colors.white70,
            ),
            tooltip: 'Toggle Flashlight',
            onPressed: () {
              setState(() => _torchOn = !_torchOn);
              _scannerController.toggleTorch();
            },
          ),
          IconButton(
            icon: const Icon(Icons.flip_camera_android, color: Colors.white70),
            tooltip: 'Flip Camera',
            onPressed: () => _scannerController.switchCamera(),
          ),
          IconButton(
            icon: const Icon(Icons.download, color: Color(0xFF34D399)),
            tooltip: 'Export Attendees',
            onPressed: () => _showExportAttendeesDialog(context),
          ),
          IconButton(
            icon: const Icon(Icons.account_circle, color: Color(0xFF60A5FA)),
            tooltip: 'Account Settings',
            onPressed: () => _showAccountMenu(context, user),
          ),
        ],
      ),
      body: Column(
        children: [
          // Subheader Badge showing verified session
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: const Color(0xFF1E1B4B),
            child: Row(
              children: [
                const Icon(Icons.verified_user, color: Color(0xFF10B981), size: 16),
                const SizedBox(width: 8),
                const Expanded(
                  child: Text(
                    'Verified Organizer Session · Ready for Gate Passes',
                    style: TextStyle(
                      color: Color(0xFFDDD6FE),
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: const Color(0xFF064E3B),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFF10B981), width: 0.8),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.circle, color: Color(0xFF34D399), size: 6),
                      SizedBox(width: 4),
                      Text(
                        'LIVE GATE',
                        style: TextStyle(color: Color(0xFF34D399), fontSize: 10, fontWeight: FontWeight.w900),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          // Camera Viewport
          Expanded(
            flex: 3,
            child: Stack(
              alignment: Alignment.center,
              children: [
                MobileScanner(
                  controller: _scannerController,
                  onDetect: (capture) {
                    final barcodes = capture.barcodes;
                    for (final barcode in barcodes) {
                      if (barcode.rawValue != null) {
                        _processScan(barcode.rawValue!);
                        break;
                      }
                    }
                  },
                ),

                // Target Reticle
                Container(
                  width: 250,
                  height: 250,
                  decoration: BoxDecoration(
                    border: Border.all(
                      color: _isSuccess
                          ? const Color(0xFF10B981)
                          : (_statusMessage != null ? const Color(0xFFEF4444) : const Color(0xFF3B82F6)),
                      width: 3,
                    ),
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: (_isSuccess ? const Color(0xFF10B981) : const Color(0xFF3B82F6)).withValues(alpha: 0.25),
                        blurRadius: 16,
                      ),
                    ],
                  ),
                ),

                // Processing Indicator Overlay
                if (_processing)
                  Container(
                    width: 250,
                    height: 250,
                    decoration: BoxDecoration(
                      color: Colors.black.withValues(alpha: 0.6),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          CircularProgressIndicator(color: Color(0xFF60A5FA), strokeWidth: 3),
                          SizedBox(height: 12),
                          Text(
                            'Verifying Gate Pass...',
                            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),

          // Result Card Banner
          if (_statusMessage != null)
            Container(
              width: double.infinity,
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: _isSuccess
                    ? const Color(0xFF064E3B)
                    : (_isAlreadyUsed ? const Color(0xFF78350F) : const Color(0xFF7F1D1D)),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: _isSuccess
                      ? const Color(0xFF10B981)
                      : (_isAlreadyUsed ? const Color(0xFFF59E0B) : const Color(0xFFEF4444)),
                  width: 1.5,
                ),
              ),
              child: Column(
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(
                        _isSuccess
                            ? Icons.check_circle
                            : (_isAlreadyUsed ? Icons.warning_amber_rounded : Icons.cancel),
                        color: Colors.white,
                        size: 28,
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          _statusMessage!,
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                            fontSize: 13,
                            height: 1.35,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: _resetScanner,
                      icon: const Icon(Icons.qr_code_scanner, size: 16),
                      label: const Text('Scan Next Pass', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white.withValues(alpha: 0.15),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                    ),
                  ),
                  if (_isAlreadyUsed && _lastRegistrationId != null) ...[
                    const SizedBox(height: 8),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        onPressed: () async {
                          final regId = _lastRegistrationId!;
                          final resetRes = await context.read<SupabaseService>().resetCheckIn(regId);
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(resetRes['message'] ?? 'Pass reset!'),
                                backgroundColor: const Color(0xFF10B981),
                              ),
                            );
                            _resetScanner();
                          }
                        },
                        icon: const Icon(Icons.refresh, size: 16, color: Color(0xFFFDE68A)),
                        label: const Text(
                          'Reset Pass for Demo (Mark Ready for Entry)',
                          style: TextStyle(color: Color(0xFFFDE68A), fontWeight: FontWeight.bold, fontSize: 12),
                        ),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Color(0xFFF59E0B)),
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                        ),
                      ),
                    ),
                  ],
                ],
              ),
            ),

          // Manual Code Lookup
          Expanded(
            flex: 2,
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Manual Pass Code Entry',
                    style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _manualCodeController,
                          style: const TextStyle(color: Colors.white, fontSize: 13),
                          decoration: InputDecoration(
                            hintText: 'e.g. EVENTFLOW-LK-EVLK-3109-X1HV-01',
                            hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                            filled: true,
                            fillColor: const Color(0xFF0F172A),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: const BorderSide(color: Color(0xFF1E293B)),
                            ),
                            enabledBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: const BorderSide(color: Color(0xFF1E293B)),
                            ),
                            focusedBorder: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: const BorderSide(color: Color(0xFF3B82F6)),
                            ),
                          ),
                          onSubmitted: _processScan,
                        ),
                      ),
                      const SizedBox(width: 8),
                      ElevatedButton(
                        onPressed: _processing ? null : () => _processScan(_manualCodeController.text),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF2563EB),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: const Text('Verify', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Gate pass scanner is strictly operational under Organizer authorization. Scans sync in realtime to Supabase turnstile records.',
                    style: TextStyle(color: Color(0xFF64748B), fontSize: 11),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Lock screen shown when user is NOT logged in or NOT an Organizer
  Widget _buildAccessDeniedScreen(BuildContext context, AppUser? user) {
    final isNotLoggedIn = user == null;

    return Scaffold(
      backgroundColor: const Color(0xFF030712),
      appBar: AppBar(
        title: const Text(
          'Gate QR Check-In Scanner',
          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
        ),
        backgroundColor: const Color(0xFF0F172A),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Container(
            constraints: const BoxConstraints(maxWidth: 440),
            padding: const EdgeInsets.all(28),
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: const Color(0xFF1E293B)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.5),
                  blurRadius: 24,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Glowing Shield & Lock Graphic
                Center(
                  child: Container(
                    width: 76,
                    height: 76,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: LinearGradient(
                        colors: isNotLoggedIn
                            ? [const Color(0xFFF59E0B), const Color(0xFFD97706)]
                            : [const Color(0xFFEF4444), const Color(0xFFB91C1C)],
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: (isNotLoggedIn ? const Color(0xFFF59E0B) : const Color(0xFFEF4444)).withValues(alpha: 0.35),
                          blurRadius: 20,
                          spreadRadius: 2,
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.shield_outlined,
                      color: Colors.white,
                      size: 40,
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                // Heading
                Text(
                  isNotLoggedIn ? 'Organizer Login Required' : 'Organizer Privileges Required',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.w900,
                    letterSpacing: -0.3,
                  ),
                ),
                const SizedBox(height: 10),

                // Description
                Text(
                  isNotLoggedIn
                      ? 'Gate Pass scanning and turnstile admission are strictly restricted. Without logging in as an Organizer, gate pass scanning is NOT permitted.'
                      : 'You are currently logged in as "${user.name}" with role "${user.role}". Only accounts with verified Organizer privileges can operate the gate scanner.',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Color(0xFF94A3B8),
                    fontSize: 13,
                    height: 1.45,
                  ),
                ),
                const SizedBox(height: 24),

                // Security Policy Info Box
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF030712),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFF1E293B)),
                  ),
                  child: Column(
                    children: [
                      _buildSecurityItem(
                        icon: Icons.lock,
                        title: 'Gate Pass Scanning',
                        status: 'Blocked',
                        statusColor: const Color(0xFFEF4444),
                      ),
                      const Divider(color: Color(0xFF1E293B), height: 16),
                      _buildSecurityItem(
                        icon: Icons.person_outline,
                        title: 'Current Session',
                        status: isNotLoggedIn ? 'Not Logged In' : user.role,
                        statusColor: isNotLoggedIn ? const Color(0xFFF59E0B) : const Color(0xFF60A5FA),
                      ),
                      const Divider(color: Color(0xFF1E293B), height: 16),
                      _buildSecurityItem(
                        icon: Icons.verified_user_outlined,
                        title: 'Required Role',
                        status: 'Organizer / Admin',
                        statusColor: const Color(0xFF10B981),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Primary Action Button: Log In / Switch Account
                ElevatedButton.icon(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const LoginScreen()),
                    );
                  },
                  icon: const Icon(Icons.login, color: Colors.white, size: 18),
                  label: Text(
                    isNotLoggedIn ? 'Log In as Organizer' : 'Switch Account',
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 4,
                  ),
                ),

                if (!isNotLoggedIn) ...[
                  const SizedBox(height: 8),
                  TextButton(
                    onPressed: () => context.read<SupabaseService>().logout(),
                    child: const Text(
                      'Sign Out',
                      style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSecurityItem({
    required IconData icon,
    required String title,
    required String status,
    required Color statusColor,
  }) {
    return Row(
      children: [
        Icon(icon, size: 16, color: const Color(0xFF94A3B8)),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            title,
            style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 12, fontWeight: FontWeight.w500),
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
          decoration: BoxDecoration(
            color: statusColor.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: statusColor.withValues(alpha: 0.3)),
          ),
          child: Text(
            status,
            style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.bold),
          ),
        ),
      ],
    );
  }

  void _showAccountMenu(BuildContext context, AppUser user) {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF0F172A),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                const CircleAvatar(
                  backgroundColor: Color(0xFF2563EB),
                  child: Icon(Icons.person, color: Colors.white),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(user.name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
                      Text('${user.email} · ${user.role}', style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                    ],
                  ),
                ),
              ],
            ),
            const Divider(color: Color(0xFF1E293B), height: 24),
            ListTile(
              leading: const Icon(Icons.swap_horiz, color: Color(0xFF60A5FA)),
              title: const Text('Switch Role / Demo Account', style: TextStyle(color: Colors.white, fontSize: 13)),
              onTap: () {
                Navigator.pop(ctx);
                Navigator.push(context, MaterialPageRoute(builder: (_) => const LoginScreen()));
              },
            ),
            ListTile(
              leading: const Icon(Icons.logout, color: Color(0xFFEF4444)),
              title: const Text('Log Out', style: TextStyle(color: Color(0xFFEF4444), fontSize: 13, fontWeight: FontWeight.bold)),
              onTap: () {
                Navigator.pop(ctx);
                context.read<SupabaseService>().logout();
              },
            ),
          ],
        ),
      ),
    );
  }
}
