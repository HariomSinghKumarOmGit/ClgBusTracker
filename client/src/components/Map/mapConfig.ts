// client/src/components/Map/mapConfig.ts

export type MapTheme = 
  | 'google-traffic' 
  | 'google-streets' 
  | 'google-satellite' 
  | 'google-terrain' 
  | 'dark-night';

export interface TileLayerConfig {
  id: MapTheme;
  name: string;
  shortName: string;
  description: string;
  url: string;
  subdomains: string[];
  maxZoom: number;
  attribution: string;
  hasTraffic?: boolean;
}

export const GOOGLE_MAP_THEMES: Record<MapTheme, TileLayerConfig> = {
  'google-traffic': {
    id: 'google-traffic',
    name: 'Google Maps (Live Traffic)',
    shortName: 'Live Traffic',
    description: 'Real-time road congestion & Google vector roads',
    url: 'https://mt{s}.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 21,
    attribution: '&copy; Google Maps &bull; Live Traffic',
    hasTraffic: true
  },
  'google-streets': {
    id: 'google-streets',
    name: 'Google Maps (Streets)',
    shortName: 'Google Streets',
    description: 'Clean high-contrast vector streets & landmarks',
    url: 'https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 21,
    attribution: '&copy; Google Maps'
  },
  'google-satellite': {
    id: 'google-satellite',
    name: 'Google Satellite (Hybrid)',
    shortName: 'Satellite 3D',
    description: 'High-res satellite photo with roads & labels',
    url: 'https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 21,
    attribution: '&copy; Google Satellite Imagery'
  },
  'google-terrain': {
    id: 'google-terrain',
    name: 'Google Terrain',
    shortName: 'Terrain',
    description: 'Elevation contours with live traffic overlay',
    url: 'https://mt{s}.google.com/vt/lyrs=p,traffic&x={x}&y={y}&z={z}',
    subdomains: ['0', '1', '2', '3'],
    maxZoom: 20,
    attribution: '&copy; Google Maps Terrain',
    hasTraffic: true
  },
  'dark-night': {
    id: 'dark-night',
    name: 'Cyber Night Mode',
    shortName: 'Night Mode',
    description: 'Sleek dark contrast for low-light tracking',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png',
    subdomains: ['a', 'b', 'c', 'd'],
    maxZoom: 19,
    attribution: '&copy; CARTO &copy; OpenStreetMap'
  }
};

export const DEFAULT_MAP_THEME: MapTheme = 'google-traffic';
