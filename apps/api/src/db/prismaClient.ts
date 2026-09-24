import { PrismaClient } from '@prisma/client';
import dns from 'dns';

// Underlying active Prisma instance
let currentPrisma: PrismaClient = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
});

// Proxy delegate — allows dynamic datasource URL switching after async DNS resolution
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const val = (currentPrisma as any)[prop];
    if (typeof val === 'function') {
      return val.bind(currentPrisma);
    }
    return val;
  }
});

let _isConnected = false;

// In-memory fallback store for standalone development without Docker/Postgres
export const inMemoryStore = {
  users: [
    {
      id: 1,
      username: 'admin',
      email: 'desk@vanta.chadi0x.io',
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$A0xL4z6Z2eFgDvxTqWn3nw$6Hkm2LW5s5LJE1PLwE0mDRjGa7n9Yq8H5nCB3mK3s2w',
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ] as any[],
  events: new Map<string, any>(),
  news: new Map<string, any>(),
  cotReports: new Map<string, any>(),
  retailSentiment: new Map<string, any>(),
  scraperHealth: new Map<string, any>()
};

export async function initDatabase(): Promise<boolean> {
  const rawUrl = process.env.DATABASE_URL || '';
  let activeUrl = rawUrl;

  try {
    if (rawUrl.includes('@')) {
      const parts = rawUrl.split('@');
      const authPart = parts[0];
      const hostPart = parts[1];
      const hostAndPort = hostPart.split('/')[0];
      const dbPath = hostPart.substring(hostAndPort.length);
      const host = hostAndPort.split(':')[0];
      const port = hostAndPort.split(':')[1] || '5432';

      // If host is a docker service name like 'postgres', resolve it to numeric IP
      if (host && !/^(\d{1,3}\.){3}\d{1,3}$/.test(host) && host !== 'localhost' && host !== '127.0.0.1') {
        try {
          const { address } = await dns.promises.lookup(host);
          if (address) {
            activeUrl = `${authPart}@${address}:${port}${dbPath}`;
            console.log(`[DB] Resolved database host '${host}' -> ${address}`);
          }
        } catch (dnsErr: any) {
          console.warn(`[DB] DNS lookup for '${host}' failed (${dnsErr.message}), using default host.`);
        }
      }
    }
  } catch (parseErr: any) {
    console.warn(`[DB] URL parse warning: ${parseErr.message}`);
  }

  try {
    currentPrisma = new PrismaClient({
      datasources: { db: { url: activeUrl } },
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
    });

    await currentPrisma.$connect();
    await currentPrisma.$queryRaw`SELECT 1`;
    _isConnected = true;
    console.log('[DB] Prisma connected to PostgreSQL cluster.');

    // Auto-seed institutional COT archives, The Pulse, calendar events, and yields
    import('./seedInitialData.js')
      .then(m => m.seedInitialData())
      .catch(err => console.warn('[DB SEED WARNING]', err.message));

    return true;
  } catch (err: any) {
    console.warn(`[DB WARNING] PostgreSQL connection failed (${err.message}). Activating In-Memory fallback mode.`);
    _isConnected = false;
    return false;
  }
}

export function isDbConnected(): boolean {
  return _isConnected;
}

export async function disconnectDb(): Promise<void> {
  try {
    await currentPrisma.$disconnect();
  } catch {
    // Ignore shutdown errors
  }
}

