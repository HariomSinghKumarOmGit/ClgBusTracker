// client/src/components/Map/BusMap.tsx
import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, Polyline, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Bus, BusRoute, RouteStop } from '../../types';
import { createBusMarkerIcon, createStopMarkerIcon } from './CustomMarkers';
import { 
  Navigation, 
  Maximize2, 
  GraduationCap, 
  AlertCircle
} from 'lucide-react';
import { MapTheme, DEFAULT_MAP_THEME } from './mapConfig';
import { 
  GoogleMapTileLayer, 
  GoogleMapZoomButtons, 
  GoogleMapLayerSelector, 
  LiveTrafficBadge 
} from './MapControls';

interface BusMapProps {
  bus: Bus | null;
  route: BusRoute | null;
  stops: RouteStop[];
  selectedStopId?: string | null;
  onSelectStop?: (stop: RouteStop) => void;
  adminClickMode?: boolean;
  onMapClickCoord?: (lat: number, lng: number) => void;
  waitingPerStop?: Record<string, number>;
}

// Delhi Technical Campus Coordinates in Knowledge Park III, Greater Noida
// Official: 28/1, Knowledge Park-III, Greater Noida - 201306 (U.P.)
const DTC_CAMPUS_COORDS: [number, number] = [28.47478, 77.476134];

// Controller for programmatic map zooming and panning
function MapViewController({
  bus,
  route,
  recenterTrigger,
  fitRouteTrigger,
  focusCampusTrigger
}: {
  bus: Bus | null;
  route: BusRoute | null;
  recenterTrigger: number;
  fitRouteTrigger: number;
  focusCampusTrigger: number;
}) {
  const map = useMap();
  const initialFitDone = useRef(false);

  // Recenter on bus
  useEffect(() => {
    if (recenterTrigger > 0 && bus?.last_known_location) {
      map.flyTo(
        [bus.last_known_location.latitude, bus.last_known_location.longitude],
        16,
        { animate: true, duration: 1.2 }
      );
    }
  }, [recenterTrigger, bus, map]);

  // Fit entire route from Saket to DTC
  useEffect(() => {
    if (fitRouteTrigger > 0 && route && route.polyline.length > 0) {
      const bounds = L.latLngBounds(route.polyline);
      map.fitBounds(bounds, { padding: [50, 50], animate: true });
    }
  }, [fitRouteTrigger, route, map]);

  // Focus directly on Delhi Technical Campus (U5)
  useEffect(() => {
    if (focusCampusTrigger > 0) {
      map.flyTo(DTC_CAMPUS_COORDS, 17, { animate: true, duration: 1.5 });
    }
  }, [focusCampusTrigger, map]);

  // Auto-fit on initial load
  useEffect(() => {
    if (!initialFitDone.current && route && route.polyline.length > 0) {
      const bounds = L.latLngBounds(route.polyline);
      map.fitBounds(bounds, { padding: [40, 40] });
      initialFitDone.current = true;
    }
  }, [route, map]);

  return null;
}

// Click listener for Admin Coordinate Picker
function MapClickHandler({ onClickCoord }: { onClickCoord?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (onClickCoord) {
        onClickCoord(
          Math.round(e.latlng.lat * 1000000) / 1000000,
          Math.round(e.latlng.lng * 1000000) / 1000000
        );
      }
    }
  });
  return null;
}

