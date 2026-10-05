class UserTicketModel {
  final String registrationId;
  final String status;
  final String ticketId;
  final String qrCode;
  final String eventTitle;
  final String eventDate;
  final String location;
  final String tierName;
  final double price;




  UserTicketModel({
    required this.registrationId,
    required this.status,
    required this.ticketId,
    required this.qrCode,
    required this.eventTitle,
    required this.eventDate,
    required this.location,
    required this.tierName,
    required this.price,
  });
}
