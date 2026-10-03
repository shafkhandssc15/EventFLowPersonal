import 'dart:io';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../services/supabase_service.dart';
import '../models/event.dart';
import '../models/user.dart';
import '../models/story_highlight.dart';
import 'event_detail_screen.dart';
import 'login_screen.dart';
import '../widgets/add_highlight_bottom_sheet.dart';
import '../widgets/story_viewer_modal.dart';

class EventsListScreen extends StatefulWidget {
  const EventsListScreen({super.key});

  @override
  State<EventsListScreen> createState() => _EventsListScreenState();
}

class _EventsListScreenState extends State<EventsListScreen> {
  String _selectedCategory = 'All';
  String _searchQuery = '';
  final Set<String> _likedEvents = {};
  late Future<List<EventModel>> _eventsFuture;

  @override
  void initState() {
    super.initState();
    _load();
  }

  void _load() {
    setState(() {
      _eventsFuture = context.read<SupabaseService>().fetchEvents();
    });
  }

  String _formatDate(String isoString) {
    if (isoString.isEmpty) return 'Upcoming';
    try {
      final dt = DateTime.parse(isoString);
      return DateFormat('MMM d, yyyy').format(dt);
    } catch (_) {
      return isoString;
    }
  }

  LinearGradient _getCategoryGradient(String category) {
    switch (category.toLowerCase()) {
      case 'technology':
        return const LinearGradient(colors: [Color(0xFF2563EB), Color(0xFF06B6D4)]);
      case 'music':
        return const LinearGradient(colors: [Color(0xFFC026D3), Color(0xFFF43F5E)]);
      case 'food':
        return const LinearGradient(colors: [Color(0xFFF59E0B), Color(0xFFDC2626)]);
      case 'sports':
        return const LinearGradient(colors: [Color(0xFF10B981), Color(0xFF0D9488)]);
      case 'art':
        return const LinearGradient(colors: [Color(0xFF7C3AED), Color(0xFFEC4899)]);
      default:
        return const LinearGradient(colors: [Color(0xFF3B82F6), Color(0xFF6366F1)]);
    }
  }

