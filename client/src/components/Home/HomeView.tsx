// client/src/components/Home/HomeView.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapContainer, Polyline, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Bus, BusRoute, RouteStop, OffTrackPassenger } from '../../types';
import { createImage1BusMarkerIcon, createImage1StopMarkerIcon, createAccuratePersonMarkerIcon, createOffTrackEmojiMarkerIcon } from '../Map/CustomMarkers';
import { X, Pin, Bell, Navigation as NavIcon, Radio, CheckCircle2, MapPin } from 'lucide-react';
import { GoogleMapTileLayer, GoogleMapZoomButtons, GoogleMapLayerSelector, LiveTrafficBadge } from '../Map/MapControls';
import { MapTheme, DEFAULT_MAP_THEME } from '../Map/mapConfig';
import { InsideBusController } from '../Bus/InsideBusController';
import { backgroundTracker } from '../../services/backgroundTracker';
import { isPointOnTrack } from '../../utils/geoUtils';
import { snapToPolyline } from '../../utils/trackSnapping';

interface HomeViewProps {
  route: BusRoute | null;
  bus: Bus | null;
  stops: RouteStop[];
  onOpenAlerts: () => void;
  onOpenStopSelector?: () => void;
  userEmoji?: string;
  userStopName?: string;
}

function MapViewController({
  busCoord,
  personCoord,
  recenterTrigger,
  fitRouteTrigger,
  routePolyline
}: {
  busCoord: [number, number] | null;
  personCoord: [number, number] | null;
  recenterTrigger: number;
  fitRouteTrigger: number;
  routePolyline: [number, number][];
}) {
  const map = useMap();
  const initialFit = useRef(false);

  useEffect(() => {
    if (recenterTrigger > 0) {
      const target = personCoord || busCoord;
      if (target) {
        map.flyTo(target, 16, { animate: true, duration: 1.2 });
      }
    }
  }, [recenterTrigger, busCoord, personCoord, map]);

  useEffect(() => {
    if (fitRouteTrigger > 0 && routePolyline.length > 0) {
      const bounds = L.latLngBounds(routePolyline);
      map.fitBounds(bounds, { padding: [50, 50], animate: true });
    }
  }, [fitRouteTrigger, routePolyline, map]);

  useEffect(() => {
    if (!initialFit.current && routePolyline.length > 0) {
      const bounds = L.latLngBounds(routePolyline);
      map.fitBounds(bounds, { padding: [35, 35] });
      initialFit.current = true;
    }
  }, [routePolyline, map]);

  return null;
}

