// api/stops.js
// Vercel Serverless Function: Route Stoppages API
import { transitRoutes } from './routes.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { routeId, id } = req.query;
  const targetRouteId = routeId || 'ROUTE-01';
  const route = transitRoutes.find(r => r.id === targetRouteId || r.code === targetRouteId) || transitRoutes[0];
  const stops = route?.stops || [];

  if (req.method === 'POST') {
    const newStop = {
      id: `STOP-${Date.now().toString(36).toUpperCase()}`,
      route_id: targetRouteId,
      sequence_order: stops.length + 1,
      name: req.body?.name || `Stop ${stops.length + 1}`,
      description: req.body?.description || '',
      latitude: Number(req.body?.latitude || 28.5204),
      longitude: Number(req.body?.longitude || 77.2014),
      scheduled_time: req.body?.scheduled_time || '08:00 AM',
      is_terminal: Boolean(req.body?.is_terminal),
      status: 'upcoming'
    };
    stops.push(newStop);
    return res.status(201).json({ stop: newStop, route });
  }

  if (req.method === 'PUT') {
    const stopIndex = stops.findIndex(s => s.id === id);
    if (stopIndex !== -1) {
      stops[stopIndex] = { ...stops[stopIndex], ...req.body };
      return res.status(200).json({ stop: stops[stopIndex], route });
    }
    return res.status(200).json({ stop: req.body, route });
  }

  if (req.method === 'DELETE') {
    return res.status(200).json({ success: true, deletedId: id });
  }

  if (id && !routeId) {
    const stop = stops.find(s => s.id === id);
    if (stop) return res.status(200).json(stop);
  }

  return res.status(200).json(stops);
}
