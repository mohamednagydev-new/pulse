import { PrismaClient } from '@prisma/client';

/**
 * SQLite hardening for production traffic:
 *
 * connection_limit=1 — SQLite allows one writer at a time anyway; a connection
 * pool only lets our own queries manufacture SQLITE_BUSY collisions against
 * each other. One connection serializes at the pool instead (sub-ms queries,
 * single Node process — the latency cost is noise) and eliminates the error.
 *
 * busy_timeout=5000 — when an EXTERNAL writer holds the file (nightly
 * VACUUM INTO backup, a manual sqlite3 session), wait up to 5s instead of
 * throwing. With one connection, the PRAGMA below reliably covers all traffic.
 */
function hardenedUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url || !url.startsWith('file:')) return url;
  if (url.includes('connection_limit')) return url;
  return url + (url.includes('?') ? '&' : '?') + 'connection_limit=1';
}

export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  datasources: { db: { url: hardenedUrl() } },
});

prisma.$executeRawUnsafe('PRAGMA busy_timeout = 5000').catch(() => {
  /* non-SQLite or startup race — the default (throw immediately) simply remains */
});
