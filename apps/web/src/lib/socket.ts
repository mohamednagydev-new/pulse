import { io, type Socket } from 'socket.io-client';
import { getAccessToken } from './api';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const url = import.meta.env.DEV ? 'http://localhost:4000' : undefined;
    socket = io(url, { auth: { token: getAccessToken() }, transports: ['websocket', 'polling'] });
  }
  return socket;
}

export function refreshSocketAuth() {
  if (socket) {
    (socket.auth as any) = { token: getAccessToken() };
    if (!socket.connected) socket.connect();
  }
}
