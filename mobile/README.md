# event_management_mobile

A new Flutter project.

## Authentication

The app requires signing in against the ASP.NET Core backend's JWT auth
endpoints (`/api/auth/login`, `/api/auth/register`) before showing the main
Explore / My Passes / Gate Scanner shell. New accounts created from the app
are always `Attendee` role.

The Gate Scanner tab calls `POST /api/checkin`, which the backend restricts
to `Organizer`, `VendorVenueManager`, or `Admin` roles — an `Attendee`
account sees a "doesn't have check-in permission" message on that tab
instead of the scanner.

For manual testing (no physical device needed to seed data), the backend
ships these demo accounts, all with password `Demo@12345`:

| Email | Role |
| --- | --- |
| `attendee@demo.com` | Attendee |
| `organizer@demo.com` | Organizer |
| `vendor@demo.com` | VendorVenueManager |
| `admin@demo.com` | Admin |

## Getting Started

This project is a starting point for a Flutter application.

A few resources to get you started if this is your first Flutter project:

- [Learn Flutter](https://docs.flutter.dev/get-started/learn-flutter)
- [Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Flutter learning resources](https://docs.flutter.dev/reference/learning-resources)

For help getting started with Flutter development, view the
[online documentation](https://docs.flutter.dev/), which offers tutorials,
samples, guidance on mobile development, and a full API reference.
