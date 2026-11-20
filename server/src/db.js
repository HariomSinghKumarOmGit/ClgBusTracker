// server/src/db.js
// Persistent embedded JSON database with thread-safe atomic file writes

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { defaultSeedData } from './seedData.js';
import { calculateRouteGeometry } from './osrm.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

class Database {
  constructor() {
    this.data = null;
    this.init();
  }

  init() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(DB_FILE)) {
      console.log('📦 Initializing local database with seed data...');
      this.data = JSON.parse(JSON.stringify(defaultSeedData));
      this.persist();
    } else {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        this.data = JSON.parse(raw);
        console.log('✅ Local database loaded successfully.');
      } catch (err) {
        console.error('⚠️ Error reading db.json, restoring default seed:', err.message);
        this.data = JSON.parse(JSON.stringify(defaultSeedData));
        this.persist();
      }
    }
  }

  persist() {
    try {
      const tempFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(this.data, null, 2), 'utf8');
      fs.renameSync(tempFile, DB_FILE);
    } catch (err) {
      console.error('Failed to persist database:', err);
    }
  }

  // --- BUSES ---
  getBuses() {
    return this.data.buses;
  }

  getBus(id) {
    return this.data.buses.find(b => b.id === id);
  }

  updateBus(id, updates) {
    const bus = this.getBus(id);
    if (!bus) return null;
    Object.assign(bus, updates);
    this.persist();
    return bus;
  }

  updateBusDirectLocation(busId, { latitude, longitude, speed_kmh, heading, accuracy_meters, delay_mins }) {
    let bus = this.getBus(busId);
    if (!bus && this.data.buses.length > 0) {
      bus = this.data.buses[0];
    }
    if (!bus) return null;

    const timestamp = new Date().toISOString();
    const speed = Number(speed_kmh || 0);
    bus.status = speed > 3 ? 'MOVING' : (bus.status === 'IDLE' ? 'IDLE' : 'STOPPED');
    bus.last_known_location = {
      latitude: Number(latitude),
      longitude: Number(longitude),
      speed_kmh: speed,
      heading: Number(heading || 0),
      accuracy_meters: Number(accuracy_meters || 5),
      timestamp
    };

    // If there's an active trip or assigned route, calculate stops
    let trip = this.getActiveTrip(bus.id);
    const routeId = trip ? trip.route_id : (bus.assigned_route_id || 'ROUTE-01');
    const stops = this.getStops(routeId);

    if (trip) {
      trip.latitude = Number(latitude);
      trip.longitude = Number(longitude);
      trip.speed_kmh = speed;
      if (heading !== undefined) trip.heading = Number(heading);
      if (delay_mins !== undefined) trip.delay_mins = Number(delay_mins);
      trip.last_update = timestamp;

      if (stops.length > 0) {
        let minDist = Infinity;
        let nearestIndex = 0;
        stops.forEach((s, idx) => {
          const d = Math.hypot(s.latitude - latitude, s.longitude - longitude);
          if (d < minDist) {
            minDist = d;
            nearestIndex = idx;
          }
        });
        const approxKm = minDist * 111;
        if (approxKm < 0.3) {
          trip.current_stop_id = stops[nearestIndex].id;
          trip.next_stop_id = stops[nearestIndex + 1]?.id || stops[nearestIndex].id;
        } else {
          const nextIdx = Math.min(nearestIndex + 1, stops.length - 1);
          trip.next_stop_id = stops[nextIdx].id;
        }

        const nextStop = stops.find(s => s.id === trip.next_stop_id);
        if (nextStop) {
          const distToNextKm = Math.hypot(nextStop.latitude - latitude, nextStop.longitude - longitude) * 111;
          const effectiveSpeed = (speed > 10) ? speed : 35;
          trip.eta_to_next_stop_mins = Math.max(1, Math.round((distToNextKm / effectiveSpeed) * 60));
        }
      }
    }

    this.persist();
    return { bus, trip, stops };
  }

  // --- ROUTES ---
  getRoutes() {
    return this.data.routes;
  }

  getRoute(id) {
    return this.data.routes.find(r => r.id === id);
  }

  async recalculateRoute(routeId) {
    const route = this.getRoute(routeId);
    if (!route) return null;
    const stops = this.getStops(routeId);
    const geometry = await calculateRouteGeometry(stops);
    route.polyline = geometry.coordinates;
    route.distance_km = geometry.distance_km;
    route.duration_mins = geometry.duration_mins;
    this.persist();
    return route;
  }

  // --- STOPS ---
  getStops(routeId) {
    return this.data.stops
      .filter(s => s.route_id === routeId)
      .sort((a, b) => a.sequence_order - b.sequence_order);
  }

  getStop(id) {
    return this.data.stops.find(s => s.id === id);
  }

  async addStop(stopData) {
    const stops = this.getStops(stopData.route_id);
    const newStop = {
      id: `STOP-${Date.now().toString(36).toUpperCase()}`,
      route_id: stopData.route_id,
      sequence_order: stops.length + 1,
      name: stopData.name || `Stop ${stops.length + 1}`,
      description: stopData.description || '',
      latitude: Number(stopData.latitude),
      longitude: Number(stopData.longitude),
      scheduled_time: stopData.scheduled_time || '08:00 AM',
      is_terminal: Boolean(stopData.is_terminal)
    };
    this.data.stops.push(newStop);
    await this.recalculateRoute(stopData.route_id);
    this.persist();
    return newStop;
  }

  async updateStop(id, updates) {
    const stop = this.getStop(id);
    if (!stop) return null;
    Object.assign(stop, updates);
    if (updates.latitude !== undefined || updates.longitude !== undefined) {
      await this.recalculateRoute(stop.route_id);
    }
    this.persist();
    return stop;
  }

  async deleteStop(id) {
    const index = this.data.stops.findIndex(s => s.id === id);
    if (index === -1) return false;
    const [deleted] = this.data.stops.splice(index, 1);
    
    // Re-sequence remaining stops
    const remaining = this.getStops(deleted.route_id);
    remaining.forEach((s, idx) => {
      s.sequence_order = idx + 1;
    });

    await this.recalculateRoute(deleted.route_id);
    this.persist();
    return true;
  }

  async reorderStops(routeId, orderedIds) {
    orderedIds.forEach((id, index) => {
      const stop = this.getStop(id);
      if (stop && stop.route_id === routeId) {
        stop.sequence_order = index + 1;
      }
    });
    await this.recalculateRoute(routeId);
    this.persist();
    return this.getStops(routeId);
  }

  // --- DRIVERS ---
  getDrivers() {
    return this.data.drivers;
  }

  getDriver(id) {
    return this.data.drivers.find(d => d.id === id);
  }

  addDriver(driverData) {
    const newDriver = {
      id: `DRV-${Date.now().toString(36).toUpperCase()}`,
      name: driverData.name,
      phone: driverData.phone,
      license_no: driverData.license_no || 'DL-PENDING',
      assigned_bus_id: driverData.assigned_bus_id || 'BUS-01',
      bus_plate: driverData.bus_plate || 'DL 1P B 4022',
      bus_number: driverData.bus_number || 'Bus 01',
      rating: driverData.rating || 5.0,
      status: driverData.status || 'ON_DUTY',
      experience_years: driverData.experience_years || 3,
      avatar_url: driverData.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(driverData.name)}`,
      emergency_contact: driverData.emergency_contact || driverData.phone,
      blood_group: driverData.blood_group || 'O+',
      shift: driverData.shift || 'Morning Shift',
      pin: driverData.pin || '1234'
    };
    this.data.drivers.push(newDriver);
    this.persist();
    return newDriver;
  }

  updateDriver(id, updates) {
    const driver = this.getDriver(id);
    if (!driver) return null;
    Object.assign(driver, updates);
    this.persist();
    return driver;
  }

  verifyDriver(pin) {
    return this.data.drivers.find(d => d.pin === pin) || null;
  }

  // --- PERMANENT SCHEDULES (ONLY STARTING & ARRIVAL TIMES STORED) ---
  getSchedules() {
    if (!this.data.schedules) {
      this.data.schedules = [];
    }
    return this.data.schedules;
  }

  addSchedule(scheduleData) {
    if (!this.data.schedules) {
      this.data.schedules = [];
    }
    // STRICT PRIVACY COMPLIANCE:
    // Only starting time (departure) and arrival time are stored.
    // Zero GPS coordinates, telemetry, or breadcrumb logs stored!
    const newRecord = {
      id: `SCH-${Date.now().toString(36).toUpperCase()}`,
      route_name: scheduleData.route_name || 'Route 38: Southbound to Glade',
      route_code: scheduleData.route_code || '38',
      bus_number: scheduleData.bus_number || 'Bus 38',
      driver_name: scheduleData.driver_name || 'Assigned Driver',
      departure_time: scheduleData.departure_time, // Starting time
      arrival_time: scheduleData.arrival_time,     // Arrival time
      status: scheduleData.status || 'COMPLETED',
      passengers_served: scheduleData.passengers_served || 35,
      terminal_notes: scheduleData.terminal_notes || 'Recorded departure and arrival time',
      created_at: new Date().toISOString()
    };
    this.data.schedules.unshift(newRecord);
    this.persist();
    return newRecord;
  }

  // --- TRIPS ---
  getActiveTrip(busId) {
    return this.data.trips.find(t => t.bus_id === busId && t.status === 'ACTIVE') || null;
  }

  startTrip({ busId, routeId, driverId, startLat, startLng }) {
    // End any lingering active trip for this bus
    this.data.trips.forEach(t => {
      if (t.bus_id === busId && t.status === 'ACTIVE') {
        t.status = 'COMPLETED';
        t.end_time = new Date().toISOString();
      }
    });

    const stops = this.getStops(routeId);
    const firstStop = stops[0];
    const secondStop = stops[1] || stops[0];

    const trip = {
      id: `TRIP-${Date.now().toString(36).toUpperCase()}`,
      bus_id: busId,
      route_id: routeId,
      driver_id: driverId,
      status: 'ACTIVE',
      start_time: new Date().toISOString(),
      end_time: null,
      current_stop_id: firstStop?.id || null,
      next_stop_id: secondStop?.id || null,
      eta_to_next_stop_mins: 10,
      delay_mins: 0,
      speed_kmh: 0,
      heading: 0,
      latitude: startLat || firstStop?.latitude || 28.5204,
      longitude: startLng || firstStop?.longitude || 77.2014,
      last_update: new Date().toISOString()
    };

    this.data.trips.push(trip);

    // Update bus
    this.updateBus(busId, {
      status: 'MOVING',
      current_trip_id: trip.id,
      last_known_location: {
        latitude: trip.latitude,
        longitude: trip.longitude,
        speed_kmh: 0,
        heading: 0,
        accuracy_meters: 5,
        timestamp: trip.last_update
      }
    });

    this.persist();
    return trip;
  }

  endTrip(tripId) {
    const trip = this.data.trips.find(t => t.id === tripId);
    if (!trip) return null;
    trip.status = 'COMPLETED';
    trip.end_time = new Date().toISOString();

    const bus = this.getBus(trip.bus_id);
    if (bus) {
      bus.status = 'IDLE';
      bus.current_trip_id = null;
    }

    // Reset boarded students for next day
    this.data.students.forEach(s => {
      if (s.route_id === trip.route_id) {
        s.is_boarded = false;
        s.is_waiting = false;
      }
    });

    this.persist();
    return trip;
  }

  updateTripLocation(tripId, { latitude, longitude, speed_kmh, heading, accuracy_meters, delay_mins }) {
    const trip = this.data.trips.find(t => t.id === tripId);
    if (!trip) return null;

    trip.latitude = latitude;
    trip.longitude = longitude;
    if (speed_kmh !== undefined) trip.speed_kmh = speed_kmh;
    if (heading !== undefined) trip.heading = heading;
    if (delay_mins !== undefined) trip.delay_mins = delay_mins;
    trip.last_update = new Date().toISOString();

    // Determine nearest and next stoppage
    const stops = this.getStops(trip.route_id);
    let nearestIndex = 0;
    let minDist = Infinity;

    stops.forEach((s, idx) => {
      const d = Math.hypot(s.latitude - latitude, s.longitude - longitude);
      if (d < minDist) {
        minDist = d;
        nearestIndex = idx;
      }
    });

    // If within ~300 meters of a stop, it's current stop
    const approxKm = minDist * 111;
    if (approxKm < 0.3) {
      trip.current_stop_id = stops[nearestIndex].id;
      trip.next_stop_id = stops[nearestIndex + 1]?.id || stops[nearestIndex].id;
    } else {
      // Find the first stoppage ahead
      const nextIdx = Math.min(nearestIndex + 1, stops.length - 1);
      trip.next_stop_id = stops[nextIdx].id;
    }

    // Calculate dynamic ETA to next stop
    const nextStop = stops.find(s => s.id === trip.next_stop_id);
    if (nextStop) {
      const distToNextKm = Math.hypot(nextStop.latitude - latitude, nextStop.longitude - longitude) * 111;
      const effectiveSpeed = (speed_kmh && speed_kmh > 10) ? speed_kmh : 35; // default 35 km/h urban average
      trip.eta_to_next_stop_mins = Math.max(1, Math.round((distToNextKm / effectiveSpeed) * 60));
    }

    // Also update bus state
    const bus = this.getBus(trip.bus_id);
    if (bus) {
      bus.status = (speed_kmh && speed_kmh > 3) ? 'MOVING' : 'STOPPED';
      bus.last_known_location = {
        latitude,
        longitude,
        speed_kmh: speed_kmh || 0,
        heading: heading || 0,
        accuracy_meters: accuracy_meters || 10,
        timestamp: trip.last_update
      };
    }

    this.persist();
    return trip;
  }

  // --- PASSENGER ACTIVITY & STUDENTS ---
  getStudents() {
    return this.data.students;
  }

  registerOrUpdateStudent(studentData) {
    let student = this.data.students.find(s => s.id === studentData.id || s.roll_no === studentData.roll_no);
    if (!student) {
      student = {
        id: studentData.id || `STU-${Date.now().toString(36).toUpperCase()}`,
        name: studentData.name,
        roll_no: studentData.roll_no,
        phone: studentData.phone || '',
        route_id: studentData.route_id || 'ROUTE-01',
        preferred_stop_id: studentData.preferred_stop_id || 'STOP-01',
        is_tracking: true,
        is_waiting: false,
        is_boarded: false,
        last_active: new Date().toISOString()
      };
      this.data.students.push(student);
    } else {
      Object.assign(student, studentData);
      student.last_active = new Date().toISOString();
    }
    this.persist();
    return student;
  }

  setStudentActivity(studentId, { is_tracking, is_waiting, is_boarded, preferred_stop_id }) {
    const student = this.data.students.find(s => s.id === studentId);
    if (!student) return null;

    if (is_tracking !== undefined) student.is_tracking = is_tracking;
    if (is_waiting !== undefined) student.is_waiting = is_waiting;
    if (is_boarded !== undefined) student.is_boarded = is_boarded;
    if (preferred_stop_id !== undefined) student.preferred_stop_id = preferred_stop_id;
    student.last_active = new Date().toISOString();

    this.persist();
    return student;
  }

  getPassengerActivity(routeId) {
    const students = this.data.students.filter(s => s.route_id === routeId);
    const active_trackers = students.filter(s => s.is_tracking).length;
    const waiting_count = students.filter(s => s.is_waiting && !s.is_boarded).length;
    const boarded_count = students.filter(s => s.is_boarded).length;

    const waiting_per_stop = {};
    students.forEach(s => {
      if (s.is_waiting && !s.is_boarded && s.preferred_stop_id) {
        waiting_per_stop[s.preferred_stop_id] = (waiting_per_stop[s.preferred_stop_id] || 0) + 1;
      }
    });

    return {
      route_id: routeId,
      total_students_enrolled: students.length,
      active_trackers,
      waiting_count,
      boarded_count,
      waiting_per_stop
    };
  }

  // --- NOTIFICATIONS ---
  getNotifications() {
    return this.data.notifications.slice(-30);
  }

  addNotification(notif) {
    const item = {
      id: `NOTIF-${Date.now().toString(36).toUpperCase()}`,
      trip_id: notif.trip_id || null,
      type: notif.type || 'INFO', // 'TRIP_STARTED', 'APPROACHING_STOP', 'ARRIVED_AT_STOP', 'DELAYED', 'TRIP_COMPLETED'
      title: notif.title,
      message: notif.message,
      created_at: new Date().toISOString()
    };
    this.data.notifications.push(item);
    if (this.data.notifications.length > 100) {
      this.data.notifications.shift();
    }
    this.persist();
    return item;
  }
}

export const db = new Database();
