/// Dart model classes mirroring the ASP.NET Core API response DTOs.
/// These are used to deserialize JSON from the EventsController.

class EventModel {
  final String id;
  final String title;
  final String? description;
  final String? category;
  final String? location;
  final String status;
  final int capacity;
  final DateTime startDate;
  final DateTime endDate;
  final List<TicketTypeModel> ticketTypes;

  EventModel({
    required this.id,
    required this.title,
    this.description,
    this.category,
    this.location,
    required this.status,
    required this.capacity,
    required this.startDate,
    required this.endDate,
    this.ticketTypes = const [],
  });

  factory EventModel.fromJson(Map<String, dynamic> json) {
    return EventModel(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      category: json['category'] as String?,
      location: json['location'] as String?,
      status: json['status'] as String,
      capacity: json['capacity'] as int,
      startDate: DateTime.parse(json['startDate'] as String),
      endDate: DateTime.parse(json['endDate'] as String),
      ticketTypes: (json['ticketTypes'] as List<dynamic>?)
              ?.map((t) => TicketTypeModel.fromJson(t as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'description': description,
        'category': category,
        'location': location,
        'status': status,
        'capacity': capacity,
        'startDate': startDate.toIso8601String(),
        'endDate': endDate.toIso8601String(),
      };
}

class TicketTypeModel {
  final String id;
  final String eventId;
  final String name;
  final double price;
  final int quantity;
  final int sold;

  const TicketTypeModel({
    required this.id,
    required this.eventId,
    required this.name,
    required this.price,
    required this.quantity,
    required this.sold,
  });

  factory TicketTypeModel.fromJson(Map<String, dynamic> json) {
    return TicketTypeModel(
      id: json['id'] as String,
      eventId: json['eventId'] as String,
      name: json['name'] as String,
      price: (json['price'] as num).toDouble(),
      quantity: json['quantity'] as int,
      sold: json['sold'] as int,
    );
  }

  bool get isSoldOut => sold >= quantity;
  int get available => quantity - sold;
}
