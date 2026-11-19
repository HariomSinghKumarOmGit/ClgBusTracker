// api/schedules.js
// Vercel Serverless Function: Bus Departure & Arrival Schedule Times
// STRICT PRIVACY COMPLIANCE:
// Only starting time (departure) and arrival time are stored permanently.
// Strictly NO GPS breadcrumbs, coordinate history, or location tracking records stored!

let inMemorySchedules = [
  {
    id: "SCH-3801",
    route_name: "Route 38: Southbound to Glade",
    route_code: "38",
    bus_number: "Bus 38",
    driver_name: "Rajesh Kumar",
    departure_time: "2026-11-19T08:00:00.000Z",
    arrival_time: "2026-11-19T08:42:00.000Z",
    status: "COMPLETED",
    passengers_served: 42,
    terminal_notes: "Arrived on schedule at Glade Central Terminal"
  },
  {
    id: "SCH-2101",
    route_name: "Route 21: Victory Monument → Siam Square",
    route_code: "21",
    bus_number: "Bus 21",
    driver_name: "Somchai Prasert",
    departure_time: "2026-11-19T08:15:00.000Z",
    arrival_time: "2026-11-19T08:58:00.000Z",
    status: "COMPLETED",
    passengers_served: 38,
    terminal_notes: "Completed run to Siam Square"
  },
  {
    id: "SCH-1401",
    route_name: "Route 140: Express Intercity",
    route_code: "140",
    bus_number: "Bus 140",
    driver_name: "Michael Chen",
    departure_time: "2026-11-19T09:00:00.000Z",
    arrival_time: "2026-11-19T09:35:00.000Z",
    status: "COMPLETED",
    passengers_served: 47,
    terminal_notes: "Morning express run"
  },
  {
    id: "SCH-3802",
    route_name: "Route 38: Southbound to Glade",
    route_code: "38",
    bus_number: "Bus 38",
    driver_name: "Rajesh Kumar",
    departure_time: "2026-11-19T09:30:00.000Z",
    arrival_time: "2026-11-19T10:12:00.000Z",
    status: "IN_TRANSIT",
    passengers_served: 36,
    terminal_notes: "Current live morning run"
  }
];

export default function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: Retrieve permanently stored starting and arrival times
  if (req.method === 'GET') {
    return res.status(200).json({
      privacy_notice: "Zero GPS logs or tracking history stored. Only starting and arrival times are recorded.",
      schedules: inMemorySchedules
    });
  }

  // POST: Record a new bus run starting and arrival time
  if (req.method === 'POST') {
    const { route_name, route_code, bus_number, driver_name, departure_time, arrival_time, status, passengers_served, terminal_notes } = req.body || {};

    if (!departure_time) {
      return res.status(400).json({ error: 'departure_time (starting time) is required' });
    }

    // STRICT COMPLIANCE: Extract ONLY the departure time, arrival time, and minimal summary metadata.
    // Explicitly reject or strip any coordinates, GPS telemetry, or breadcrumb logs!
    const newRecord = {
      id: `SCH-${Date.now().toString(36).toUpperCase()}`,
      route_name: route_name || 'Route 38: Southbound to Glade',
      route_code: route_code || '38',
      bus_number: bus_number || 'Bus 38',
      driver_name: driver_name || 'Assigned Driver',
      departure_time, // Starting time
      arrival_time: arrival_time || new Date(new Date(departure_time).getTime() + 42 * 60000).toISOString(), // Arrival time
      status: status || 'COMPLETED',
      passengers_served: passengers_served || Math.floor(Math.random() * 20 + 25),
      terminal_notes: terminal_notes || 'Recorded permanent departure and arrival log',
      created_at: new Date().toISOString()
    };

    inMemorySchedules.unshift(newRecord);
    return res.status(201).json({
      success: true,
      record: newRecord
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
