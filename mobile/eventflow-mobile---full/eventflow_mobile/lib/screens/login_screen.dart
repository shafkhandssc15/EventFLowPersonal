import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/supabase_service.dart';

class LoginScreen extends StatefulWidget {
  final bool initialIsSignUp;
  const LoginScreen({super.key, this.initialIsSignUp = false});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  late bool _isSignUp;
  bool _obscurePassword = true;
  bool _loading = false;
  String? _error;

  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _phoneController = TextEditingController();
  final _nicController = TextEditingController();

  String _selectedRole = 'Attendee';

  final List<Map<String, String>> _roleOptions = [
    {'value': 'Attendee', 'label': 'Attendee (Browse & Buy Tickets)'},
    {'value': 'Organizer', 'label': 'Organizer (Host & Scan Passes)'},
    {'value': 'Admin', 'label': 'Admin (System Administration)'},
    {'value': 'VendorVenueManager', 'label': 'Venue & Vendor Partner (Spaces & Services)'},
  ];

  @override
  void initState() {
    super.initState();
    _isSignUp = widget.initialIsSignUp;
  }

  Future<void> _handleSubmit() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();

    if (email.isEmpty || !email.contains('@')) {
      setState(() => _error = 'Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setState(() => _error = 'Password must be at least 6 characters.');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final service = context.read<SupabaseService>();
      if (_isSignUp) {
        final name = _nameController.text.trim();
        if (name.isEmpty) {
          setState(() {
            _error = 'Please enter your full name.';
            _loading = false;
          });
          return;
        }

        await service.signUp(
          name: name,
          email: email,
          password: password,
          role: _selectedRole,
        );

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('🎉 Account created as $_selectedRole! Welcome.'),
              backgroundColor: const Color(0xFF10B981),
            ),
          );
          Navigator.pop(context);
        }
      } else {
        final success = await service.login(email, password);
        if (success && mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('👋 Welcome back! Signed in successfully.'),
              backgroundColor: Color(0xFF10B981),
            ),
          );
          Navigator.pop(context);
        } else if (mounted) {
          setState(() => _error = 'Invalid email or password.');
        }
      }
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }


  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF050811),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close, color: Colors.white70),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
          child: Container(
            constraints: const BoxConstraints(maxWidth: 420),
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              borderRadius: BorderRadius.circular(28),
              border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.5),
                  blurRadius: 24,
                  offset: const Offset(0, 10),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Header matching LoginModal
                Row(
                  children: [
                    Container(
                      width: 38,
                      height: 38,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFF2563EB), Color(0xFF4F46E5)],
                        ),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      alignment: Alignment.center,
                      child: const Text('EF', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 13)),
                    ),
                    const SizedBox(width: 12),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _isSignUp ? 'Create Account' : 'Sign In',
                          style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.w900),
                        ),
                        const Text(
                          'EventFlow Mobile Access',
                          style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 20),

                // Error Banner
                if (_error != null)
                  Container(
                    padding: const EdgeInsets.all(12),
                    margin: const EdgeInsets.only(bottom: 16),
                    decoration: BoxDecoration(
                      color: const Color(0x33EF4444),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFEF4444)),
                    ),
                    child: Text(_error!, style: const TextStyle(color: Color(0xFFFCA5A5), fontSize: 12)),
                  ),

                // Form Fields
                if (_isSignUp) ...[
                  const Text('Full Name', style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 11, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  _buildInputField(
                    controller: _nameController,
                    hint: 'e.g. Kasun Fernando',
                    icon: Icons.person_outline,
                  ),
                  const SizedBox(height: 14),
                ],

                const Text('Email Address', style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 11, fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                _buildInputField(
                  controller: _emailController,
                  hint: 'name@example.com',
                  icon: Icons.mail_outline,
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 14),

                const Text('Password', style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 11, fontWeight: FontWeight.bold)),
                const SizedBox(height: 6),
                _buildInputField(
                  controller: _passwordController,
                  hint: '••••••••',
                  icon: Icons.lock_outline,
                  obscureText: _obscurePassword,
                  suffixIcon: IconButton(
                    icon: Icon(
                      _obscurePassword ? Icons.visibility_off : Icons.visibility,
                      color: const Color(0xFF64748B),
                      size: 18,
                    ),
                    onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                  ),
                ),
                const SizedBox(height: 14),

                if (_isSignUp) ...[
                  const Text('Account Role', style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 11, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    decoration: BoxDecoration(
                      color: const Color(0xFF030712),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
                    ),
                    child: DropdownButtonHideUnderline(
                      child: DropdownButton<String>(
                        value: _selectedRole,
                        dropdownColor: const Color(0xFF0F172A),
                        isExpanded: true,
                        style: const TextStyle(color: Colors.white, fontSize: 12),
                        items: _roleOptions.map((opt) {
                          return DropdownMenuItem<String>(
                            value: opt['value'],
                            child: Text(opt['label']!),
                          );
                        }).toList(),
                        onChanged: (val) {
                          if (val != null) setState(() => _selectedRole = val);
                        },
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),

                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Phone', style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 11, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 6),
                            _buildInputField(
                              controller: _phoneController,
                              hint: '077 123 4567',
                              icon: Icons.phone_outlined,
                              keyboardType: TextInputType.phone,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('NIC / ID', style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 11, fontWeight: FontWeight.bold)),
                            const SizedBox(height: 6),
                            _buildInputField(
                              controller: _nicController,
                              hint: 'NIC / Passport',
                              icon: Icons.badge_outlined,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                ],

                const SizedBox(height: 8),

                // Submit Button
                ElevatedButton(
                  onPressed: _loading ? null : _handleSubmit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                    elevation: 4,
                  ),
                  child: _loading
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              _isSignUp ? 'Create My Account' : 'Sign In',
                              style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(width: 8),
                            const Icon(Icons.arrow_forward, color: Colors.white, size: 16),
                          ],
                        ),
                ),

                const SizedBox(height: 16),

                // Toggle Sign In / Sign Up
                Center(
                  child: TextButton(
                    onPressed: () => setState(() {
                      _isSignUp = !_isSignUp;
                      _error = null;
                    }),
                    child: Text(
                      _isSignUp ? 'Already registered? Sign In' : "Don't have an account? Create Account",
                      style: const TextStyle(color: Color(0xFF60A5FA), fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),

                const SizedBox(height: 16),
                const Divider(color: Color(0xFF1E293B)),
                const SizedBox(height: 12),
                const Text(
                  'QUICK DEMO ROLES (1-TAP ACCESS)',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Color(0xFF64748B), fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 0.5),
                ),
                const SizedBox(height: 10),

                // Demo role buttons
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  alignment: WrapAlignment.center,
                  children: [
                    ActionChip(
                      avatar: const Icon(Icons.analytics, color: Color(0xFF8B5CF6), size: 14),
                      label: const Text('Organizer', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                      backgroundColor: const Color(0xFF8B5CF6).withValues(alpha: 0.2),
                      side: const BorderSide(color: Color(0xFF8B5CF6)),
                      onPressed: () {
                        context.read<SupabaseService>().switchDemoRole('Organizer');
                        Navigator.pop(context);
                      },
                    ),
                    ActionChip(
                      avatar: const Icon(Icons.admin_panel_settings, color: Color(0xFFEC4899), size: 14),
                      label: const Text('Admin', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                      backgroundColor: const Color(0xFFEC4899).withValues(alpha: 0.2),
                      side: const BorderSide(color: Color(0xFFEC4899)),
                      onPressed: () {
                        context.read<SupabaseService>().switchDemoRole('Admin');
                        Navigator.pop(context);
                      },
                    ),
                    ActionChip(
                      avatar: const Icon(Icons.confirmation_number, color: Color(0xFF60A5FA), size: 14),
                      label: const Text('Attendee', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                      backgroundColor: const Color(0xFF2563EB).withValues(alpha: 0.2),
                      side: const BorderSide(color: Color(0xFF2563EB)),
                      onPressed: () {
                        context.read<SupabaseService>().switchDemoRole('Attendee');
                        Navigator.pop(context);
                      },
                    ),
                    ActionChip(
                      avatar: const Icon(Icons.location_city, color: Color(0xFF10B981), size: 14),
                      label: const Text('Vendor', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                      backgroundColor: const Color(0xFF10B981).withValues(alpha: 0.2),
                      side: const BorderSide(color: Color(0xFF10B981)),
                      onPressed: () {
                        context.read<SupabaseService>().switchDemoRole('VendorVenueManager');
                        Navigator.pop(context);
                      },
                    ),
                  ],
                ),

              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildInputField({
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    bool obscureText = false,
    Widget? suffixIcon,
    TextInputType? keyboardType,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF030712),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
      ),
      child: TextField(
        controller: controller,
        obscureText: obscureText,
        keyboardType: keyboardType,
        style: const TextStyle(color: Colors.white, fontSize: 12),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
          prefixIcon: Icon(icon, color: const Color(0xFF64748B), size: 16),
          suffixIcon: suffixIcon,
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
        ),
      ),
    );
  }
}