export const BusMap: React.FC<BusMapProps> = ({
  bus,
  route,
  stops,
  selectedStopId,
  onSelectStop,
  adminClickMode = false,
  onMapClickCoord,
  waitingPerStop = {}
}) => {
  // Map Layer Style state (Default: Google Maps Live Traffic)
  const [mapTheme, setMapTheme] = useState<MapTheme>(DEFAULT_MAP_THEME);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

  // Trigger counters
  const [recenterCount, setRecenterCount] = useState(0);
  const [fitRouteCount, setFitRouteCount] = useState(0);
  const [focusCampusCount, setFocusCampusCount] = useState(0);

  const busLocation = bus?.last_known_location;

  // Determine current/next stop
  const currentStopId = bus?.status === 'MOVING' || bus?.status === 'STOPPED' 
    ? stops.find(s => s.status === 'current')?.id 
    : null;

  const handleToggleTraffic = () => {
    setMapTheme(prev => prev === 'google-traffic' ? 'google-streets' : 'google-traffic');
  };

  return (
    <div className="relative w-full h-full min-h-[350px] overflow-hidden bg-slate-900 select-none">
      <MapContainer
        ref={setMapInstance}
        center={DTC_CAMPUS_COORDS}
        zoom={12}
        maxZoom={21}
        zoomControl={false}
        className="w-full h-full"
      >
        {/* Real Live Google Maps Tile Layer with live congestion and multi-threading */}
        <GoogleMapTileLayer theme={mapTheme} />

        <MapViewController
          bus={bus}
          route={route}
          recenterTrigger={recenterCount}
          fitRouteTrigger={fitRouteCount}
          focusCampusTrigger={focusCampusCount}
        />

        {adminClickMode && <MapClickHandler onClickCoord={onMapClickCoord} />}

        {/* Google Maps Style Route Lines */}
        {route && route.polyline.length > 0 && (
          <>
            {/* Outer Soft Electric Glow Aura */}
            <Polyline
              positions={route.polyline}
              pathOptions={{
                color: mapTheme === 'dark-night' ? '#38bdf8' : '#2563eb',
                weight: 10,
                opacity: 0.35,
                lineCap: 'round',
                lineJoin: 'round'
              }}
            />

            {/* Inner Crisp Deep Royal Blue Road Core */}
            <Polyline
              positions={route.polyline}
              pathOptions={{
                color: mapTheme === 'dark-night' ? '#0ea5e9' : '#1d4ed8',
                weight: 5.5,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round'
              }}
            />

            {/* White Dashed Directional Navigation Bead Line */}
            <Polyline
              positions={route.polyline}
              pathOptions={{
                color: '#ffffff',
                weight: 2,
                opacity: 0.8,
                dashArray: '4, 12',
                lineCap: 'round'
              }}
            />
          </>
        )}

        {/* Stoppage Markers along Route 01 */}
        {stops.map((stop) => {
          const isPickup = stop.id === selectedStopId;
          const isTerminal = stop.is_terminal || stop.sequence_order === stops.length;
          const isPassed = stop.status === 'passed';
          const isNext = stop.id === currentStopId;
          const waitCount = waitingPerStop[stop.id] || 0;

          return (
            <Marker
              key={stop.id}
              position={[stop.latitude, stop.longitude]}
              icon={createStopMarkerIcon({
                sequenceOrder: stop.sequence_order,
                isTerminal,
                isPickup,
                isPassed,
                isNext,
                waitingCount: waitCount
              })}
              eventHandlers={{
                click: () => onSelectStop && onSelectStop(stop)
              }}
            >
              <Popup className="custom-popup" closeButton={false}>
                <div className="p-1.5 text-slate-900 min-w-[190px]">
                  <div className="flex items-center gap-1.5 mb-1">
                    {isTerminal ? (
                      <span className="w-5 h-5 rounded-md bg-purple-700 text-amber-300 text-xs font-bold flex items-center justify-center">
                        🎓
                      </span>
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-black flex items-center justify-center">
                        {stop.sequence_order}
                      </span>
                    )}
                    <h4 className="font-extrabold text-sm leading-tight">
                      {isTerminal ? 'Delhi Technical Campus' : stop.name}
                    </h4>
                  </div>

                  <p className="text-xs text-slate-500 mb-1">
                    {isTerminal 
                      ? '28/1, Knowledge Park III, Greater Noida, UP - 201306' 
                      : (stop.description || 'Route 01 Transit Stoppage')}
                  </p>

                  {isTerminal && (
                    <div className="mb-1.5">
                      <a
                        href="https://delhitechnicalcampus.ac.in/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                      >
                        <span>🌐 delhitechnicalcampus.ac.in</span>
                      </a>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs py-1 border-t border-slate-100 font-medium">
                    <span className="text-slate-500">Scheduled:</span>
                    <span className="font-bold text-slate-800">{stop.scheduled_time}</span>
                  </div>

                  {waitCount > 0 && (
                    <div className="mt-1 text-[11px] bg-amber-50 text-amber-900 font-bold px-2 py-0.5 rounded border border-amber-200">
                      👥 {waitCount} student{waitCount > 1 ? 's' : ''} waiting here
                    </div>
                  )}

                  {!isTerminal && onSelectStop && (
                    <button
                      onClick={() => onSelectStop(stop)}
                      className={`mt-2 w-full py-1.5 px-2 text-xs font-bold rounded-xl transition-all shadow-xs ${
                        isPickup
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {isPickup ? '✓ Your Pickup Point' : 'Set as My Pickup Point'}
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Live Moving Bus Marker */}
        {busLocation && (
          <Marker
            position={[busLocation.latitude, busLocation.longitude]}
            icon={createBusMarkerIcon(
              busLocation.heading,
              bus?.status || 'IDLE',
              bus?.number || 'Bus U5'
            )}
            zIndexOffset={2000}
          >
            <Popup closeButton={false}>
              <div className="p-1 min-w-[170px]">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1 font-black text-sm text-slate-900">
                    <span>{bus?.number || 'Bus U5'}</span>
                  </div>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      bus?.status === 'MOVING'
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                        : bus?.status === 'STOPPED'
                        ? 'bg-amber-100 text-amber-700 border border-amber-300'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {bus?.status || 'IDLE'}
                  </span>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded-lg">
                    <span className="font-semibold text-slate-500">Speed:</span>
                    <span className="font-black text-blue-600 text-sm">{Math.round(busLocation.speed_kmh || 0)} km/h</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 pt-1">
                    <span>Route:</span>
                    <span className="font-semibold text-slate-700">Saket ➔ Delhi Technical Campus</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Plate:</span>
                    <span className="font-mono text-slate-600">{bus?.plate_number}</span>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Floating Speed & Status Badge Overlay */}
      <div className="absolute top-16 left-3 z-[400] flex flex-wrap items-center gap-2">
        <LiveTrafficBadge
          isTrafficActive={mapTheme === 'google-traffic' || mapTheme === 'google-terrain'}
          onToggle={handleToggleTraffic}
          speedKmh={busLocation?.speed_kmh}
        />

        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/90 text-xs font-bold text-slate-800">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              bus?.status === 'MOVING'
                ? 'bg-emerald-500 animate-ping'
                : bus?.status === 'STOPPED'
                ? 'bg-amber-500'
                : 'bg-slate-400'
            }`}
          ></span>
          <span>{bus?.status === 'MOVING' ? 'LIVE GPS' : bus?.status === 'STOPPED' ? 'AT STOP' : 'IDLE'}</span>
        </div>
      </div>

      {/* Floating Action Controls on Right Side (Google Maps style) */}
      <div className="absolute top-16 right-3 z-[400] flex flex-col gap-2">
        {/* Layer Switcher with Google Live Traffic */}
        <GoogleMapLayerSelector 
          currentTheme={mapTheme} 
          onSelectTheme={setMapTheme} 
        />

        {/* 1-Tap Focus on Delhi Technical Campus Button */}
        <button
          onClick={() => setFocusCampusCount(c => c + 1)}
          title="Focus on Delhi Technical Campus"
          className="w-10 h-10 bg-gradient-to-tr from-purple-700 to-purple-600 hover:from-purple-600 hover:to-purple-500 text-white active:scale-95 rounded-2xl shadow-lg border border-purple-400/40 flex items-center justify-center transition-all group"
        >
          <GraduationCap className="w-5 h-5 text-amber-300 drop-shadow group-hover:scale-110 transition-transform" />
        </button>

        {/* Recenter on Bus */}
        <button
          onClick={() => setRecenterCount(c => c + 1)}
          title="Recenter on Moving Bus"
          className="w-10 h-10 bg-white/95 backdrop-blur-md hover:bg-blue-50 text-blue-600 active:scale-95 rounded-2xl shadow-lg border border-slate-200 flex items-center justify-center transition-all"
        >
          <Navigation className="w-5 h-5 fill-blue-600" />
        </button>

        {/* Fit Entire Route */}
        <button
          onClick={() => setFitRouteCount(c => c + 1)}
          title="Fit Full Route (Saket → DTC)"
          className="w-10 h-10 bg-white/95 backdrop-blur-md hover:bg-slate-50 text-slate-700 active:scale-95 rounded-2xl shadow-lg border border-slate-200 flex items-center justify-center transition-all"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Modern Google Maps Zoom In / Zoom Out Controls */}
        <GoogleMapZoomButtons map={mapInstance} className="mt-1" />
      </div>

      {/* Admin Mode Tap Hint */}
      {adminClickMode && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[400] bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-2xl shadow-xl flex items-center gap-1.5 animate-bounce">
          <AlertCircle className="w-4 h-4" />
          <span>Click anywhere on the map to set stoppage coordinates</span>
        </div>
      )}
    </div>
  );
};
