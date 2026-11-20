// server/src/index.js
// Main Server: Express + Socket.IO Real-time Bus Tracking Backend

import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';
import { db } from './db.js';
import { snapToPolyline, processTrackLocation, OFF_TRACK_THRESHOLD_METERS } from './trackSnapping.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
  }
});

const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Helper to get local network IP
function getLocalNetworkIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const localIP = getLocalNetworkIP();

// --- MULTI-DEVICE PASSENGER REPORTER TRACKING & CONSENSUS ENGINE ---
// Maps busId -> Map<deviceId, reporterData>
const busReporters = new Map();

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

function processReporterLocation(busId, data) {
  const {
    deviceId = 'DEV-UNKNOWN',
    emoji = '😎',
    isOnTrack: clientReportedOnTrack,
    consecutiveOffTrackCount: clientConsecutiveCount,
    latitude,
    longitude,
    speed_kmh = 0,
    heading = 0,
    accuracy_meters = 5,
    delay_mins = 0
  } = data;

  if (latitude === undefined || longitude === undefined) return null;

  if (!busReporters.has(busId)) {
    busReporters.set(busId, new Map());
  }
  const reporters = busReporters.get(busId);
  const now = Date.now();
  const prevReporter = reporters.get(deviceId);

  // Retrieve route polyline for the bus
  const busRecord = db.getBus(busId);
  const routeId = busRecord?.assigned_route_id || 'ROUTE-01';
  const route = db.getRoute(routeId);
  const polyline = route?.polyline || [];

  // Determine physical distance to track polyline
  const { minDistance, snappedPoint, segmentBearing } = snapToPolyline(Number(latitude), Number(longitude), polyline);
  const physicallyOnTrack = minDistance <= OFF_TRACK_THRESHOLD_METERS; // 50m road corridor

  // Calculate consecutive off-track count for this device
  let devConsecutiveOffTrack = (clientConsecutiveCount !== undefined && clientConsecutiveCount > 0)
    ? Number(clientConsecutiveCount)
    : (prevReporter ? prevReporter.consecutiveOffTrackCount || 0 : 0);

  if (!physicallyOnTrack) {
    devConsecutiveOffTrack += 1;
  } else {
    devConsecutiveOffTrack = 0;
  }

  // Save current reporter state
  reporters.set(deviceId, {
    deviceId,
    emoji: emoji || '😎',
    isOnTrack: physicallyOnTrack,
    consecutiveOffTrackCount: devConsecutiveOffTrack,
    latitude: Number(latitude),
    longitude: Number(longitude),
    snappedLat: snappedPoint[0],
    snappedLng: snappedPoint[1],
    speed_kmh: Number(speed_kmh || 0),
    heading: Number(heading || (physicallyOnTrack && segmentBearing ? segmentBearing : 0)),
    accuracy_meters: Number(accuracy_meters || 5),
    delay_mins: Number(delay_mins || 0),
    updatedAt: now
  });

  // Prune reporters inactive for > 25 seconds
  for (const [id, rep] of reporters.entries()) {
    if (now - rep.updatedAt > 25000) {
      reporters.delete(id);
    }
  }

  const allActive = Array.from(reporters.values());
  const onTrackReporters = allActive.filter(r => r.isOnTrack);
  const offTrackReporters = allActive.filter(r => !r.isOnTrack);

  // Cluster reporters to find group consensus within 350m
  function getLargestCluster(reps) {
    if (!reps || reps.length === 0) return [];
    if (reps.length === 1) return [reps[0]];
    let best = [reps[0]];
    for (let i = 0; i < reps.length; i++) {
      const orig = reps[i];
      const cluster = [orig];
      for (let j = 0; j < reps.length; j++) {
        if (i !== j) {
          const dist = haversineDistMeters(orig.latitude, orig.longitude, reps[j].latitude, reps[j].longitude);
          if (dist <= 350) {
            cluster.push(reps[j]);
          }
        }
      }
      if (cluster.length > best.length) {
        best = cluster;
      }
    }
    return best;
  }

  const onTrackCluster = getLargestCluster(onTrackReporters);
  const offTrackCluster = getLargestCluster(offTrackReporters);

  // Max consecutive off-track count recorded among all active reporters
  const maxConsecutiveOffTrack = allActive.length > 0 
    ? Math.max(...allActive.map(r => r.consecutiveOffTrackCount || 0))
    : 0;

  // USER CORE REQUIREMENT:
  // "bus can goo or move out of track only if max no of location orhte ther eare out of track, min more then 3,
  //  adn also , if less then three ignore keep bus on track"
  //
  // 1. Bus can go/move out of track ONLY IF:
  //    - Maximum number of locations out of track is minimum more than 3 / at least 3 (>= 3)
  //      (i.e. cluster of >= 3 out-of-track reporters in agreement, OR single/consecutive off-track reports >= 3)
  // 2. If less than 3:
  //    - IGNORE off-track deviation, KEEP BUS ON TRACK (snapped)!
  const offTrackCount = offTrackCluster.length;
  const onTrackCount = onTrackCluster.length;

  const canMoveOutOfTrack = 
    (offTrackCount >= 3 && offTrackCount > onTrackCount) || 
    (onTrackCount === 0 && (offTrackCount >= 3 || maxConsecutiveOffTrack >= 3));

  let targetLat, targetLng, targetSpeed, targetHeading, targetAccuracy;
  let passengerEmojis = [];
  let passengerCount = 0;
  let busIsOnTrack = true;

  if (canMoveOutOfTrack) {
    // QUALIFIED: Max locations are out of track, and minimum count is >= 3!
    // Bus moves out of track to the off-track consensus cluster
    busIsOnTrack = false;
    const cluster = offTrackCluster.length > 0 ? offTrackCluster : allActive;
    targetLat = cluster.reduce((s, r) => s + r.latitude, 0) / cluster.length;
    targetLng = cluster.reduce((s, r) => s + r.longitude, 0) / cluster.length;
    targetSpeed = Math.round(cluster.reduce((s, r) => s + r.speed_kmh, 0) / cluster.length);
    targetHeading = cluster[0].heading;
    targetAccuracy = Math.round(cluster.reduce((s, r) => s + r.accuracy_meters, 0) / cluster.length);
    passengerCount = cluster.length;
    passengerEmojis = cluster.map(r => r.emoji || '😎');
  } else {
    // LESS THAN 3 LOCATIONS OUT OF TRACK (OR ON-TRACK REPORTERS DOMINATE):
    // "if less then three ignore keep bus on track" -> IGNORE AND KEEP BUS ON TRACK!
    busIsOnTrack = true;

    if (onTrackCount > 0) {
      // Position bus at the cluster of verified on-track reporters
      targetLat = onTrackCluster.reduce((s, r) => s + r.latitude, 0) / onTrackCluster.length;
      targetLng = onTrackCluster.reduce((s, r) => s + r.longitude, 0) / onTrackCluster.length;
      targetSpeed = Math.round(onTrackCluster.reduce((s, r) => s + r.speed_kmh, 0) / onTrackCluster.length);
      targetHeading = onTrackCluster[0].heading;
      targetAccuracy = Math.round(onTrackCluster.reduce((s, r) => s + r.accuracy_meters, 0) / onTrackCluster.length);
      passengerCount = onTrackCluster.length;
      passengerEmojis = onTrackCluster.map(r => r.emoji || '😎');
    } else {
      // Off-track count is less than 3 (< 3):
      // Snap to polyline to strictly keep the bus on track!
      targetLat = snappedPoint[0];
      targetLng = snappedPoint[1];
      targetSpeed = Number(speed_kmh || 0);
      targetHeading = Number(heading || segmentBearing || 0);
      targetAccuracy = Number(accuracy_meters || 5);
      passengerCount = allActive.length;
      passengerEmojis = allActive.map(r => r.emoji || '😎');
    }
  }

  // Off-track passengers shown as individual emoji pins when the bus itself is kept on track
  const offTrackReportersList = busIsOnTrack
    ? offTrackReporters.map(r => ({
        device_id: r.deviceId,
        emoji: r.emoji,
        latitude: r.latitude,
        longitude: r.longitude,
        accuracy_meters: r.accuracy_meters
      }))
    : [];

  // Update bus location in db (passing out_of_track_count and is_on_track)
  const result = db.updateBusDirectLocation(busId, {
    latitude: targetLat,
    longitude: targetLng,
    speed_kmh: targetSpeed,
    heading: targetHeading,
    accuracy_meters: targetAccuracy,
    delay_mins,
    out_of_track_count: busIsOnTrack ? 0 : Math.max(offTrackCount, maxConsecutiveOffTrack),
    is_on_track: busIsOnTrack
  });

  return {
    result,
    targetLat,
    targetLng,
    targetSpeed,
    targetHeading,
    targetAccuracy,
    passengerCount,
    passengerEmojis,
    offTrackReporters: offTrackReportersList,
    isOnTrack: busIsOnTrack,
    outOfTrackCount: busIsOnTrack ? 0 : Math.max(offTrackCount, maxConsecutiveOffTrack)
  };
}

