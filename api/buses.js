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

function haversineDistMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// In-memory active reporters registry for serverless invocations
globalThis.vercelReporters = globalThis.vercelReporters || new Map();

function find20MeterCluster(reporters) {
  if (!reporters || reporters.length === 0) return [];
  let bestCluster = [];
  for (let i = 0; i < reporters.length; i++) {
    const anchor = reporters[i];
    const inRadius = [anchor];
    for (let j = 0; j < reporters.length; j++) {
      if (i !== j) {
        const dist = haversineDistMeters(anchor.latitude, anchor.longitude, reporters[j].latitude, reporters[j].longitude);
        if (dist <= 20) {
          inRadius.push(reporters[j]);
        }
      }
    }
    if (inRadius.length > bestCluster.length) {
      bestCluster = inRadius;
    }
  }
  return bestCluster;
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
    
    const { deviceId = 'DEV-UNKNOWN', emoji = '😎', name, latitude, longitude, speed_kmh, heading, accuracy_meters } = req.body || {};
    if (latitude !== undefined && longitude !== undefined) {
      if (!globalThis.vercelReporters.has(busId)) {
        globalThis.vercelReporters.set(busId, new Map());
      }
      const reps = globalThis.vercelReporters.get(busId);
      const now = Date.now();
      reps.set(deviceId, {
        deviceId,
        emoji,
        name: name || deviceId,
        latitude: Number(latitude),
        longitude: Number(longitude),
        speed_kmh: Number(speed_kmh || 0),
        heading: Number(heading || 0),
        accuracy_meters: Number(accuracy_meters || 5),
        updatedAt: now
      });

      // Prune inactive
      for (const [id, rep] of reps.entries()) {
        if (now - rep.updatedAt > 25000) {
          reps.delete(id);
        }
      }

      const allActive = Array.from(reps.values());
      const busCluster = find20MeterCluster(allActive);
      const isBusConfirmed = busCluster.length >= 3;

      const route = transitRoutes.find(r => r.id === bus.assigned_route_id) || transitRoutes[0];
      const poly = route?.polyline || [];

      if (isBusConfirmed) {
        const clusterLat = busCluster.reduce((s, r) => s + r.latitude, 0) / busCluster.length;
        const clusterLng = busCluster.reduce((s, r) => s + r.longitude, 0) / busCluster.length;
        const { minDistance, snappedPoint } = snapToSegment(clusterLat, clusterLng, poly);
        const finalLat = minDistance <= 50 ? snappedPoint[0] : clusterLat;
        const finalLng = minDistance <= 50 ? snappedPoint[1] : clusterLng;

        bus.is_bus_confirmed = true;
        bus.status = (speed_kmh && speed_kmh > 3) ? 'MOVING' : 'STOPPED';
        bus.passenger_count = busCluster.length;
        bus.passenger_emojis = busCluster.map(r => r.emoji || '😎');
        bus.last_known_location = {
          latitude: finalLat,
          longitude: finalLng,
          raw_latitude: Number(latitude),
          raw_longitude: Number(longitude),
          is_on_track: minDistance <= 50,
          speed_kmh: Number(speed_kmh || 0),
          heading: Number(heading || 0),
          accuracy_meters: Number(accuracy_meters || 5),
          timestamp: new Date().toISOString()
        };
      } else {
        bus.is_bus_confirmed = false;
        bus.status = 'IDLE';
        bus.passenger_count = busCluster.length;
        bus.passenger_emojis = busCluster.map(r => r.emoji || '😎');
      }

      bus.active_reporters = allActive.map(r => ({
        device_id: r.deviceId,
        emoji: r.emoji,
        name: r.name,
        latitude: r.latitude,
        longitude: r.longitude,
        in_bus: isBusConfirmed && busCluster.some(c => c.deviceId === r.deviceId)
      }));

      return res.status(200).json({ success: true, bus, is_bus_confirmed: isBusConfirmed });
    }
    return res.status(200).json({ success: true, bus });
  }

  const { id } = req.query;
  if (id) {
    const bus = defaultBuses.find(b => b.id === id);
    if (!bus) return res.status(404).json({ error: 'Bus not found' });
    const reps = globalThis.vercelReporters.get(id);
    const allActive = reps ? Array.from(reps.values()) : [];
    const busCluster = find20MeterCluster(allActive);
    const isBusConfirmed = busCluster.length >= 3;
    return res.status(200).json({
      ...bus,
      is_bus_confirmed: isBusConfirmed,
      passenger_count: busCluster.length,
      passenger_emojis: busCluster.map(r => r.emoji || '😎'),
      active_reporters: allActive
    });
  }

  const enriched = defaultBuses.map(bus => {
    const reps = globalThis.vercelReporters.get(bus.id);
    const allActive = reps ? Array.from(reps.values()) : [];
    const busCluster = find20MeterCluster(allActive);
    const isBusConfirmed = busCluster.length >= 3;
    return {
      ...bus,
      is_bus_confirmed: isBusConfirmed,
      passenger_count: busCluster.length,
      passenger_emojis: busCluster.map(r => r.emoji || '😎'),
      active_reporters: allActive
    };
  });

  return res.status(200).json(enriched);
}
