import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import argon2 from 'argon2';
import { z } from 'zod';
import { prisma, isDbConnected, inMemoryStore } from '../db/prismaClient.js';
import { config } from '../config.js';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required')
});

export async function registerAuthRoutes(app: FastifyInstance) {

  // POST /api/auth/login — Argon2 verify + httpOnly JWT cookie
  app.post('/api/auth/login', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const parseResult = loginSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: 'Validation failed',
          details: parseResult.error.format()
        });
      }

      const { username, password } = parseResult.data;
      let user: any = null;

      if (isDbConnected()) {
        user = await prisma.user.findFirst({
          where: {
            OR: [{ username }, { email: username }]
          }
        });
      } else {
        user = inMemoryStore.users.find(
          u => u.username === username || u.email === username
        );
      }

      if (!user) {
        return reply.status(401).send({ error: 'Terminal Access Rejected: Invalid credentials' });
      }

      // Argon2 verification
      let isMatch = false;
      try {
        isMatch = await argon2.verify(user.passwordHash, password);
      } catch (argonErr) {
        // Fallback: try bcrypt hash format for backward compatibility during migration
        // If the stored hash starts with $2a$ it's a bcrypt hash from V1/V2
        if (user.passwordHash.startsWith('$2a$') || user.passwordHash.startsWith('$2b$')) {
          const bcryptModule = await import('bcryptjs').catch(() => null);
          if (bcryptModule) {
            isMatch = await bcryptModule.default.compare(password, user.passwordHash);
            if (isMatch) {
              // Re-hash with Argon2 on-the-fly (upgrade migration)
              const newHash = await argon2.hash(password);
              if (isDbConnected()) {
                await prisma.user.update({
                  where: { id: user.id },
                  data: { passwordHash: newHash }
                });
              } else {
                user.passwordHash = newHash;
              }
            }
          }
        }
      }

      if (!isMatch) {
        return reply.status(401).send({ error: 'Terminal Access Rejected: Invalid credentials' });
      }

      // Update last login
      if (isDbConnected()) {
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() }
        }).catch(() => {});
      }

      // Issue JWT as httpOnly cookie
      const token = app.jwt.sign({
        userId: user.id,
        username: user.username,
        role: user.role
      });

      reply.setCookie(config.cookieName, token, {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      });

      return reply.status(200).send({
        message: 'Terminal Authorization Granted',
        // Also return token in body for frontend fallback compatibility
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    } catch (error: any) {
      app.log.error('[Auth Error]', error);
      return reply.status(500).send({ error: 'Internal security authentication error' });
    }
  });

  // POST /api/auth/logout — Clear httpOnly cookie
  app.post('/api/auth/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.clearCookie(config.cookieName, { path: '/' });
    return reply.send({ message: 'Session terminated. Terminal offline.' });
  });

  // GET /api/auth/me — Session introspection
  app.get('/api/auth/me', {
    preValidation: [app.authenticate]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      authenticated: true,
      user: (request as any).user
    });
  });
}

// Extend FastifyInstance with authenticate decorator (set in server.ts via plugin)
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
