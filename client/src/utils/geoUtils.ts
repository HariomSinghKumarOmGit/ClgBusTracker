// client/src/utils/geoUtils.ts

/**
 * Calculates Haversine distance in meters between two [latitude, longitude] coordinates.
 */
export function haversineMeters(coord1: [number, number], coord2: [number, number]): number {
  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates the perpendicular distance in meters from point P to line segment AB.
 */
export function distanceToSegmentMeters(
  point: [number, number],
  segA: [number, number],
  segB: [number, number]
): number {
  const [latP, lngP] = point;
  const [latA, lngA] = segA;
  const [latB, lngB] = segB;

  // Local flat earth projection centered at A
  const avgLatRad = ((latA + latB) / 2) * (Math.PI / 180);
  const metersPerLat = 110540;
  const metersPerLng = 111320 * Math.cos(avgLatRad);

  const px = (lngP - lngA) * metersPerLng;
  const py = (latP - latA) * metersPerLat;

  const bx = (lngB - lngA) * metersPerLng;
  const by = (latB - latA) * metersPerLat;

  const segLenSq = bx * bx + by * by;

  if (segLenSq === 0) {
    return Math.hypot(px, py);
  }

  // Projection scalar t along segment [0, 1]
  const t = Math.max(0, Math.min(1, (px * bx + py * by) / segLenSq));
  const projX = t * bx;
  const projY = t * by;

  return Math.hypot(px - projX, py - projY);
}

/**
 * Finds the minimum distance in meters from a point to an entire polyline.
 */
export function distanceToPolylineMeters(
  point: [number, number],
  polyline: [number, number][]
): number {
  if (!polyline || polyline.length === 0) return 0;
  if (polyline.length === 1) return haversineMeters(point, polyline[0]);

  let minDistance = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const d = distanceToSegmentMeters(point, polyline[i], polyline[i + 1]);
    if (d < minDistance) {
      minDistance = d;
    }
  }
  return minDistance;
}

/**
 * Determines whether a coordinate is considered "on track" along the route.
 * Default threshold is 250 meters to comfortably accommodate GPS drift and multi-lane roads.
 */
export function isPointOnTrack(
  point: [number, number],
  polyline: [number, number][],
  thresholdMeters = 250
): boolean {
  if (!polyline || polyline.length === 0) return true;
  return distanceToPolylineMeters(point, polyline) <= thresholdMeters;
}

export interface LocationReport {
  deviceId: string;
  emoji: string;
  latitude: number;
  longitude: number;
  speedKmh?: number;
  heading?: number;
  accuracy?: number;
  isOnTrack?: boolean;
}

/**
 * Clusters an array of reports and finds the cluster with the MAXIMUM number of locations.
 * Returns the centroid coordinate, cluster size, and participating emojis.
 */
export function findMaxLocationCluster(
  reports: LocationReport[],
  radiusMeters = 350
): {
  centroid: [number, number];
  count: number;
  emojis: string[];
  members: LocationReport[];
} | null {
  if (!reports || reports.length === 0) return null;
  if (reports.length === 1) {
    return {
      centroid: [reports[0].latitude, reports[0].longitude],
      count: 1,
      emojis: [reports[0].emoji || '😎'],
      members: reports
    };
  }

  let bestCluster: LocationReport[] = [];

  for (let i = 0; i < reports.length; i++) {
    const origin = reports[i];
    const neighbors: LocationReport[] = [];

    for (let j = 0; j < reports.length; j++) {
      const target = reports[j];
      const dist = haversineMeters(
        [origin.latitude, origin.longitude],
        [target.latitude, target.longitude]
      );
      if (dist <= radiusMeters) {
        neighbors.push(target);
      }
    }

    if (neighbors.length > bestCluster.length) {
      bestCluster = neighbors;
    }
  }

  if (bestCluster.length === 0) {
    bestCluster = [reports[0]];
  }

  // Calculate centroid
  const sumLat = bestCluster.reduce((acc, r) => acc + r.latitude, 0);
  const sumLng = bestCluster.reduce((acc, r) => acc + r.longitude, 0);

  return {
    centroid: [sumLat / bestCluster.length, sumLng / bestCluster.length],
    count: bestCluster.length,
    emojis: bestCluster.map(r => r.emoji || '😎'),
    members: bestCluster
  };
}
