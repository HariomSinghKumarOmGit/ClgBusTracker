// client/src/services/backgroundTracker.ts
// Background Geolocation & Bus Telemetry Tracker Service
// Strictly active ONLY while "Inside Bus" travel is initiated by the passenger/driver.

import { socket } from './socket';
import { api } from './api';

export interface TrackerLocationUpdate {
  latitude: number;
  longitude: number;
  speedKmh: number;
  heading: number;
  accuracy: number;
  timestamp: string;
  isBackground: boolean;
}

export interface TrackerState {
  isTracking: boolean;
  busId: string;
  routeId: string;
  mode: 'real' | 'simulate';
  currentLocation: TrackerLocationUpdate | null;
  packetsSent: number;
  startedAt: Date | null;
  wakeLockActive: boolean;
  backgroundKeepAliveActive: boolean;
  gpsPermissionStatus: 'prompt' | 'granted' | 'denied';
  error: string | null;
}

type StateListener = (state: TrackerState) => void;

class BackgroundTrackerService {
  private state: TrackerState = {
    isTracking: false,
    busId: 'BUS-01',
    routeId: 'ROUTE-01',
    mode: 'real',
    currentLocation: null,
    packetsSent: 0,
    startedAt: null,
    wakeLockActive: false,
    backgroundKeepAliveActive: false,
    gpsPermissionStatus: 'prompt',
    error: null
  };

