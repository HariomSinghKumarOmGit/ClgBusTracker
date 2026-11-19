// client/src/components/Map/CustomMarkers.ts
import L from 'leaflet';

/**
 * Modern High-Tech 3D Bus Marker:
 * - Directional headlight projection beam
 * - Smooth bearing rotation
 * - Glowing radar pulse rings
 * - Speed badge and bus identification tag
 */
export function createBusMarkerIcon(heading = 0, status: string = 'IDLE', busNumber = 'Bus U5') {
  const isMoving = status === 'MOVING';
  const isStopped = status === 'STOPPED';

  const html = `
    <div class="relative flex items-center justify-center select-none" style="width: 68px; height: 68px;">
      <!-- Directional Headlight Glow Beam (pointing in heading angle) -->
      ${isMoving ? `
        <div 
          class="absolute pointer-events-none"
          style="
            top: -24px;
            width: 36px;
            height: 36px;
            transform: rotate(${heading}deg);
            transform-origin: center 46px;
            background: radial-gradient(ellipse at bottom, rgba(59, 130, 246, 0.45) 0%, rgba(59, 130, 246, 0) 75%);
            clip-path: polygon(25% 0%, 75% 0%, 100% 100%, 0% 100%);
          "
        ></div>
      ` : ''}

      <!-- Multi-stage Pulsating Radar Waves -->
      ${isMoving ? `
        <div class="absolute w-12 h-12 rounded-full bg-blue-500/30 animate-ping pointer-events-none"></div>
        <div class="absolute w-16 h-16 rounded-full border border-blue-400/40 animate-pulse pointer-events-none"></div>
      ` : ''}

      <!-- Rotating Vehicle Body -->
      <div 
        class="relative flex items-center justify-center rounded-2xl shadow-2xl transition-transform duration-500 ease-out"
        style="
          width: 44px; 
          height: 44px; 
          background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%);
          border: 3px solid #ffffff;
          box-shadow: 0 8px 24px rgba(29, 78, 216, 0.45), 0 2px 6px rgba(0,0,0,0.25);
          transform: rotate(${heading}deg);
        "
      >
        <!-- Direction Triangle Pointer on Top Edge -->
        <div 
          class="absolute -top-2 w-0 h-0" 
          style="
            border-left: 6px solid transparent; 
            border-right: 6px solid transparent; 
            border-bottom: 8px solid #3b82f6;
            filter: drop-shadow(0 -1px 2px rgba(0,0,0,0.3));
          "
        ></div>

        <!-- Modern Sleek Bus SVG Glyph -->
        <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-white drop-shadow-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 6v6"/>
          <path d="M16 6v6"/>
          <path d="M4 12h16"/>
          <rect width="18" height="15" x="3" y="3" rx="3.5"/>
          <circle cx="7.5" cy="15" r="1.5" fill="#ffffff"/>
          <circle cx="16.5" cy="15" r="1.5" fill="#ffffff"/>
          <path d="M6 18v2.5"/>
          <path d="M18 18v2.5"/>
        </svg>
      </div>

      <!-- Bus Number Badge floating underneath -->
      <div 
        class="absolute -bottom-5 whitespace-nowrap bg-slate-950/90 text-white text-[10px] font-black px-2 py-0.5 rounded-full border border-blue-400/50 shadow-lg backdrop-blur-md flex items-center gap-1 pointer-events-none"
      >
        <span class="w-1.5 h-1.5 rounded-full ${isMoving ? 'bg-emerald-400 animate-pulse' : (isStopped ? 'bg-amber-400' : 'bg-slate-400')}"></span>
        <span>${busNumber}</span>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'modern-bus-marker',
    iconSize: [68, 68],
    iconAnchor: [34, 34],
    popupAnchor: [0, -34]
  });
}

/**
 * Special Campus Marker for Delhi Technical Campus (U5):
 * - Graduation crest with golden/purple neon aura
 * - Permanent floating label: "🎓 Delhi Technical Campus (U5)"
 */
export function createCampusU5MarkerIcon() {
  const html = `
    <div class="relative flex flex-col items-center justify-center cursor-pointer group select-none" style="width: 80px; height: 90px;">
      <!-- Glowing Purple & Golden Radar Halo -->
      <div class="absolute -top-1 w-14 h-14 rounded-full bg-purple-600/30 animate-ping pointer-events-none"></div>
      <div class="absolute -top-3 w-18 h-18 rounded-full border-2 border-amber-400/40 animate-pulse pointer-events-none"></div>

      <!-- 3D Hex/Circle Badge with Campus Graduation Crest -->
      <div 
        class="relative flex items-center justify-center rounded-2xl shadow-2xl transition-transform group-hover:scale-115"
        style="
          width: 48px; 
          height: 48px; 
          background: linear-gradient(135deg, #4c1d95 0%, #6d28d9 50%, #8b5cf6 100%);
          border: 3px solid #fbbf24;
          box-shadow: 0 10px 25px rgba(109, 40, 217, 0.55), 0 0 15px rgba(251, 191, 36, 0.5);
        "
      >
        <!-- Graduation Cap SVG -->
        <svg class="w-6 h-6 text-amber-300 drop-shadow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
          <path d="M6 12v5c3 3 9 3 12 0v-5"/>
        </svg>

        <!-- U5 Badge Chip -->
        <div class="absolute -top-2 -right-2 bg-amber-400 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded-md shadow border border-white">
          U5
        </div>
      </div>

      <!-- Pointer Tip -->
      <div 
        class="w-0 h-0 -mt-1" 
        style="
          border-left: 7px solid transparent; 
          border-right: 7px solid transparent; 
          border-top: 10px solid #6d28d9;
        "
      ></div>

      <!-- Permanent High-Visibility Campus Label -->
      <div 
        class="absolute -bottom-4 whitespace-nowrap bg-purple-950/95 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-lg border border-amber-400/60 shadow-xl backdrop-blur-md flex items-center gap-1"
      >
        <span class="text-amber-400 font-black">🎓</span>
        <span>Delhi Technical Campus (U5)</span>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'campus-u5-marker',
    iconSize: [80, 90],
    iconAnchor: [40, 56],
    popupAnchor: [0, -56]
  });
}

