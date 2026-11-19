// api/stops.js
// Vercel Serverless Function: Route Stoppages API
import { transitRoutes } from './routes.js';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { routeId, id } = req.query;
  const targetRouteId = routeId || id || 'ROUTE-38';
  const route = transitRoutes.find(r => r.id === targetRouteId || r.code === targetRouteId);
  if (!route) {
    return res.status(200).json(transitRoutes[0]?.stops || []);
  }

  return res.status(200).json(route.stops || []);
}
