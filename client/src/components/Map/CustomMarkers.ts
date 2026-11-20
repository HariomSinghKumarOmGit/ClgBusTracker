// client/src/components/Map/CustomMarkers.ts
import L from 'leaflet';

/**
 * Image 1 Style Bus Marker:
 * - White circular bubble with royal blue bus glyph
 * - Top radio signal broadcast waves (( ))
 * - Blue countdown tag (e.g. "32s")
 * - 6-dot matrix occupancy pill (:::)
 */
export function createImage1BusMarkerIcon({
  heading = 0,
  countdownText = '32s',
  isOccupied = [true, true, true, false, false, false],
  status = 'MOVING'
}: {
  heading?: number;
  countdownText?: string;
  isOccupied?: boolean[];
  status?: string;
}) {
  const isMoving = status === 'MOVING';

  const dotsHtml = (isOccupied || [true, true, true, false, false, false])
    .map(filled => `<span style="width: 4px; height: 4px; border-radius: 9999px; background-color: ${filled ? '#1d4ed8' : '#cbd5e1'};"></span>`)
    .join('');

  const html = `
    <div class="relative flex flex-col items-center justify-center select-none" style="width: 72px; height: 84px;">
      ${isMoving ? `
        <div class="absolute -top-1 flex items-center justify-center pointer-events-none" style="width: 28px; height: 16px;">
          <svg class="w-7 h-4 text-blue-600 animate-pulse" viewBox="0 0 24 14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <path d="M7 10a5 5 0 0 1 10 0" />
            <path d="M3 7a10 10 0 0 1 18 0" />
            <path d="M12 12v.01" stroke-width="3" />
          </svg>
        </div>
      ` : ''}

      <div 
        class="relative flex items-center justify-center rounded-full bg-white shadow-xl transition-all duration-300"
        style="
          width: 52px; 
          height: 52px; 
          border: 3.5px solid #ffffff;
          box-shadow: 0 8px 24px rgba(29, 78, 216, 0.28), 0 2px 8px rgba(0,0,0,0.12);
        "
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          class="w-7 h-7 text-[#1d4ed8]" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          stroke-width="2.3" 
          stroke-linecap="round" 
          stroke-linejoin="round"
        >
          <path d="M8 6v6" />
          <path d="M16 6v6" />
          <path d="M4 6h16a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-1H7v1a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
          <circle cx="7" cy="15" r="1.5" />
          <circle cx="17" cy="15" r="1.5" />
        </svg>

        <div 
          class="absolute -top-1 -right-4 bg-[#1d4ed8] text-white text-[11px] font-black px-2 py-0.5 rounded-full shadow-md flex items-center gap-0.5"
          style="border: 2px solid #ffffff;"
        >
          ${countdownText}
        </div>
      </div>

      <div 
        class="mt-1 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-full shadow-md flex items-center justify-center gap-1"
        style="border: 1.5px solid #e2e8f0;"
        title="Bus Occupancy Level"
      >
        <div class="grid grid-cols-3 gap-0.5">
          ${dotsHtml}
        </div>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'image1-bus-marker',
    iconSize: [72, 84],
    iconAnchor: [36, 42],
    popupAnchor: [0, -42]
  });
}

/**
 * Image 1 Style Stop Node:
 * - White circular disc with royal blue outer ring
 */
export function createImage1StopMarkerIcon({
  sequenceOrder,
  isUserStop = false,
  isTerminal = false,
  isPassed = false,
  stopLabel
}: {
  sequenceOrder: number;
  isUserStop?: boolean;
  isTerminal?: boolean;
  isPassed?: boolean;
  stopLabel?: string;
}) {
  const ringColor = isUserStop ? '#1d4ed8' : (isTerminal ? '#4338ca' : (isPassed ? '#94a3b8' : '#3b82f6'));
  const dotColor = isUserStop ? '#1d4ed8' : (isTerminal ? '#4338ca' : (isPassed ? '#cbd5e1' : '#60a5fa'));

  const html = `
    <div class="relative flex items-center justify-center cursor-pointer group" style="width: 28px; height: 28px;">
      ${isUserStop ? `
        <div class="absolute w-8 h-8 rounded-full bg-blue-500/20 animate-ping"></div>
      ` : ''}

      <div 
        class="relative flex items-center justify-center rounded-full bg-white shadow-md transition-transform group-hover:scale-125"
        style="
          width: 22px; 
          height: 22px; 
          border: 3.5px solid ${ringColor};
        "
      >
        <div 
          class="rounded-full"
          style="
            width: 7px; 
            height: 7px; 
            background-color: ${dotColor};
          "
        ></div>
      </div>

      ${isUserStop ? `
        <div 
          class="absolute -bottom-5 whitespace-nowrap bg-blue-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full shadow uppercase"
        >
          ${stopLabel || 'Start'}
        </div>
      ` : ''}
      ${isTerminal ? `
        <div 
          class="absolute -bottom-5 whitespace-nowrap bg-purple-700 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full shadow uppercase"
        >
          DTC
        </div>
      ` : ''}
    </div>
  `;

  return L.divIcon({
    html,
    className: 'image1-stop-node',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14]
  });
}

/**
 * Image 1 User Location Pin (😎 15th start point)
 */
export function createUserPinIcon(emoji = '😎') {
  const html = `
    <div class="relative flex flex-col items-center justify-center select-none" style="width: 36px; height: 42px;">
      <div class="absolute -top-1 w-9 h-9 rounded-full bg-blue-500/30 animate-pulse"></div>

      <div 
        class="relative flex items-center justify-center rounded-full bg-white text-lg shadow-xl"
        style="
          width: 34px; 
          height: 34px; 
          border: 3px solid #1d4ed8;
          box-shadow: 0 4px 14px rgba(29, 78, 216, 0.35);
        "
      >
        <span>${emoji}</span>
      </div>

      <div 
        class="w-0 h-0 -mt-0.5" 
        style="
          border-left: 5px solid transparent; 
          border-right: 5px solid transparent; 
          border-top: 6px solid #1d4ed8;
        "
      ></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'image1-user-pin',
    iconSize: [36, 42],
    iconAnchor: [18, 40],
    popupAnchor: [0, -40]
  });
}

