class StoryHighlightModel {
  final String id;
  final String title;
  final String subtitle;
  final String avatar;
  final String image;
  final String location;
  final String badge;
  final String? eventId;

  StoryHighlightModel({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.avatar,
    required this.image,
    required this.location,
    required this.badge,
    this.eventId,
  });
}
