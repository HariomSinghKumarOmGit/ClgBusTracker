// client/src/components/Map/BusMap.tsx
import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Bus, BusRoute, RouteStop } from '../../types';
import { createBusMarkerIcon, createStopMarkerIcon, createCampusU5MarkerIcon } from './CustomMarkers';
import { 
  Navigation, 
  Maximize2, 
  Layers, 
  GraduationCap, 
  Map as MapIcon, 
  Satellite, 
  Moon, 
  Compass,
  AlertCircle
} from 'lucide-react';

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

type MapTheme = 'google-streets' | 'google-satellite' | 'carto-voyager' | 'dark-night';

const TILE_LAYERS: Record<MapTheme, { name: string; url: string; subdomains?: string[]; maxZoom: number; attribution: string }> = {
  'google-streets': {
    name: 'Google Maps',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    maxZoom: 20,
    attribution: '&copy; Google Maps'
  },
  'google-satellite': {
    name: 'Satellite',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    maxZoom: 20,
    attribution: '&copy; Google Satellite Imagery'
  },
  'carto-voyager': {
    name: 'Clean Transit',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    subdomains: ['a', 'b', 'c', 'd'],
    maxZoom: 19,
    attribution: '&copy; CARTO &copy; OpenStreetMap'
  },
  'dark-night': {
    name: 'Night Mode',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    subdomains: ['a', 'b', 'c', 'd'],
    maxZoom: 19,
    attribution: '&copy; CARTO Dark &copy; OpenStreetMap'
  }
};

// Delhi Technical Campus (U5) Coordinates in Knowledge Park III, Greater Noida
const DTC_CAMPUS_COORDS: [number, number] = [28.4633, 77.4912];

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
  // Map Layer Style state (Default: Google Maps Streets)
  const [mapTheme, setMapTheme] = useState<MapTheme>('google-streets');
  const [showLayerSelector, setShowLayerSelector] = useState(false);

  // Trigger counters
  const [recenterCount, setRecenterCount] = useState(0);
  const [fitRouteCount, setFitRouteCount] = useState(0);
  const [focusCampusCount, setFocusCampusCount] = useState(0);

  const busLocation = bus?.last_known_location;
  const currentTileConfig = TILE_LAYERS[mapTheme];

  // Determine current/next stop
  const currentStopId = bus?.status === 'MOVING' || bus?.status === 'STOPPED' 
    ? stops.find(s => s.status === 'current')?.id 
    : null;

  return (
    <div className="relative w-full h-full min-h-[350px] overflow-hidden bg-slate-900 select-none">
      <MapContainer
        center={DTC_CAMPUS_COORDS}
        zoom={12}
        zoomControl={false}
        className="w-full h-full"
      >
        {/* Real Google Maps Tile Layer with live layer switching */}
        <TileLayer
          key={mapTheme}
          url={currentTileConfig.url}
          subdomains={currentTileConfig.subdomains || []}
          maxZoom={currentTileConfig.maxZoom}
          attribution={currentTileConfig.attribution}
        />

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
                      {isTerminal ? 'Delhi Technical Campus (U5)' : stop.name}
                    </h4>
                  </div>

                  <p className="text-xs text-slate-500 mb-1.5">
                    {isTerminal 
                      ? '28/1, Knowledge Park III, Greater Noida, UP' 
                      : (stop.description || 'Route 01 Transit Stoppage')}
                  </p>

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
                    <span className="font-semibold text-slate-700">Saket ➔ DTC (U5)</span>
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
      <div className="absolute top-16 left-3 z-[400] flex items-center gap-2">
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
          {busLocation && busLocation.speed_kmh > 0 && (
            <span className="text-blue-600 font-black border-l border-slate-200 pl-2">
              {Math.round(busLocation.speed_kmh)} km/h
            </span>
          )}
        </div>
      </div>

      {/* Floating Action Controls on Right Side (Google Maps style) */}
      <div className="absolute top-16 right-3 z-[400] flex flex-col gap-2">
        {/* Layer Switcher Button */}
        <div className="relative">
          <button
            onClick={() => setShowLayerSelector(!showLayerSelector)}
            title="Change Map Style (Google Maps, Satellite, Night)"
            className="w-10 h-10 bg-white/95 backdrop-blur-md hover:bg-slate-50 text-slate-800 active:scale-95 rounded-2xl shadow-lg border border-slate-200 flex items-center justify-center transition-all"
          >
            <Layers className="w-5 h-5 text-blue-600" />
          </button>

          {/* Layer Selection Dropdown Menu */}
          {showLayerSelector && (
            <div className="absolute top-0 right-12 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 p-2 min-w-[150px] space-y-1 animate-fadeIn">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 py-0.5 block">
                Map Style
              </span>
              {[
                { id: 'google-streets', label: 'Google Maps', icon: MapIcon },
                { id: 'google-satellite', label: 'Satellite 3D', icon: Satellite },
                { id: 'carto-voyager', label: 'Clean Transit', icon: Layers },
                { id: 'dark-night', label: 'Night Cyber', icon: Moon }
              ].map((style) => {
                const Icon = style.icon;
                const active = mapTheme === style.id;
                return (
                  <button
                    key={style.id}
                    onClick={() => {
                      setMapTheme(style.id as MapTheme);
                      setShowLayerSelector(false);
                    }}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                      active
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{style.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 1-Tap Focus on Campus (U5) Button */}
        <button
          onClick={() => setFocusCampusCount(c => c + 1)}
          title="Focus on Delhi Technical Campus (U5)"
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
