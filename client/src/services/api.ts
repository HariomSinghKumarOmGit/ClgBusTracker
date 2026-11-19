// client/src/services/api.ts
import { Bus, BusRoute, RouteStop, Trip, PassengerActivity, StudentProfile, Driver, AppNotification, NetworkInfo } from '../types';

const API_BASE = '/api';

const FALLBACK_ROUTE: BusRoute = {
  id: 'ROUTE-01',
  name: 'Route 01: Saket → Delhi Technical Campus',
  code: 'R01',
  description: 'Saket, Delhi to Delhi Technical Campus, Greater Noida (Noida Side)',
  start_point: 'Saket, Delhi',
  end_point: 'Delhi Technical Campus, Greater Noida',
  distance_km: 54.1,
  duration_mins: 65,
  is_active: true,
  polyline: []
};

const FALLBACK_STOPS: RouteStop[] = [
  { id: 'STOP-01', route_id: 'ROUTE-01', sequence_order: 1, name: 'Saket (Starting Point)', description: 'Saket Metro / Press Enclave Rd', latitude: 28.5204, longitude: 77.2014, scheduled_time: '07:30 AM', is_terminal: false },
  { id: 'STOP-02', route_id: 'ROUTE-01', sequence_order: 2, name: 'Stop 02 (Placeholder)', description: 'Near Kalindi Kunj / Sarita Vihar transit', latitude: 28.5447, longitude: 77.2648, scheduled_time: '07:50 AM', is_terminal: false },
  { id: 'STOP-03', route_id: 'ROUTE-01', sequence_order: 3, name: 'Stop 03 (Placeholder)', description: 'Near Mahamaya Flyover / Sector 18 entry', latitude: 28.5583, longitude: 77.3352, scheduled_time: '08:05 AM', is_terminal: false },
  { id: 'STOP-04', route_id: 'ROUTE-01', sequence_order: 4, name: 'Stop 04 (Placeholder)', description: 'Noida Expressway (near Sector 128 / 137)', latitude: 28.5132, longitude: 77.3821, scheduled_time: '08:25 AM', is_terminal: false },
  { id: 'STOP-05', route_id: 'ROUTE-01', sequence_order: 5, name: 'Stop 05 (Placeholder)', description: 'Pari Chowk Interchange, Greater Noida', latitude: 28.4735, longitude: 77.4789, scheduled_time: '08:45 AM', is_terminal: false },
  { id: 'STOP-06', route_id: 'ROUTE-01', sequence_order: 6, name: 'Delhi Technical Campus (Destination)', description: 'Knowledge Park III, Greater Noida', latitude: 28.4633, longitude: 77.4912, scheduled_time: '09:00 AM', is_terminal: true }
];

const FALLBACK_BUS: Bus = {
  id: 'BUS-01',
  number: 'Bus 01',
  plate_number: 'DL 1P B 4022',
  capacity: 45,
  assigned_route_id: 'ROUTE-01',
  assigned_driver_id: 'DRV-01',
  status: 'IDLE',
  current_trip_id: null,
  last_known_location: {
    latitude: 28.5204,
    longitude: 77.2014,
    speed_kmh: 0,
    heading: 85,
    accuracy_meters: 5,
    timestamp: new Date().toISOString()
  }
};

const FALLBACK_DRIVERS: Driver[] = [
  { id: 'DRV-01', name: 'Rajesh Kumar', phone: '+91 98112 34567', assigned_bus_id: 'BUS-01' }
];

function getLocalItem<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

function setLocalItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {}
}