// --- REST API ENDPOINTS ---

// Health & System Info
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    local_ip: localIP,
    port: PORT
  });
});

app.get('/api/network-info', async (req, res) => {
  const clientUrl = `http://${localIP}:5173`;
  try {
    const qrDataUrl = await QRCode.toDataURL(clientUrl, { margin: 1, width: 256 });
    res.json({
      local_ip: localIP,
      server_port: PORT,
      client_url: clientUrl,
      qr_code: qrDataUrl
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// Buses
app.get('/api/buses', (req, res) => {
  res.json(db.getBuses());
});

app.get('/api/buses/:id', (req, res) => {
  const bus = db.getBus(req.params.id);
  if (!bus) return res.status(404).json({ error: 'Bus not found' });
  res.json(bus);
});

// Update bus location (from commuter inside bus or driver)
app.post('/api/buses/:id/location', (req, res) => {
  const { latitude, longitude } = req.body;
  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'latitude and longitude are required' });
  }

  const processed = processReporterLocation(req.params.id, req.body);
  if (!processed || !processed.result || !processed.result.bus) {
    return res.status(404).json({ error: 'Bus not found' });
  }

  const { result, targetLat, targetLng, targetSpeed, targetHeading, targetAccuracy, passengerCount, passengerEmojis, offTrackReporters } = processed;

  // Real-time broadcast to all connected passengers and maps with multi-device consensus & emoji dots
  io.emit('bus:location_update', {
    bus_id: result.bus.id,
    trip_id: result.trip?.id || null,
    latitude: targetLat,
    longitude: targetLng,
    speed_kmh: targetSpeed,
    heading: targetHeading,
    accuracy_meters: targetAccuracy,
    status: result.bus.status,
    current_stop_id: result.trip?.current_stop_id || null,
    next_stop_id: result.trip?.next_stop_id || null,
    eta_to_next_stop_mins: result.trip?.eta_to_next_stop_mins || 2,
    passenger_count: passengerCount,
    passenger_emojis: passengerEmojis,
    off_track_passengers: offTrackReporters,
    last_update: result.bus.last_known_location.timestamp
  });

  res.json({ success: true, bus: result.bus, trip: result.trip, passengerCount, passengerEmojis });
});

// Start/Stop tracking notifications
app.post('/api/buses/:id/stop-tracking', (req, res) => {
  const bus = db.getBus(req.params.id);
  if (bus) {
    bus.status = 'IDLE';
    db.persist();
    io.emit('bus:status_change', { bus_id: req.params.id, status: 'IDLE' });
  }
  res.json({ success: true });
});

// Routes & Stoppages
app.get('/api/routes', (req, res) => {
  res.json(db.getRoutes());
});

app.get('/api/routes/:id', (req, res) => {
  const route = db.getRoute(req.params.id);
  if (!route) return res.status(404).json({ error: 'Route not found' });
  res.json(route);
});

app.get('/api/routes/:id/stops', (req, res) => {
  res.json(db.getStops(req.params.id));
});

// Admin: Add stoppage
app.post('/api/routes/:id/stops', async (req, res) => {
  try {
    const { name, description, latitude, longitude, scheduled_time, is_terminal } = req.body;
    if (!name || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Name, latitude, and longitude are required' });
    }
    const newStop = await db.addStop({
      route_id: req.params.id,
      name,
      description,
      latitude,
      longitude,
      scheduled_time,
      is_terminal
    });

    const updatedRoute = db.getRoute(req.params.id);
    const updatedStops = db.getStops(req.params.id);

    // Notify all connected clients of route/stops update
    io.emit('route:updated', { route: updatedRoute, stops: updatedStops });

    res.status(201).json({ stop: newStop, route: updatedRoute });
  } catch (err) {
    console.error('Error adding stop:', err);
    res.status(500).json({ error: err.message });
  }
});

// Admin: Edit stoppage
app.put('/api/stops/:id', async (req, res) => {
  try {
    const updated = await db.updateStop(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Stop not found' });

    const updatedRoute = db.getRoute(updated.route_id);
    const updatedStops = db.getStops(updated.route_id);

    io.emit('route:updated', { route: updatedRoute, stops: updatedStops });
    res.json({ stop: updated, route: updatedRoute });
  } catch (err) {
    console.error('Error updating stop:', err);
    res.status(500).json({ error: err.message });
  }
});

// Admin: Delete stoppage
app.delete('/api/stops/:id', async (req, res) => {
  try {
    const stop = db.getStop(req.params.id);
    if (!stop) return res.status(404).json({ error: 'Stop not found' });
    const routeId = stop.route_id;

    await db.deleteStop(req.params.id);
    const updatedRoute = db.getRoute(routeId);
    const updatedStops = db.getStops(routeId);

    io.emit('route:updated', { route: updatedRoute, stops: updatedStops });
    res.json({ success: true, route: updatedRoute });
  } catch (err) {
    console.error('Error deleting stop:', err);
    res.status(500).json({ error: err.message });
  }
});

// Admin: Reorder stoppages
app.post('/api/routes/:id/reorder-stops', async (req, res) => {
  try {
    const { stopIds } = req.body;
    if (!Array.isArray(stopIds)) {
      return res.status(400).json({ error: 'stopIds array is required' });
    }
    const stops = await db.reorderStops(req.params.id, stopIds);
    const updatedRoute = db.getRoute(req.params.id);

    io.emit('route:updated', { route: updatedRoute, stops });
    res.json({ stops, route: updatedRoute });
  } catch (err) {
    console.error('Error reordering stops:', err);
    res.status(500).json({ error: err.message });
  }
});

// Drivers & Auth (Vercel Backend Parity)
app.get('/api/drivers', (req, res) => {
  res.json(db.getDrivers());
});

app.post('/api/drivers', (req, res) => {
  const { name, phone } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: 'Name and phone required' });
  }
  const newDriver = db.addDriver(req.body);
  res.status(201).json(newDriver);
});

