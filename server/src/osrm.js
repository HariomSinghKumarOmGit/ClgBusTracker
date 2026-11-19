// server/src/osrm.js
// Service for fetching road-accurate routes via OSRM

export async function calculateRouteGeometry(stops) {
  if (!stops || stops.length < 2) {
    return {
      coordinates: stops.map(s => [s.latitude, s.longitude]),
      distance_km: 0,
      duration_mins: 0
    };
  }

  // Format: lng,lat;lng,lat
  const coordString = stops.map(s => `${s.longitude},${s.latitude}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CollegeBusTracker/1.0' },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) {
      throw new Error(`OSRM HTTP error: ${res.status}`);
    }

    const data = await res.json();
    if (data.code === 'Ok' && data.routes && data.routes[0]) {
      const route = data.routes[0];
      return {
        // Convert from GeoJSON [lng, lat] to Leaflet [lat, lng]
        coordinates: route.geometry.coordinates.map(c => [c[1], c[0]]),
        distance_km: Math.round((route.distance / 1000) * 10) / 10,
        duration_mins: Math.round(route.duration / 60)
      };
    }
  } catch (err) {
    console.warn('OSRM route fetch failed or timed out, using linear fallback:', err.message);
  }

  // Fallback: direct linear interpolation between stops
  return {
    coordinates: stops.map(s => [s.latitude, s.longitude]),
    distance_km: 40.0,
    duration_mins: 50
  };
}
