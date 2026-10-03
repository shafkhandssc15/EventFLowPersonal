import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:provider/provider.dart';
import '../services/supabase_service.dart';

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
      final res = await context.read<SupabaseService>().checkIn(clean);
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF030712),
      appBar: AppBar(
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Gate QR Check-In Scanner', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
            Text('Station: Turnstile Gate 1 · Live Supabase Sync', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
          ],
        ),
        backgroundColor: const Color(0xFF0F172A),
        foregroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: Icon(_torchOn ? Icons.flash_on : Icons.flash_off, color: _torchOn ? const Color(0xFFFBBF24) : Colors.white70),
            onPressed: () {
              setState(() => _torchOn = !_torchOn);
              _scannerController.toggleTorch();
            },
          ),
          IconButton(
            icon: const Icon(Icons.flip_camera_android, color: Colors.white70),
            onPressed: () => _scannerController.switchCamera(),
          ),
        ],
      ),
      body: Column(
        children: [
          // Subheader Badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: const Color(0xFF1E1B4B),
            child: const Row(
              children: [
                Icon(Icons.sensors, color: Color(0xFFA78BFA), size: 16),
                SizedBox(width: 8),
                Text('Active Scanner: Ready for Attendee QR Passes', style: TextStyle(color: Color(0xFFDDD6FE), fontSize: 11, fontWeight: FontWeight.bold)),
                Spacer(),
                Text('Real-time', style: TextStyle(color: Color(0xFF34D399), fontSize: 11, fontWeight: FontWeight.w900)),
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
                          Text('Verifying Pass...', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
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
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13, height: 1.35),
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
                        label: const Text('Reset Pass for Demo (Mark Ready for Entry)',
                            style: TextStyle(color: Color(0xFFFDE68A), fontWeight: FontWeight.bold, fontSize: 12)),
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
                  const Text('Manual Pass Code Entry', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12, fontWeight: FontWeight.bold)),
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
                    'Compatible with all QR pass formats: EventFlow Web App passes, Wallet QR badges, and manual booking reference codes.',
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
}