app.put('/api/drivers/:id', (req, res) => {
  const updated = db.updateDriver(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Driver not found' });
  res.json(updated);
});

// Bus Schedule Times (STRICT PRIVACY: ONLY starting and arrival time stored permanently)
app.get('/api/schedules', (req, res) => {
  res.json({
    privacy_notice: "Zero GPS logs or tracking history stored. Only starting and arrival times are recorded.",
    schedules: db.getSchedules()
  });
});

app.post('/api/schedules', (req, res) => {
  const { departure_time } = req.body;
  if (!departure_time) {
    return res.status(400).json({ error: 'departure_time is required' });
  }
  const record = db.addSchedule(req.body);
  res.status(201).json({ success: true, record });
});

app.post('/api/auth/driver-login', (req, res) => {
  const { pin } = req.body;
  const driver = db.verifyDriver(pin);
  if (!driver) {
    return res.status(401).json({ error: 'Invalid Driver PIN' });
  }
  res.json({
    role: 'driver',
    driver: {
      id: driver.id,
      name: driver.name,
      phone: driver.phone,
      assigned_bus_id: driver.assigned_bus_id
    }
  });
});

app.post('/api/auth/admin-login', (req, res) => {
  const { pin } = req.body;
  if (pin === db.data.system_settings.admin_pin) {
    return res.json({ role: 'admin', authenticated: true });
  }
  res.status(401).json({ error: 'Invalid Admin PIN' });
});

// Trips
app.get('/api/trips/active/:busId', (req, res) => {
  const trip = db.getActiveTrip(req.params.busId);
  res.json(trip || null);
});

app.post('/api/trips/start', (req, res) => {
  const { busId, routeId, driverId, startLat, startLng } = req.body;
  if (!busId || !routeId) {
    return res.status(400).json({ error: 'busId and routeId are required' });
  }

  const trip = db.startTrip({ busId, routeId, driverId, startLat, startLng });
  const bus = db.getBus(busId);
  const route = db.getRoute(routeId);

  // Add system notification
  const notif = db.addNotification({
    trip_id: trip.id,
    type: 'TRIP_STARTED',
    title: `${bus.number} Trip Started`,
    message: `${bus.number} has departed from ${route.start_point} towards ${route.end_point}.`
  });

  io.emit('trip:started', { trip, bus });
  io.emit('notification:new', notif);

  res.status(201).json({ trip, bus });
});

app.post('/api/trips/end', (req, res) => {
  const { tripId } = req.body;
  if (!tripId) return res.status(400).json({ error: 'tripId is required' });

  const trip = db.endTrip(tripId);
  if (!trip) return res.status(404).json({ error: 'Trip not found' });
  const bus = db.getBus(trip.bus_id);

  const notif = db.addNotification({
    trip_id: trip.id,
    type: 'TRIP_COMPLETED',
    title: `${bus ? bus.number : 'Bus'} Trip Completed`,
    message: `Trip has safely ended at the college destination.`
  });

  io.emit('trip:ended', { tripId, bus });
  io.emit('notification:new', notif);

  res.json({ trip, bus });
});

// Telemetry (REST fallback for driver location update)
app.post('/api/trips/telemetry', (req, res) => {
  const { tripId, latitude, longitude, speed_kmh, heading, accuracy_meters, delay_mins } = req.body;
  if (!tripId || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'tripId, latitude, longitude are required' });
  }

  const updatedTrip = db.updateTripLocation(tripId, {
    latitude: Number(latitude),
    longitude: Number(longitude),
    speed_kmh: Number(speed_kmh || 0),
    heading: Number(heading || 0),
    accuracy_meters: Number(accuracy_meters || 5),
    delay_mins: Number(delay_mins || 0)
  });

  if (!updatedTrip) return res.status(404).json({ error: 'Trip not found' });
  const bus = db.getBus(updatedTrip.bus_id);

  // Broadcast to all students in real time
  io.emit('bus:location_update', {
    bus_id: updatedTrip.bus_id,
    trip_id: updatedTrip.id,
    latitude: updatedTrip.latitude,
    longitude: updatedTrip.longitude,
    speed_kmh: updatedTrip.speed_kmh,
    heading: updatedTrip.heading,
    accuracy_meters: accuracy_meters || 5,
    status: bus.status,
    current_stop_id: updatedTrip.current_stop_id,
    next_stop_id: updatedTrip.next_stop_id,
    eta_to_next_stop_mins: updatedTrip.eta_to_next_stop_mins,
    last_update: updatedTrip.last_update
  });

  res.json({ success: true, trip: updatedTrip });
});

