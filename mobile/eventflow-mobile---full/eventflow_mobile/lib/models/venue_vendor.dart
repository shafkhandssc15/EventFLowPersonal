class VenueModel {
  final String id;
  final String name;
  final String location;
  final int capacity;
  final double pricePerHour;
  final List<String> amenities;

  VenueModel({
    required this.id,
    required this.name,
    required this.location,
    required this.capacity,
    required this.pricePerHour,
    required this.amenities,
  });

  factory VenueModel.fromJson(Map<String, dynamic> json) {
    return VenueModel(
      id: json['Id']?.toString() ?? '',
      name: json['Name'] ?? 'Venue Space',
      location: json['Location'] ?? 'Colombo, Sri Lanka',
      capacity: (json['Capacity'] as num?)?.toInt() ?? 500,
      pricePerHour: (json['PricePerHour'] as num?)?.toDouble() ?? 45000.0,
      amenities: json['Amenities'] is List
          ? List<String>.from(json['Amenities'])
          : ['Air Conditioning', 'WiFi', 'Parking'],
    );
  }
}

class VendorModel {
  final String id;
  final String name;
  final String category;
  final double price;
  final String phone;

  VendorModel({
    required this.id,
    required this.name,
    required this.category,
    required this.price,
    required this.phone,
  });

  factory VendorModel.fromJson(Map<String, dynamic> json) {
    return VendorModel(
      id: json['Id']?.toString() ?? '',
      name: json['Name'] ?? 'Event Vendor',
      category: json['Category'] ?? 'Audio/Visual & Lighting',
      price: (json['Price'] as num?)?.toDouble() ?? 150000.0,
      phone: json['Phone'] ?? '077 123 4567',
    );
  }
}
