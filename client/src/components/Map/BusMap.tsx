// client/src/components/Map/BusMap.tsx
import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Bus, BusRoute, RouteStop } from '../../types';
import { createBusMarkerIcon, createStopMarkerIcon } from './CustomMarkers';
import { Navigation, Maximize2, Compass, AlertCircle } from 'lucide-react';

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

// Controller component to smoothly pan/zoom map programmatically
function MapViewController({
  bus,
  route,
  recenterTrigger,
  fitRouteTrigger
}: {
  bus: Bus | null;
  route: BusRoute | null;
  recenterTrigger: number;
  fitRouteTrigger: number;
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

  // Fit entire route
  useEffect(() => {
    if (fitRouteTrigger > 0 && route && route.polyline.length > 0) {
      const bounds = L.latLngBounds(route.polyline);
      map.fitBounds(bounds, { padding: [50, 50], animate: true });
    }
  }, [fitRouteTrigger, route, map]);

  // Initial auto-fit once loaded
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
  const [recenterCount, setRecenterCount] = useState(0);
  const [fitRouteCount, setFitRouteCount] = useState(0);
  const busLocation = bus?.last_known_location;

  // Determine current/next stop to style markers
  const currentStopId = bus?.status === 'MOVING' || bus?.status === 'STOPPED' 
    ? stops.find(s => s.status === 'current')?.id 
    : null;

  return (
    <div className="relative w-full h-full min-h-[350px] overflow-hidden rounded-2xl shadow-inner border border-slate-200/80 bg-slate-100">
      <MapContainer
        center={[28.5204, 77.2014]}
        zoom={12}
        zoomControl={false}
        className="w-full h-full"
      >
        {/* Clean, high-readability Google-Maps-like vector tiles */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />

        <MapViewController
          bus={bus}
          route={route}
          recenterTrigger={recenterCount}
          fitRouteTrigger={fitRouteCount}
        />

        {adminClickMode && <MapClickHandler onClickCoord={onMapClickCoord} />}

        {/* Route Outer Casing for Google Maps style road glow */}
        {route && route.polyline.length > 0 && (
          <>
            <Polyline
              positions={route.polyline}
              pathOptions={{
                color: '#1e3a8a',
                weight: 7,
                opacity: 0.85,
                lineCap: 'round',
                lineJoin: 'round'
              }}
            />
            <Polyline
              positions={route.polyline}
              pathOptions={{
                color: '#3b82f6',
                weight: 4.5,
                opacity: 0.95,
                lineCap: 'round',
                lineJoin: 'round'
              }}
            />
          </>
        )}

        {/* Stoppage Markers */}
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
                <div className="p-1 text-slate-800">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center">
                      {stop.sequence_order}
                    </span>
                    <h4 className="font-bold text-sm leading-tight">{stop.name}</h4>
                  </div>
                  {stop.description && (
                    <p className="text-xs text-slate-500 mb-1">{stop.description}</p>
                  )}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                    <span className="text-slate-500">Scheduled:</span>
                    <span className="font-semibold text-slate-700">{stop.scheduled_time}</span>
                  </div>
                  {waitCount > 0 && (
                    <div className="mt-1 text-[11px] bg-amber-50 text-amber-800 font-medium px-2 py-0.5 rounded">
                      👥 {waitCount} student{waitCount > 1 ? 's' : ''} waiting here
                    </div>
                  )}
                  {onSelectStop && (
                    <button
                      onClick={() => onSelectStop(stop)}
                      className={`mt-2 w-full py-1 px-2 text-xs font-semibold rounded-lg transition-colors ${
                        isPickup
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {isPickup ? '✓ Your Selected Pickup' : 'Set as My Pickup Point'}
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
              bus?.number || 'Bus 01'
            )}
            zIndexOffset={1000}
          >
            <Popup closeButton={false}>
              <div className="p-1 min-w-[160px]">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-slate-900">{bus?.number}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      bus?.status === 'MOVING'
                        ? 'bg-emerald-100 text-emerald-700'
                        : bus?.status === 'STOPPED'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {bus?.status || 'IDLE'}
                  </span>
                </div>
                <div className="text-xs text-slate-600 space-y-0.5">
                  <div className="flex justify-between">
                    <span>Speed:</span>
                    <span className="font-semibold">{Math.round(busLocation.speed_kmh || 0)} km/h</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Accuracy:</span>
                    <span className="font-semibold">±{Math.round(busLocation.accuracy_meters || 5)}m</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                    <span>Plate:</span>
                    <span>{bus?.plate_number}</span>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Floating Speed & Status Badge Overlay */}
      <div className="absolute top-3 left-3 z-[400] flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-slate-200/80 text-xs font-semibold text-slate-800">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              bus?.status === 'MOVING'
                ? 'bg-emerald-500 animate-ping'
                : bus?.status === 'STOPPED'
                ? 'bg-amber-500'
                : 'bg-slate-400'
            }`}
          ></span>
          <span>{bus?.status === 'MOVING' ? 'LIVE TRACKING' : bus?.status === 'STOPPED' ? 'BUS STOPPED' : 'IDLE'}</span>
          {busLocation && busLocation.speed_kmh > 0 && (
            <span className="text-blue-600 font-bold border-l border-slate-200 pl-1.5">
              {Math.round(busLocation.speed_kmh)} km/h
            </span>
          )}
        </div>
      </div>

      {/* Floating Action Controls: Recenter and Fit Route */}
      <div className="absolute bottom-4 right-3 z-[400] flex flex-col gap-2">
        <button
          onClick={() => setRecenterCount(c => c + 1)}
          title="Recenter on Bus"
          className="w-11 h-11 bg-white hover:bg-blue-50 text-blue-600 active:scale-95 rounded-xl shadow-lg border border-slate-200 flex items-center justify-center transition-all"
        >
          <Navigation className="w-5 h-5 fill-blue-600" />
        </button>
        <button
          onClick={() => setFitRouteCount(c => c + 1)}
          title="Fit Entire Route"
          className="w-11 h-11 bg-white hover:bg-slate-50 text-slate-700 active:scale-95 rounded-xl shadow-lg border border-slate-200 flex items-center justify-center transition-all"
        >
          <Maximize2 className="w-5 h-5" />
        </button>
      </div>

      {/* Admin Mode Tap Hint */}
      {adminClickMode && (
        <div className="absolute top-3 right-3 z-[400] bg-indigo-600 text-white text-xs font-medium px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5 animate-bounce">
          <AlertCircle className="w-4 h-4" />
          <span>Click anywhere on the map to set stoppage coordinates</span>
        </div>
      )}
    </div>
  );
};
