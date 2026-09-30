# EventFlow Mobile Flutter App

Production mobile client built with Flutter, Material 3, and Supabase Realtime Database.

## Features
- **Direct Supabase Realtime Integration**: No direct DB passwords exposed in mobile — uses Supabase Auth + PostgREST.
- **Dynamic Ticket QR Generator**: High-density QR code generated for every purchased pass.
- **Hardware Gate Scanner**: Uses `mobile_scanner` to scan attendee QR codes and instantly mark tickets as `CheckedIn` in the Supabase `Registrations` and `CheckIns` tables.
- **Duplicate Entry Blocker**: Prevents passes from being reused once scanned at the gate.

## Getting Started

1. **Install dependencies**:
   ```bash
   flutter pub get
   ```

2. **Run on Android / iOS / Web**:
   ```bash
   flutter run
   ```

## Configuration
Supabase credentials are preconfigured in `lib/main.dart` and `lib/services/supabase_service.dart`:
- URL: `https://fndjylgegtzjxdkkqjql.supabase.co`
- Key: `sb_publishable_e1z-H7yT8G90cUwHcEKvWQ_t5-MpoPg`
