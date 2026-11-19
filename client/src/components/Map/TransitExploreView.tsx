// client/src/components/Map/TransitExploreView.tsx
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Bus, BusRoute, RouteStop, TransitStopHub } from '../../types';
import { createViabusBusMarkerIcon, createViabusRadarHubIcon, createImage1StopMarkerIcon } from './CustomMarkers';
import { Search, MapPin, Navigation, Bell, ArrowRight, ShieldCheck, ChevronUp, ChevronDown, Check, Bus as BusIcon, Accessibility, Wind, Zap } from 'lucide-react';
import { GoogleMapTileLayer, GoogleMapZoomButtons, GoogleMapLayerSelector, LiveTrafficBadge } from './MapControls';
import { MapTheme, DEFAULT_MAP_THEME } from './mapConfig';

interface TransitExploreViewProps {
  routes: BusRoute[];
  stops: RouteStop[];
  buses: Bus[];
  selectedRoute: BusRoute | null;
  onSelectRoute: (route: BusRoute) => void;
  onOpenAlerts: () => void;
}

function ExploreMapController({ targetCoord }: { targetCoord: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (targetCoord) {
      map.flyTo(targetCoord, 14, { animate: true, duration: 1.0 });
    }
  }, [targetCoord, map]);
  return null;
}