// Passenger Activity
app.get('/api/passenger-activity/:routeId', (req, res) => {
  res.json(db.getPassengerActivity(req.params.routeId));
});

// Students
app.get('/api/students', (req, res) => {
  res.json(db.getStudents());
});

app.post('/api/students/register', (req, res) => {
  const student = db.registerOrUpdateStudent(req.body);
  const activity = db.getPassengerActivity(student.route_id);
  io.emit('passenger:activity_update', activity);
  res.json(student);
});

app.post('/api/students/activity', (req, res) => {
  const { studentId, is_tracking, is_waiting, is_boarded, preferred_stop_id } = req.body;
  if (!studentId) return res.status(400).json({ error: 'studentId is required' });

  const student = db.setStudentActivity(studentId, {
    is_tracking,
    is_waiting,
    is_boarded,
    preferred_stop_id
  });

  if (!student) return res.status(404).json({ error: 'Student not found' });

  const activity = db.getPassengerActivity(student.route_id);
  io.emit('passenger:activity_update', activity);

  // If student checked in as boarded, broadcast gentle update
  if (is_boarded) {
    io.emit('student:boarded', {
      student_id: student.id,
      name: student.name,
      stop_id: student.preferred_stop_id
    });
  }

  res.json({ student, activity });
});

// Notifications
app.get('/api/notifications', (req, res) => {
  res.json(db.getNotifications());
});