/**
 * Modern Google Maps Style Stoppage Marker:
 * - Numbered pin with clean drop shadow
 * - Pickup point highlight with glowing green radar
 * - Passed stop dimming
 */
export function createStopMarkerIcon({
  sequenceOrder,
  isTerminal = false,
  isPickup = false,
  isPassed = false,
  isNext = false,
  waitingCount = 0
}: {
  sequenceOrder: number;
  isTerminal?: boolean;
  isPickup?: boolean;
  isPassed?: boolean;
  isNext?: boolean;
  waitingCount?: number;
}) {
  // If this is the college destination stop, use the dedicated U5 Campus marker
  if (isTerminal) {
    return createCampusU5MarkerIcon();
  }

  let gradient = 'linear-gradient(135deg, #1e40af 0%, #2563eb 100%)';
  let borderColor = '#ffffff';
  let badgeColor = '#ffffff';

  if (isPassed) {
    gradient = 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)';
    badgeColor = '#e2e8f0';
  } else if (isPickup) {
    gradient = 'linear-gradient(135deg, #059669 0%, #10b981 100%)'; // Emerald Green for student pickup
    borderColor = '#a7f3d0';
  } else if (isNext) {
    gradient = 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)';
    borderColor = '#bfdbfe';
  }

  const html = `
    <div class="relative flex flex-col items-center justify-center cursor-pointer group select-none" style="width: 44px; height: 52px;">
      <!-- Pickup Pulse Ring -->
      ${isPickup ? `
        <div class="absolute -top-1 w-11 h-11 rounded-full bg-emerald-500/30 animate-ping pointer-events-none"></div>
      ` : ''}

      <!-- Next Stop Pulse Ring -->
      ${isNext ? `
        <div class="absolute -top-1 w-11 h-11 rounded-full bg-blue-500/30 animate-pulse pointer-events-none"></div>
      ` : ''}

      <!-- Pin Head -->
      <div 
        class="relative flex items-center justify-center rounded-full shadow-lg transition-transform group-hover:scale-115"
        style="
          width: 34px; 
          height: 34px; 
          background: ${gradient}; 
          border: 2.5px solid ${borderColor};
          box-shadow: 0 6px 16px rgba(0,0,0,0.3);
        "
      >
        <span class="text-xs font-black tracking-tight" style="color: ${badgeColor};">
          ${sequenceOrder}
        </span>

        <!-- Waiting count badge -->
        ${waitingCount > 0 ? `
          <div class="absolute -top-2 -right-2 bg-amber-400 text-slate-950 text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white shadow">
            ${waitingCount}
          </div>
        ` : ''}
      </div>

      <!-- Pin Tip -->
      <div 
        class="w-0 h-0 -mt-1" 
        style="
          border-left: 6px solid transparent; 
          border-right: 6px solid transparent; 
          border-top: 8px solid ${isPassed ? '#64748b' : (isPickup ? '#10b981' : '#2563eb')};
        "
      ></div>

      <!-- Tag Label if pickup point -->
      ${isPickup ? `
        <div class="absolute -bottom-3 bg-emerald-700 text-white font-black text-[8px] px-1.5 py-0.2 rounded shadow uppercase tracking-wider whitespace-nowrap">
          MY STOP
        </div>
      ` : ''}
    </div>
  `;

  return L.divIcon({
    html,
    className: 'modern-stop-marker',
    iconSize: [44, 52],
    iconAnchor: [22, 44],
    popupAnchor: [0, -44]
  });
}
