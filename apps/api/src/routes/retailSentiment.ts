import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma, isDbConnected, inMemoryStore } from '../db/prismaClient.js';

export async function registerRetailSentimentRoutes(app: FastifyInstance) {

  // GET /api/retail-sentiment — Latest retail sentiment per asset
  app.get('/api/retail-sentiment', async (request: FastifyRequest, reply: FastifyReply) => {
    const assets = ['XAUUSD', 'XAGUSD', 'USOIL', 'USIDX'];

    if (isDbConnected()) {
      try {
        const results: Record<string, any> = {};
        for (const asset of assets) {
          const latest = await prisma.retailSentiment.findFirst({
            where: { asset },
            orderBy: { capturedAt: 'desc' }
          });
          results[asset] = latest || null;
        }
        return reply.send({ timestamp: new Date().toISOString(), data: results });
      } catch (err: any) {
        return reply.status(500).send({ error: 'Failed to retrieve retail sentiment' });
      }
    } else {
      const results: Record<string, any> = {};
      for (const asset of assets) {
        for (const [key, val] of inMemoryStore.retailSentiment) {
          if (key.startsWith(asset)) { results[asset] = val; break; }
        }
        if (!results[asset]) results[asset] = null;
      }
      return reply.send({ timestamp: new Date().toISOString(), data: results, mode: 'IN_MEMORY' });
    }
  });

  // POST /api/retail-sentiment/ingest — Ingest from scraper workers
  app.post('/api/retail-sentiment/ingest', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const items = Array.isArray(request.body) ? request.body as any[] : [request.body];
      let ingested = 0;

      for (const item of items) {
        if (!item.asset || item.longPercent === undefined) continue;

        if (isDbConnected()) {
          await prisma.retailSentiment.create({
            data: {
              asset: item.asset,
              source: item.source || 'UNKNOWN',
              longPercent: parseFloat(item.longPercent),
              shortPercent: parseFloat(item.shortPercent),
              longPositions: item.longPositions ? parseInt(item.longPositions) : null,
              shortPositions: item.shortPositions ? parseInt(item.shortPositions) : null
            }
          });
        } else {
          inMemoryStore.retailSentiment.set(`${item.asset}_${item.source || 'UNK'}`, {
            asset: item.asset,
            source: item.source || 'UNKNOWN',
            longPercent: parseFloat(item.longPercent),
            shortPercent: parseFloat(item.shortPercent),
            capturedAt: new Date().toISOString()
          });
        }
        ingested++;
      }

      return reply.send({ success: true, ingested });
    } catch (err: any) {
      return reply.status(500).send({ error: 'Retail sentiment ingestion failure', detail: err.message });
    }
  });
}