  void _showAccountModal(BuildContext context, AppUser user) {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF0F172A),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(24, 20, 24, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: const Color(0xFF334155),
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                Row(
                  children: [
                    CircleAvatar(
                      radius: 22,
                      backgroundColor: const Color(0xFF2563EB),
                      child: Text(
                        user.name.isNotEmpty ? user.name[0].toUpperCase() : 'U',
                        style: const TextStyle(fontSize: 18, color: Colors.white, fontWeight: FontWeight.bold),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            user.name,
                            style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                          Text(
                            user.email,
                            style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFF2563EB).withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0xFF3B82F6).withValues(alpha: 0.4)),
                      ),
                      child: Text(
                        user.role,
                        style: const TextStyle(color: Color(0xFF60A5FA), fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                const Divider(color: Color(0xFF1E293B)),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  icon: const Icon(Icons.switch_account_outlined, color: Color(0xFF60A5FA), size: 18),
                  label: const Text('Switch Account', style: TextStyle(color: Color(0xFF60A5FA), fontSize: 13, fontWeight: FontWeight.bold)),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Color(0xFF1E293B)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () {
                    Navigator.pop(ctx);
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const LoginScreen()));
                  },
                ),
                const SizedBox(height: 10),
                ElevatedButton.icon(
                  icon: const Icon(Icons.logout, color: Colors.white, size: 18),
                  label: const Text('Sign Out', style: TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFDC2626),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () {
                    Navigator.pop(ctx);
                    context.read<SupabaseService>().logout();
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('👋 Signed out successfully.'),
                        backgroundColor: Color(0xFF334155),
                      ),
                    );
                  },
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  ImageProvider _getHighlightImage(String path) {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return NetworkImage(path);
    }
    final file = File(path);
    if (file.existsSync()) {
      return FileImage(file);
    }
    return NetworkImage(path);
  }

  void _openEventHighlights(EventModel ev, List<StoryHighlightModel> allCustomHighlights) {
    // 1. Gather all custom highlights added by organizers for this particular event
    final eventHighlights = allCustomHighlights.where((h) => h.eventId == ev.id).toList();

    // 2. Base highlight for the event itself
    final baseStory = StoryHighlightModel(
      id: 'base-${ev.id}',
      title: ev.title,
      subtitle: ev.description,
      avatar: ev.imageUrl,
      image: ev.imageUrl,
      location: ev.location,
      badge: ev.category,
      eventId: ev.id,
    );

    // Multi-highlight support: Organizer updates + event overview
    final List<StoryHighlightModel> stories = [
      ...eventHighlights,
      baseStory,
    ];

    showDialog(
      context: context,
      builder: (_) => StoryViewerModal(stories: stories),
    );
  }

  void _openCustomHighlight(StoryHighlightModel ch, List<StoryHighlightModel> allCustomHighlights, List<EventModel> events) {
    final sameEventHighlights = allCustomHighlights.where((h) => h.eventId == ch.eventId).toList();
    if (sameEventHighlights.isEmpty) {
      sameEventHighlights.add(ch);
    }

    final matchedEvent = events.where((e) => e.id == ch.eventId).firstOrNull;
    if (matchedEvent != null && !sameEventHighlights.any((h) => h.id == 'base-${matchedEvent.id}')) {
      sameEventHighlights.add(
        StoryHighlightModel(
          id: 'base-${matchedEvent.id}',
          title: matchedEvent.title,
          subtitle: matchedEvent.description,
          avatar: matchedEvent.imageUrl,
          image: matchedEvent.imageUrl,
          location: matchedEvent.location,
          badge: matchedEvent.category,
          eventId: matchedEvent.id,
        ),
      );
    }

    final index = sameEventHighlights.indexOf(ch);

    showDialog(
      context: context,
      builder: (_) => StoryViewerModal(
        stories: sameEventHighlights,
        initialIndex: index >= 0 ? index : 0,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final service = context.watch<SupabaseService>();
    final user = service.currentUser;
    final categories = ['All', 'Technology', 'Music', 'Food', 'Sports', 'Art'];

    return Scaffold(
      backgroundColor: const Color(0xFF050811),
      body: SafeArea(
        child: Column(
          children: [
            // Top App Bar matching React Web UI
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 10),
              child: Row(
                children: [
                  // Logo with Lightning icon
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF2563EB), Color(0xFF4F46E5)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(10),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF2563EB).withValues(alpha: 0.4),
                          blurRadius: 10,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: const Icon(Icons.bolt, color: Colors.white, size: 20),
                  ),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'EventFlow',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.w900,
                          letterSpacing: -0.5,
                        ),
                      ),
                      Row(
                        children: [
                          Container(
                            width: 6,
                            height: 6,
                            decoration: const BoxDecoration(
                              color: Color(0xFF10B981),
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 4),
                          const Text(
                            'Supabase Live',
                            style: TextStyle(
                              color: Color(0xFF94A3B8),
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  const Spacer(),
                  // User Role or Login button
                  if (user != null)
                    InkWell(
                      onTap: () => _showAccountModal(context, user),
                      borderRadius: BorderRadius.circular(20),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: const Color(0xFF0F172A),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            CircleAvatar(
                              radius: 10,
                              backgroundColor: const Color(0xFF2563EB),
                              child: Text(
                                user.name.isNotEmpty ? user.name[0].toUpperCase() : 'U',
                                style: const TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.bold),
                              ),
                            ),
                            const SizedBox(width: 6),
                            Text(
                              user.role,
                              style: const TextStyle(color: Color(0xFF60A5FA), fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                            const SizedBox(width: 2),
                            const Icon(Icons.keyboard_arrow_down, color: Color(0xFF94A3B8), size: 14),
                          ],
                        ),
                      ),
                    )
                  else
                    InkWell(
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const LoginScreen())),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(colors: [Color(0xFF2563EB), Color(0xFF4F46E5)]),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: const Text('Sign In', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
                      ),
                    ),
                  const SizedBox(width: 6),
                  IconButton(
                    icon: const Icon(Icons.refresh, color: Color(0xFF94A3B8), size: 20),
                    onPressed: _load,
                  ),
                ],
              ),
            ),

            // Search Bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: Container(
                height: 40,
                decoration: BoxDecoration(
                  color: const Color(0xFF0F172A),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
                ),
                child: TextField(
                  style: const TextStyle(color: Colors.white, fontSize: 13),
                  onChanged: (val) => setState(() => _searchQuery = val.trim().toLowerCase()),
                  decoration: const InputDecoration(
                    hintText: 'Search events, venues, topics...',
                    hintStyle: TextStyle(color: Color(0xFF64748B), fontSize: 12),
                    prefixIcon: Icon(Icons.search, color: Color(0xFF64748B), size: 18),
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.symmetric(vertical: 10),
                  ),
                ),
              ),
            ),

            // Main Content Area
            Expanded(
              child: FutureBuilder<List<EventModel>>(
                future: _eventsFuture,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator(color: Color(0xFF3B82F6)));
                  }
                  if (snapshot.hasError) {
                    return Center(
                      child: Text('Error loading events: ${snapshot.error}', style: const TextStyle(color: Colors.redAccent)),
                    );
                  }

                  final allEvents = snapshot.data ?? [];

                  // Filter by category and search query
                  final filteredEvents = allEvents.where((e) {
                    final matchesCategory = _selectedCategory == 'All' || e.category.toLowerCase() == _selectedCategory.toLowerCase();
                    final matchesSearch = _searchQuery.isEmpty ||
                        e.title.toLowerCase().contains(_searchQuery) ||
                        e.location.toLowerCase().contains(_searchQuery) ||
                        e.category.toLowerCase().contains(_searchQuery);
                    return matchesCategory && matchesSearch;
                  }).toList();

                  return RefreshIndicator(
                    onRefresh: () async => _load(),
                    color: const Color(0xFF2563EB),
                    child: ListView(
                      padding: const EdgeInsets.only(bottom: 24),
                      children: [
                        // Stories / Highlights Row
                        if (allEvents.isNotEmpty || service.customHighlights.isNotEmpty) ...[
                          Padding(
                            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: const [
                                    Icon(Icons.auto_awesome, color: Color(0xFF60A5FA), size: 14),
                                    SizedBox(width: 6),
                                    Text(
                                      'Live Highlights & Stories',
                                      style: TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontWeight: FontWeight.bold),
                                    ),
                                  ],
                                ),
                                if (user?.role == 'Organizer' || user?.role == 'Admin')
                                  InkWell(
                                    onTap: () {
                                      showModalBottomSheet(
                                        context: context,
                                        isScrollControlled: true,
                                        backgroundColor: Colors.transparent,
                                        builder: (_) => AddHighlightBottomSheet(events: allEvents),
                                      );
                                    },
                                    borderRadius: BorderRadius.circular(14),
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        gradient: const LinearGradient(colors: [Color(0xFF2563EB), Color(0xFF4F46E5)]),
                                        borderRadius: BorderRadius.circular(14),
                                      ),
                                      child: Row(
                                        children: const [
                                          Icon(Icons.add, color: Colors.white, size: 12),
                                          SizedBox(width: 3),
                                          Text('Add Story', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                                        ],
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                          SizedBox(
                            height: 88,
                            child: ListView(
                              padding: const EdgeInsets.symmetric(horizontal: 16),
                              scrollDirection: Axis.horizontal,
                              children: [
                                // If Organizer: quick "+ Add" avatar
                                if (user?.role == 'Organizer' || user?.role == 'Admin')
                                  Padding(
                                    padding: const EdgeInsets.only(right: 14),
                                    child: GestureDetector(
                                      onTap: () {
                                        showModalBottomSheet(
                                          context: context,
                                          isScrollControlled: true,
                                          backgroundColor: Colors.transparent,
                                          builder: (_) => AddHighlightBottomSheet(events: allEvents),
                                        );
                                      },
                                      child: Column(
                                        children: [
                                          Container(
                                            width: 52,
                                            height: 52,
                                            decoration: BoxDecoration(
                                              shape: BoxShape.circle,
                                              border: Border.all(color: const Color(0xFF3B82F6), width: 1.5, style: BorderStyle.solid),
                                              color: const Color(0xFF0F172A),
                                            ),
                                            child: const Icon(Icons.add, color: Color(0xFF60A5FA), size: 24),
                                          ),
                                          const SizedBox(height: 4),
                                          const SizedBox(
                                            width: 60,
                                            child: Text(
                                              'Your Story',
                                              textAlign: TextAlign.center,
                                              style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10, fontWeight: FontWeight.w600),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),

                                // Custom Organizer Stories
                                ...service.customHighlights.map((ch) {
                                  return Padding(
                                    padding: const EdgeInsets.only(right: 14),
                                    child: GestureDetector(
                                      onTap: () => _openCustomHighlight(ch, service.customHighlights, allEvents),
                                      child: Column(
                                        children: [
                                          Container(
                                            padding: const EdgeInsets.all(2.5),
                                            decoration: const BoxDecoration(
                                              shape: BoxShape.circle,
                                              gradient: LinearGradient(
                                                colors: [Color(0xFFF59E0B), Color(0xFFEC4899), Color(0xFF6366F1)],
                                              ),
                                            ),
                                            child: CircleAvatar(
                                              radius: 26,
                                              backgroundColor: const Color(0xFF0F172A),
                                              backgroundImage: _getHighlightImage(ch.image),
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          SizedBox(
                                            width: 60,
                                            child: Text(
                                              ch.title.split(' ').first,
                                              textAlign: TextAlign.center,
                                              style: const TextStyle(color: Color(0xFFE2E8F0), fontSize: 10, fontWeight: FontWeight.w600),
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  );
                                }),

                                // Event Stories
                                ...allEvents.map((ev) {
                                  final customForEvent = service.customHighlights.where((h) => h.eventId == ev.id).toList();
                                  final hasMultiple = customForEvent.isNotEmpty;
                                  final latestImg = hasMultiple ? customForEvent.first.image : ev.imageUrl;

                                  return Padding(
                                    padding: const EdgeInsets.only(right: 14),
                                    child: GestureDetector(
                                      onTap: () => _openEventHighlights(ev, service.customHighlights),
                                      child: Column(
                                        children: [
                                          Stack(
                                            clipBehavior: Clip.none,
                                            children: [
                                              Container(
                                                padding: const EdgeInsets.all(2.5),
                                                decoration: BoxDecoration(
                                                  shape: BoxShape.circle,
                                                  gradient: hasMultiple
                                                      ? const LinearGradient(colors: [Color(0xFFEC4899), Color(0xFF8B5CF6)])
                                                      : _getCategoryGradient(ev.category),
                                                ),
                                                child: CircleAvatar(
                                                  radius: 26,
                                                  backgroundColor: const Color(0xFF0F172A),
                                                  backgroundImage: _getHighlightImage(latestImg),
                                                ),
                                              ),
                                              if (hasMultiple)
                                                Positioned(
                                                  right: -2,
                                                  bottom: -2,
                                                  child: Container(
                                                    padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                                                    decoration: BoxDecoration(
                                                      color: const Color(0xFFEC4899),
                                                      borderRadius: BorderRadius.circular(10),
                                                      border: Border.all(color: const Color(0xFF0F172A), width: 1.5),
                                                    ),
                                                    child: Text(
                                                      '${customForEvent.length + 1}',
                                                      style: const TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.w900),
                                                    ),
                                                  ),
                                                ),
                                            ],
                                          ),
                                          const SizedBox(height: 4),
                                          SizedBox(
                                            width: 60,
                                            child: Text(
                                              ev.title.split(' ').first,
                                              textAlign: TextAlign.center,
                                              style: const TextStyle(color: Color(0xFFE2E8F0), fontSize: 10, fontWeight: FontWeight.w600),
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  );
                                }),
                              ],
                            ),
                          ),
                        ],

                        // Category Chips
                        Padding(
                          padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                          child: SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            child: Row(
                              children: categories.map((cat) {
                                final isSelected = _selectedCategory == cat;
                                return Padding(
                                  padding: const EdgeInsets.only(right: 8),
                                  child: GestureDetector(
                                    onTap: () => setState(() => _selectedCategory = cat),
                                    child: AnimatedContainer(
                                      duration: const Duration(milliseconds: 200),
                                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
                                      decoration: BoxDecoration(
                                        gradient: isSelected
                                            ? const LinearGradient(colors: [Color(0xFF2563EB), Color(0xFF1D4ED8)])
                                            : null,
                                        color: isSelected ? null : const Color(0xFF0F172A),
                                        borderRadius: BorderRadius.circular(20),
                                        border: Border.all(
                                          color: isSelected
                                              ? const Color(0xFF3B82F6)
                                              : Colors.white.withValues(alpha: 0.08),
                                        ),
                                        boxShadow: isSelected
                                            ? [
                                                BoxShadow(
                                                  color: const Color(0xFF2563EB).withValues(alpha: 0.35),
                                                  blurRadius: 8,
                                                  offset: const Offset(0, 2),
                                                )
                                              ]
                                            : null,
                                      ),
                                      child: Text(
                                        cat,
                                        style: TextStyle(
                                          color: isSelected ? Colors.white : const Color(0xFF94A3B8),
                                          fontSize: 11,
                                          fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                                        ),
                                      ),
                                    ),
                                  ),
                                );
                              }).toList(),
                            ),
                          ),
                        ),

                        // Section Title
                        Padding(
                          padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                _selectedCategory == 'All' ? 'Upcoming Summits' : '$_selectedCategory Summits',
                                style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w900),
                              ),
                              Text(
                                '${filteredEvents.length} events',
                                style: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                              ),
                            ],
                          ),
                        ),

                        // Event Cards
                        if (filteredEvents.isEmpty)
                          const Padding(
                            padding: EdgeInsets.all(40),
                            child: Center(
                              child: Text('No events found matching your criteria', style: TextStyle(color: Color(0xFF64748B))),
                            ),
                          )
                        else
                          ...filteredEvents.map((ev) {
                            final isLiked = _likedEvents.contains(ev.id);
                            final lowestPrice = ev.lowestPrice;

                            return Container(
                              margin: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                              decoration: BoxDecoration(
                                color: const Color(0xFF0F172A),
                                borderRadius: BorderRadius.circular(22),
                                border: Border.all(color: Colors.white.withValues(alpha: 0.08)),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.4),
                                    blurRadius: 16,
                                    offset: const Offset(0, 6),
                                  ),
                                ],
                              ),
                              clipBehavior: Clip.antiAlias,
                              child: InkWell(
                                onTap: () => Navigator.push(
                                  context,
                                  MaterialPageRoute(builder: (_) => EventDetailScreen(event: ev)),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    // Hero Image Banner
                                    Stack(
                                      children: [
                                        Image.network(
                                          ev.imageUrl,
                                          height: 160,
                                          width: double.infinity,
                                          fit: BoxFit.cover,
                                          errorBuilder: (_, __, ___) => Container(
                                            height: 160,
                                            color: const Color(0xFF1E293B),
                                            child: const Icon(Icons.event, color: Colors.white30, size: 48),
                                          ),
                                        ),
                                        // Gradient overlay
                                        Positioned.fill(
                                          child: Container(
                                            decoration: BoxDecoration(
                                              gradient: LinearGradient(
                                                begin: Alignment.topCenter,
                                                end: Alignment.bottomCenter,
                                                colors: [
                                                  Colors.black.withValues(alpha: 0.2),
                                                  Colors.black.withValues(alpha: 0.8),
                                                ],
                                              ),
                                            ),
                                          ),
                                        ),
                                        // Category Badge top-left
                                        Positioned(
                                          top: 12,
                                          left: 12,
                                          child: Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                            decoration: BoxDecoration(
                                              gradient: _getCategoryGradient(ev.category),
                                              borderRadius: BorderRadius.circular(20),
                                              boxShadow: [
                                                BoxShadow(
                                                  color: Colors.black.withValues(alpha: 0.3),
                                                  blurRadius: 6,
                                                ),
                                              ],
                                            ),
                                            child: Text(
                                              ev.category.toUpperCase(),
                                              style: const TextStyle(
                                                color: Colors.white,
                                                fontSize: 10,
                                                fontWeight: FontWeight.bold,
                                                letterSpacing: 0.5,
                                              ),
                                            ),
                                          ),
                                        ),
                                        // Like Heart Button top-right
                                        Positioned(
                                          top: 10,
                                          right: 10,
                                          child: GestureDetector(
                                            onTap: () {
                                              setState(() {
                                                if (isLiked) {
                                                  _likedEvents.remove(ev.id);
                                                } else {
                                                  _likedEvents.add(ev.id);
                                                }
                                              });
                                            },
                                            child: Container(
                                              padding: const EdgeInsets.all(7),
                                              decoration: BoxDecoration(
                                                color: Colors.black.withValues(alpha: 0.5),
                                                shape: BoxShape.circle,
                                              ),
                                              child: Icon(
                                                isLiked ? Icons.favorite : Icons.favorite_border,
                                                color: isLiked ? const Color(0xFFEF4444) : Colors.white,
                                                size: 16,
                                              ),
                                            ),
                                          ),
                                        ),
                                        // Date & Price Pills bottom
                                        Positioned(
                                          bottom: 10,
                                          left: 12,
                                          right: 12,
                                          child: Row(
                                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                            children: [
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                                decoration: BoxDecoration(
                                                  color: Colors.black.withValues(alpha: 0.7),
                                                  borderRadius: BorderRadius.circular(6),
                                                  border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
                                                ),
                                                child: Row(
                                                  children: [
                                                    const Icon(Icons.calendar_today_outlined, size: 10, color: Color(0xFF94A3B8)),
                                                    const SizedBox(width: 4),
                                                    Text(
                                                      _formatDate(ev.startDate),
                                                      style: const TextStyle(color: Color(0xFFCBD5E1), fontSize: 10, fontWeight: FontWeight.bold),
                                                    ),
                                                  ],
                                                ),
                                              ),
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                                decoration: BoxDecoration(
                                                  color: const Color(0xFF064E3B).withValues(alpha: 0.85),
                                                  borderRadius: BorderRadius.circular(6),
                                                  border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.5)),
                                                ),
                                                child: Text(
                                                  lowestPrice > 0 ? 'Rs. ${lowestPrice.toStringAsFixed(0)}' : 'Free Entry',
                                                  style: const TextStyle(color: Color(0xFF34D399), fontSize: 10, fontWeight: FontWeight.bold),
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),

                                    // Content Section
                                    Padding(
                                      padding: const EdgeInsets.all(14),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            ev.title,
                                            style: const TextStyle(
                                              color: Colors.white,
                                              fontSize: 15,
                                              fontWeight: FontWeight.bold,
                                              letterSpacing: -0.3,
                                            ),
                                          ),
                                          const SizedBox(height: 6),
                                          Text(
                                            ev.description,
                                            maxLines: 2,
                                            overflow: TextOverflow.ellipsis,
                                            style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11, height: 1.4),
                                          ),
                                          const SizedBox(height: 12),
                                          Container(
                                            padding: const EdgeInsets.only(top: 10),
                                            decoration: BoxDecoration(
                                              border: Border(top: BorderSide(color: Colors.white.withValues(alpha: 0.06))),
                                            ),
                                            child: Row(
                                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                              children: [
                                                Expanded(
                                                  child: Row(
                                                    children: [
                                                      const Icon(Icons.location_on, color: Color(0xFFFB7185), size: 14),
                                                      const SizedBox(width: 4),
                                                      Expanded(
                                                        child: Text(
                                                          ev.location,
                                                          style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                                                          overflow: TextOverflow.ellipsis,
                                                        ),
                                                      ),
                                                    ],
                                                  ),
                                                ),
                                                Row(
                                                  children: const [
                                                    Text(
                                                      'Get Ticket',
                                                      style: TextStyle(
                                                        color: Color(0xFF60A5FA),
                                                        fontSize: 11,
                                                        fontWeight: FontWeight.bold,
                                                      ),
                                                    ),
                                                    SizedBox(width: 2),
                                                    Icon(Icons.chevron_right, color: Color(0xFF60A5FA), size: 14),
                                                  ],
                                                ),
                                              ],
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          }),
                      ],
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
