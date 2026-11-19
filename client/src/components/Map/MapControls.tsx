// client/src/components/Map/MapControls.tsx
import React, { useState, useContext } from 'react';
import { TileLayer } from 'react-leaflet';
import { LeafletContext } from '@react-leaflet/core';
import type { Map as LeafletMap } from 'leaflet';
import { 
  Layers, 
  Map as MapIcon, 
  Satellite, 
  Moon, 
  Mountain, 
  Activity, 
  Plus, 
  Minus, 
  Check
} from 'lucide-react';
import { MapTheme, GOOGLE_MAP_THEMES } from './mapConfig';

export const GoogleMapTileLayer: React.FC<{ theme: MapTheme }> = ({ theme }) => {
  const config = GOOGLE_MAP_THEMES[theme] || GOOGLE_MAP_THEMES['google-traffic'];
  return (
    <TileLayer
      key={theme}
      url={config.url}
      subdomains={config.subdomains}
      maxZoom={config.maxZoom}
      attribution={config.attribution}
    />
  );
};

export interface GoogleMapZoomButtonsProps {
  map?: LeafletMap | null;
  className?: string;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
}

export const GoogleMapZoomButtons: React.FC<GoogleMapZoomButtonsProps> = ({
  map: externalMap,
  className = '',
  onZoomIn,
  onZoomOut
}) => {
  const context = useContext(LeafletContext);
  const activeMap = externalMap || context?.map || null;

  const handleZoomIn = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onZoomIn) {
      onZoomIn();
    } else if (activeMap) {
      activeMap.zoomIn(1, { animate: true });
    }
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onZoomOut) {
      onZoomOut();
    } else if (activeMap) {
      activeMap.zoomOut(1, { animate: true });
    }
  };

  return (
    <div className={`flex flex-col bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={handleZoomIn}
        title="Zoom In"
        aria-label="Zoom in"
        className="w-10 h-10 flex items-center justify-center text-slate-700 hover:text-blue-600 hover:bg-slate-50 active:bg-slate-100 transition-colors border-b border-slate-100"
      >
        <Plus className="w-4 h-4 stroke-[2.5]" />
      </button>
      <button
        type="button"
        onClick={handleZoomOut}
        title="Zoom Out"
        aria-label="Zoom out"
        className="w-10 h-10 flex items-center justify-center text-slate-700 hover:text-blue-600 hover:bg-slate-50 active:bg-slate-100 transition-colors"
      >
        <Minus className="w-4 h-4 stroke-[2.5]" />
      </button>
    </div>
  );
};

interface GoogleMapLayerSelectorProps {
  currentTheme: MapTheme;
  onSelectTheme: (theme: MapTheme) => void;
  className?: string;
  dropdownAlign?: 'left' | 'right';
}

export const GoogleMapLayerSelector: React.FC<GoogleMapLayerSelectorProps> = ({
  currentTheme,
  onSelectTheme,
  className = '',
  dropdownAlign = 'right'
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const themeOptions: Array<{ id: MapTheme; label: string; icon: React.ElementType; badge?: string }> = [
    { id: 'google-traffic', label: 'Live Traffic', icon: Activity, badge: 'LIVE' },
    { id: 'google-streets', label: 'Google Maps', icon: MapIcon },
    { id: 'google-satellite', label: 'Satellite 3D', icon: Satellite },
    { id: 'google-terrain', label: 'Terrain', icon: Mountain },
    { id: 'dark-night', label: 'Night Cyber', icon: Moon }
  ];

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(prev => !prev)}
        title="Select Map Style (Google Maps, Satellite, Live Traffic)"
        className={`w-10 h-10 bg-white/95 backdrop-blur-md hover:bg-slate-50 text-slate-800 active:scale-95 rounded-2xl shadow-xl border border-slate-200/90 flex items-center justify-center transition-all ${
          isOpen ? 'ring-2 ring-blue-500 shadow-blue-200' : ''
        }`}
      >
        <Layers className="w-5 h-5 text-blue-600" />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-[650]" 
            onClick={() => setIsOpen(false)} 
          />
          <div 
            className={`absolute top-12 ${
              dropdownAlign === 'right' ? 'right-0' : 'left-0'
            } z-[700] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200/90 p-2 min-w-[200px] space-y-1 animate-fadeIn`}
          >
            <div className="flex items-center justify-between px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
              <span>Map Style</span>
              <span className="text-blue-600">Google Live</span>
            </div>

            {themeOptions.map((opt) => {
              const Icon = opt.icon;
              const isActive = currentTheme === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    onSelectTheme(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-700 hover:bg-slate-100/90'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    <span>{opt.label}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {opt.badge && (
                      <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-emerald-400 text-slate-900' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {opt.badge}
                      </span>
                    )}
                    {isActive && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export const LiveTrafficBadge: React.FC<{
  isTrafficActive: boolean;
  onToggle?: () => void;
  speedKmh?: number;
}> = ({ isTrafficActive, onToggle, speedKmh }) => {
  return (
    <button
      onClick={onToggle}
      title={isTrafficActive ? 'Click to toggle Live Google Traffic' : 'Click to enable Live Google Traffic'}
      className="flex items-center gap-2 px-3 py-1.5 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200/90 text-xs font-bold text-slate-800 transition-all hover:bg-slate-50 active:scale-95 cursor-pointer"
    >
      <span className="relative flex h-2.5 w-2.5">
        {isTrafficActive ? (
          <>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </>
        ) : (
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-400"></span>
        )}
      </span>

      <span className="text-[11px] font-extrabold tracking-tight">
        {isTrafficActive ? 'Google Live Traffic' : 'Traffic Off'}
      </span>

      {speedKmh !== undefined && speedKmh > 0 && (
        <span className="text-blue-600 font-black border-l border-slate-200 pl-2 text-[11px]">
          {Math.round(speedKmh)} km/h
        </span>
      )}
    </button>
  );
};