export function createAccuratePersonMarkerIcon(emoji = '😎') {
  const html = `
    <div class="relative flex flex-col items-center justify-center select-none" style="width: 44px; height: 44px;">
      <div class="absolute w-11 h-11 rounded-full bg-blue-500/25 animate-ping"></div>
      <div class="absolute w-8 h-8 rounded-full bg-blue-500/20 border border-blue-400"></div>
      <div 
        class="relative flex items-center justify-center rounded-full bg-white text-sm shadow-xl"
        style="
          width: 28px; 
          height: 28px; 
          border: 2.5px solid #2563eb;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.45);
        "
      >
        <span>${emoji}</span>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'accurate-person-pin',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22]
  });
}

/**
 * Image 2 Viabus Transit Radar Hub Marker
 */
export function createViabusRadarHubIcon(stopName: string, routeCodes: string[] = ['140', '29', '38']) {
  const routePills = routeCodes.slice(0, 3).map(c => `
    <span class="bg-[#1e40af] text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-xs">${c}</span>
  `).join('');

  const html = `
    <div class="relative flex flex-col items-center justify-center cursor-pointer group" style="width: 70px; height: 70px;">
      <div class="absolute w-12 h-12 rounded-full border-2 border-blue-500/40 animate-ping"></div>

      <div 
        class="relative flex items-center justify-center rounded-full bg-blue-900 text-white shadow-xl transition-transform group-hover:scale-110"
        style="
          width: 38px; 
          height: 38px; 
          border: 3px solid #ffffff;
          box-shadow: 0 6px 18px rgba(30, 58, 138, 0.4);
        "
      >
        <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3">
          <rect width="16" height="16" x="4" y="3" rx="2" />
          <path d="M4 11h16" />
          <path d="M8 15h.01" stroke-width="3" />
          <path d="M16 15h.01" stroke-width="3" />
        </svg>
      </div>

      <div class="absolute -bottom-4 flex items-center gap-0.5 shadow-sm">
        ${routePills}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'viabus-radar-hub',
    iconSize: [70, 70],
    iconAnchor: [35, 35],
    popupAnchor: [0, -35]
  });
}

/**
 * Image 2 Viabus Bus Marker
 */
export function createViabusBusMarkerIcon(routeCode: string, isLive = true) {
  const html = `
    <div class="relative flex flex-col items-center justify-center cursor-pointer select-none" style="width: 50px; height: 50px;">
      ${isLive ? `<div class="absolute w-10 h-10 rounded-full bg-blue-600/30 animate-ping"></div>` : ''}
      <div 
        class="relative flex items-center justify-center rounded-xl bg-blue-700 text-white shadow-lg"
        style="
          width: 38px; 
          height: 38px; 
          border: 2.5px solid #ffffff;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        "
      >
        <div class="flex flex-col items-center leading-none">
          <svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 6h16a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-1v-1H5v1H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
          </svg>
          <span class="text-[10px] font-black">${routeCode}</span>
        </div>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'viabus-bus-marker',
    iconSize: [50, 50],
    iconAnchor: [25, 25],
    popupAnchor: [0, -25]
  });
}

export function createBusMarkerIcon(heading = 0, status: string = 'IDLE', busNumber = 'Bus 01') {
  return createImage1BusMarkerIcon({ heading, countdownText: '32s', status });
}

export function createStopMarkerIcon(opts: any) {
  return createImage1StopMarkerIcon(opts);
}

export function createCampusU5MarkerIcon(label: string = 'Campus Destination') {
  const html = `
    <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
      <div style="background: #1e3a8a; color: white; padding: 4px 8px; border-radius: 8px; font-weight: 800; font-size: 11px; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.25); border: 2px solid white; display: flex; align-items: center; gap: 4px;">
        <span>🎓</span>
        <span>${label}</span>
      </div>
      <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 6px solid #1e3a8a;"></div>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'campus-destination-marker',
    iconSize: [120, 40],
    iconAnchor: [60, 36],
    popupAnchor: [0, -36]
  });
}

