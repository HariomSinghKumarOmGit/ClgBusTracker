// client/src/types.ts

export type NavTab = 'home' | 'map' | 'driver' | 'profile';

export type UserRole = 'student' | 'driver' | 'admin';

export type BusStatus = 'IDLE' | 'MOVING' | 'STOPPED' | 'OFFLINE';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface BusLocationTelemetry extends LocationCoordinates {
  speed_kmh: number;
  heading: number;
  accuracy_meters: number;
  timestamp: string;
}

export interface OffTrackPassenger {
  device_id: string;
  emoji: string;
  latitude: number;
  longitude: number;
  accuracy_meters?: number;
}

export interface Bus {
  id: string;
  number: string;
  plate_number: string;
  capacity: number;
  assigned_route_id: string;
  assigned_driver_id: string;
  status: BusStatus;
  current_trip_id: string | null;
  last_known_location: BusLocationTelemetry;
  passenger_count?: number;
  passenger_emojis?: string[];
  off_track_passengers?: OffTrackPassenger[];
}

export interface RouteStop {
  id: string;
  route_id: string;
  sequence_order: number;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
  scheduled_time: string;
  estimated_time?: string;
  actual_time?: string;
  is_terminal: boolean;
  status?: 'passed' | 'current' | 'upcoming';
  accessibility?: {
    wheelchair?: boolean;
    air_conditioned?: boolean;
    tactile_paving?: boolean;
  };
}

export interface BusRoute {
  id: string;
  name: string;
  code: string;
  description: string;
  direction?: string;
  start_point: string;
  end_point: string;
  distance_km: number;
  duration_mins: number;
  is_active: boolean;
  polyline: [number, number][];
  vehicle_plate?: string;
  color?: string;
  stops?: RouteStop[];
}

export interface Trip {
  id: string;
  bus_id: string;
  route_id: string;
  driver_id: string;
  status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  start_time: string;
  end_time: string | null;
  current_stop_id: string | null;
  next_stop_id: string | null;
  eta_to_next_stop_mins: number | null;
  delay_mins: number;
  speed_kmh: number;
  heading: number;
  latitude: number;
  longitude: number;
  last_update: string;
}

export interface PassengerActivity {
  route_id: string;
  total_students_enrolled: number;
  active_trackers: number;
  waiting_count: number;
  boarded_count: number;
  waiting_per_stop: Record<string, number>;
}

export interface StudentProfile {
  id: string;
  name: string;
  roll_no: string;
  phone: string;
  route_id: string;
  preferred_stop_id: string;
  is_tracking: boolean;
  is_waiting: boolean;
  is_boarded: boolean;
}

// Driver Details - Stored on Vercel Backend
export interface Driver {
  id: string;
  name: string;
  phone: string;
  license_no: string;
  assigned_bus_id: string;
  bus_plate: string;
  bus_number: string;
  rating: number;
  status: 'ON_DUTY' | 'OFF_DUTY' | 'ON_BREAK';
  experience_years?: number;
  avatar_url?: string;
  emergency_contact?: string;
  blood_group?: string;
  shift?: string;
  pin?: string;
}

// Permanent Schedule Times - Stored on Vercel Backend
// STRICT PRIVACY: ONLY starting (departure) and arrival time stored permanently. ZERO GPS logs or route records stored!
export interface BusScheduleRecord {
  id: string;
  route_name: string;
  route_code: string;
  bus_number: string;
  driver_name: string;
  departure_time: string; // Permanent starting time
  arrival_time: string;   // Permanent arrival time
  status: 'SCHEDULED' | 'IN_TRANSIT' | 'COMPLETED';
  passengers_served?: number;
  terminal_notes?: string;
  created_at?: string;
}

// User Profile - Stored locally in browser LocalStorage
export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email?: string;
  avatar_emoji: string;
  role: 'student' | 'passenger' | 'commuter';
  is_logged_in: boolean;
  preferred_stop_id: string;
  preferred_stop_name: string;
  home_stop?: string;
  work_campus_stop?: string;
  saved_routes: string[];
  notifications_enabled: boolean;
  chime_alerts: boolean;
  vibration_alerts: boolean;
}

export interface ArrivalCardData {
  id: string;
  bus_number: string;
  minutes: number;
  seconds?: number;
  occupancy_level: 'low' | 'medium' | 'high';
  occupancy_dots: boolean[];
  has_wifi: boolean;
  is_accessible: boolean;
  route_code: string;
  destination: string;
}

export interface TransitStopHub {
  id: string;
  name: string;
  name_alt?: string;
  latitude: number;
  longitude: number;
  connected_routes: {
    route_code: string;
    route_id: string;
    destination: string;
    eta_mins: number;
    is_live: boolean;
    vehicle_plate?: string;
  }[];
}

export interface AppNotification {
  id: string;
  trip_id: string | null;
  type: 'INFO' | 'TRIP_STARTED' | 'APPROACHING_STOP' | 'ARRIVED_AT_STOP' | 'DELAYED' | 'TRIP_COMPLETED';
  title: string;
  message: string;
  created_at: string;
}

export interface NetworkInfo {
  local_ip: string;
  server_port: number;
  client_url: string;
  qr_code: string;
}
