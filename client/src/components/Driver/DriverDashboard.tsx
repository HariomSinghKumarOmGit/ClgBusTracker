// client/src/components/Driver/DriverDashboard.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Bus, BusRoute, RouteStop, Trip, Driver } from '../../types';
import { api } from '../../services/api';
import { socket } from '../../services/socket';
import { 
  Play, 
  Square, 
  Navigation, 
  Wifi, 
  WifiOff, 
  Compass, 
  AlertTriangle, 
  Lock, 
  Unlock, 
  ShieldCheck, 
  Zap, 
  Radio,
  Clock,
  RotateCcw
} from 'lucide-react';

interface DriverDashboardProps {
  bus: Bus | null;
  route: BusRoute | null;
  stops: RouteStop[];
  activeTrip: Trip | null;
  driver: Driver | null;
  onTripStarted: (trip: Trip) => void;
  onTripEnded: () => void;
}

export const DriverDashboard: React.FC<DriverDashboardProps> = ({
  bus,
  route,
  stops,
  activeTrip,
  driver,
  onTripStarted,
  onTripEnded
}) => {
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'searching' | 'active' | 'denied'>('idle');
  const [networkOnline, setNetworkOnline] = useState(navigator.onLine);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [mode, setMode] = useState<'real' | 'simulate'>('simulate'); // Default simulate for easy testing, or real
  const [simSpeed, setSimSpeed] = useState<number>(2); // 1x, 2x, 5x
  const [packetsSent, setPacketsSent] = useState(0);
  const [lastGpsUpdate, setLastGpsUpdate] = useState<Date | null>(null);
  const [currentSpeed, setCurrentSpeed] = useState<number>(0);
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [accuracy, setAccuracy] = useState<number>(5);
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [trafficDelayMins, setTrafficDelayMins] = useState<number>(0);

  const watchIdRef = useRef<number | null>(null);
  const simIndexRef = useRef<number>(0);
  const simTimerRef = useRef<any>(null);
  const wakeLockRef = useRef<any>(null);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setNetworkOnline(true);
    const handleOffline = () => setNetworkOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Request Screen Wake Lock API to prevent phone screen from dimming/sleeping while driving
  const requestWakeLock = async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        setWakeLockActive(true);
        wakeLockRef.current.addEventListener('release', () => {
          setWakeLockActive(false);
        });
      } catch (err: any) {
        console.warn('Wake Lock request failed:', err.message);
      }
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
      setWakeLockActive(false);
    }
  };

  // Transmit location packet to server
  const broadcastLocation = (lat: number, lng: number, speed: number, heading: number, acc: number) => {
    if (!activeTrip) return;

    setCurrentCoords({ lat, lng });
    setCurrentSpeed(speed);
    setAccuracy(acc);
    setLastGpsUpdate(new Date());
    setPacketsSent(p => p + 1);

    // High frequency Socket.IO emit
    socket.emit('driver:send_location', {
      tripId: activeTrip.id,
      latitude: lat,
      longitude: lng,
      speed_kmh: speed,
      heading,
      accuracy_meters: acc,
      delay_mins: trafficDelayMins
    });
  };

  // Real GPS Geolocation Watcher
  const startRealGps = () => {
    if (!navigator.geolocation) {
      setGpsStatus('denied');
      alert('Geolocation is not supported by your mobile browser.');
      return;
    }

    setGpsStatus('searching');
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsStatus('active');
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const speed = (pos.coords.speed !== null && pos.coords.speed !== undefined) 
          ? Math.max(0, Math.round(pos.coords.speed * 3.6)) 
          : 35;
        const heading = pos.coords.heading || 0;
        const acc = Math.round(pos.coords.accuracy || 5);
        broadcastLocation(lat, lng, speed, heading, acc);
      },
      (err) => {
        console.error('GPS error:', err);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsStatus('denied');
        } else {
          setGpsStatus('searching');
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 8000
      }
    );
  };

  // Simulation Mode Driver (follows real road coordinates from Saket to DTC)
  const startSimulation = () => {
    if (!route || route.polyline.length === 0) return;
    setGpsStatus('active');

    simTimerRef.current = setInterval(() => {
      const poly = route.polyline;
      const index = simIndexRef.current;
      const nextIndex = (index + simSpeed) % poly.length;
      simIndexRef.current = nextIndex;

      const [lat, lng] = poly[nextIndex];
      const prevCoord = poly[index];

      // Calculate bearing angle
      const dLng = lng - prevCoord[1];
      const dLat = lat - prevCoord[0];
      const heading = (Math.atan2(dLng, dLat) * 180) / Math.PI;

      // Realistic speed (30-55 km/h)
      const simulatedSpeed = Math.floor(35 + Math.random() * 15);
      broadcastLocation(lat, lng, simulatedSpeed, Math.round(heading), 4);
    }, 1500);
  };

  // Stop location broadcasting
  const stopLocationSharing = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (simTimerRef.current) {
      clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }
    setGpsStatus('idle');
    releaseWakeLock();
  };

  // Manage location tracking based on trip status
  useEffect(() => {
    if (activeTrip && activeTrip.status === 'ACTIVE') {
      requestWakeLock();
      if (mode === 'real') {
        startRealGps();
      } else {
        startSimulation();
      }
    } else {
      stopLocationSharing();
    }

    return () => {
      stopLocationSharing();
    };
  }, [activeTrip?.id, mode, simSpeed]);

  // Handle START TRIP
  const handleStartTrip = async () => {
    if (!bus || !route) return;
    setIsStarting(true);
    try {
      const firstStop = stops[0];
      const res = await api.startTrip(
        bus.id,
        route.id,
        driver?.id || 'DRV-01',
        firstStop?.latitude,
        firstStop?.longitude
      );
      onTripStarted(res.trip);
      setPacketsSent(0);
    } catch (err: any) {
      alert('Failed to start trip: ' + err.message);
    } finally {
      setIsStarting(false);
    }
  };

  // Handle STOP TRIP
  const handleStopTrip = async () => {
    if (!activeTrip) return;
    if (!confirm('Are you sure you want to complete and end this bus trip?')) return;
    setIsEnding(true);
    try {
      await api.endTrip(activeTrip.id);
      stopLocationSharing();
      onTripEnded();
    } catch (err: any) {
      alert('Failed to end trip: ' + err.message);
    } finally {
      setIsEnding(false);
    }
  };

  // Report Traffic Delay
  const handleReportDelay = async (mins: number) => {
    setTrafficDelayMins(mins);
    await api.broadcastNotification(
      `Traffic Delay Reported (${mins} mins)`,
      `Driver ${driver?.name || 'Rajesh'} has reported a traffic slowdown on Route 01. ETAs adjusted.`,
      'DELAYED'
    );
    alert(`Traffic delay of +${mins} mins broadcasted to students.`);
  };

  return (
    <div className="flex flex-col h-[100dvh] overflow-y-auto bg-slate-900 text-white p-4 pt-safe pb-28 max-w-md mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight">Driver Cockpit</h1>
            <p className="text-xs text-slate-400">
              {driver?.name || 'Assigned Driver'} • {bus?.plate_number}
            </p>
          </div>
        </div>

        {/* Network status pill */}
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
          networkOnline ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'
        }`}>
          {networkOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          <span>{networkOnline ? 'ONLINE' : 'OFFLINE'}</span>
        </div>
      </div>

      <div className="space-y-4 pt-4">
        {/* BUS & ROUTE ASSIGNMENT CARD */}
        <div className="bg-slate-800/90 rounded-2xl p-4 border border-slate-700/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
              Assigned Bus & Route
            </span>
            <span className="text-xs font-bold bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">
              {bus?.number || 'Bus 01'}
            </span>
          </div>

          <div className="text-sm font-extrabold text-white">
            {route?.name || 'Route 01: Saket → Delhi Technical Campus'}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-700/60">
            <span>Stoppages: {stops.length} stops</span>
            <span>Total: ~{route?.distance_km} km</span>
          </div>
        </div>

        {/* BIG TACTILE START / END TRIP BUTTON */}
        {!activeTrip ? (
          <button
            onClick={handleStartTrip}
            disabled={isStarting}
            className="w-full py-6 px-6 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 active:scale-[0.98] text-white rounded-3xl font-black text-xl tracking-wide shadow-xl shadow-emerald-900/40 flex items-center justify-center gap-3 transition-all"
          >
            <Play className="w-8 h-8 fill-white" />
            <span>{isStarting ? 'INITIALIZING TRIP...' : 'START TRIP'}</span>
          </button>
        ) : (
          <button
            onClick={handleStopTrip}
            disabled={isEnding}
            className="w-full py-6 px-6 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 active:scale-[0.98] text-white rounded-3xl font-black text-xl tracking-wide shadow-xl shadow-red-900/40 flex items-center justify-center gap-3 transition-all animate-pulse"
          >
            <Square className="w-7 h-7 fill-white" />
            <span>{isEnding ? 'ENDING TRIP...' : 'END TRIP'}</span>
          </button>
        )}

        {/* LIVE GPS TRANSMISSION TELEMETRY HUD */}
        <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              Live GPS Telemetry
            </span>
            <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
              gpsStatus === 'active' 
                ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-600'
                : gpsStatus === 'searching'
                ? 'bg-amber-900/60 text-amber-300 animate-pulse'
                : 'bg-slate-700 text-slate-400'
            }`}>
              {gpsStatus === 'active' ? '● BROADCASTING' : gpsStatus === 'searching' ? 'SEARCHING GPS' : 'GPS IDLE'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            {/* Speed */}
            <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-semibold block">SPEED</span>
              <span className="text-2xl font-black text-blue-400">{currentSpeed}</span>
              <span className="text-[9px] text-slate-500 block">km/h</span>
            </div>

            {/* Packets */}
            <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-semibold block">PACKETS</span>
              <span className="text-2xl font-black text-emerald-400">{packetsSent}</span>
              <span className="text-[9px] text-slate-500 block">sent to cloud</span>
            </div>

            {/* Accuracy */}
            <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-semibold block">ACCURACY</span>
              <span className="text-2xl font-black text-amber-400">±{accuracy}</span>
              <span className="text-[9px] text-slate-500 block">meters</span>
            </div>
          </div>

          {/* Current coordinates & last update */}
          {currentCoords && (
            <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
              <span>GPS: {currentCoords.lat.toFixed(5)}, {currentCoords.lng.toFixed(5)}</span>
              <span>Updated: {lastGpsUpdate ? lastGpsUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--'}</span>
            </div>
          )}
        </div>

        {/* GPS TRANSMISSION MODE TOGGLE (REAL DEVICE VS ROUTE SIMULATOR) */}
        <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">GPS Mode</h3>
              <p className="text-[11px] text-slate-400">Choose between real phone GPS or test simulator</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setMode('simulate')}
              className={`p-3 rounded-xl border text-xs font-bold text-center transition-all ${
                mode === 'simulate'
                  ? 'bg-blue-600 text-white border-blue-400 shadow-md'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              🚗 Route Simulator
              <span className="text-[10px] block font-normal opacity-80 mt-0.5">
                Auto-drives Saket → DTC
              </span>
            </button>

            <button
              onClick={() => setMode('real')}
              className={`p-3 rounded-xl border text-xs font-bold text-center transition-all ${
                mode === 'real'
                  ? 'bg-blue-600 text-white border-blue-400 shadow-md'
                  : 'bg-slate-900 text-slate-400 border-slate-800'
              }`}
            >
              📡 Real Device GPS
              <span className="text-[10px] block font-normal opacity-80 mt-0.5">
                Uses Phone Geolocation
              </span>
            </button>
          </div>

          {/* Speed multiplier for simulator */}
          {mode === 'simulate' && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-700 text-xs">
              <span className="text-slate-400">Simulation Speed:</span>
              <div className="flex gap-1">
                {[1, 2, 5].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setSimSpeed(spd)}
                    className={`px-2.5 py-1 rounded-lg font-bold ${
                      simSpeed === spd
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SCREEN WAKE LOCK & BACKGROUND LOCATION HELPER */}
        <div className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700 text-xs text-slate-300 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-white">
              {wakeLockActive ? <Lock className="w-4 h-4 text-emerald-400" /> : <Unlock className="w-4 h-4 text-amber-400" />}
              <span>Screen WakeLock: {wakeLockActive ? 'Active (Screen Won’t Sleep)' : 'Inactive'}</span>
            </div>
            <button
              onClick={requestWakeLock}
              className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 underline"
            >
              Re-engage
            </button>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            💡 <strong className="text-slate-300">Background GPS Note:</strong> Mobile OS (Android/iOS) may freeze background JavaScript timers when minimized. Keep the driver screen awake or in split-screen mode while driving for continuous real-time transmission.
          </p>
        </div>

        {/* QUICK TRAFFIC DELAY BROADCAST */}
        <div className="bg-slate-800/80 rounded-2xl p-4 border border-slate-700 space-y-2">
          <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold block">
            Report Traffic Slowdown
          </span>
          <div className="grid grid-cols-3 gap-2">
            {[5, 10, 15].map((mins) => (
              <button
                key={mins}
                onClick={() => handleReportDelay(mins)}
                className="py-2 px-3 bg-slate-700/80 hover:bg-amber-600/30 text-amber-300 rounded-xl text-xs font-bold border border-slate-600 transition-colors"
              >
                +{mins} Mins Delay
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
