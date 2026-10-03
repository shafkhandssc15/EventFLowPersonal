class AppUser {
  final String id;
  final String name;
  final String email;
  final String role;

  AppUser({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
  });

  factory AppUser.fromJson(Map<String, dynamic> json) {
    return AppUser(
      id: json['Id'] ?? json['id'] ?? '',
      name: json['Name'] ?? json['name'] ?? '',
      email: json['Email'] ?? json['email'] ?? '',
      role: json['Role'] ?? json['role'] ?? 'Attendee',
    );
  }
}