app.post('/api/notifications', (req, res) => {
  const { title, message, type, trip_id } = req.body;
  if (!title || !message) return res.status(400).json({ error: 'Title and message required' });
  const notif = db.addNotification({ title, message, type, trip_id });
  io.emit('notification:new', notif);
  res.status(201).json(notif);
});

// --- REAL-TIME SOCKET.IO HANDLERS ---
io.on('connection', socket => {
  // Send current active buses and trips on connect
  socket.emit('init:state', {
    buses: db.getBuses(),
    routes: db.getRoutes(),
    server_time: new Date().toISOString()
  });

  // Driver / Inside-Bus Passenger transmits live high-frequency GPS position
  socket.on('driver:send_location', data => {
    const { tripId, busId = 'BUS-01', latitude, longitude, speed_kmh, heading, accuracy_meters, delay_mins } = data;
    if (latitude === undefined || longitude === undefined) return;

    let result;
    if (tripId) {
      const updatedTrip = db.updateTripLocation(tripId, {
        latitude: Number(latitude),
        longitude: Number(longitude),
        speed_kmh: Number(speed_kmh || 0),
        heading: Number(heading || 0),
        accuracy_meters: Number(accuracy_meters || 5),
        delay_mins: Number(delay_mins || 0)
      });
      const bus = updatedTrip ? db.getBus(updatedTrip.bus_id) : null;
      result = { bus, trip: updatedTrip };
    } else {
      result = db.updateBusDirectLocation(busId, {
        latitude,
        longitude,
        speed_kmh,
        heading,
        accuracy_meters,
        delay_mins
      });
    }

    if (result && result.bus) {
      // Sub-second broadcast to all students and riders
      io.emit('bus:location_update', {
        bus_id: result.bus.id,
        trip_id: result.trip?.id || null,
        latitude: Number(latitude),
        longitude: Number(longitude),
        speed_kmh: Number(speed_kmh || 0),
        heading: Number(heading || 0),
        accuracy_meters: Number(accuracy_meters || 5),
        status: result.bus.status || 'MOVING',
        current_stop_id: result.trip?.current_stop_id || null,
        next_stop_id: result.trip?.next_stop_id || null,
        eta_to_next_stop_mins: result.trip?.eta_to_next_stop_mins || 2,
        last_update: new Date().toISOString()
      });
    }
  });

  // Direct bus location update event (used by Inside Bus passenger or driver)
  socket.on('bus:send_location', data => {
    const busId = data.busId || 'BUS-01';
    if (data.latitude === undefined || data.longitude === undefined) return;

    // Use socket id as fallback deviceId
    if (!data.deviceId) {
      data.deviceId = socket.id;
    }

    const processed = processReporterLocation(busId, data);
    if (!processed || !processed.result || !processed.result.bus) return;

    const { result, targetLat, targetLng, targetSpeed, targetHeading, targetAccuracy, passengerCount, passengerEmojis, offTrackReporters, isOnTrack, outOfTrackCount } = processed;

    io.emit('bus:location_update', {
      bus_id: result.bus.id,
      trip_id: result.trip?.id || null,
      latitude: targetLat,
      longitude: targetLng,
      speed_kmh: targetSpeed,
      heading: targetHeading,
      accuracy_meters: targetAccuracy,
      status: result.bus.status || 'MOVING',
      is_on_track: isOnTrack,
      out_of_track_count: outOfTrackCount,
      current_stop_id: result.trip?.current_stop_id || null,
      next_stop_id: result.trip?.next_stop_id || null,
      eta_to_next_stop_mins: result.trip?.eta_to_next_stop_mins || 2,
      passenger_count: passengerCount,
      passenger_emojis: passengerEmojis,
      off_track_passengers: offTrackReporters,
      last_update: new Date().toISOString()
    });
  });

  // Stop tracking event
  socket.on('bus:stop_tracking', ({ busId = 'BUS-01', deviceId }) => {
    if (busReporters.has(busId)) {
      const reps = busReporters.get(busId);
      if (deviceId) {
        reps.delete(deviceId);
      } else {
        reps.delete(socket.id);
      }
    }
    const bus = db.getBus(busId);
    if (bus) {
      bus.status = 'IDLE';
      db.persist();
      io.emit('bus:status_change', { bus_id: busId, status: 'IDLE' });
    }
  });

  // Student presence tracking (tracking start/stop)
  socket.on('student:heartbeat', ({ studentId, routeId }) => {
    if (studentId) {
      db.setStudentActivity(studentId, { is_tracking: true });
      const activity = db.getPassengerActivity(routeId || 'ROUTE-01');
      io.emit('passenger:activity_update', activity);
    }
  });

  socket.on('disconnect', () => {
    // Handled gracefully
  });
});

