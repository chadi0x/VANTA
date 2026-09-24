import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma, isDbConnected, inMemoryStore } from '../db/prismaClient.js';
import { StreamHandler } from '../sockets/streamHandler.js';

export async function registerSystemRoutes(app: FastifyInstance, streamHandler: StreamHandler) {

  // GET /api/system/health — Scraper telemetry + system status
  app.get('/api/system/health', async (request: FastifyRequest, reply: FastifyReply) => {
    let scraperStatus: any[] = [];

    if (isDbConnected()) {
      try {
        const workers = ['cftc-comex', 'retail-sentiment', 'forex-factory', 'rss-feeds', 'crypto-equities'];
        scraperStatus = await Promise.all(workers.map(async (w) => {
          const latest = await prisma.scraperHealth.findFirst({
            where: { workerName: w },
            orderBy: { reportedAt: 'desc' }
          });
          return latest || { workerName: w, status: 'NO_DATA', lastRunAt: null, recordsIngested: 0 };
        }));
      } catch {
        scraperStatus = [];
      }
    } else {
      scraperStatus = Array.from(inMemoryStore.scraperHealth.values());
    }

    return reply.send({
      timestamp: new Date().toISOString(),
      database: isDbConnected() ? 'PRISMA_CONNECTED' : 'IN_MEMORY_FALLBACK',
      activeSocketClients: streamHandler.getActiveClients(),
      scraperWorkers: scraperStatus
    });
  });

  // POST /api/system/scraper-health — Worker health report endpoint
  app.post('/api/system/scraper-health', async (request: FastifyRequest, reply: FastifyReply) => {
    const report = request.body as any;
    if (!report?.workerName) return reply.status(400).send({ error: 'workerName required' });

    const record = {
      workerName: report.workerName,
      status: report.status || 'HEALTHY',
      lastRunAt: new Date(),
      recordsIngested: report.recordsIngested || 0,
      errorMessage: report.errorMessage || null,
      latencyMs: report.latencyMs || 0
    };

    if (isDbConnected()) {
      await prisma.scraperHealth.create({ data: record }).catch(() => {});
    } else {
      inMemoryStore.scraperHealth.set(report.workerName, { ...record, reportedAt: new Date().toISOString() });
    }

    // Broadcast scraper status update
    streamHandler.broadcastScraperHealth({
      timestamp: new Date().toISOString(),
      worker: record
    });

    return reply.send({ success: true });
  });

  // POST /api/system/treasury/ingest — Ingest US Treasury XML yield data
  app.post('/api/system/treasury/ingest', async (request: FastifyRequest, reply: FastifyReply) => {
    const data = request.body as any;
    if (!data?.recordDate) return reply.status(400).send({ error: 'recordDate required' });

    if (isDbConnected()) {
      try {
        await prisma.treasuryYield.upsert({
          where: { recordDate: new Date(data.recordDate) },
          update: {
            bc1Month: data.bc1Month,
            bc3Month: data.bc3Month,
            bc6Month: data.bc6Month,
            bc1Year: data.bc1Year,
            bc2Year: data.bc2Year,
            bc5Year: data.bc5Year,
            bc10Year: data.bc10Year,
            bc30Year: data.bc30Year,
            spread10y2y: data.spread10y2y,
            spread10y3m: data.spread10y3m
          },
          create: {
            recordDate: new Date(data.recordDate),
            bc1Month: data.bc1Month,
            bc3Month: data.bc3Month,
            bc6Month: data.bc6Month,
            bc1Year: data.bc1Year,
            bc2Year: data.bc2Year,
            bc5Year: data.bc5Year,
            bc10Year: data.bc10Year,
            bc30Year: data.bc30Year,
            spread10y2y: data.spread10y2y,
            spread10y3m: data.spread10y3m
          }
        });
      } catch (err: any) {
        app.log.error('[Treasury Ingest Error]', err);
      }
    }
    return reply.send({ success: true, timestamp: new Date().toISOString() });
  });

  // POST /api/system/fedwatch/ingest — Ingest CME FedWatch probabilities
  app.post('/api/system/fedwatch/ingest', async (request: FastifyRequest, reply: FastifyReply) => {
    const items = Array.isArray(request.body) ? request.body : [request.body];
    if (isDbConnected() && items.length > 0) {
      try {
        for (const item of items) {
          if (!item.meetingDate || !item.targetRateRange) continue;
          await prisma.fedWatchProbability.create({
            data: {
              meetingDate: new Date(item.meetingDate),
              targetRateRange: item.targetRateRange,
              probabilityPct: item.probabilityPct || 0,
              priorDayPct: item.priorDayPct,
              priorWeekPct: item.priorWeekPct,
              priorMonthPct: item.priorMonthPct
            }
          });
        }
      } catch (err: any) {
        app.log.error('[FedWatch Ingest Error]', err);
      }
    }
    return reply.send({ success: true, count: items.length });
  });

  // POST /api/system/seed — Trigger manual institutional data seeding
  app.post('/api/system/seed', async (request: FastifyRequest, reply: FastifyReply) => {
    const { seedInitialData } = await import('../db/seedInitialData.js');
    await seedInitialData(true);
    return reply.send({
      success: true,
      message: 'Institutional seed executed successfully. COT, The Pulse, Economic Events, and Yields updated.',
      timestamp: new Date().toISOString()
    });
  });

  // GET /api/system/stream-logs — Combined recent telemetry & event logs for System Logs Tab
  app.get('/api/system/stream-logs', async (request: FastifyRequest, reply: FastifyReply) => {
    const logs: Array<{
      id: string;
      ts: string;
      type: 'EVENT' | 'NEWS' | 'COT' | 'SCRAPER' | 'HEARTBEAT';
      msg: string;
      rawData: any;
    }> = [];

    if (isDbConnected()) {
      try {
        const [recentEvents, recentNews, recentWorkers, recentCot] = await Promise.all([
          prisma.economicEvent.findMany({ orderBy: { timestampUtc: 'desc' }, take: 30 }),
          prisma.intelligenceFeed.findMany({ orderBy: { timestampUtc: 'desc' }, take: 30 }),
          prisma.scraperHealth.findMany({ orderBy: { reportedAt: 'desc' }, take: 10 }),
          prisma.cotReport.findMany({ orderBy: { reportDate: 'desc' }, take: 8 })
        ]);

        for (const e of recentEvents) {
          logs.push({
            id: e.id,
            ts: e.timestampUtc.toISOString(),
            type: 'EVENT',
            msg: `[MACRO EVENT] ${e.asset} | ${e.headline?.slice(0, 75)} | DEV: ${e.deviationType} (${e.deviationScore})`,
            rawData: e
          });
        }

        for (const n of recentNews) {
          logs.push({
            id: n.id,
            ts: n.timestampUtc.toISOString(),
            type: 'NEWS',
            msg: `[THE PULSE] ${n.source} | ${n.headline?.slice(0, 80)}`,
            rawData: {
              ...n,
              timestampMicros: n.timestampMicros ? n.timestampMicros.toString() : '0'
            }
          });
        }

        for (const w of recentWorkers) {
          logs.push({
            id: `W_${w.id}`,
            ts: w.reportedAt.toISOString(),
            type: 'SCRAPER',
            msg: `[WORKER] ${w.workerName.toUpperCase()} reported ${w.status} | ${w.recordsIngested} recs (${w.latencyMs || 0}ms)`,
            rawData: w
          });
        }

        for (const c of recentCot) {
          logs.push({
            id: `COT_${c.id}`,
            ts: c.reportDate.toISOString(),
            type: 'COT',
            msg: `[CFTC COT] ${c.assetName} | OI: ${c.openInterest.toLocaleString()} | Spec Net: ${(c.nonCommercialLong - c.nonCommercialShort).toLocaleString()}`,
            rawData: c
          });
        }
      } catch (err: any) {
        console.error('[STREAM LOGS DB ERROR]', err);
      }
    }

    // Always sort descending by timestamp
    logs.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());

    return reply.send({
      total: logs.length,
      logs: logs.slice(0, 100),
      timestamp: new Date().toISOString()
    });
  });
}
