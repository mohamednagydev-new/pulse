import { io, type Socket } from 'socket.io-client';
import { getAccessToken } from './api';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const url = import.meta.env.DEV ? 'http://localhost:4000' : undefined;
    socket = io(url, {
      // Function form: the token is read at every connection attempt, not
      // captured once at construction. Components mount (and used to build the
      // socket) before bootstrap() has the access token, which permanently
      // killed realtime for the whole session — the server rejects the
      // handshake and socket.io does not retry after a middleware rejection.
      auth: (cb) => cb({ token: getAccessToken() }),
      // Polling first, then upgrade to websocket. With websocket listed first
      // there is NO fallback within a connection attempt (documented socket.io
      // gotcha) — one blocked ws:// upgrade at the proxy and realtime is dead
      // for the whole session. Polling always gets through IIS/ARR.
      transports: ['polling', 'websocket'],
    });
    socket.on('connect_error', (err) => {
      // Rejected while we *do* hold a token → transient (expired JWT mid-
      // rotation); retry shortly. Rejected without a token → stay quiet and
      // wait for refreshSocketAuth() after login/bootstrap.
      if (err.message === 'unauthorized' && getAccessToken()) {
        setTimeout(() => socket?.connect(), 1500);
      }
    });
  }
  return socket;
}

/** (Re)connect with the current token — call after login/bootstrap sets it. */
export function refreshSocketAuth() {
  if (socket && !socket.connected) socket.connect();
}

/** Drop the connection on logout so a stale session stops receiving events. */
export function disconnectSocket() {
  socket?.disconnect();
}