export const api = {
  async getHealth(): Promise<{ status: string; local_ip?: string }> {
    try {
      const res = await fetch(`${API_BASE}/health`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return { status: 'ok', local_ip: typeof window !== 'undefined' ? window.location.hostname : 'localhost' };
  },

  async getNetworkInfo(): Promise<NetworkInfo> {
    try {
      const res = await fetch(`${API_BASE}/network-info`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return {
      local_ip: typeof window !== 'undefined' ? window.location.hostname : 'localhost',
      server_port: 5173,
      client_url: typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173',
      qr_code: ''
    };
  },

  async getBuses(): Promise<Bus[]> {
    try {
      const res = await fetch(`${API_BASE}/buses`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return getLocalItem('dtc_local_buses', [FALLBACK_BUS]);
  },

  async getBus(id: string): Promise<Bus> {
    const buses = await this.getBuses();
    return buses.find(b => b.id === id) || FALLBACK_BUS;
  },

  async getRoutes(): Promise<BusRoute[]> {
    try {
      const res = await fetch(`${API_BASE}/routes`);
      if (res.ok) return await res.json();
    } catch (e) {}
    const stops = await this.getStops('ROUTE-01');
    const route: BusRoute = {
      ...FALLBACK_ROUTE,
      polyline: stops.map(s => [s.latitude, s.longitude] as [number, number])
    };
    return getLocalItem('dtc_local_routes', [route]);
  },

  async getRoute(id: string): Promise<BusRoute> {
    const routes = await this.getRoutes();
    return routes.find(r => r.id === id) || FALLBACK_ROUTE;
  },

  async getStops(routeId: string): Promise<RouteStop[]> {
    try {
      const res = await fetch(`${API_BASE}/routes/${routeId}/stops`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return getLocalItem('dtc_local_stops', FALLBACK_STOPS);
  },

  async addStop(routeId: string, stop: Partial<RouteStop>): Promise<{ stop: RouteStop; route: BusRoute }> {
    try {
      const res = await fetch(`${API_BASE}/routes/${routeId}/stops`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(stop)
      });
      if (res.ok) return await res.json();
    } catch (e) {}

    const stops = await this.getStops(routeId);
    const newStop: RouteStop = {
      id: `STOP-${Date.now().toString(36).toUpperCase()}`,
      route_id: routeId,
      sequence_order: stops.length + 1,
      name: stop.name || `Stop ${stops.length + 1}`,
      description: stop.description || '',
      latitude: Number(stop.latitude),
      longitude: Number(stop.longitude),
      scheduled_time: stop.scheduled_time || '08:00 AM',
      is_terminal: Boolean(stop.is_terminal)
    };
    stops.push(newStop);
    setLocalItem('dtc_local_stops', stops);
    const route = await this.getRoute(routeId);
    return { stop: newStop, route };
  },

  async updateStop(id: string, updates: Partial<RouteStop>): Promise<{ stop: RouteStop; route: BusRoute }> {
    try {
      const res = await fetch(`${API_BASE}/stops/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) return await res.json();
    } catch (e) {}

    const stops = await this.getStops('ROUTE-01');
    const stop = stops.find(s => s.id === id);
    if (stop) Object.assign(stop, updates);
    setLocalItem('dtc_local_stops', stops);
    const route = await this.getRoute('ROUTE-01');
    return { stop: stop || (updates as RouteStop), route };
  },

  async deleteStop(id: string): Promise<{ success: boolean; route: BusRoute }> {
    try {
      const res = await fetch(`${API_BASE}/stops/${id}`, { method: 'DELETE' });
      if (res.ok) return await res.json();
    } catch (e) {}

    let stops = await this.getStops('ROUTE-01');
    stops = stops.filter(s => s.id !== id);
    stops.forEach((s, idx) => { s.sequence_order = idx + 1; });
    setLocalItem('dtc_local_stops', stops);
    const route = await this.getRoute('ROUTE-01');
    return { success: true, route };
  },

  async reorderStops(routeId: string, stopIds: string[]): Promise<{ stops: RouteStop[]; route: BusRoute }> {
    try {
      const res = await fetch(`${API_BASE}/routes/${routeId}/reorder-stops`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stopIds })
      });
      if (res.ok) return await res.json();
    } catch (e) {}

    const stops = await this.getStops(routeId);
    const ordered: RouteStop[] = [];
    stopIds.forEach((id, idx) => {
      const s = stops.find(x => x.id === id);
      if (s) {
        s.sequence_order = idx + 1;
        ordered.push(s);
      }
    });
    setLocalItem('dtc_local_stops', ordered);
    const route = await this.getRoute(routeId);
    return { stops: ordered, route };
  },

  async getDrivers(): Promise<Driver[]> {
    try {
      const res = await fetch(`${API_BASE}/drivers`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return FALLBACK_DRIVERS;
  },

  async driverLogin(pin: string): Promise<{ role: string; driver: Driver }> {
    try {
      const res = await fetch(`${API_BASE}/auth/driver-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      if (res.ok) return await res.json();
    } catch (e) {}

    if (pin === '1234') {
      return { role: 'driver', driver: FALLBACK_DRIVERS[0] };
    }
    throw new Error('Invalid Driver PIN');
  },

  async adminLogin(pin: string): Promise<{ role: string; authenticated: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/auth/admin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      if (res.ok) return await res.json();
    } catch (e) {}

    if (pin === 'admin123') {
      return { role: 'admin', authenticated: true };
    }
    throw new Error('Invalid Admin PIN');
  },

  async getActiveTrip(busId: string): Promise<Trip | null> {
    try {
      const res = await fetch(`${API_BASE}/trips/active/${busId}`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return getLocalItem<Trip | null>('dtc_active_trip', null);
  },

  async startTrip(busId: string, routeId: string, driverId: string, startLat?: number, startLng?: number): Promise<{ trip: Trip; bus: Bus }> {
    try {
      const res = await fetch(`${API_BASE}/trips/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ busId, routeId, driverId, startLat, startLng })
      });
      if (res.ok) return await res.json();
    } catch (e) {}

    const trip: Trip = {
      id: `TRIP-${Date.now().toString(36).toUpperCase()}`,
      bus_id: busId,
      route_id: routeId,
      driver_id: driverId,
      status: 'ACTIVE',
      start_time: new Date().toISOString(),
      end_time: null,
      current_stop_id: 'STOP-01',
      next_stop_id: 'STOP-02',
      eta_to_next_stop_mins: 8,
      delay_mins: 0,
      speed_kmh: 38,
      heading: 85,
      latitude: startLat || 28.5204,
      longitude: startLng || 77.2014,
      last_update: new Date().toISOString()
    };
    const bus: Bus = { ...FALLBACK_BUS, status: 'MOVING', current_trip_id: trip.id };
    setLocalItem('dtc_active_trip', trip);
    return { trip, bus };
  },

  async endTrip(tripId: string): Promise<{ trip: Trip; bus: Bus }> {
    try {
      const res = await fetch(`${API_BASE}/trips/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId })
      });
      if (res.ok) return await res.json();
    } catch (e) {}

    setLocalItem('dtc_active_trip', null);
    const bus: Bus = { ...FALLBACK_BUS, status: 'IDLE', current_trip_id: null };
    return { trip: { ...FALLBACK_BUS, status: 'COMPLETED' } as any, bus };
  },

  async sendTelemetry(data: any): Promise<void> {
    try {
      await fetch(`${API_BASE}/trips/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (e) {}
  },

  async getPassengerActivity(routeId: string): Promise<PassengerActivity> {
    try {
      const res = await fetch(`${API_BASE}/passenger-activity/${routeId}`);
      if (res.ok) return await res.json();
    } catch (e) {}

    return getLocalItem<PassengerActivity>('dtc_passenger_activity', {
      route_id: routeId,
      total_students_enrolled: 25,
      active_trackers: 14,
      waiting_count: 8,
      boarded_count: 2,
      waiting_per_stop: { 'STOP-01': 2, 'STOP-02': 3, 'STOP-03': 1, 'STOP-04': 2 }
    });
  },

  async getStudents(): Promise<StudentProfile[]> {
    try {
      const res = await fetch(`${API_BASE}/students`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return getLocalItem<StudentProfile[]>('dtc_students_list', [
      { id: 'STU-01', name: 'Aarav Sharma', roll_no: 'DTC/2024/01', phone: '+91 98765 00001', route_id: 'ROUTE-01', preferred_stop_id: 'STOP-01', is_tracking: true, is_waiting: true, is_boarded: false },
      { id: 'STU-02', name: 'Ananya Verma', roll_no: 'DTC/2024/02', phone: '+91 98765 00002', route_id: 'ROUTE-01', preferred_stop_id: 'STOP-02', is_tracking: true, is_waiting: false, is_boarded: true },
      { id: 'STU-03', name: 'Rohan Gupta', roll_no: 'DTC/2024/03', phone: '+91 98765 00003', route_id: 'ROUTE-01', preferred_stop_id: 'STOP-03', is_tracking: true, is_waiting: true, is_boarded: false }
    ]);
  },

  async registerStudent(student: Partial<StudentProfile>): Promise<StudentProfile> {
    try {
      const res = await fetch(`${API_BASE}/students/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(student)
      });
      if (res.ok) return await res.json();
    } catch (e) {}

    const registered: StudentProfile = {
      id: student.id || 'STU-LOCAL',
      name: student.name || 'Student',
      roll_no: student.roll_no || 'DTC/2024/01',
      phone: student.phone || '',
      route_id: student.route_id || 'ROUTE-01',
      preferred_stop_id: student.preferred_stop_id || 'STOP-01',
      is_tracking: true,
      is_waiting: false,
      is_boarded: false
    };
    return registered;
  },

  async updateStudentActivity(data: {
    studentId: string;
    is_tracking?: boolean;
    is_waiting?: boolean;
    is_boarded?: boolean;
    preferred_stop_id?: string;
  }): Promise<{ student: StudentProfile; activity: PassengerActivity }> {
    try {
      const res = await fetch(`${API_BASE}/students/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (res.ok) return await res.json();
    } catch (e) {}

    const activity = await this.getPassengerActivity('ROUTE-01');
    if (data.is_boarded !== undefined) {
      activity.boarded_count = data.is_boarded ? activity.boarded_count + 1 : Math.max(0, activity.boarded_count - 1);
    }
    if (data.is_waiting !== undefined) {
      activity.waiting_count = data.is_waiting ? activity.waiting_count + 1 : Math.max(0, activity.waiting_count - 1);
    }
    setLocalItem('dtc_passenger_activity', activity);

    const student: StudentProfile = {
      id: data.studentId,
      name: 'Aarav Sharma',
      roll_no: 'DTC/2024/01',
      phone: '',
      route_id: 'ROUTE-01',
      preferred_stop_id: data.preferred_stop_id || 'STOP-01',
      is_tracking: data.is_tracking ?? true,
      is_waiting: data.is_waiting ?? false,
      is_boarded: data.is_boarded ?? false
    };

    return { student, activity };
  },

  async getNotifications(): Promise<AppNotification[]> {
    try {
      const res = await fetch(`${API_BASE}/notifications`);
      if (res.ok) return await res.json();
    } catch (e) {}

    return [
      {
        id: 'NOTIF-01',
        trip_id: null,
        type: 'INFO',
        title: 'Welcome to DTC Bus Tracker',
        message: 'Route 01 Saket to DTC Greater Noida live tracking is active. Check stops and live ETA.',
        created_at: new Date().toISOString()
      }
    ];
  },

  async broadcastNotification(title: string, message: string, type = 'INFO'): Promise<AppNotification> {
    try {
      const res = await fetch(`${API_BASE}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message, type })
      });
      if (res.ok) return await res.json();
    } catch (e) {}

    return {
      id: `NOTIF-${Date.now().toString(36).toUpperCase()}`,
      trip_id: null,
      type: type as any,
      title,
      message,
      created_at: new Date().toISOString()
    };
  }
};
