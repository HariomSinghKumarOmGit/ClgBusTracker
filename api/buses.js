// api/buses.js
// Vercel Serverless Function: Buses Telemetry API

const defaultBuses = [
  {
    id: "BUS-01",
    number: "Bus 01",
    plate_number: "DL 1P B 4022",
    capacity: 45,
    assigned_route_id: "ROUTE-01",
    assigned_driver_id: "DRV-01",
    status: "IDLE",
    current_trip_id: null,
    last_known_location: {
      latitude: 28.5204,
      longitude: 77.2014,
      speed_kmh: 0,
      heading: 85,
      accuracy_meters: 5,
      timestamp: new Date().toISOString()
    }
  },
  {
    id: "BUS-38",
    number: "Bus 38",
    plate_number: "DL 1P B 3838",
    capacity: 45,
    assigned_route_id: "ROUTE-38",
    assigned_driver_id: "DRV-3801",
    status: "MOVING",
    current_trip_id: "TRIP-3801",
    last_known_location: {
      latitude: 28.5280,
      longitude: 77.2060,
      speed_kmh: 36,
      heading: 142,
      accuracy_meters: 5,
      timestamp: new Date().toISOString()
    }
  },
  {
    id: "BUS-21",
    number: "Bus 21",
    plate_number: "16-1270 5-70016",
    capacity: 42,
    assigned_route_id: "ROUTE-21",
    assigned_driver_id: "DRV-2101",
    status: "MOVING",
    current_trip_id: "TRIP-2101",
    last_known_location: {
      latitude: 13.7650,
      longitude: 100.5380,
      speed_kmh: 28,
      heading: 180,
      accuracy_meters: 5,
      timestamp: new Date().toISOString()
    }
  }
];

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;
  if (id) {
    const bus = defaultBuses.find(b => b.id === id);
    if (!bus) return res.status(404).json({ error: 'Bus not found' });
    return res.status(200).json(bus);
  }

  return res.status(200).json(defaultBuses);
}