  private listeners: Set<StateListener> = new Set();
  private watchId: number | null = null;
  private wakeLock: any = null;
  private audioElement: HTMLAudioElement | null = null;
  private audioCtx: AudioContext | null = null;
  private audioInterval: any = null;
  private simTimer: any = null;
  private simIndex: number = 0;
  private routePolyline: [number, number][] = [];
  private lastCoord: { lat: number; lng: number; time: number } | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      window.addEventListener('beforeunload', () => {
        if (this.state.isTracking) {
          this.stopTracking();
        }
      });
    }
  }

  // Subscribe to state changes
  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const currentState = this.getState();
    this.listeners.forEach(fn => fn(currentState));
  }

  getState(): TrackerState {
    return { ...this.state };
  }

  setRoutePolyline(polyline: [number, number][]) {
    this.routePolyline = polyline;
  }

  setMode(mode: 'real' | 'simulate') {
    this.state.mode = mode;
    this.notify();
    if (this.state.isTracking) {
      // Restart with the new mode
      this.stopGpsOrSim();
      if (mode === 'real') {
        this.startRealGps();
      } else {
        this.startSimulation();
      }
    }
  }

  // ==========================================
  // START TRACKING (User clicked "Inside Bus")
  // ==========================================
  async startTracking(busId: string = 'BUS-01', routeId: string = 'ROUTE-01'): Promise<boolean> {
    if (this.state.isTracking) return true;

    this.state.isTracking = true;
    this.state.busId = busId;
    this.state.routeId = routeId;
    this.state.startedAt = new Date();
    this.state.packetsSent = 0;
    this.state.error = null;
    this.notify();

    // 1. Request Screen Wake Lock (prevents device from sleeping while driving)
    await this.requestWakeLock();

    // 2. Start Background Keep-Alive Audio (prevents OS from killing background JS / GPS in sleep)
    this.startBackgroundKeepAlive();

    // 3. Request Notification for background indicator
    this.requestNotificationPermission();

    // 4. Start either Real GPS or Simulation
    if (this.state.mode === 'real') {
      const ok = this.startRealGps();
      if (!ok) {
        // Fallback to simulation if GPS denied or unsupported
        console.warn('Real GPS unavailable, falling back to route simulation.');
        this.state.mode = 'simulate';
        this.startSimulation();
      }
    } else {
      this.startSimulation();
    }

    return true;
  }

  // ==========================================
  // STOP TRACKING (User clicked "Exit Bus")
  // ==========================================
  stopTracking(): void {
    if (!this.state.isTracking) return;

    this.stopGpsOrSim();
    this.releaseWakeLock();
    this.stopBackgroundKeepAlive();

    // Notify backend that tracking stopped
    socket.emit('bus:stop_tracking', { busId: this.state.busId });
    api.stopBusTracking(this.state.busId).catch(() => {});

    this.state.isTracking = false;
    this.state.currentLocation = null;
    this.state.startedAt = null;
    this.lastCoord = null;
    this.notify();
  }

  private stopGpsOrSim() {
    if (this.watchId !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    if (this.simTimer) {
      clearInterval(this.simTimer);
      this.simTimer = null;
    }
  }

  // Real GPS Geolocation Watcher
  private startRealGps(): boolean {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      this.state.gpsPermissionStatus = 'denied';
      this.state.error = 'Geolocation is not supported on this device/browser.';
      this.notify();
      return false;
    }

    this.watchId = navigator.geolocation.watchPosition(
      (pos) => {
        this.state.gpsPermissionStatus = 'granted';
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy || 5);

        // Derive speed: use pos.coords.speed if present (m/s -> km/h), else calculate from delta
        let speedKmh = 0;
        if (pos.coords.speed !== null && pos.coords.speed !== undefined && !isNaN(pos.coords.speed)) {
          speedKmh = Math.max(0, Math.round(pos.coords.speed * 3.6));
        } else if (this.lastCoord) {
          const now = Date.now();
          const dt = (now - this.lastCoord.time) / 1000; // seconds
          if (dt > 1) {
            const dLat = (lat - this.lastCoord.lat) * 111320;
            const dLng = (lng - this.lastCoord.lng) * 111320 * Math.cos(lat * (Math.PI / 180));
            const distMeters = Math.hypot(dLat, dLng);
            speedKmh = Math.min(120, Math.max(0, Math.round((distMeters / dt) * 3.6)));
          }
        }

        // Derive heading: use pos.coords.heading or angle from lastCoord
        let heading = 0;
        if (pos.coords.heading !== null && pos.coords.heading !== undefined && !isNaN(pos.coords.heading)) {
          heading = Math.round(pos.coords.heading);
        } else if (this.lastCoord) {
          const dLng = lng - this.lastCoord.lng;
          const dLat = lat - this.lastCoord.lat;
          heading = Math.round((Math.atan2(dLng, dLat) * 180) / Math.PI);
          if (heading < 0) heading += 360;
        }

        this.lastCoord = { lat, lng, time: Date.now() };

        this.handleNewLocation({
          latitude: lat,
          longitude: lng,
          speedKmh,
          heading,
          accuracy,
          timestamp: new Date().toISOString(),
          isBackground: document.visibilityState === 'hidden'
        });
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        if (err.code === err.PERMISSION_DENIED) {
          this.state.gpsPermissionStatus = 'denied';
          this.state.error = 'GPS permission denied. Please allow location access.';
        } else {
          this.state.error = `GPS search: ${err.message}`;
        }
        this.notify();
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000
      }
    );

    return true;
  }

  // Simulation fallback along route polyline
  private startSimulation() {
    const poly = this.routePolyline.length > 0 
      ? this.routePolyline 
      : [
          [28.5204, 77.2014],
          [28.5255, 77.2095],
          [28.5350, 77.2280],
          [28.5447, 77.2648],
          [28.5583, 77.3352],
          [28.5132, 77.3821],
          [28.4735, 77.4789],
          [28.47478, 77.476134]
        ];

    this.simTimer = setInterval(() => {
      this.simIndex = (this.simIndex + 1) % poly.length;
      const [lat, lng] = poly[this.simIndex];
      const prevCoord = poly[(this.simIndex - 1 + poly.length) % poly.length];

      const dLng = lng - prevCoord[1];
      const dLat = lat - prevCoord[0];
      let heading = Math.round((Math.atan2(dLng, dLat) * 180) / Math.PI);
      if (heading < 0) heading += 360;

      const simulatedSpeed = Math.floor(32 + Math.random() * 16); // 32 - 48 km/h

      this.handleNewLocation({
        latitude: lat,
        longitude: lng,
        speedKmh: simulatedSpeed,
        heading,
        accuracy: 4,
        timestamp: new Date().toISOString(),
        isBackground: document.visibilityState === 'hidden'
      });
    }, 2000);
  }

  // Broadcast location over Socket.io and REST fallback
  private handleNewLocation(update: TrackerLocationUpdate) {
    this.state.currentLocation = update;
    this.state.packetsSent += 1;
    this.notify();

    // 1. High-frequency Socket.IO real-time broadcast
    socket.emit('bus:send_location', {
      busId: this.state.busId,
      latitude: update.latitude,
      longitude: update.longitude,
      speed_kmh: update.speedKmh,
      heading: update.heading,
      accuracy_meters: update.accuracy
    });

    // Also emit driver:send_location for legacy listener compatibility
    socket.emit('driver:send_location', {
      busId: this.state.busId,
      latitude: update.latitude,
      longitude: update.longitude,
      speed_kmh: update.speedKmh,
      heading: update.heading,
      accuracy_meters: update.accuracy
    });

    // 2. Periodic REST fallback every ~10 updates (in case socket drops)
    if (this.state.packetsSent % 8 === 0) {
      api.sendBusLocation(this.state.busId, {
        latitude: update.latitude,
        longitude: update.longitude,
        speed_kmh: update.speedKmh,
        heading: update.heading,
        accuracy_meters: update.accuracy
      }).catch(() => {});
    }
  }

  // ==========================================
  // BACKGROUND RUNTIME KEEP-ALIVE SYSTEM
  // ==========================================
  // Plays a silent audio buffer loop with MediaSession metadata so mobile OS
  // does not pause JavaScript execution or GPS when phone screen dims or tab is backgrounded.
  private startBackgroundKeepAlive() {
    try {
      // 1. Silent HTML5 Audio Element Loop
      // Tiny 1-second silent WAV base64
      const silentWav = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
      this.audioElement = new Audio(silentWav);
      this.audioElement.loop = true;
      this.audioElement.volume = 0.001; // virtually silent
      this.audioElement.play().catch(e => {
        console.log('Background audio play deferred (will activate on user interaction):', e.message);
      });

      // 2. Register Web Audio API buffer tick
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
        // Keep AudioContext clock active
        this.audioInterval = setInterval(() => {
          if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume().catch(() => {});
          }
        }, 3000);
      }

      // 3. MediaSession API (marks active media session on iOS & Android lockscreen)
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: 'Bus 01 Live Location',
          artist: 'Inside Bus Live Telemetry',
          album: 'Saket → Delhi Technical Campus',
          artwork: [
            { src: '/bus-icon.svg', sizes: '96x96', type: 'image/svg+xml' }
          ]
        });
        navigator.mediaSession.playbackState = 'playing';
      }

      this.state.backgroundKeepAliveActive = true;
      this.notify();
    } catch (err: any) {
      console.warn('Could not start audio keep-alive:', err.message);
    }
  }

  private stopBackgroundKeepAlive() {
    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.src = '';
      } catch (e) {}
      this.audioElement = null;
    }
    if (this.audioInterval) {
      clearInterval(this.audioInterval);
      this.audioInterval = null;
    }
    if (this.audioCtx) {
      try {
        this.audioCtx.close().catch(() => {});
      } catch (e) {}
      this.audioCtx = null;
    }
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = 'none';
    }
    this.state.backgroundKeepAliveActive = false;
    this.notify();
  }

  // ==========================================
  // SCREEN WAKE LOCK API
  // ==========================================
  private async requestWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        this.wakeLock = await (navigator as any).wakeLock.request('screen');
        this.state.wakeLockActive = true;
        this.notify();

        this.wakeLock.addEventListener('release', () => {
          this.state.wakeLockActive = false;
          this.notify();
        });
      } catch (err: any) {
        console.warn('Screen WakeLock error:', err.message);
      }
    }
  }

  private releaseWakeLock() {
    if (this.wakeLock) {
      try {
        this.wakeLock.release().catch(() => {});
      } catch (e) {}
      this.wakeLock = null;
      this.state.wakeLockActive = false;
      this.notify();
    }
  }

  // Handle visibility change (screen lock or app switch)
  private handleVisibilityChange = async () => {
    if (!this.state.isTracking) return;

    if (document.visibilityState === 'visible') {
      // Re-acquire WakeLock if released while in background
      if (!this.wakeLock) {
        await this.requestWakeLock();
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
    } else {
      // Running in background during active travel
      console.log('📱 Background travel mode active: keeping GPS and live telemetry awake.');
    }
  };

  // Notification helper
  private async requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch (e) {}
    }
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('🚌 Inside Bus 01: Location Tracking Active', {
          body: 'Your phone is updating live bus location for passengers on Route 01. Background tracking active.',
          icon: '/bus-icon.svg',
          tag: 'inside-bus-tracking-active',
          silent: true
        });
      } catch (e) {}
    }
  }
}

export const backgroundTracker = new BackgroundTrackerService();
