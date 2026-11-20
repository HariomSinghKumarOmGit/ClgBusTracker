// client/src/components/Bus/InsideBusController.tsx
import React, { useState, useEffect } from 'react';
import { backgroundTracker, TrackerState } from '../../services/backgroundTracker';
import { 
  Bus as BusIcon, 
  Navigation, 
  Radio, 
  ShieldCheck, 
  Square, 
  Zap, 
  ChevronDown, 
  ChevronUp, 
  Lock,
  Volume2,
  MapPin
} from 'lucide-react';

interface InsideBusControllerProps {
  busNumber?: string;
  routeName?: string;
  routePolyline?: [number, number][];
  className?: string;
  compact?: boolean;
  onRecenter?: () => void;
}

export const InsideBusController: React.FC<InsideBusControllerProps> = ({
  busNumber = 'Bus 01',
  routeName = 'Saket → Delhi Technical Campus',
  routePolyline = [],
  className = '',
  compact = false,
  onRecenter
}) => {
  const [trackerState, setTrackerState] = useState<TrackerState>(backgroundTracker.getState());
  const [isExpanded, setIsExpanded] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Sync with backgroundTracker service
  useEffect(() => {
    if (routePolyline.length > 0) {
      backgroundTracker.setRoutePolyline(routePolyline);
    }
    const unsubscribe = backgroundTracker.subscribe((state) => {
      setTrackerState(state);
    });
    return () => unsubscribe();
  }, [routePolyline]);

  // Elapsed travel timer
  useEffect(() => {
    if (!trackerState.isTracking || !trackerState.startedAt) {
      setElapsedSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - trackerState.startedAt!.getTime()) / 1000);
      setElapsedSeconds(diff);
    }, 1000);

    return () => clearInterval(interval);
  }, [trackerState.isTracking, trackerState.startedAt]);

  const formatElapsed = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleStart = async () => {
    try {
      await backgroundTracker.startTracking('BUS-01', 'ROUTE-01');
      if (onRecenter) {
        setTimeout(onRecenter, 600);
      }
    } catch (e) {
      console.error('Failed to start tracking:', e);
    }
  };

  const handleStop = () => {
    backgroundTracker.stopTracking();
  };

  const currentSpeed = trackerState.currentLocation?.speedKmh ?? 0;
  const currentAcc = trackerState.currentLocation?.accuracy ?? 5;
  const currentHeading = trackerState.currentLocation?.heading ?? 0;

  // -------------------------------------------------------------
  // COMPACT VIEW (Single-Row 2-Column Side-by-Side Mode)
  // -------------------------------------------------------------
  if (compact) {
    if (trackerState.isTracking) {
      return (
        <div className={`h-[88px] bg-gradient-to-br from-emerald-950 via-slate-900 to-emerald-950 backdrop-blur-md rounded-2xl p-2.5 shadow-md border border-emerald-500/40 text-white flex flex-col justify-between select-none ${className}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-black tracking-wide text-emerald-300 uppercase">
                ON BUS
              </span>
            </div>
            <span className="text-[9px] font-mono font-bold bg-white/10 px-1.5 py-0.2 rounded text-emerald-300">
              {formatElapsed(elapsedSeconds)}
            </span>
          </div>

          <div className="flex items-baseline justify-between my-0.5">
            <div className="flex items-baseline gap-0.5">
              <span className="text-xl font-black text-emerald-400 leading-none">
                {currentSpeed}
              </span>
              <span className="text-[10px] text-slate-300 font-normal">km/h</span>
            </div>
            <span className="text-[10px] text-blue-300 font-bold">±{currentAcc}m</span>
          </div>

          <div className="flex items-center gap-1.5 pt-1 border-t border-white/10">
            {onRecenter && (
              <button
                onClick={onRecenter}
                className="flex-1 py-1 bg-blue-600/90 hover:bg-blue-600 text-white text-[10px] font-bold rounded-lg shadow-sm flex items-center justify-center gap-0.5 active:scale-95 transition-all"
                title="Locate real phone position on map"
              >
                <MapPin className="w-2.5 h-2.5 fill-white" />
                <span>Locate</span>
              </button>
            )}

            <button
              onClick={handleStop}
              className="flex-1 py-1 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold rounded-lg shadow-sm flex items-center justify-center gap-0.5 active:scale-95 transition-all"
            >
              <Square className="w-2.5 h-2.5 fill-white" />
              <span>Exit</span>
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className={`h-[88px] bg-white/95 backdrop-blur-md rounded-2xl p-2.5 shadow-md border border-slate-200/90 flex flex-col justify-between select-none ${className}`}>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-slate-900 tracking-tight">Inside {busNumber}?</span>
          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
            Broadcaster
          </span>
        </div>
        <p className="text-[10px] text-slate-500 leading-tight">
          Locate & broadcast phone GPS
        </p>
        <button
          onClick={handleStart}
          className="w-full mt-0.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-1 border border-emerald-500"
        >
          <Navigation className="w-3 h-3 fill-white" />
          <span>I'm Inside Bus</span>
        </button>
      </div>
    );
  }

  // -------------------------------------------------------------
  // FULL VIEW: ACTIVE LIVE TRACKING
  // -------------------------------------------------------------
  if (trackerState.isTracking) {
    return (
      <div className={`w-full bg-gradient-to-r from-emerald-950/95 via-slate-900/95 to-emerald-950/95 backdrop-blur-md border border-emerald-500/40 rounded-2xl shadow-xl p-3 text-white transition-all duration-300 ${className}`}>
        {/* Top Active Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400">
                <BusIcon className="w-4 h-4 animate-pulse" />
              </div>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900 animate-ping"></span>
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900"></span>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-black tracking-wide text-emerald-300 uppercase">
                  INSIDE BUS ACTIVE
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono font-bold">
                  {formatElapsed(elapsedSeconds)}
                </span>
              </div>
              <p className="text-[10px] text-slate-300 font-medium">
                Broadcasting {busNumber} live phone location
              </p>
            </div>
          </div>

          {/* Action Buttons: Locate + Exit */}
          <div className="flex items-center gap-1.5">
            {onRecenter && (
              <button
                onClick={onRecenter}
                className="px-2.5 py-1.5 bg-blue-600/90 hover:bg-blue-600 active:scale-95 text-white text-[11px] font-bold rounded-xl shadow-md transition-all flex items-center gap-1 border border-blue-400/40"
                title="Locate real phone position on map"
              >
                <MapPin className="w-3 h-3 fill-white" />
                <span>Locate</span>
              </button>
            )}

            <button
              onClick={handleStop}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-[11px] font-bold rounded-xl shadow-md transition-all flex items-center gap-1 border border-rose-400/50"
            >
              <Square className="w-3 h-3 fill-white" />
              <span>Exit Bus</span>
            </button>
          </div>
        </div>

        {/* Live Telemetry Row */}
        <div className="grid grid-cols-4 gap-1.5 mt-2.5 pt-2 border-t border-white/10 text-center">
          <div className="bg-white/5 rounded-lg py-1 px-1">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">Speed</span>
            <span className="text-xs font-black text-emerald-400">{currentSpeed} <span className="text-[9px] font-normal text-slate-300">km/h</span></span>
          </div>

          <div className="bg-white/5 rounded-lg py-1 px-1">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">Accuracy</span>
            <span className="text-xs font-black text-blue-300">±{currentAcc}m</span>
          </div>

          <div className="bg-white/5 rounded-lg py-1 px-1">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">Packets</span>
            <span className="text-xs font-black text-amber-300">{trackerState.packetsSent}</span>
          </div>

          <div className="bg-white/5 rounded-lg py-1 px-1">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">BG Lock</span>
            <span className="text-[11px] font-bold text-emerald-300 flex items-center justify-center gap-0.5 mt-0.5">
              <Zap className="w-2.5 h-2.5 text-emerald-400" />
              <span>ON</span>
            </span>
          </div>
        </div>

        {/* Background Keep-Alive Banner */}
        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-300 bg-white/5 px-2 py-1 rounded-lg border border-white/5">
          <div className="flex items-center gap-1.5">
            <Volume2 className="w-3 h-3 text-emerald-400" />
            <span className="font-semibold text-emerald-300">Background Keep-Alive Active:</span>
            <span className="text-slate-400 text-[9px]">Updates when phone is locked</span>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-400 hover:text-white p-0.5"
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Expandable Technical Controls */}
        {isExpanded && (
          <div className="mt-2 pt-2 border-t border-white/10 space-y-1.5 text-xs text-slate-300 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400">Tracking Source:</span>
              <div className="flex bg-black/40 rounded-lg p-0.5 border border-white/10 text-[10px]">
                <button
                  onClick={() => backgroundTracker.setMode('real')}
                  className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                    trackerState.mode === 'real'
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  📱 Device GPS
                </button>
                <button
                  onClick={() => backgroundTracker.setMode('simulate')}
                  className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                    trackerState.mode === 'simulate'
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🛣️ Test Sim
                </button>
              </div>
            </div>

            {trackerState.currentLocation && (
              <div className="bg-black/40 p-1.5 rounded-lg font-mono text-[10px] text-slate-300 flex justify-between">
                <span>Lat: {trackerState.currentLocation.latitude.toFixed(6)}</span>
                <span>Lng: {trackerState.currentLocation.longitude.toFixed(6)}</span>
                <span>Hdg: {currentHeading}°</span>
              </div>
            )}

            <div className="flex items-center gap-1 text-[9px] text-emerald-300/90 pt-0.5">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>Strict Travel Privacy: Location tracking ends the moment you tap Exit Bus.</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // FULL VIEW: IDLE STATE
  // -------------------------------------------------------------
  return (
    <div className={`w-full bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/90 p-3 transition-all duration-300 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        {/* Left Info */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/80 shrink-0">
            <BusIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-black text-slate-900 tracking-tight">
                Are you inside {busNumber}?
              </h4>
              <span className="text-[9px] font-semibold bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded border border-emerald-200">
                GPS Broadcaster
              </span>
            </div>
            <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
              Tap to locate and track real bus position on map
            </p>
          </div>
        </div>

        {/* Start Bus Button */}
        <button
          onClick={handleStart}
          className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black rounded-xl shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-1.5 whitespace-nowrap border border-emerald-500"
        >
          <Navigation className="w-3.5 h-3.5 fill-white" />
          <span>I'm Inside Bus</span>
        </button>
      </div>

      {/* Privacy Guarantee Note */}
      <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-400">
        <div className="flex items-center gap-1">
          <Lock className="w-3 h-3 text-slate-400" />
          <span>If not inside the bus, don't tap. Zero location tracking when idle.</span>
        </div>
        <span className="text-[9px] font-medium text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded">
          BG Active during trip
        </span>
      </div>
    </div>
  );
};
