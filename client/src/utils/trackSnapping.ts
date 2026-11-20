// client/src/utils/trackSnapping.ts
// Map matching and track snapping algorithm for bus navigation.
//
// Requirement:
// - Bus can go or move out of track ONLY if consecutive locations out of track are >= 3.
// - If less than 3, ignore deviation and keep bus on track (snapped to polyline).
// - When location returns on track (within threshold), consecutive count resets to 0.

export const OFF_TRACK_THRESHOLD_METERS = 50; // Road corridor boundary in meters
export const MIN_OUT_OF_TRACK_COUNT = 3;      // Must have >= 3 consecutive off-track readings to deviate

/**
 * Calculates Great Circle / Haversine distance in meters between two lat/lng coordinates
 */
export function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface SnapResult {
  minDistance: number;
  snappedPoint: [number, number];
  segmentBearing: number;
}

/**
 * Snaps a point (lat, lng) to the nearest segment of a polyline track.
 */
export function snapToPolyline(
  lat: number,
  lng: number,
  polyline: [number, number][]
): SnapResult {
  if (!polyline || polyline.length < 2) {
    return {
      minDistance: 0,
      snappedPoint: [lat, lng],
      segmentBearing: 0
    };
  }

  let minDistance = Infinity;
  let snappedPoint: [number, number] = [lat, lng];
  let segmentBearing = 0;

  for (let i = 0; i < polyline.length - 1; i++) {
    const [lat1, lng1] = polyline[i];
    const [lat2, lng2] = polyline[i + 1];

    const midLat = ((lat1 + lat2) / 2) * (Math.PI / 180);
    const kx = 111320 * Math.cos(midLat);
    const ky = 111320;

    const dx = (lng2 - lng1) * kx;
    const dy = (lat2 - lat1) * ky;
    const lenSq = dx * dx + dy * dy;

    let t = 0;
    if (lenSq > 0) {
      const px = (lng - lng1) * kx;
      const py = (lat - lat1) * ky;
      t = Math.max(0, Math.min(1, (px * dx + py * dy) / lenSq));
    }

    const nLat = lat1 + t * (lat2 - lat1);
    const nLng = lng1 + t * (lng2 - lng1);

    const dLat = (lat - nLat) * 111320;
    const dLng = (lng - nLng) * kx;
    const dist = Math.hypot(dLat, dLng);

    if (dist < minDistance) {
      minDistance = dist;
      snappedPoint = [nLat, nLng];
      const bearing = (((Math.atan2(lng2 - lng1, lat2 - lat1) * 180) / Math.PI) + 360) % 360;
      segmentBearing = Math.round(bearing);
    }
  }

  return { minDistance, snappedPoint, segmentBearing };
}

export interface ProcessedTrackLocation {
  latitude: number;
  longitude: number;
  rawLatitude: number;
  rawLongitude: number;
  isOnTrack: boolean;
  outOfTrackCount: number;
  distanceToTrackMeters: number;
  snappedLocation: [number, number];
  segmentBearing: number;
}

/**
 * Evaluates a location update against the route polyline track:
 * - If consecutive out-of-track count < 3: ignore deviation, keep bus on track.
 * - If consecutive out-of-track count >= 3: bus moves out of track.
 * - When back on track: resets count to 0.
 */
export function processTrackLocation({
  latitude,
  longitude,
  currentOutOfTrackCount = 0,
  polyline = [],
  thresholdMeters = OFF_TRACK_THRESHOLD_METERS
}: {
  latitude: number;
  longitude: number;
  currentOutOfTrackCount?: number;
  polyline?: [number, number][];
  thresholdMeters?: number;
}): ProcessedTrackLocation {
  if (!polyline || polyline.length < 2) {
    return {
      latitude,
      longitude,
      rawLatitude: latitude,
      rawLongitude: longitude,
      isOnTrack: true,
      outOfTrackCount: 0,
      distanceToTrackMeters: 0,
      snappedLocation: [latitude, longitude],
      segmentBearing: 0
    };
  }

  const { minDistance, snappedPoint, segmentBearing } = snapToPolyline(latitude, longitude, polyline);
  const isDeviation = minDistance > thresholdMeters;

  let newCount = currentOutOfTrackCount;
  let isOnTrack = true;
  let finalLat = snappedPoint[0];
  let finalLng = snappedPoint[1];

  if (isDeviation) {
    newCount += 1;
    if (newCount < MIN_OUT_OF_TRACK_COUNT) {
      // Less than 3: ignore deviation, keep bus on track!
      isOnTrack = true;
      finalLat = snappedPoint[0];
      finalLng = snappedPoint[1];
    } else {
      // 3 or more: bus is confirmed off-track and moves out of track
      isOnTrack = false;
      finalLat = latitude;
      finalLng = longitude;
    }
  } else {
    // On track: reset counter to 0 and snap smoothly to road
    newCount = 0;
    isOnTrack = true;
    finalLat = snappedPoint[0];
    finalLng = snappedPoint[1];
  }

  return {
    latitude: finalLat,
    longitude: finalLng,
    rawLatitude: latitude,
    rawLongitude: longitude,
    isOnTrack,
    outOfTrackCount: newCount,
    distanceToTrackMeters: Math.round(minDistance * 10) / 10,
    snappedLocation: snappedPoint,
    segmentBearing
  };
}
