# 🚌 College Bus Live Tracker (PWA)

A modern, real-time, mobile-first College Bus Tracking Progressive Web App (PWA) engineered for **Delhi Technical Campus (DTC), Greater Noida** and 20–30 daily college commuters.

The application allows students to track their college bus moving **LIVE** on an interactive road map, check real-time GPS locations, view upcoming stops, calculate dynamic ETAs, and monitor active passenger attendance ("I'm Waiting at This Stop", "I'm Boarding This Bus").

---

## 📱 Quick Mobile Access (Local Wi-Fi Network)

When running on your computer, any mobile phone connected to the same Wi-Fi network or hotspot can open and install the app immediately:

- **Local Host:** `http://localhost:5173` (Vite) or `http://localhost:4000` (Server)
- **Phone Network URL:** `http://192.168.31.74:5173`
- **Instant Phone Sync:** Click the **Phone Sync** (QR Code) button in the bottom navigation bar and point your phone camera to scan!

---

## 🌟 Key Features

### 1. 🗺️ Interactive Live Map (Google Maps / Uber Style)
- High-contrast, clean navigation tiles (CartoDB Voyager) showing clear road networks.
- Full road geometry for **Route 01: Saket, Delhi → Delhi Technical Campus, Greater Noida** (39.9+ km, 784 high-precision road coordinates along Noida Expressway).
- Animated 3D bus marker with real-time bearing/heading rotation pointing in the exact travel direction.
- Subtle radar pulse wave around the bus indicating live signal transmission.
- Numbered stoppage pins with scheduled arrival times, pickup tags, and college destination badge.
- Floating controls: "Recenter on Bus" and "Fit Entire Route".

### 2. ⚡ Dynamic ETA & Stoppage Management
- Live ETAs calculated dynamically using current GPS position, road distance, and travel speed.
- Clear distinction between **Scheduled Time** and **Live Estimated Arrival Time**.
- Sequenced stoppage timeline with passed stops (checked), active stop, and upcoming stops.
- **Admin Stoppage System:** Administrators can add, remove, rename, and reorder stoppages directly from the UI without modifying application code.
- Interactive map coordinate picker: tap/click anywhere on the map to set stoppage latitude and longitude.

### 3. 👥 Live Passenger Activity (Viewers vs Confirmed Boardings)
- Distinct counters to ensure app activity is never falsely presented as confirmed bus occupancy:
  - 🟢 **Active Trackers:** Number of students currently viewing/tracking live in app.
  - 🟡 **Waiting at Stops:** Students waiting at specific stoppages.
  - 🔵 **Confirmed Boarded:** Students who checked in as "I'm Boarding This Bus".
- Quick action toggles with instant 1-tap cancel options.

### 4. 🕹️ Driver Cockpit
- Minimalist, high-contrast dashboard with big tactile buttons designed for one-handed mobile use.
- Massive **START TRIP** / **END TRIP** buttons.
- **Screen WakeLock API:** Prevents phone screen from dimming/sleeping while driving.
- **Dual GPS Modes:**
  - 📡 **Real Device GPS:** Streams live mobile GPS via `navigator.geolocation.watchPosition` with high accuracy.
  - 🚗 **Route Simulator:** Automatically drives along the road network from Saket to DTC with adjustable speed multipliers (1x, 2x, 5x) for testing without driving 40 km!
- Quick traffic delay broadcast button (+5, +10, +15 mins) that notifies students immediately.

### 5. 🛡️ Administrator Panel
- Reorder stoppages with 1-click Move Up / Move Down buttons.
- Add and rename placeholder stops to verified stoppage names.
- Live Fleet overview & master fleet map.
- View registered student accounts and real-time boarding attendance.
- Broadcast custom emergency announcements / traffic notifications.

### 6. 📲 Progressive Web App (PWA) Support
- Fully installable from Chrome on Android via "Install App" / "Add to Home Screen".
- Full iOS Safari standalone support with custom apple-touch icons and status bar styling.
- Works offline with service worker caching.

