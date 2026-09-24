import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config.js';
import { initDatabase, disconnectDb } from './db/prismaClient.js';
import { StreamHandler } from './sockets/streamHandler.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerEventsRoutes } from './routes/events.js';
import { registerCotRoutes } from './routes/cot.js';
import { registerRetailSentimentRoutes } from './routes/retailSentiment.js';
import { registerSystemRoutes } from './routes/system.js';
import { registerSearchRoutes } from './routes/search.js';
import { registerJournalRoutes } from './routes/journal.js';

// ─── Fastify Instance ───────────────────────────────────────────────────────
const app = Fastify({
  logger: {
    level: config.nodeEnv === 'development' ? 'info' : 'warn',
    transport: config.nodeEnv === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined
  }
});

// ─── Plugins ────────────────────────────────────────────────────────────────
await app.register(fastifyCors, {
  origin: [config.clientOrigin, 'http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
});

await app.register(fastifyCookie);

await app.register(fastifyJwt, {
  secret: config.jwtSecret,
  cookie: {
    cookieName: config.cookieName,
    signed: false
  },
  sign: { expiresIn: config.jwtExpiry }
});

// Authenticate decorator — used via preValidation on protected routes
app.decorate('authenticate', async function(request: any, reply: any) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.status(401).send({ error: 'Terminal Access Rejected: Invalid or expired session' });
  }
});


// ─── Socket.io (attached to underlying http.Server) ─────────────────────────
const io = new SocketIOServer(app.server, {
  cors: {
    origin: [config.clientOrigin, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST']
  },
  pingTimeout: 10000,
  pingInterval: 5000
});

const streamHandler = new StreamHandler(io);

// ─── Routes ─────────────────────────────────────────────────────────────────
await registerAuthRoutes(app);
await registerEventsRoutes(app, streamHandler);
await registerCotRoutes(app, streamHandler);
await registerRetailSentimentRoutes(app);
await registerSystemRoutes(app, streamHandler);
await registerSearchRoutes(app);
await registerJournalRoutes(app);

// ─── Health ──────────────────────────────────────────────────────────────────
app.get('/health', async (request, reply) => {
  const { isDbConnected } = await import('./db/prismaClient.js');
  return reply.send({
    status: 'OPTIMAL',
    service: 'Chadi0x VANTA Telemetry Gateway v3',
    timestamp: new Date().toISOString(),
    database: isDbConnected() ? 'POSTGRES_PRISMA_CONNECTED' : 'IN_MEMORY_FALLBACK',
    activeSocketClients: streamHandler.getActiveClients(),
    version: '3.0.0'
  });
});

// ─── Startup ─────────────────────────────────────────────────────────────────
async function startServer() {
  await initDatabase();

  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    console.log('====================================================');
    console.log('  CHADI0X VANTA - INSTITUTIONAL ALPHA TERMINAL v3   ');
    console.log(`  PORT: ${config.port} | ENV: ${config.nodeEnv}      `);
    console.log('  FASTIFY + PRISMA + SOCKET.IO — LIVE STREAM ACTIVE  ');
    console.log('====================================================');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// ─── Graceful Shutdown ───────────────────────────────────────────────────────
const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
signals.forEach(signal => {
  process.on(signal, async () => {
    console.log(`\n[Gateway] ${signal} received — initiating graceful shutdown...`);
    await app.close();
    await disconnectDb();
    process.exit(0);
  });
});

startServer();
