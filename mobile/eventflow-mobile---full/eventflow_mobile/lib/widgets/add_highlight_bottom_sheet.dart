import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';
import '../models/event.dart';
import '../models/story_highlight.dart';
import '../services/supabase_service.dart';

class AddHighlightBottomSheet extends StatefulWidget {
  final List<EventModel> events;
  final String? initialEventId;

  const AddHighlightBottomSheet({
    super.key,
    required this.events,
    this.initialEventId,
  });

  @override
  State<AddHighlightBottomSheet> createState() => _AddHighlightBottomSheetState();
}

class _AddHighlightBottomSheetState extends State<AddHighlightBottomSheet> {
  late String _selectedEventId;
  final _headlineController = TextEditingController();
  final _noteController = TextEditingController();
  final _locationController = TextEditingController();
  String _selectedTag = 'Live Now';

  final List<String> _presetBadges = [
    'Live Now',
    'Backstage',
    'Doors Open',
    'VIP Area',
    'Sneak Peek',
    'Stage Prep',
  ];

  final List<Map<String, String>> _presetImages = [
    {'label': 'Concert', 'url': 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1080&q=85'},
    {'label': 'Stage', 'url': 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1080&q=85'},
    {'label': 'Auditorium', 'url': 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1080&q=85'},
    {'label': 'Tech Summit', 'url': 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1080&q=85'},
    {'label': 'Outdoor Arena', 'url': 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1080&q=85'},
  ];

  late String _selectedImageUrl;
  String? _pickedImagePath;
  String _imageSourceLabel = 'Preset Image';

  @override
  void initState() {
    super.initState();
    _selectedEventId = widget.initialEventId ?? (widget.events.isNotEmpty ? widget.events.first.id : '');
    _selectedImageUrl = _presetImages.first['url']!;
    if (widget.events.isNotEmpty) {
      final ev = widget.events.firstWhere((e) => e.id == _selectedEventId, orElse: () => widget.events.first);
      _locationController.text = ev.location;
      _headlineController.text = '${ev.title.split(' ').first} Live Update';
    }
  }

  @override
  void dispose() {
    _headlineController.dispose();
    _noteController.dispose();
    _locationController.dispose();
    super.dispose();
  }

  void _onEventChanged(String id) {
    setState(() {
      _selectedEventId = id;
      final ev = widget.events.firstWhere((e) => e.id == id, orElse: () => widget.events.first);
      _locationController.text = ev.location;
      _headlineController.text = '${ev.title.split(' ').first} Live';
    });
  }

  Future<void> _pickImage(ImageSource source) async {
    try {
      final picker = ImagePicker();
      final picked = await picker.pickImage(
        source: source,
        maxWidth: 1080,
        maxHeight: 1920,
        imageQuality: 85,
      );
      if (picked != null) {
        setState(() {
          _pickedImagePath = picked.path;
          _selectedImageUrl = picked.path;
          _imageSourceLabel = source == ImageSource.camera ? 'Camera Photo' : 'Gallery Upload';
        });
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not access image: $e')),
      );
    }
  }

  bool _publishing = false;

  Future<void> _submit() async {
    final title = _headlineController.text.trim();
    if (title.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter a headline for the highlight')),
      );
      return;
    }

    setState(() => _publishing = true);

    final newHighlight = StoryHighlightModel(
      id: 'story-${DateTime.now().millisecondsSinceEpoch}',
      title: title,
      subtitle: _noteController.text.trim().isNotEmpty
          ? _noteController.text.trim()
          : 'Doors open! Come join the experience.',
      avatar: _selectedImageUrl,
      image: _selectedImageUrl,
      location: _locationController.text.trim().isNotEmpty
          ? _locationController.text.trim()
          : 'Colombo, Sri Lanka',
      badge: _selectedTag,
      eventId: _selectedEventId,
    );

    try {
      await context.read<SupabaseService>().addHighlight(newHighlight);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('🎉 Highlight published! Live in event stories.'),
            backgroundColor: Color(0xFF10B981),
          ),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        setState(() => _publishing = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error adding highlight: $e')),
        );
      }
    }
  }

  ImageProvider _previewImage() {
    if (_pickedImagePath != null) {
      final f = File(_pickedImagePath!);
      if (f.existsSync()) {
        return FileImage(f);
      }
    }
    return NetworkImage(_selectedImageUrl);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      decoration: const BoxDecoration(
        color: Color(0xFF0F172A),
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Bar
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      width: 34,
                      height: 34,
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [Color(0xFFF59E0B), Color(0xFFEC4899), Color(0xFF6366F1)],
                        ),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.auto_awesome, color: Colors.white, size: 18),
                    ),
                    const SizedBox(width: 10),
                    const Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Add Live Story / Highlight', style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.w900)),
                        Text('Add multiple photo updates for this event', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11)),
                      ],
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.close, color: Colors.white70),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Event Picker
            if (widget.events.isNotEmpty) ...[
              const Text('Select Event to Highlight', style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 11, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  color: const Color(0xFF030712),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
                ),
                child: DropdownButtonHideUnderline(
                  child: DropdownButton<String>(
                    value: _selectedEventId,
                    isExpanded: true,
                    dropdownColor: const Color(0xFF0F172A),
                    style: const TextStyle(color: Colors.white, fontSize: 12),
                    items: widget.events.map((e) {
                      return DropdownMenuItem<String>(
                        value: e.id,
                        child: Text(e.title, overflow: TextOverflow.ellipsis),
                      );
                    }).toList(),
                    onChanged: (val) {
                      if (val != null) _onEventChanged(val);
                    },
                  ),
                ),
              ),
              const SizedBox(height: 14),
            ],

            // Photo Selection Options: Camera / Gallery / Presets
            const Text('Story Photo Source', style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 11, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),

            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _pickImage(ImageSource.camera),
                    icon: const Icon(Icons.camera_alt, color: Color(0xFF60A5FA), size: 16),
                    label: const Text('Take Photo', style: TextStyle(color: Color(0xFF60A5FA), fontSize: 11, fontWeight: FontWeight.bold)),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Color(0xFF2563EB)),
                      padding: const EdgeInsets.symmetric(vertical: 11),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      backgroundColor: const Color(0x1A2563EB),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _pickImage(ImageSource.gallery),
                    icon: const Icon(Icons.photo_library, color: Color(0xFFA78BFA), size: 16),
                    label: const Text('From Gallery', style: TextStyle(color: Color(0xFFA78BFA), fontSize: 11, fontWeight: FontWeight.bold)),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: Color(0xFF7C3AED)),
                      padding: const EdgeInsets.symmetric(vertical: 11),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      backgroundColor: const Color(0x1A7C3AED),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),

            // Live Preview Card
            Container(
              height: 110,
              width: double.infinity,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFF3B82F6), width: 1.5),
                image: DecorationImage(
                  image: _previewImage(),
                  fit: BoxFit.cover,
                ),
              ),
              child: Stack(
                children: [
                  Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(14),
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [Colors.black.withValues(alpha: 0.5), Colors.black.withValues(alpha: 0.7)],
                      ),
                    ),
                  ),
                  Positioned(
                    top: 10,
                    left: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFF10B981),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        '✓ Selected: $_imageSourceLabel',
                        style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                  Positioned(
                    bottom: 10,
                    left: 12,
                    right: 12,
                    child: Text(
                      _headlineController.text.isNotEmpty ? _headlineController.text : 'Story preview',
                      style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Presets Bar
            const Text('Or Select Sample Event Photo:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10, fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            SizedBox(
              height: 52,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: _presetImages.length,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (_, i) {
                  final img = _presetImages[i];
                  final isSelected = _selectedImageUrl == img['url'] && _pickedImagePath == null;
                  return GestureDetector(
                    onTap: () {
                      setState(() {
                        _selectedImageUrl = img['url']!;
                        _pickedImagePath = null;
                        _imageSourceLabel = 'Preset: ${img['label']}';
                      });
                    },
                    child: Container(
                      width: 52,
                      height: 52,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: isSelected ? const Color(0xFF3B82F6) : Colors.transparent,
                          width: 2,
                        ),
                        image: DecorationImage(
                          image: NetworkImage(img['url']!),
                          fit: BoxFit.cover,
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
            const SizedBox(height: 14),

            // Headline
            const Text('Headline', style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 11, fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            _buildTextField(
              controller: _headlineController,
              hint: 'e.g. Soundcheck Underway, Doors Open Soon',
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 14),

            // Note (Optional)
            const Text('Note (Optional)', style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 11, fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            _buildTextField(
              controller: _noteController,
              hint: 'e.g. VIP guests head to Gate B for express pass check-in.',
              maxLines: 2,
            ),
            const SizedBox(height: 14),

            // Venue Location
            const Text('Venue Location', style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 11, fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            _buildTextField(
              controller: _locationController,
              hint: 'e.g. BMICH, Colombo',
              prefixIcon: Icons.location_on_outlined,
            ),
            const SizedBox(height: 14),

            // Live Tags
            const Text('Live Tag Badge', style: TextStyle(color: Color(0xFFCBD5E1), fontSize: 11, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: _presetBadges.map((badge) {
                final isSelected = _selectedTag == badge;
                return ChoiceChip(
                  label: Text(badge),
                  selected: isSelected,
                  selectedColor: const Color(0xFF2563EB),
                  backgroundColor: const Color(0xFF030712),
                  labelStyle: TextStyle(
                    color: isSelected ? Colors.white : const Color(0xFF94A3B8),
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                  onSelected: (_) => setState(() => _selectedTag = badge),
                );
              }).toList(),
            ),
            const SizedBox(height: 20),

            // Submit Button
            ElevatedButton(
              onPressed: _publishing ? null : _submit,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF2563EB),
                minimumSize: const Size.fromHeight(48),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: _publishing
                  ? const SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                    )
                  : const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.auto_awesome, color: Colors.white, size: 16),
                        SizedBox(width: 8),
                        Text('Publish Live Story Highlight', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String hint,
    IconData? prefixIcon,
    int maxLines = 1,
    ValueChanged<String>? onChanged,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF030712),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
      ),
      child: TextField(
        controller: controller,
        maxLines: maxLines,
        onChanged: onChanged,
        style: const TextStyle(color: Colors.white, fontSize: 12),
        decoration: InputDecoration(
          hintText: hint,
          hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
          prefixIcon: prefixIcon != null ? Icon(prefixIcon, color: const Color(0xFF64748B), size: 16) : null,
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        ),
      ),
    );
  }
}
