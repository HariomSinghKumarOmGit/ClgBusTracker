// api/buses.js
// Vercel Serverless Function: Buses Telemetry API
import { transitRoutes } from './routes.js';

function snapToSegment(lat, lng, polyline) {
  if (!polyline || polyline.length < 2) return { minDistance: 0, snappedPoint: [lat, lng] };
  let minDistance = Infinity;
  let snappedPoint = [lat, lng];
  for (let i = 0; i < polyline.length - 1; i++) {
    const [lat1, lng1] = polyline[i];
    const [lat2, lng2] = polyline[i + 1];
    const midLat = ((lat1 + lat2) / 2) * (Math.PI / 180);
    const kx = 111320 * Math.cos(midLat);
    const ky = 111320;
    const dx = (lng2 - lng1) * kx;
    const dy = (lat2 - lat1) * ky;
    const lenSq = dx * dx + dy * dy;
    let t = 0;
    if (lenSq > 0) {
      const px = (lng - lng1) * kx;
      const py = (lat - lat1) * ky;
      t = Math.max(0, Math.min(1, (px * dx + py * dy) / lenSq));
    }
    const nLat = lat1 + t * (lat2 - lat1);
    const nLng = lng1 + t * (lng2 - lng1);
    const dist = Math.hypot((lat - nLat) * 111320, (lng - nLng) * kx);
    if (dist < minDistance) {
      minDistance = dist;
      snappedPoint = [nLat, nLng];
    }
  }
  return { minDistance, snappedPoint };
}

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
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle location update from inside bus
  if (req.method === 'POST' || req.method === 'PUT') {
    const busId = req.query.id || req.body.busId || req.body.id || 'BUS-01';
    const bus = defaultBuses.find(b => b.id === busId) || defaultBuses[0];
    
    const { latitude, longitude, speed_kmh, heading, accuracy_meters, consecutiveOffTrackCount } = req.body || {};
    if (latitude !== undefined && longitude !== undefined) {
      const route = transitRoutes.find(r => r.id === bus.assigned_route_id) || transitRoutes[0];
      const poly = route?.polyline || [];
      const { minDistance, snappedPoint } = snapToSegment(Number(latitude), Number(longitude), poly);
      const isOffTrack = minDistance > 50;

      let outOfTrackCount = consecutiveOffTrackCount !== undefined 
        ? Number(consecutiveOffTrackCount) 
        : (bus.out_of_track_count || 0);

      if (isOffTrack) {
        outOfTrackCount += 1;
      } else {
        outOfTrackCount = 0;
      }

      bus.out_of_track_count = outOfTrackCount;

      let finalLat, finalLng;
      // Rule: Bus can move out of track ONLY if count >= 3. If < 3, keep bus on track!
      if (outOfTrackCount >= 3) {
        finalLat = Number(latitude);
        finalLng = Number(longitude);
        bus.is_on_track = false;
      } else {
        finalLat = snappedPoint[0];
        finalLng = snappedPoint[1];
        bus.is_on_track = true;
      }

      bus.status = (speed_kmh && speed_kmh > 3) ? 'MOVING' : 'STOPPED';
      bus.last_known_location = {
        latitude: finalLat,
        longitude: finalLng,
        raw_latitude: Number(latitude),
        raw_longitude: Number(longitude),
        is_on_track: bus.is_on_track,
        out_of_track_count: outOfTrackCount,
        speed_kmh: Number(speed_kmh || 0),
        heading: Number(heading || 0),
        accuracy_meters: Number(accuracy_meters || 5),
        timestamp: new Date().toISOString()
      };
    }
    return res.status(200).json({ success: true, bus });
  }

  const { id } = req.query;
  if (id) {
    const bus = defaultBuses.find(b => b.id === id);
    if (!bus) return res.status(404).json({ error: 'Bus not found' });
    return res.status(200).json(bus);
  }

  return res.status(200).json(defaultBuses);
}