export const HomeView: React.FC<HomeViewProps> = ({
  route,
  bus,
  stops,
  onOpenAlerts,
  onOpenStopSelector,
  userEmoji = '😎',
  userStopName = '15th'
}) => {
  const [recenterCount, setRecenterCount] = useState(0);
  const [fitRouteCount, setFitRouteCount] = useState(0);
  const [isPinned, setIsPinned] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [selectedArrivalIndex, setSelectedArrivalIndex] = useState(0);
  const [countdownSeconds, setCountdownSeconds] = useState(32);
  const [mapTheme, setMapTheme] = useState<MapTheme>(DEFAULT_MAP_THEME);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

  const handleToggleTraffic = () => {
    if (mapTheme === 'google-traffic') {
      setMapTheme('google-streets');
      showToast('Live traffic layer turned off');
    } else {
      setMapTheme('google-traffic');
      showToast('🟢 Google Live Traffic enabled');
    }
  };

  // Person GPS Location state — strictly populated ONLY when "Inside Bus" tracking is active
  const [isInsideBus, setIsInsideBus] = useState<boolean>(() => backgroundTracker.getState().isTracking);
  const [activeUserEmoji, setActiveUserEmoji] = useState<string>(() => backgroundTracker.getState().userEmoji || userEmoji || '😎');
  const [isPersonOnTrack, setIsPersonOnTrack] = useState<boolean>(() => backgroundTracker.getState().isOnTrack);
  const [personLocation, setPersonLocation] = useState<[number, number] | null>(null);
  const [personAccuracy, setPersonAccuracy] = useState<number | null>(null);

  const [currentBusCoord, setCurrentBusCoord] = useState<[number, number]>(() => {
    if (bus?.last_known_location) {
      return [bus.last_known_location.latitude, bus.last_known_location.longitude];
    }
    return [28.5204, 77.2014];
  });

  // Keep bus coordinate in sync with live socket telemetry from any broadcasting device
  useEffect(() => {
    if (bus?.last_known_location) {
      setCurrentBusCoord([bus.last_known_location.latitude, bus.last_known_location.longitude]);
    }
  }, [bus?.last_known_location?.latitude, bus?.last_known_location?.longitude]);

  // Synchronize location strictly with backgroundTracker
  // 1. If user has NOT clicked "I'm Inside Bus": personLocation is null, zero location is tracked or shown.
  // 2. If user clicked "I'm Inside Bus":
  //    - If on track: person is inside bus, bus is located where max locations are clustered, emoji shown under bus.
  //    - If off track: person's location is shown by their individual emoji, not by bus.
  useEffect(() => {
    let hasCenteredOnce = false;
    let lastTrackState = true;
    const unsub = backgroundTracker.subscribe((state) => {
      setIsInsideBus(state.isTracking);
      setActiveUserEmoji(state.userEmoji);
      setIsPersonOnTrack(state.isOnTrack);

      if (state.isTracking && state.currentLocation) {
        const realCoord: [number, number] = [
          state.currentLocation.latitude,
          state.currentLocation.longitude
        ];
        setPersonLocation(realCoord);
        setPersonAccuracy(state.currentLocation.accuracy);

        // User Rule:
        // Bus can move out of track ONLY if max locations out of track >= 3.
        // If less than three (< 3): ignore, keep bus on track (snapped)!
        if (state.isOnTrack) {
          if (!lastTrackState) {
            lastTrackState = true;
            showToast(`🟢 On Track: Verified on route with ${bus?.number || 'Bus 01'}`);
          }
          setCurrentBusCoord(realCoord);
        } else if (state.consecutiveOffTrackCount >= 3) {
          // Qualified: 3 or more locations out of track -> bus moves out of track!
          if (lastTrackState) {
            lastTrackState = false;
            showToast(`⚠️ Off Track: Bus detour confirmed (3+ points out of track)`);
          }
          setCurrentBusCoord(realCoord);
        } else {
          // Less than 3: ignore deviation, keep bus on track (snapped)!
          const snapped = snapToPolyline(realCoord[0], realCoord[1], polylineCoords);
          setCurrentBusCoord(snapped.snappedPoint);
          if (lastTrackState && state.consecutiveOffTrackCount === 1) {
            showToast(`📍 Minor deviation (${state.consecutiveOffTrackCount}/3) ignored: keeping bus on track`);
          }
        }

        // Auto fly map to real phone GPS location on first fix
        if (!hasCenteredOnce) {
          hasCenteredOnce = true;
          setRecenterCount(c => c + 1);
        }
      } else {
        // Not inside the bus or tracking stopped: completely clear location
        setPersonLocation(null);
        setPersonAccuracy(null);
        hasCenteredOnce = false;
        lastTrackState = true;
      }
    });
    return () => unsub();
  }, [bus?.number]);

  // Follow bus if user enabled "FOLLOWING / GO"
  useEffect(() => {
    if (isNavigating && currentBusCoord) {
      setRecenterCount(c => c + 1);
    }
  }, [isNavigating, currentBusCoord[0], currentBusCoord[1]]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdownSeconds(prev => {
        if (prev <= 1) return 45;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Dynamically calculate the Next Stop & ETA based on real bus GPS coordinates
  const nextStopInfo = useMemo(() => {
    if (!stops || stops.length === 0) {
      return {
        name: 'Delhi Technical Campus',
        stopIndex: 6,
        totalStops: 6,
        distKm: 1.2,
        etaMinutes: 2,
        scheduledTime: '09:00 AM',
        isTerminal: true
      };
    }

    const [bLat, bLng] = currentBusCoord;

    // Find nearest stop along route
    let minDistance = Infinity;
    let closestIndex = 0;

    stops.forEach((stop, index) => {
      const d = Math.hypot(stop.latitude - bLat, stop.longitude - bLng) * 111;
      if (d < minDistance) {
        minDistance = d;
        closestIndex = index;
      }
    });

    // If within 300m of a stop, target the next upcoming stop unless at destination
    let nextIndex = closestIndex;
    if (minDistance < 0.3 && closestIndex < stops.length - 1) {
      nextIndex = closestIndex + 1;
    }

    const targetStop = stops[nextIndex] || stops[stops.length - 1];
    const distToTargetKm = Math.hypot(targetStop.latitude - bLat, targetStop.longitude - bLng) * 111;

    const currentSpeed = bus?.last_known_location?.speed_kmh || 0;
    const effectiveSpeed = currentSpeed > 8 ? currentSpeed : 35; // 35 km/h urban speed
    const etaMinutes = Math.max(1, Math.round((distToTargetKm / effectiveSpeed) * 60));

    return {
      name: targetStop.name,
      stopIndex: nextIndex + 1,
      totalStops: stops.length,
      distKm: Number(distToTargetKm.toFixed(1)),
      etaMinutes,
      scheduledTime: targetStop.scheduled_time || '09:00 AM',
      isTerminal: targetStop.is_terminal
    };
  }, [stops, currentBusCoord, bus?.last_known_location?.speed_kmh]);

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {}
  };

  const handleTogglePin = () => {
    setIsPinned(!isPinned);
    playBeep();
    showToast(!isPinned ? 'Route 01 pinned to your favorites!' : 'Route unpinned');
  };

  const handleToggleGo = () => {
    playBeep();
    const nextState = !isNavigating;
    setIsNavigating(nextState);
    if (nextState) {
      showToast('🚀 Live Following Bus — Map will track live location.');
      setRecenterCount(c => c + 1);
    } else {
      showToast('Live following paused.');
    }
  };

  const handleReset = () => {
    setIsNavigating(false);
    setFitRouteCount(c => c + 1);
    showToast('Map view reset to entire route.');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const polylineCoords: [number, number][] = route?.polyline && route.polyline.length > 0 
    ? route.polyline 
    : [
        [28.5350, 77.1980],
        [28.5312, 77.2020],
        [28.5280, 77.2060],
        [28.5255, 77.2095],
        [28.5230, 77.2135],
        [28.5200, 77.2170],
        [28.5165, 77.2215],
        [28.5130, 77.2260],
        [28.5080, 77.2320],
        [28.5040, 77.2380]
      ];

  const currentRouteCode = route?.code || '01';
  const currentDirection = route?.direction || '➔ Eastbound to Delhi Technical Campus';

  return (
    <div className="relative w-full h-full max-w-md mx-auto overflow-hidden bg-slate-100 flex flex-col font-sans select-none">
      
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[600] px-4 py-2 bg-slate-900/90 text-white text-xs font-semibold rounded-full shadow-2xl backdrop-blur-md animate-fade-in flex items-center gap-2 border border-white/20 whitespace-nowrap">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP HEADER OVERLAY (Image 1 Style) */}
      <div className="absolute top-3 left-4 right-4 z-[500] flex items-start justify-between pointer-events-none">
        
        {/* Left Side: Avatar Stop Pill + Giant Route Number "38" */}
        <div className="flex flex-col items-start pointer-events-auto">
          <button
            onClick={onOpenStopSelector}
            className="flex items-center gap-1.5 px-3 py-1 bg-white/95 backdrop-blur-md rounded-full shadow-md border border-slate-200/80 hover:bg-slate-50 transition-all active:scale-95 group"
            title="Click to view or change pickup stop"
          >
            <span className="text-sm">{userEmoji}</span>
            <span className="text-xs font-black text-[#1e3a8a] tracking-tight">{userStopName}</span>
          </button>

          {/* Giant Bold Route Number (Image 1 Exact Bold Typography) */}
          <h1 className="mt-1 text-7xl font-black text-[#1e3a8a] tracking-tighter leading-none drop-shadow-sm select-none">
            {currentRouteCode}
          </h1>

          {/* Live Google Traffic Status Badge */}
          <div className="mt-2 flex items-center gap-1.5">
            <LiveTrafficBadge
              isTrafficActive={mapTheme === 'google-traffic' || mapTheme === 'google-terrain'}
              onToggle={handleToggleTraffic}
              speedKmh={isNavigating ? 42 : 38}
            />
          </div>
        </div>

        {/* Right Side: Floating Vertical Stack of Circular Action Buttons */}
        <div className="flex flex-col gap-2 pointer-events-auto items-end">
          <button
            onClick={handleReset}
            className="w-11 h-11 rounded-full bg-white hover:bg-rose-50 text-rose-500 shadow-md border border-slate-200/80 flex items-center justify-center transition-all active:scale-90"
            title="Reset Map View"
          >
            <X className="w-5 h-5 stroke-[2.8]" />
          </button>

          <button
            onClick={handleTogglePin}
            className={`w-11 h-11 rounded-full bg-white shadow-md border border-slate-200/80 flex items-center justify-center transition-all active:scale-90 ${
              isPinned ? 'text-blue-600 bg-blue-50 ring-2 ring-blue-500' : 'text-slate-700 hover:text-blue-600'
            }`}
            title="Pin Route to Favorites"
          >
            <Pin className={`w-5 h-5 ${isPinned ? 'fill-blue-600' : ''}`} />
          </button>

          <button
            onClick={onOpenAlerts}
            className="w-11 h-11 rounded-full bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-500 shadow-md border border-slate-200/80 flex items-center justify-center transition-all active:scale-90 relative"
            title="Set Ride Alerts"
          >
            <Bell className="w-5 h-5 fill-slate-700 hover:fill-amber-500" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-blue-600"></span>
          </button>

          <button
            onClick={() => setRecenterCount(c => c + 1)}
            className="w-11 h-11 rounded-full bg-white hover:bg-blue-50 text-slate-800 hover:text-blue-600 shadow-md border border-slate-200/80 flex items-center justify-center transition-all active:scale-90"
            title="Recenter on Live Bus"
          >
            <NavIcon className="w-5 h-5 fill-slate-800" />
          </button>

          {/* Google Maps Layer Switcher */}
          <GoogleMapLayerSelector 
            currentTheme={mapTheme} 
            onSelectTheme={setMapTheme}
            dropdownAlign="right"
          />
        </div>
      </div>

      {/* FULL MAP VIEW (Modern Live Google Maps) */}
      <div className="flex-1 w-full relative">
        <MapContainer
          ref={setMapInstance}
          center={currentBusCoord}
          zoom={14}
          maxZoom={21}
          zoomControl={false}
          className="w-full h-full"
        >
          {/* Live Google Maps Tile Layer with live congestion and multi-threading */}
          <GoogleMapTileLayer theme={mapTheme} />

          <MapViewController
            busCoord={currentBusCoord}
            personCoord={personLocation}
            recenterTrigger={recenterCount}
            fitRouteTrigger={fitRouteCount}
            routePolyline={polylineCoords}
          />

          {/* Route Outer Soft Glowing Aura (Google Maps Style) */}
          <Polyline
            positions={polylineCoords}
            pathOptions={{
              color: mapTheme === 'dark-night' ? '#38bdf8' : '#2563eb',
              weight: 10,
              opacity: 0.35,
              lineCap: 'round',
              lineJoin: 'round'
            }}
          />

          {/* Route Road Core (Google Blue) */}
          <Polyline
            positions={polylineCoords}
            pathOptions={{
              color: mapTheme === 'dark-night' ? '#0ea5e9' : '#1a73e8',
              weight: 5.5,
              opacity: 0.98,
              lineCap: 'round',
              lineJoin: 'round'
            }}
          />

          {/* Directional Dash Flow Navigation Overlay */}
          <Polyline
            positions={polylineCoords}
            pathOptions={{
              color: '#ffffff',
              weight: 2,
              opacity: 0.85,
              dashArray: '4, 12',
              lineCap: 'round'
            }}
          />

          {/* GPS Accuracy Circle — Shown when user is tracking */}
          {isInsideBus && personLocation && personAccuracy && (
            <Circle
              center={personLocation}
              radius={personAccuracy}
              pathOptions={{
                color: isPersonOnTrack ? '#2563eb' : '#d97706',
                fillColor: isPersonOnTrack ? '#3b82f6' : '#f59e0b',
                fillOpacity: 0.16,
                weight: 1.5,
                dashArray: '3, 6'
              }}
            />
          )}

          {/* Off-Track Passenger: Shown by EMOJI (not by bus) when off the route track */}
          {isInsideBus && personLocation && !isPersonOnTrack && (
            <Marker position={personLocation} icon={createOffTrackEmojiMarkerIcon(activeUserEmoji)}>
              <Popup closeButton={false}>
                <div className="text-center font-bold text-xs p-1 min-w-[150px]">
                  <p className="text-amber-700">📍 Off Route: {activeUserEmoji}</p>
                  <p className="text-[10px] text-slate-600 font-semibold mt-0.5">
                    Showing your emoji location (not bus)
                  </p>
                  <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                    {personLocation[0].toFixed(6)}, {personLocation[1].toFixed(6)}
                  </p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Connected Off-Track Passengers from Other Devices: Shown by Emoji */}
          {((bus as any)?.off_track_passengers as OffTrackPassenger[] | undefined)?.map((otp) => {
            if (isInsideBus && personLocation && Math.abs(otp.latitude - personLocation[0]) < 0.0001 && Math.abs(otp.longitude - personLocation[1]) < 0.0001) {
              return null;
            }
            return (
              <Marker
                key={otp.device_id}
                position={[otp.latitude, otp.longitude]}
                icon={createOffTrackEmojiMarkerIcon(otp.emoji || '😎')}
              >
                <Popup closeButton={false}>
                  <div className="p-1 text-center font-bold text-xs">
                    <p className="text-amber-700 font-bold">Passenger {otp.emoji}</p>
                    <p className="text-[10px] text-slate-500">Off bus route</p>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Route Stop Nodes */}
          {stops.map((stop: RouteStop, index: number) => {
            const isUserStop = stop.id === 'STOP-01' || stop.name.includes('Saket') || index === 0;
            return (
              <Marker
                key={stop.id}
                position={[stop.latitude, stop.longitude]}
                icon={createImage1StopMarkerIcon({
                  sequenceOrder: stop.sequence_order || index + 1,
                  isUserStop,
                  isTerminal: stop.is_terminal,
                  isPassed: stop.status === 'passed'
                })}
              >
                <Popup closeButton={false}>
                  <div className="p-1 min-w-[170px]">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {stop.is_terminal && <span className="text-sm">🎓</span>}
                      <p className="font-extrabold text-sm text-[#1e3a8a]">{stop.name}</p>
                    </div>
                    <p className="text-xs text-slate-500">{stop.description || (stop.is_terminal ? '28/1, Knowledge Park III, Greater Noida' : 'Bus Stop')}</p>
                    {stop.is_terminal && (
                      <a
                        href="https://delhitechnicalcampus.ac.in/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-semibold my-1 hover:underline"
                      >
                        <span>🌐 delhitechnicalcampus.ac.in</span>
                      </a>
                    )}
                    <p className="text-[11px] font-semibold text-blue-600 mt-0.5">Scheduled: {stop.scheduled_time}</p>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* LIVE MOVING BUS MARKER (Image 1 Style with Numbered Emoji Dot below) */}
          <Marker
            position={currentBusCoord}
            icon={createImage1BusMarkerIcon({
              countdownText: `${nextStopInfo.etaMinutes}m`,
              status: isNavigating ? 'MOVING' : (bus?.status || 'MOVING'),
              passengerCount: (bus as any)?.passenger_count ?? (isInsideBus && isPersonOnTrack ? 1 : 1),
              passengerEmojis: (bus as any)?.passenger_emojis && (bus as any).passenger_emojis.length > 0
                ? (bus as any).passenger_emojis
                : [activeUserEmoji]
            })}
            zIndexOffset={1000}
          >
            <Popup closeButton={false}>
              <div className="p-2 min-w-[180px] text-center">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-sm text-[#1e3a8a]">{bus?.number || 'Bus 01'}</span>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                    LIVE {bus?.last_known_location?.speed_kmh ?? 0} km/h
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-800">
                  Next: {nextStopInfo.name}
                </p>
                <p className="text-[11px] text-blue-600 font-semibold mt-0.5">
                  Arriving in ~{nextStopInfo.etaMinutes} mins ({nextStopInfo.distKm} km)
                </p>
                <div className="mt-1 pt-1 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>{currentBusCoord[0].toFixed(5)}, {currentBusCoord[1].toFixed(5)}</span>
                  <span>{bus?.plate_number || 'DL 1P B 4022'}</span>
                </div>
              </div>
            </Popup>
          </Marker>
        </MapContainer>

        {/* Floating Modern Google Maps Zoom In / Zoom Out Buttons */}
        <GoogleMapZoomButtons map={mapInstance} className="absolute bottom-4 right-3 z-[450]" />
      </div>

      {/* BOTTOM CONTROLS (Direction Header & Single-Row Dual Tabs) */}
      <div className="relative z-[500] px-3 pb-3 pt-1 pointer-events-auto flex flex-col gap-1.5">
        
        {/* Direction Header (No GO Button) */}
        <div className="flex items-center gap-2 px-1">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1e3a8a]"></span>
            <span className="w-2 h-2 rounded-full bg-slate-300"></span>
          </div>

          <span className="text-xs font-black text-[#1e3a8a] tracking-tight">
            {currentDirection}
          </span>
        </div>

        {/* SINGLE ROW: Dual Tabs Side-by-Side (Next Stop Tab + Inside Bus Tab) */}
        <div className="grid grid-cols-2 gap-2 items-stretch">
          {/* TAB 1: Next Stop & ETA */}
          <div className="h-[88px] bg-white/95 backdrop-blur-md rounded-2xl p-2.5 shadow-md border border-slate-200/90 flex flex-col justify-between select-none">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Next Stop
              </span>
              <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1 rounded border border-blue-100">
                {nextStopInfo.stopIndex}/{nextStopInfo.totalStops}
              </span>
            </div>

            <h4 className="text-xs font-black text-slate-900 leading-tight truncate my-0.5" title={nextStopInfo.name}>
              {nextStopInfo.name}
            </h4>

            <div className="flex items-baseline justify-between pt-1 border-t border-slate-100">
              <span className="text-[10px] text-slate-500 font-medium">
                {nextStopInfo.distKm} km
              </span>
              <div className="flex items-baseline gap-0.5">
                <span className="text-xl font-black text-[#1e3a8a] tracking-tight leading-none">
                  {nextStopInfo.etaMinutes}
                </span>
                <span className="text-[10px] font-bold text-slate-500">min</span>
              </div>
            </div>
          </div>

          {/* TAB 2: Inside Bus Controller in Compact Mode */}
          <InsideBusController
            busNumber={bus?.number || 'Bus 01'}
            routeName={route?.name || 'Saket → Delhi Technical Campus'}
            routePolyline={polylineCoords}
            onRecenter={() => setRecenterCount(c => c + 1)}
            compact={true}
          />
        </div>
      </div>
    </div>
  );
};
