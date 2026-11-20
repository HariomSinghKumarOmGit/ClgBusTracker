// client/src/components/Map/TransitExploreView.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Bus, BusRoute, RouteStop, TransitStopHub } from '../../types';
import { 
  createViabusBusMarkerIcon, 
  createViabusRadarHubIcon, 
  createTransitRouteStopMarkerIcon 
} from './CustomMarkers';
import { 
  Search, 
  MapPin, 
  Navigation, 
  Bell, 
  ChevronUp, 
  ChevronDown, 
  Check, 
  Bus as BusIcon, 
  Accessibility, 
  Wind, 
  Zap, 
  Maximize2, 
  Minimize2, 
  Clock, 
  Compass, 
  ArrowUpRight,
  Sparkles,
  Map as MapIcon
} from 'lucide-react';
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
      map.flyTo(targetCoord, 14.5, { animate: true, duration: 0.9 });
    }
  }, [targetCoord, map]);
  return null;
}

type SheetSnapMode = 'collapsed' | 'half' | 'full';

export const TransitExploreView: React.FC<TransitExploreViewProps> = ({
  routes,
  stops,
  buses,
  selectedRoute,
  onSelectRoute,
  onOpenAlerts
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState<number>(750);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selectedHub, setSelectedHub] = useState<TransitStopHub | null>(null);
  const [targetCoord, setTargetCoord] = useState<[number, number] | null>(null);
  const [alertToggles, setAlertToggles] = useState<Record<string, boolean>>({ '140': true, '29': false, '38': true, '01': true });
  const [mapTheme, setMapTheme] = useState<MapTheme>(DEFAULT_MAP_THEME);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

  // Bottom Sheet Snap & Dragging States
  const [sheetMode, setSheetMode] = useState<SheetSnapMode>('half');
  const [isDragging, setIsDragging] = useState(false);
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const dragStartYRef = useRef<number>(0);
  const dragStartHeightRef = useRef<number>(0);
  const dragStartTimeRef = useRef<number>(0);

  // Measure container height dynamically
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateH = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };
    updateH();
    const observer = new ResizeObserver(updateH);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Snap heights:
  // - collapsed: 74px (shows compact header, maximizes full map view)
  // - half: ~335px (shows route header, accessibility badges, and some stops preview)
  // - full: containerHeight - 56px (full screen with little space at top for whole stops)
  const COLLAPSED_HEIGHT = 74;
  const HALF_HEIGHT = Math.min(335, Math.round(containerHeight * 0.44));
  const FULL_HEIGHT = Math.max(containerHeight - 56, 420);

  // Determine current active height
  const activeHeight = dragHeight !== null 
    ? dragHeight 
    : (sheetMode === 'collapsed' ? COLLAPSED_HEIGHT : sheetMode === 'half' ? HALF_HEIGHT : FULL_HEIGHT);

  // Handle Drag Gestures (Touch + Mouse)
  const startDrag = (clientY: number) => {
    setIsDragging(true);
    dragStartYRef.current = clientY;
    dragStartHeightRef.current = activeHeight;
    dragStartTimeRef.current = Date.now();
  };

  const onDragMove = useCallback((clientY: number) => {
    if (!isDragging) return;
    const deltaY = dragStartYRef.current - clientY; // dragging UP increases height
    const rawHeight = dragStartHeightRef.current + deltaY;
    const clampedHeight = Math.max(COLLAPSED_HEIGHT, Math.min(FULL_HEIGHT, rawHeight));
    setDragHeight(clampedHeight);
  }, [isDragging, COLLAPSED_HEIGHT, FULL_HEIGHT]);

  const endDrag = useCallback((clientY: number) => {
    if (!isDragging) return;
    setIsDragging(false);

    const deltaY = dragStartYRef.current - clientY;
    const deltaTime = Math.max(1, Date.now() - dragStartTimeRef.current);
    const velocity = deltaY / deltaTime; // px per ms

    const finalHeight = dragHeight !== null ? dragHeight : activeHeight;
    setDragHeight(null);

    // Fast flick detection
    if (velocity > 0.35) {
      // Fast flick UP
      if (finalHeight < HALF_HEIGHT) {
        setSheetMode('half');
      } else {
        setSheetMode('full');
      }
      return;
    } else if (velocity < -0.35) {
      // Fast flick DOWN
      if (finalHeight > HALF_HEIGHT) {
        setSheetMode('half');
      } else {
        setSheetMode('collapsed');
      }
      return;
    }

    // Distance threshold snapping
    const distToCollapsed = Math.abs(finalHeight - COLLAPSED_HEIGHT);
    const distToHalf = Math.abs(finalHeight - HALF_HEIGHT);
    const distToFull = Math.abs(finalHeight - FULL_HEIGHT);

    if (distToCollapsed <= distToHalf && distToCollapsed <= distToFull) {
      setSheetMode('collapsed');
    } else if (distToFull <= distToHalf && distToFull <= distToCollapsed) {
      setSheetMode('full');
    } else {
      setSheetMode('half');
    }
  }, [isDragging, dragHeight, activeHeight, COLLAPSED_HEIGHT, HALF_HEIGHT, FULL_HEIGHT]);

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    startDrag(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    onDragMove(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    endDrag(e.changedTouches[0].clientY);
  };

  // Mouse handlers for desktop browser support
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    startDrag(e.clientY);

    const handleMouseMove = (moveEvt: MouseEvent) => {
      onDragMove(moveEvt.clientY);
    };

    const handleMouseUp = (upEvt: MouseEvent) => {
      endDrag(upEvt.clientY);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

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
        { route_code: '01', route_id: 'ROUTE-01', destination: 'Delhi Technical Campus', eta_mins: 8, is_live: true, vehicle_plate: 'DL 1P B 3838' }
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
        { route_code: '01', route_id: 'ROUTE-01', destination: 'Delhi Technical Campus', eta_mins: 2, is_live: true, vehicle_plate: 'DL 1P B 3838' }
      ]
    }
  ];

  const categories = [
    { id: 'all', label: 'All Routes', icon: '🚌' },
    { id: 'home', label: 'Home', icon: '🏠', coord: [28.5040, 77.2380] as [number, number] },
    { id: 'work', label: 'Work', icon: '💼', coord: [28.5230, 77.2290] as [number, number] },
    { id: 'campus', label: 'DTC Campus', icon: '🎓', coord: [28.47478, 77.476134] as [number, number] },
    { id: 'hospital', label: 'Hospital', icon: '🏥', coord: [28.5130, 77.2260] as [number, number] }
  ];

  const currentRoute = selectedRoute || routes[0];
  const busStoppedCoord: [number, number] = [28.5447, 77.2648]; // Kalindi Kunj (Stop 2)
  const currentStoppedStopName = 'Kalindi Kunj';

  const handleCategoryClick = (cat: typeof categories[0]) => {
    setActiveCategory(cat.id);
    if (cat.coord) {
      setTargetCoord(cat.coord);
    }
  };

  const toggleAlert = (code: string) => {
    setAlertToggles(prev => ({ ...prev, [code]: !prev[code] }));
  };

  // Center on current bus stopped location
  const handleFocusBus = () => {
    setTargetCoord(busStoppedCoord);
  };

  // Stops to show: In 'half' mode show some stops (top 4), in 'full' mode show whole stops (all 6)
  const displayedStops = sheetMode === 'half' ? stops.slice(0, 4) : stops;

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full max-w-md mx-auto overflow-hidden bg-slate-900 flex flex-col font-sans select-none"
    >
      
      {/* TOP VIABUS HEADER & SEARCH BAR */}
      <div className="absolute top-3 left-3 right-3 z-[450] flex flex-col gap-2 pointer-events-auto">
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

      {/* FULL-CANVAS LEAFLET TRANSIT MAP - Occupies full container underneath */}
      <div className="absolute inset-0 w-full h-full z-0">
        <MapContainer
          ref={setMapInstance}
          center={[28.5300, 77.2500]}
          zoom={12.8}
          maxZoom={21}
          zoomControl={false}
          className="w-full h-full"
        >
          {/* Live Google Maps Tile Layer */}
          <GoogleMapTileLayer theme={mapTheme} />

          <ExploreMapController targetCoord={targetCoord} />

          {/* Render Transit Route Polyline with Glow */}
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

          {/* Render All Route Stoppages On The Map (Whole Stops & Current Stopped Stop) */}
          {stops.map((stop, sIdx) => {
            const isPassed = sIdx === 0;
            const isCurrent = sIdx === 1; // Bus is currently stopped at Kalindi Kunj
            const isTerminal = stop.is_terminal || sIdx === stops.length - 1;

            return (
              <Marker
                key={stop.id}
                position={[stop.latitude, stop.longitude]}
                icon={createTransitRouteStopMarkerIcon({
                  sequenceOrder: sIdx + 1,
                  name: stop.name,
                  isCurrent,
                  isPassed,
                  isTerminal
                })}
                eventHandlers={{
                  click: () => {
                    setTargetCoord([stop.latitude, stop.longitude]);
                  }
                }}
              >
                <Popup closeButton={false}>
                  <div className="p-1 min-w-[160px] text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span className="font-extrabold text-xs text-[#1e3a8a]">{stop.name}</span>
                      {isCurrent && (
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-1.5 py-0.2 rounded">
                          BUS HERE
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">{stop.description || 'Stoppage'}</p>
                    <div className="mt-1 text-[11px] font-bold text-slate-700 bg-slate-50 py-0.5 rounded">
                      Scheduled: {stop.scheduled_time}
                    </div>
                    {isCurrent && (
                      <p className="text-[10px] font-black text-blue-600 mt-1">
                        ● DL 1P B 3838 currently stopped here
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
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
                b.id === 'BUS-38' ? '38' : (b.id === 'BUS-21' ? '21' : '01'),
                b.status === 'MOVING'
              )}
            >
              <Popup closeButton={false}>
                <div className="p-1 font-bold text-xs text-center">
                  Route 01 • DL 1P B 3838
                  <div className="text-[10px] text-emerald-600 font-extrabold mt-0.5">
                    ● Currently Stopped @ Kalindi Kunj
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Floating Buttons: Zoom & Quick Focus Bus (smoothly floats above the dynamic bottom sheet) */}
      <div 
        className="absolute right-3 z-[460] flex flex-col items-end gap-2 pointer-events-auto transition-all duration-300"
        style={{ bottom: `${activeHeight + 14}px` }}
      >
        {/* Floating Shortcut: One-Click Locate Where Bus Is Stopped on Map */}
        <button
          onClick={handleFocusBus}
          className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md text-blue-800 hover:text-blue-950 px-3 py-1.5 rounded-full shadow-xl border border-blue-200 text-xs font-black transition-transform active:scale-95 group"
          title="Center map on live bus stopped location"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <BusIcon className="w-3.5 h-3.5 text-blue-600" />
          <span>Bus Stopped @ {currentStoppedStopName}</span>
          <ArrowUpRight className="w-3 h-3 text-slate-400 group-hover:text-blue-600" />
        </button>

        {/* Floating Google Maps Zoom Controls */}
        <GoogleMapZoomButtons map={mapInstance} className="relative shadow-xl" />
      </div>

      {/* VIABUS STOP RADAR CARD (When a Transit Hub is tapped) */}
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

      {/* DRAGGABLE BOTTOM SHEET - Drag to full screen (with little space at top) or drag back to collapse */}
      <div 
        style={{ 
          height: `${activeHeight}px`,
          transition: isDragging ? 'none' : 'height 0.32s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
        className="absolute bottom-0 left-0 right-0 z-[500] bg-white rounded-t-3xl shadow-[0_-10px_35px_rgba(0,0,0,0.18)] border-t border-slate-200 flex flex-col overflow-hidden will-change-[height]"
      >
        
        {/* DRAG HANDLE BAR (Interactive Touch & Pointer Target) */}
        <div 
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          className="pt-2.5 pb-1 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing hover:bg-slate-50/80 transition-colors touch-none"
          title="Drag up to expand to full screen, drag down to collapse to full map"
        >
          {/* Centered Pill Grabber */}
          <div className="w-12 h-1.5 rounded-full bg-slate-300 hover:bg-slate-400 active:bg-blue-500 transition-colors" />
          
          {/* Subtle indicator hint */}
          <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
            {sheetMode === 'collapsed' 
              ? 'Drag up for stops · Full map active' 
              : sheetMode === 'full' 
              ? 'Drag down to collapse' 
              : 'Drag up for whole stops · Drag down to collapse'}
          </span>
        </div>

        {/* HEADER SECTION (Route Title, Plate, Ride Alert & Expand/Collapse Controls) */}
        <div 
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          className="px-4 py-2 flex items-center justify-between border-b border-slate-100 cursor-grab active:cursor-grabbing select-none"
        >
          <div 
            onClick={() => {
              if (sheetMode === 'collapsed') setSheetMode('half');
            }}
            className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
          >
            {/* Route Code Circular Badge */}
            <div className="w-11 h-11 rounded-full bg-[#1e40af] text-white font-black text-base flex items-center justify-center shadow-md flex-shrink-0">
              R01
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 truncate">
                <span className="font-extrabold text-sm text-[#1e3a8a] truncate">
                  {currentRoute?.name || 'Route 01: Saket → Delhi Technical Campus'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                <span>Plate: {currentRoute?.vehicle_plate || 'DL 1P B 3838'}</span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Stopped @ Kalindi Kunj
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Ride Alert Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenAlerts();
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 active:scale-95 font-bold text-xs shadow-xs transition-all"
            >
              <Bell className="w-3.5 h-3.5 fill-blue-600" />
              <span>Ride Alert</span>
            </button>

            {/* Expand / Collapse Control Buttons */}
            {sheetMode === 'full' ? (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setSheetMode('half');
                }}
                className="text-slate-500 hover:text-slate-800 active:scale-90 p-1.5 rounded-xl hover:bg-slate-100 transition-all"
                title="Collapse to half view"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            ) : sheetMode === 'collapsed' ? (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setSheetMode('half');
                }}
                className="text-slate-500 hover:text-slate-800 active:scale-90 p-1.5 rounded-xl hover:bg-slate-100 transition-all"
                title="Expand to view stops"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
            ) : (
              <div className="flex items-center gap-0.5 bg-slate-100/80 p-0.5 rounded-xl">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSheetMode('collapsed');
                  }}
                  className="text-slate-500 hover:text-slate-800 active:scale-90 p-1 rounded-lg hover:bg-white transition-all"
                  title="Collapse to full map"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSheetMode('full');
                  }}
                  className="text-slate-600 hover:text-blue-700 active:scale-90 p-1 rounded-lg hover:bg-white transition-all"
                  title="Expand to full screen"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* EXPANDED CONTENT: Visible in 'half' and 'full' modes */}
        {sheetMode !== 'collapsed' && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-white">
            
            {/* Accessibility Badges */}
            <div className="px-4 py-2 bg-slate-50/90 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-700 font-semibold overflow-x-auto no-scrollbar flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs whitespace-nowrap">
                  <Accessibility className="w-3.5 h-3.5 text-blue-600" /> Wheelchair Ramp
                </span>
                <span className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs whitespace-nowrap">
                  <Wind className="w-3.5 h-3.5 text-cyan-600" /> Air Conditioned
                </span>
                <span className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs whitespace-nowrap">
                  <Zap className="w-3.5 h-3.5 text-amber-500" /> Free WiFi
                </span>
              </div>

              {/* Mode indicator pill */}
              <span className="text-[10px] font-black text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full whitespace-nowrap ml-2">
                {sheetMode === 'full' ? 'Whole Stops (All 6)' : 'Some Stops (4/6)'}
              </span>
            </div>

            {/* Whole Stops Route Summary Banner (Shown in Full mode) */}
            {sheetMode === 'full' && (
              <div className="mx-4 mt-3 mb-1 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl flex items-center justify-between text-xs flex-shrink-0 animate-fade-in">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-extrabold text-[#1e3a8a]">Total Route: 34.2 km • 55 Mins</p>
                    <p className="text-[11px] text-slate-500">6 Major Stoppages to Greater Noida Campus</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="inline-block px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-black rounded-full shadow-xs">
                    LIVE TRACKING
                  </span>
                </div>
              </div>
            )}

            {/* Vertical Stop Progression Timeline (Scrollable) */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5">
              {displayedStops.map((stop: RouteStop, sIdx: number) => {
                const isPassed = sIdx === 0;
                const isCurrent = sIdx === 1; // Stop 2: Kalindi Kunj
                const isTerminal = stop.is_terminal || sIdx === stops.length - 1;

                return (
                  <div 
                    key={stop.id} 
                    onClick={() => setTargetCoord([stop.latitude, stop.longitude])}
                    className="relative flex items-start gap-3 pl-1 cursor-pointer group hover:bg-slate-50 p-1.5 rounded-xl transition-colors"
                  >
                    {/* Vertical connecting line */}
                    {sIdx < displayedStops.length - 1 && (
                      <div 
                        className={`absolute left-[17px] top-6 bottom-0 w-[2.5px] ${
                          isPassed ? 'bg-blue-600' : 'bg-slate-200'
                        }`}
                      />
                    )}

                    {/* Timeline Node Icon */}
                    <div className="relative z-10 flex-shrink-0">
                      {isCurrent ? (
                        <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg ring-4 ring-blue-100 animate-pulse">
                          <BusIcon className="w-4 h-4" />
                        </div>
                      ) : isPassed ? (
                        <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black shadow-sm">
                          ✓
                        </div>
                      ) : isTerminal ? (
                        <div className="w-7 h-7 rounded-full bg-purple-700 text-white flex items-center justify-center text-xs font-black shadow-sm">
                          ★
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center text-xs font-bold text-slate-600 group-hover:border-blue-500 transition-colors">
                          {sIdx + 1}
                        </div>
                      )}
                    </div>

                    {/* Stop Details */}
                    <div className="flex-1 -mt-0.5 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 truncate">
                          <p className={`text-xs font-bold truncate ${
                            isCurrent ? 'text-blue-700 font-black' : isPassed ? 'text-slate-800' : 'text-slate-700'
                          }`}>
                            {stop.name}
                          </p>
                          {isCurrent && (
                            <span className="text-[9px] font-black bg-blue-600 text-white px-1.5 py-0.2 rounded-full uppercase tracking-wider flex-shrink-0 animate-pulse">
                              Bus Currently Here
                            </span>
                          )}
                          {isTerminal && (
                            <span className="text-[9px] font-black bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded uppercase tracking-wider flex-shrink-0">
                              Destination
                            </span>
                          )}
                        </div>

                        <span className="text-[10px] font-bold text-slate-400 flex-shrink-0 ml-2">
                          {stop.scheduled_time}
                        </span>
                      </div>

                      <p className="text-[10px] text-slate-500 truncate mt-0.5">
                        {stop.description || 'Regular transit stop'}
                      </p>

                      {/* Real-time Dynamic ETA Badge */}
                      <div className="flex items-center gap-2 mt-1">
                        {isPassed ? (
                          <span className="text-[9.5px] text-emerald-600 font-bold flex items-center gap-1">
                            ✓ Departed on schedule
                          </span>
                        ) : isCurrent ? (
                          <span className="text-[9.5px] text-blue-600 font-extrabold flex items-center gap-1">
                            ● Bus stopped here (Taking passengers)
                          </span>
                        ) : (
                          <span className="text-[9.5px] text-slate-400 font-medium">
                            ETA: {sIdx === 2 ? '~12 mins' : sIdx === 3 ? '~32 mins' : sIdx === 4 ? '~52 mins' : '~1 hr 10 mins'}
                          </span>
                        )}
                        <span className="text-[9px] text-blue-500 underline opacity-0 group-hover:opacity-100 transition-opacity">
                          View on map
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Action Banner when in 'half' mode to encourage dragging to full screen */}
              {sheetMode === 'half' && (
                <div 
                  onClick={() => setSheetMode('full')}
                  className="mt-2 p-2.5 rounded-xl bg-blue-50/70 border border-blue-200 text-center cursor-pointer hover:bg-blue-100 transition-colors"
                >
                  <p className="text-xs font-bold text-blue-700 flex items-center justify-center gap-1">
                    <span>Drag up or click to view all whole stops & destination</span>
                    <ChevronUp className="w-4 h-4" />
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Pari Chowk & Delhi Technical Campus (DTC)
                  </p>
                </div>
              )}

              {/* In 'full' mode: collapse back button at bottom */}
              {sheetMode === 'full' && (
                <div 
                  onClick={() => setSheetMode('half')}
                  className="pt-2 pb-6 text-center cursor-pointer"
                >
                  <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors">
                    <ChevronDown className="w-4 h-4" />
                    <span>Collapse sheet to see full map</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
