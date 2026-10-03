class EventModel {
  final String id;
  final String title;
  final String description;
  final String category;
  final String startDate;
  final String endDate;
  final String location;
  final int capacity;
  final List<TicketTypeModel> ticketTypes;

  final String status;
  final String? organizerId;
  final String? customImageUrl;

  EventModel({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.startDate,
    required this.endDate,
    required this.location,
    required this.capacity,
    required this.ticketTypes,
    this.status = 'Published',
    this.organizerId,
    this.customImageUrl,
  });

  factory EventModel.fromJson(Map<String, dynamic> json, List<TicketTypeModel> types) {
    return EventModel(
      id: json['Id'] ?? '',
      title: json['Title'] ?? 'Untitled Event',
      description: json['Description'] ?? '',
      category: json['Category'] ?? 'General',
      startDate: json['StartDate'] ?? '',
      endDate: json['EndDate'] ?? '',
      location: json['Location'] ?? 'Colombo, Sri Lanka',
      capacity: (json['Capacity'] as num?)?.toInt() ?? 100,
      status: json['Status'] ?? 'Published',
      organizerId: json['OrganizerId'],
      customImageUrl: json['ImageUrl'],
      ticketTypes: types,
    );
  }

  double get lowestPrice {
    if (ticketTypes.isEmpty) return 0.0;
    return ticketTypes.map((t) => t.price).reduce((a, b) => a < b ? a : b);
  }

  int get totalSold {
    if (ticketTypes.isEmpty) return 0;
    return ticketTypes.map((t) => t.sold).reduce((a, b) => a + b);
  }

  String get imageUrl {
    if (customImageUrl != null && customImageUrl!.isNotEmpty) {
      return customImageUrl!;
    }
    switch (id) {
      case '33333333-0000-0000-0000-000000000001':
        return 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=85';
      case '33333333-0000-0000-0000-000000000002':
        return 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=85';
      case '33333333-0000-0000-0000-000000000003':
        return 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=85';
      case '33333333-0000-0000-0000-000000000004':
        return 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=85';
      case '33333333-0000-0000-0000-000000000005':
        return 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=85';
      case '33333333-0000-0000-0000-000000000006':
        return 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=85';
      default:
        final cat = category.toLowerCase();
        if (cat == 'technology') {
          return 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=85';
        } else if (cat == 'music') {
          return 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=85';
        } else if (cat == 'food') {
          return 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=85';
        } else if (cat == 'sports') {
          return 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=85';
        } else if (cat == 'art') {
          return 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=85';
        }
        return 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1200&q=85';
    }
  }
}

class TicketTypeModel {
  final String id;
  final String name;
  final double price;
  final int quantity;
  final int sold;

  TicketTypeModel({
    required this.id,
    required this.name,
    required this.price,
    required this.quantity,
    required this.sold,
  });

  factory TicketTypeModel.fromJson(Map<String, dynamic> json) {
    return TicketTypeModel(
      id: json['Id'] ?? '',
      name: json['Name'] ?? 'Pass',
      price: (json['Price'] as num?)?.toDouble() ?? 0.0,
      quantity: (json['Quantity'] as num?)?.toInt() ?? 0,
      sold: (json['Sold'] as num?)?.toInt() ?? 0,
    );
  }
}