// Serve frontend build if exists
const clientDistPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return next();
  }
  const indexPath = path.join(clientDistPath, 'index.html');
  res.sendFile(indexPath, err => {
    if (err) {
      res.status(200).send(`
        <html>
          <body style="font-family:sans-serif;padding:40px;text-align:center;">
            <h2>College Bus Live Tracker Backend is Running</h2>
            <p>Local API: <code>http://${localIP}:${PORT}/api</code></p>
            <p>Vite Development Client: <code>http://${localIP}:5173</code></p>
          </body>
        </html>
      `);
    }
  });
});

// Start HTTP server on 0.0.0.0
server.listen(PORT, '0.0.0.0', async () => {
  console.log(`\n======================================================`);
  console.log(`🚌 COLLEGE BUS LIVE TRACKER BACKEND STARTED`);
  console.log(`======================================================`);
  console.log(`📡 Local Host:    http://localhost:${PORT}`);
  console.log(`📱 Phone Network: http://${localIP}:${PORT}`);
  console.log(`⚡ Vite Dev Client: http://${localIP}:5173`);
  console.log(`------------------------------------------------------`);
  console.log(`Scan this QR code from your phone camera on same Wi-Fi:`);
  try {
    const qrString = await QRCode.toString(`http://${localIP}:5173`, { type: 'terminal', small: true });
    console.log(qrString);
  } catch (e) {
    // ignore
  }
  console.log(`======================================================\n`);
});