---

## 🔑 Default Credentials

| Role | Access | Default PIN / Password |
|---|---|---|
| **Student** | Open / Tap Profile | None required (pre-enrolled with sample students) |
| **Driver** | Driver Cockpit | PIN: `1234` (Rajesh Kumar - Bus 01) |
| **Administrator** | Admin Route & Fleet Console | PIN: `admin123` |

*(A 1-click "Quick Login Demo" button is also provided on the login popup for instant testing!)*

---

## 🚀 Running Locally

### Prerequisites
- Node.js v18+ (tested on Node v22.21.0)
- npm v9+

### 1-Command Startup
From the project root directory:

```bash
# Start both Backend Server & Vite Client concurrently
npm run dev
```

The terminal will display:
```
📡 Local Host:    http://localhost:4000
📱 Phone Network: http://192.168.31.74:4000
⚡ Vite Dev Client: http://192.168.31.74:5173
```
Scan the terminal QR code from your phone camera or visit `http://192.168.31.74:5173`.

### Production Build & Standalone Run
```bash
# Build the client PWA
npm run build

# Start production server (serves both API & built client PWA on port 4000)
npm run start
```

---

## 🗄️ Database Architecture & Supabase Integration

The project includes dual database support:

1. **Embedded Local Database (`server/data/db.json`):**
   - Zero-configuration, zero-dependency embedded database with atomic writes.
   - Pre-seeded with Route 01, Bus 01, Driver Rajesh, sample students, and OSRM road geometry.
   - All admin edits (new stops, renamed stops, reordered stops) persist automatically.

2. **Supabase PostgreSQL Cloud Schema (`supabase/schema.sql`):**
   - Full PostgreSQL DDL schema with Row Level Security (RLS) policies.
   - Real-time publications enabled for `buses`, `trips`, `student_activity`, and `notifications`.
   - To use Supabase:
     1. Create a project at [supabase.com](https://supabase.com).
     2. Open the **SQL Editor** in Supabase and paste the contents of `supabase/schema.sql`.
     3. Add your `SUPABASE_URL` and `SUPABASE_ANON_KEY` to `.env`.

---

## 📂 Project Structure

```
bustracker/
├── client/                      # Vite + React + TypeScript + Tailwind PWA
│   ├── public/                  # PWA icons and web manifest
│   ├── src/
│   │   ├── components/
│   │   │   ├── Admin/           # Admin Dashboard (stops manager, fleet, broadcast)
│   │   │   ├── Driver/          # Driver Cockpit (big buttons, WakeLock, telemetry)
│   │   │   ├── Map/             # Leaflet map, custom 3D bus marker, road polyline
│   │   │   ├── Modals/          # QR code, PWA install guide, notifications, auth
│   │   │   ├── Student/         # Student Dashboard, passenger activity, stop timeline
│   │   │   └── Navbar.tsx       # Bottom mobile navigation
│   │   ├── services/            # REST API client & Socket.IO realtime connection
│   │   ├── types.ts             # TypeScript interfaces
│   │   ├── App.tsx              # Root application component
│   │   └── main.tsx             # Entry point
│   ├── vite.config.ts           # Vite + PWA plugin + local proxy
│   └── package.json
│
├── server/                      # Node.js + Express + Socket.IO Backend
│   ├── src/
│   │   ├── index.js             # Express server, REST endpoints, Socket.IO handlers
│   │   ├── db.js                # Embedded database with atomic persistence
│   │   ├── osrm.js              # OSRM road routing integration
│   │   └── seedData.js          # Route 01 seed data and placeholder stops
│   └── package.json
│
├── supabase/
│   └── schema.sql               # Complete Supabase PostgreSQL schema with RLS & Realtime
├── .env.example                 # Environment configuration template
├── package.json                 # Root orchestrator
└── README.md                    # Project documentation
```
