import 'package:flutter/material.dart';

/// Reusable Widgets conforming to Flutter best practices

/// 1. Reusable Status Badge
class StatusBadgeWidget extends StatelessWidget {
  final String status;

  const StatusBadgeWidget({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final isCheckedIn = status.toLowerCase() == 'checkedin';
    final isConfirmed = status.toLowerCase() == 'confirmed' || status.toLowerCase() == 'registered';

    final bg = isCheckedIn
        ? const Color(0x3310B981)
        : isConfirmed
            ? const Color(0x333B82F6)
            : const Color(0x33F59E0B);

    final fg = isCheckedIn
        ? const Color(0xFF34D399)
        : isConfirmed
            ? const Color(0xFF60A5FA)
            : const Color(0xFFFBBF24);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: fg.withOpacity(0.4)),
      ),
      child: Text(
        isCheckedIn ? 'Checked In' : isConfirmed ? 'Confirmed' : status,
        style: TextStyle(color: fg, fontSize: 11, fontWeight: FontWeight.bold),
      ),
    );
  }
}

/// 2. Reusable Empty State Widget
class EmptyStateWidget extends StatelessWidget {
  final IconData icon;
  final String title;
  final String description;
  final String? actionLabel;
  final VoidCallback? onAction;

  const EmptyStateWidget({
    super.key,
    required this.icon,
    required this.title,
    required this.description,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFF0F172A),
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0x33FFFFFF)),
              ),
              child: Icon(icon, size: 48, color: const Color(0xFF60A5FA)),
            ),
            const SizedBox(height: 16),
            Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold, color: Colors.white),
            ),
            const SizedBox(height: 8),
            Text(
              description,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 13, color: Color(0xFF94A3B8)),
            ),
            if (actionLabel != null && onAction != null) ...[
              const SizedBox(height: 20),
              ElevatedButton(
                onPressed: onAction,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF2563EB),
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: Text(actionLabel!, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// 3. Reusable Loading Shimmer Skeletons
class LoadingShimmerWidget extends StatelessWidget {
  const LoadingShimmerWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: 4,
      itemBuilder: (_, __) => Container(
        height: 140,
        margin: const EdgeInsets.only(bottom: 16),
        decoration: BoxDecoration(
          color: const Color(0xFF0F172A),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0x1AFFFFFF)),
        ),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(height: 16, width: 180, color: const Color(0xFF1E293B)),
            const SizedBox(height: 12),
            Container(height: 12, width: 240, color: const Color(0xFF1E293B)),
            const Spacer(),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(height: 14, width: 80, color: const Color(0xFF1E293B)),
                Container(height: 28, width: 90, decoration: BoxDecoration(color: const Color(0xFF1E293B), borderRadius: BorderRadius.circular(10))),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// 4. Reusable Form Text Field
class CustomTextFieldWidget extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final IconData prefixIcon;
  final bool obscureText;
  final String? Function(String?)? validator;
  final TextInputType keyboardType;

  const CustomTextFieldWidget({
    super.key,
    required this.controller,
    required this.label,
    required this.prefixIcon,
    this.obscureText = false,
    this.validator,
    this.keyboardType = TextInputType.text,
  });

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      obscureText: obscureText,
      validator: validator,
      keyboardType: keyboardType,
      style: const TextStyle(color: Colors.white, fontSize: 14),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
        prefixIcon: Icon(prefixIcon, color: const Color(0xFF60A5FA), size: 20),
        filled: true,
        fillColor: const Color(0xFF0F172A),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0x33FFFFFF))),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0x1AFFFFFF))),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFF2563EB), width: 1.5)),
      ),
    );
  }
}

/// 5. Reusable Error Banner
class ErrorBannerWidget extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;

  const ErrorBannerWidget({super.key, required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24.0),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: const Color(0x26EF4444),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0x66EF4444)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.error_outline, color: Color(0xFFEF4444), size: 40),
              const SizedBox(height: 12),
              Text(
                message,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Color(0xFFFCA5A5), fontSize: 13),
              ),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh, size: 16),
                label: const Text('Try Again'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFEF4444),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
