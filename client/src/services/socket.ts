// client/src/services/socket.ts
import { io, Socket } from 'socket.io-client';

// Use backend on port 4000 if running locally, or current origin
const SOCKET_URL = typeof window !== 'undefined' && window.location.port === '5173'
  ? 'http://' + window.location.hostname + ':4000'
  : '/';

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
  timeout: 3000,
  transports: ['websocket', 'polling']
});

socket.on('connect', () => {
  console.log('⚡ Connected to College Bus Tracker Real-time Socket (ID:', socket.id, ')');
});

socket.on('connect_error', () => {
  // Silent fallback when running on static hosting without custom WebSocket server
});

socket.on('disconnect', (reason) => {
  console.log('Socket disconnected:', reason);
});
