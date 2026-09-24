import 'dotenv/config';

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://vanta:vanta2026@localhost:5432/vanta_db',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  jwtSecret: process.env.JWT_SECRET || 'vanta-institutional-jwt-secret-change-in-production',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:3000',
  jwtExpiry: '7d',
  cookieName: 'vanta_auth'
} as const;