export const TransitExploreView: React.FC<TransitExploreViewProps> = ({
  routes,
  stops,
  buses,
  selectedRoute,
  onSelectRoute,
  onOpenAlerts
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedHub, setSelectedHub] = useState<TransitStopHub | null>(null);
  const [isTimelineOpen, setIsTimelineOpen] = useState(true);
  const [targetCoord, setTargetCoord] = useState<[number, number] | null>(null);
  const [alertToggles, setAlertToggles] = useState<Record<string, boolean>>({ '140': true, '29': false, '38': true });
  const [mapTheme, setMapTheme] = useState<MapTheme>(DEFAULT_MAP_THEME);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

  const handleToggleTraffic = () => {
    setMapTheme(prev => prev === 'google-traffic' ? 'google-streets' : 'google-traffic');
  };

  const stopHubs: TransitStopHub[] = [
    {
      id: 'HUB-01',
      name: 'อนุสาวรีย์ชัยสมรภูมิ (เกาะพญาไท)',
      name_alt: 'Victory Monument Interchange',
      latitude: 28.5380,
      longitude: 77.1950,
      connected_routes: [
        { route_code: '140', route_id: 'ROUTE-140', destination: 'อนุสาวรีย์ชัยสมรภูมิ → แสมดำ', eta_mins: 2, is_live: true, vehicle_plate: 'DL 1P B 1401' },
        { route_code: '29', route_id: 'ROUTE-21', destination: 'รังสิต → หัวลำโพง', eta_mins: 5, is_live: true, vehicle_plate: '16-1270 5-70016' },
        { route_code: '01', route_id: 'ROUTE-01', destination: 'Delhi Technical Campus', eta_mins: 8, is_live: true, vehicle_plate: 'DL 1P B 4022' }
      ]
    },
    {
      id: 'HUB-02',
      name: 'สยามสแควร์ (Siam Square)',
      name_alt: 'Central Downtown Transfer',
      latitude: 28.5280,
      longitude: 77.2060,
      connected_routes: [
        { route_code: '21', route_id: 'ROUTE-21', destination: 'จุฬาฯ → วัดคู่สร้าง', eta_mins: 4, is_live: true, vehicle_plate: '16-1270 5-70016' },
        { route_code: '01', route_id: 'ROUTE-01', destination: 'Delhi Technical Campus', eta_mins: 2, is_live: true, vehicle_plate: 'DL 1P B 4022' }
      ]
    }
  ];

  const categories = [
    { id: 'all', label: 'All Routes', icon: '🚌' },
    { id: 'home', label: 'Home', icon: '🏠', coord: [28.5040, 77.2380] as [number, number] },
    { id: 'work', label: 'Work', icon: '💼', coord: [28.5230, 77.2135] as [number, number] },
    { id: 'campus', label: 'DTC Campus', icon: '🎓', coord: [28.47478, 77.476134] as [number, number] },
    { id: 'hospital', label: 'Hospital', icon: '🏥', coord: [28.5130, 77.2260] as [number, number] }
  ];

  const currentRoute = selectedRoute || routes[0];

  const handleCategoryClick = (cat: typeof categories[0]) => {
    setActiveCategory(cat.id);
    if (cat.coord) {
      setTargetCoord(cat.coord);
    }
  };

  const toggleAlert = (code: string) => {
    setAlertToggles(prev => ({ ...prev, [code]: !prev[code] }));
  };

  return (
    <div className="relative w-full h-[calc(100vh-68px)] max-w-md mx-auto overflow-hidden bg-slate-900 flex flex-col font-sans select-none">
      
      {/* TOP VIABUS HEADER & SEARCH BAR (Image 2) */}
      <div className="absolute top-3 left-3 right-3 z-[500] flex flex-col gap-2">
        <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl px-3 py-2.5 border border-slate-200">
          <Search className="w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Where to go? ไปไหนดี? (Search stops, routes)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none"
          />
          <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-xl text-blue-700 font-bold text-xs">
            <BusIcon className="w-4 h-4" />
            <span>Transit</span>
          </div>
        </div>

        {/* Quick Category Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap shadow-md transition-all active:scale-95 ${
                activeCategory === cat.id
                  ? 'bg-blue-600 text-white shadow-blue-500/30'
                  : 'bg-white/95 backdrop-blur-md text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Live Google Map Controls Pill */}
        <div className="flex items-center justify-between pt-0.5">
          <LiveTrafficBadge
            isTrafficActive={mapTheme === 'google-traffic' || mapTheme === 'google-terrain'}
            onToggle={handleToggleTraffic}
          />
          <GoogleMapLayerSelector
            currentTheme={mapTheme}
            onSelectTheme={setMapTheme}
            dropdownAlign="right"
          />
        </div>
      </div>

      {/* FULL LEAFLET TRANSIT MAP (Modern Google Maps) */}
      <div className="flex-1 w-full relative">
        <MapContainer
          ref={setMapInstance}
          center={[28.5300, 77.2050]}
          zoom={13}
          maxZoom={21}
          zoomControl={false}
          className="w-full h-full"
        >
          {/* Real Live Google Maps Tile Layer with live congestion and multi-threading */}
          <GoogleMapTileLayer theme={mapTheme} />

          <ExploreMapController targetCoord={targetCoord} />

          {/* Render All Transit Routes with Google Maps Transit Glow */}
          {routes.map(r => {
            const isSelected = r.id === currentRoute?.id;
            return (
              <React.Fragment key={r.id}>
                {isSelected && (
                  <Polyline
                    positions={r.polyline}
                    pathOptions={{
                      color: mapTheme === 'dark-night' ? '#38bdf8' : '#2563eb',
                      weight: 10,
                      opacity: 0.35,
                      lineCap: 'round',
                      lineJoin: 'round'
                    }}
                  />
                )}
                <Polyline
                  positions={r.polyline}
                  pathOptions={{
                    color: isSelected 
                      ? (mapTheme === 'dark-night' ? '#0ea5e9' : '#1a73e8') 
                      : '#94a3b8',
                    weight: isSelected ? 6 : 3.5,
                    opacity: isSelected ? 0.98 : 0.65,
                    lineCap: 'round',
                    lineJoin: 'round'
                  }}
                  eventHandlers={{
                    click: () => onSelectRoute(r)
                  }}
                />
              </React.Fragment>
            );
          })}

          {/* Viabus Stop Radar Hubs */}
          {stopHubs.map(hub => (
            <Marker
              key={hub.id}
              position={[hub.latitude, hub.longitude]}
              icon={createViabusRadarHubIcon(hub.name, hub.connected_routes.map((c: any) => c.route_code))}
              eventHandlers={{
                click: () => setSelectedHub(hub)
              }}
            >
              <Popup closeButton={false}>
                <div className="p-1 min-w-[160px]">
                  <p className="font-extrabold text-xs text-[#1e3a8a]">{hub.name}</p>
                  <p className="text-[10px] text-slate-500">{hub.name_alt}</p>
                  <div className="mt-1 flex flex-col gap-1 text-[11px]">
                    {hub.connected_routes.map((r: any) => (
                      <div key={r.route_code} className="flex items-center justify-between font-bold">
                        <span className="bg-blue-100 text-blue-800 px-1 rounded">{r.route_code}</span>
                        <span className="text-emerald-700">{r.eta_mins} mins</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Live Multi-Buses on Map */}
          {buses.map(b => (
            <Marker
              key={b.id}
              position={[b.last_known_location.latitude, b.last_known_location.longitude]}
              icon={createViabusBusMarkerIcon(
                b.id === 'BUS-38' ? '38' : (b.id === 'BUS-21' ? '21' : '140'),
                b.status === 'MOVING'
              )}
            >
              <Popup closeButton={false}>
                <div className="p-1 font-bold text-xs text-center">
                  {b.number} • {b.plate_number}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Floating Google Maps Zoom In / Zoom Out Controls */}
        <GoogleMapZoomButtons map={mapInstance} className="absolute bottom-52 right-3 z-[450]" />
      </div>

      {/* VIABUS STOP RADAR CARD (Image 2 Left Phone) */}
      {selectedHub && (
        <div className="absolute top-24 left-3 right-3 z-[550] bg-white rounded-3xl p-4 shadow-2xl border border-slate-200 animate-slide-up">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                Transit Hub Radar
              </span>
              <h3 className="font-extrabold text-base text-[#1e3a8a] mt-1">{selectedHub.name}</h3>
              <p className="text-xs text-slate-500">{selectedHub.name_alt}</p>
            </div>
            <button
              onClick={() => setSelectedHub(null)}
              className="text-slate-400 hover:text-slate-700 font-bold p-1"
            >
              ✕
            </button>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            {selectedHub.connected_routes.map((cr: any) => (
              <div
                key={cr.route_code}
                className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-100"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-8 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-sm">
                    {cr.route_code}
                  </div>
                  <div>
                    <p className="font-bold text-xs text-slate-900">{cr.destination}</p>
                    <p className="text-[10px] text-slate-400">Plate: {cr.vehicle_plate || 'Live'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <span className="text-sm font-black text-[#1e3a8a]">{cr.eta_mins}</span>
                    <span className="text-[10px] text-slate-500 ml-1">mins</span>
                  </div>

                  <button
                    onClick={() => toggleAlert(cr.route_code)}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                      alertToggles[cr.route_code]
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                    title="Toggle Alert for this route"
                  >
                    <Bell className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ROUTE MAP & ACCESSIBILITY SHEET (Image 2 Middle Phone) */}
      <div className={`relative z-[500] bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 transition-all duration-300 ${
        isTimelineOpen ? 'max-h-[310px]' : 'max-h-[70px]'
      }`}>
        
        <div 
          onClick={() => setIsTimelineOpen(!isTimelineOpen)}
          className="p-3.5 flex items-center justify-between cursor-pointer border-b border-slate-100"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-11 h-9 rounded-2xl bg-[#1e40af] text-white font-black text-lg flex items-center justify-center shadow-md">
              {currentRoute?.code || '38'}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm text-[#1e3a8a]">{currentRoute?.name || 'Route 01: Saket → Delhi Technical Campus'}</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">Plate: {currentRoute?.vehicle_plate || 'DL 1P B 3838'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenAlerts();
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs shadow-xs"
            >
              <Bell className="w-3.5 h-3.5 fill-blue-600" />
              <span>Ride Alert</span>
            </button>

            <button className="text-slate-400 p-1">
              {isTimelineOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Accessibility Badges */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2 text-[11px] text-slate-700 font-semibold overflow-x-auto no-scrollbar">
          <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
            <Accessibility className="w-3.5 h-3.5 text-blue-600" /> Wheelchair Ramp
          </span>
          <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
            <Wind className="w-3.5 h-3.5 text-cyan-600" /> Air Conditioned
          </span>
          <span className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
            <Zap className="w-3.5 h-3.5 text-amber-500" /> Free WiFi
          </span>
        </div>

        {/* Vertical Stop Progression Timeline */}
        <div className="p-4 overflow-y-auto max-h-[180px] space-y-3">
          {stops.map((stop: RouteStop, sIdx: number) => {
            const isPassed = sIdx === 0;
            const isCurrent = sIdx === 1;

            return (
              <div key={stop.id} className="relative flex items-start gap-3 pl-1">
                {sIdx < stops.length - 1 && (
                  <div 
                    className={`absolute left-[13px] top-6 bottom-0 w-[2.5px] ${
                      isPassed ? 'bg-blue-600' : 'bg-slate-200'
                    }`}
                  />
                )}

                <div className="relative z-10 flex-shrink-0">
                  {isCurrent ? (
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md animate-pulse">
                      <BusIcon className="w-3.5 h-3.5" />
                    </div>
                  ) : isPassed ? (
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-black">
                      ✓
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-500">
                      {sIdx + 1}
                    </div>
                  )}
                </div>

                <div className="flex-1 -mt-0.5">
                  <div className="flex items-center justify-between">
                    <p className={`text-xs font-bold ${isCurrent ? 'text-blue-700 font-black' : 'text-slate-800'}`}>
                      {stop.name}
                    </p>
                    <span className="text-[10px] font-semibold text-slate-400">
                      {stop.scheduled_time}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">{stop.description || 'Regular Stop'}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
