// client/src/components/Home/HomeView.tsx
import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Bus, BusRoute, RouteStop, ArrivalCardData } from '../../types';
import { createImage1BusMarkerIcon, createImage1StopMarkerIcon, createUserPinIcon } from '../Map/CustomMarkers';
import { X, Pin, Bell, Navigation as NavIcon, Radio, CheckCircle2 } from 'lucide-react';
import { GoogleMapTileLayer, GoogleMapZoomButtons, GoogleMapLayerSelector, LiveTrafficBadge } from '../Map/MapControls';
import { MapTheme, DEFAULT_MAP_THEME } from '../Map/mapConfig';

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
  recenterTrigger,
  fitRouteTrigger,
  routePolyline
}: {
  busCoord: [number, number] | null;
  recenterTrigger: number;
  fitRouteTrigger: number;
  routePolyline: [number, number][];
}) {
  const map = useMap();
  const initialFit = useRef(false);

  useEffect(() => {
    if (recenterTrigger > 0 && busCoord) {
      map.flyTo(busCoord, 16, { animate: true, duration: 1.2 });
    }
  }, [recenterTrigger, busCoord, map]);

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

  const userLocation: [number, number] = [28.5204, 77.2014];
  const userStopLocation: [number, number] = [28.5204, 77.2014];

  const [currentBusCoord, setCurrentBusCoord] = useState<[number, number]>(() => {
    if (bus?.last_known_location) {
      return [bus.last_known_location.latitude, bus.last_known_location.longitude];
    }
    return [28.5204, 77.2014];
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdownSeconds(prev => {
        if (prev <= 1) return 45;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isNavigating) return;

    let step = 0;
    const navPolyline: [number, number][] = route?.polyline && route.polyline.length > 0 
      ? route.polyline 
      : [
          [28.5350, 77.1980],
          [28.5312, 77.2020],
          [28.5280, 77.2060],
          [28.5255, 77.2095],
          [28.5230, 77.2135]
        ];

    const moveInterval = setInterval(() => {
      step = (step + 1) % navPolyline.length;
      setCurrentBusCoord(navPolyline[step]);
    }, 2500);

    return () => clearInterval(moveInterval);
  }, [isNavigating, route]);

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
    showToast(!isPinned ? 'Route 38 pinned to your favorites!' : 'Route unpinned');
  };

  const handleToggleGo = () => {
    playBeep();
    const nextState = !isNavigating;
    setIsNavigating(nextState);
    if (nextState) {
      showToast('🚀 Live turn-by-turn navigation started! Bus is en route.');
      setRecenterCount(c => c + 1);
    } else {
      showToast('Navigation ended.');
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

  const arrivalCards: ArrivalCardData[] = [
    {
      id: 'arr-1',
      bus_number: 'Bus 38-A',
      minutes: 2,
      seconds: countdownSeconds,
      occupancy_level: 'medium',
      occupancy_dots: [true, true, true, false, false, false],
      has_wifi: true,
      is_accessible: true,
      route_code: '01',
      destination: 'Delhi Technical Campus'
    },
    {
      id: 'arr-2',
      bus_number: 'Bus 01-B',
      minutes: 8,
      occupancy_level: 'low',
      occupancy_dots: [true, true, false, false, false, false],
      has_wifi: true,
      is_accessible: true,
      route_code: '01',
      destination: 'Delhi Technical Campus'
    },
    {
      id: 'arr-3',
      bus_number: 'Bus 01-C',
      minutes: 13,
      occupancy_level: 'high',
      occupancy_dots: [true, true, true, true, true, false],
      has_wifi: true,
      is_accessible: true,
      route_code: '01',
      destination: 'Delhi Technical Campus'
    }
  ];

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

  const walkingPath: [number, number][] = [
    userLocation,
    [28.5286, 77.2056],
    userStopLocation
  ];

  const currentRouteCode = route?.code || '01';
  const currentDirection = route?.direction || '➔ Eastbound to Delhi Technical Campus';

  return (
    <div className="relative w-full h-[calc(100vh-68px)] max-w-md mx-auto overflow-hidden bg-slate-100 flex flex-col font-sans select-none">
      
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
            recenterTrigger={recenterCount}
            fitRouteTrigger={fitRouteCount}
            routePolyline={polylineCoords}
          />

          {/* Walking Dotted Path */}
          <Polyline
            positions={walkingPath}
            pathOptions={{
              color: '#334155',
              weight: 3.5,
              dashArray: '4, 8',
              opacity: 0.85,
              lineCap: 'round'
            }}
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

          {/* User Starting Point Pin (😎 15th) */}
          <Marker position={userLocation} icon={createUserPinIcon(userEmoji)}>
            <Popup closeButton={false}>
              <div className="text-center font-bold text-xs p-1">
                Your Current Spot ({userStopName})
              </div>
            </Popup>
          </Marker>

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

          {/* LIVE MOVING BUS MARKER (Image 1 Style) */}
          <Marker
            position={currentBusCoord}
            icon={createImage1BusMarkerIcon({
              countdownText: `${countdownSeconds}s`,
              isOccupied: [true, true, true, false, false, false],
              status: isNavigating ? 'MOVING' : (bus?.status || 'MOVING')
            })}
            zIndexOffset={1000}
          >
            <Popup closeButton={false}>
              <div className="p-1.5 min-w-[160px] text-center">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-sm text-[#1e3a8a]">Bus 38</span>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                    LIVE 38 km/h
                  </span>
                </div>
                <p className="text-xs text-slate-600">Arriving in {countdownSeconds} seconds at 15th & Market</p>
                <p className="text-[11px] text-slate-400 mt-1">Plate: DL 1P B 3838</p>
              </div>
            </Popup>
          </Marker>
        </MapContainer>

        {/* Floating Modern Google Maps Zoom In / Zoom Out Buttons */}
        <GoogleMapZoomButtons map={mapInstance} className="absolute bottom-28 right-4 z-[450]" />
      </div>

      {/* BOTTOM CONTROLS & CAROUSEL (Image 1 Style) */}
      <div className="relative z-[500] px-4 pb-4 pt-1 pointer-events-auto">
        
        {/* Direction Row with Slider Dots & "GO" Button */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1e3a8a]"></span>
              <span className="w-2 h-2 rounded-full bg-slate-300"></span>
            </div>

            <span className="text-base font-black text-[#1e3a8a] tracking-tight">
              {currentDirection}
            </span>
          </div>

          <button
            onClick={handleToggleGo}
            className={`px-7 py-3 rounded-2xl font-black text-xl tracking-wider transition-all duration-300 shadow-xl active:scale-95 flex items-center justify-center gap-1.5 ${
              isNavigating 
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 ring-2 ring-emerald-400' 
                : 'bg-[#1d4ed8] hover:bg-[#1e40af] text-white shadow-blue-600/30 hover:shadow-2xl'
            }`}
          >
            <span>{isNavigating ? 'LIVE' : 'GO'}</span>
          </button>
        </div>

        {/* HORIZONTALLY SCROLLING ARRIVAL CARDS CAROUSEL */}
        <div className="flex items-stretch gap-3 overflow-x-auto no-scrollbar pb-1 pt-1 -mx-4 px-4 scroll-smooth">
          {arrivalCards.map((card: ArrivalCardData, idx: number) => {
            const isSelected = selectedArrivalIndex === idx;

            return (
              <div
                key={card.id}
                onClick={() => {
                  setSelectedArrivalIndex(idx);
                  playBeep();
                }}
                className={`flex-shrink-0 w-32 rounded-3xl p-3.5 transition-all duration-300 cursor-pointer flex flex-col justify-between select-none ${
                  isSelected
                    ? 'bg-[#1d4ed8] text-white shadow-xl shadow-blue-600/35 scale-[1.02]'
                    : 'bg-white text-[#1e3a8a] border border-slate-200/90 shadow-md hover:border-blue-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <span className={`text-6xl font-black tracking-tighter leading-none ${isSelected ? 'text-white' : 'text-[#1e3a8a]'}`}>
                    {card.minutes}
                  </span>
                  
                  <div className="pt-1">
                    <Radio className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-[#1e3a8a]'}`} />
                  </div>
                </div>

                <div className="mt-1">
                  <span className={`text-xs font-bold tracking-tight ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                    minutes
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-start">
                  <div 
                    className={`px-2 py-1 rounded-full flex items-center justify-center ${
                      isSelected ? 'bg-white/20' : 'bg-slate-100'
                    }`}
                  >
                    <div className="grid grid-cols-3 gap-1">
                      {card.occupancy_dots.map((filled: boolean, dIdx: number) => (
                        <span
                          key={dIdx}
                          className={`w-1.5 h-1.5 rounded-full ${
                            isSelected 
                              ? (filled ? 'bg-white' : 'bg-white/40') 
                              : (filled ? 'bg-[#1d4ed8]' : 'bg-slate-300')
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
