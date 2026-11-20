// server/src/trackSnapping.js
// Map matching and track snapping algorithm for bus navigation.
// Rule:
// - Bus stays snapped to the track (polyline) if fewer than 3 consecutive locations are off-track (< 3).
// - Bus can move out of track ONLY if there are at least 3 consecutive out-of-track locations (>= 3).
// - When a location returns to the track corridor, counter resets to 0.

export const OFF_TRACK_THRESHOLD_METERS = 50; // Road corridor boundary in meters
export const MIN_OUT_OF_TRACK_COUNT = 3;      // Must have >= 3 consecutive off-track readings to deviate

/**
 * Calculates Great Circle / Haversine distance in meters between two lat/lng coordinates
 */
export function getDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Snaps a point (lat, lng) to the nearest segment of a polyline track.
 * Returns { minDistance, snappedPoint: [lat, lng], segmentBearing }
 */
export function snapToPolyline(lat, lng, polyline) {
  if (!polyline || polyline.length < 2) {
    return {
      minDistance: 0,
      snappedPoint: [lat, lng],
      segmentBearing: 0
    };
  }

  let minDistance = Infinity;
  let snappedPoint = [lat, lng];
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
      const bearing = (Math.atan2(lng2 - lng1, lat2 - lat1) * 180 / Math.PI + 360) % 360;
      segmentBearing = Math.round(bearing);
    }
  }

  return { minDistance, snappedPoint, segmentBearing };
}

/**
 * Processes a location update according to the out-of-track rule:
 * - If current out_of_track_count < 3, keep bus on track (snapped).
 * - Only allow bus to move out of track if out_of_track_count >= 3.
 */
export function processTrackLocation({
  latitude,
  longitude,
  currentOutOfTrackCount = 0,
  polyline = [],
  thresholdMeters = OFF_TRACK_THRESHOLD_METERS
}) {
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
      // Rule: If less than three, ignore deviation and keep bus on track
      isOnTrack = true;
      finalLat = snappedPoint[0];
      finalLng = snappedPoint[1];
    } else {
      // Rule: 3 or more consecutive locations are out of track, bus can go out of track
      isOnTrack = false;
      finalLat = latitude;
      finalLng = longitude;
    }
  } else {
    // Back on track: reset counter to 0 and snap to road
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
