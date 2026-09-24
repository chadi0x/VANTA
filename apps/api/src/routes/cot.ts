import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma, isDbConnected, inMemoryStore } from '../db/prismaClient.js';
import { CotAnalyticsEngine, CotRawRecord, CotAssetName, RetailSentimentSnapshot } from '../services/cotAnalyticsEngine.js';
import { StreamHandler } from '../sockets/streamHandler.js';

// Asset registry
const ASSETS: Array<{ code: string; name: CotAssetName }> = [
  { code: '088691', name: 'GOLD' },
  { code: '084691', name: 'SILVER' },
  { code: '067651', name: 'CRUDE_OIL' },
  { code: '098662', name: 'DXY' }
];

// In-memory cache (populated from DB or scraper ingest)
const cotCache = new Map<string, { current: CotRawRecord; previous: CotRawRecord | null; history: CotRawRecord[] }>();

/**
 * Load latest 2 records + 52-week history per asset from Prisma (or in-memory).
 */
async function loadCotFromDb(assetCode: string): Promise<{
  current: CotRawRecord | null;
  previous: CotRawRecord | null;
  history: CotRawRecord[];
}> {
  if (!isDbConnected()) {
    const cached = cotCache.get(assetCode);
    if (cached) return cached;
    return { current: null, previous: null, history: [] };
  }

  try {
    const records = await prisma.cotReport.findMany({
      where: { assetCode },
      orderBy: { reportDate: 'desc' },
      take: 54  // Current + Previous + 52 historical
    });

    if (records.length === 0) return { current: null, previous: null, history: [] };

    const toRaw = (r: any): CotRawRecord => ({
      reportDate: r.reportDate.toISOString().slice(0, 10),
      assetCode: r.assetCode,
      assetName: r.assetName as CotAssetName,
      openInterest: r.openInterest,
      nonCommercialLong: r.nonCommercialLong,
      nonCommercialShort: r.nonCommercialShort,
      nonCommercialSpreads: r.nonCommercialSpreads,
      commercialLong: r.commercialLong,
      commercialShort: r.commercialShort,
      otherReportableLong: r.otherReportableLong,
      otherReportableShort: r.otherReportableShort,
      nonReportableLong: r.nonReportableLong,
      nonReportableShort: r.nonReportableShort,
      oiVelocity14d: r.oiVelocity14d
    });

    const current = toRaw(records[0]);
    const previous = records.length > 1 ? toRaw(records[1]) : null;
    const history = records.slice(2).map(toRaw);

    return { current, previous, history };
  } catch (err: any) {
    console.error(`[COT DB] Failed to load records for ${assetCode}: ${err.message}`);
    return { current: null, previous: null, history: [] };
  }
}

/**
 * Load latest retail sentiment for an asset from Prisma or in-memory cache.
 */
async function loadRetailSentiment(assetTicker: string): Promise<RetailSentimentSnapshot | null> {
  if (!isDbConnected()) {
    // Try in-memory
    for (const [key, val] of inMemoryStore.retailSentiment) {
      if (key.startsWith(assetTicker)) return val;
    }
    return null;
  }

  try {
    const rec = await prisma.retailSentiment.findFirst({
      where: { asset: assetTicker },
      orderBy: { capturedAt: 'desc' }
    });
    if (!rec) return null;
    return {
      asset: rec.asset,
      longPercent: rec.longPercent,
      shortPercent: rec.shortPercent,
      source: rec.source
    };
  } catch {
    return null;
  }
}

// Asset → retail ticker mapping
const COT_TO_RETAIL: Record<string, string> = {
  '088691': 'XAUUSD',
  '084691': 'XAGUSD',
  '067651': 'USOIL',
  '098662': 'USIDX'
};

export async function registerCotRoutes(app: FastifyInstance, streamHandler: StreamHandler) {

  // GET /api/cot/latest — 4-asset live COT analytics
  app.get('/api/cot/latest', async (request: FastifyRequest, reply: FastifyReply) => {
    const reports: Record<string, any> = {};
    const diagnostics: Record<string, string> = {};

    for (const asset of ASSETS) {
      const { current, previous, history } = await loadCotFromDb(asset.code);
      const retailTicker = COT_TO_RETAIL[asset.code];
      const retail = await loadRetailSentiment(retailTicker);

      if (!current) {
        reports[asset.name] = CotAnalyticsEngine.awaitingIngestion(asset.code, asset.name);
        diagnostics[asset.name] = 'NO_DATA — Awaiting CFTC scraper ingestion';
      } else {
        reports[asset.name] = CotAnalyticsEngine.analyze(current, previous, history, retail);
        diagnostics[asset.name] = `LIVE — Report date: ${current.reportDate}`;
      }
    }

    return reply.send({
      timestamp: new Date().toISOString(),
      reports,
      diagnostics,
      dataMode: isDbConnected() ? 'PRISMA_POSTGRES' : 'IN_MEMORY_CACHE'
    });
  });

  // POST /api/cot/ingest — Ingest records from scraper workers (no mock data)
  app.post('/api/cot/ingest', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const records: CotRawRecord[] = Array.isArray(request.body) ? request.body as any : [request.body];
      let ingested = 0;

      for (const rec of records) {
        if (!rec.assetCode || !rec.assetName || !rec.reportDate) continue;

        const speculatorNet = rec.nonCommercialLong - rec.nonCommercialShort;

        if (isDbConnected()) {
          await prisma.cotReport.upsert({
            where: {
              asset_report_unique: {
                assetCode: rec.assetCode,
                reportDate: new Date(rec.reportDate)
              }
            },
            update: {
              openInterest: rec.openInterest,
              nonCommercialLong: rec.nonCommercialLong,
              nonCommercialShort: rec.nonCommercialShort,
              nonCommercialSpreads: rec.nonCommercialSpreads || 0,
              commercialLong: rec.commercialLong,
              commercialShort: rec.commercialShort,
              otherReportableLong: rec.otherReportableLong || 0,
              otherReportableShort: rec.otherReportableShort || 0,
              speculatorNet,
              oiVelocity14d: rec.oiVelocity14d || 0
            },
            create: {
              reportDate: new Date(rec.reportDate),
              assetCode: rec.assetCode,
              assetName: rec.assetName,
              openInterest: rec.openInterest,
              nonCommercialLong: rec.nonCommercialLong,
              nonCommercialShort: rec.nonCommercialShort,
              nonCommercialSpreads: rec.nonCommercialSpreads || 0,
              commercialLong: rec.commercialLong,
              commercialShort: rec.commercialShort,
              otherReportableLong: rec.otherReportableLong || 0,
              otherReportableShort: rec.otherReportableShort || 0,
              speculatorNet,
              oiVelocity14d: rec.oiVelocity14d || 0
            }
          });
        } else {
          // In-memory: keep latest per asset
          const existing = cotCache.get(rec.assetCode);
          cotCache.set(rec.assetCode, {
            current: rec,
            previous: existing?.current || null,
            history: existing ? [existing.current, ...(existing.history || [])].slice(0, 52) : []
          });
        }

        ingested++;
      }

      // Recompute and broadcast updated analytics
      const broadcastReports: Record<string, any> = {};
      for (const asset of ASSETS) {
        const { current, previous, history } = await loadCotFromDb(asset.code);
        if (current) {
          const retail = await loadRetailSentiment(COT_TO_RETAIL[asset.code]);
          broadcastReports[asset.name] = CotAnalyticsEngine.analyze(current, previous, history, retail);
        }
      }

      if (Object.keys(broadcastReports).length > 0) {
        streamHandler.broadcastCotUpdate({
          timestamp: new Date().toISOString(),
          reports: broadcastReports
        });
      }

      return reply.send({ success: true, ingested, timestamp: new Date().toISOString() });
    } catch (err: any) {
      app.log.error('[COT Ingest Error]', err);
      return reply.status(500).send({ error: 'COT ingestion pipeline failure', detail: err.message });
    }
  });

  // GET /api/cot/history/:assetCode — Historical records for tabular matrix
  app.get('/api/cot/history/:assetCode', async (request: FastifyRequest, reply: FastifyReply) => {
    const { assetCode } = request.params as { assetCode: string };
    const { limit = '12' } = request.query as { limit?: string };

    if (!isDbConnected()) {
      return reply.send({ assetCode, records: [], mode: 'IN_MEMORY' });
    }

    try {
      const records = await prisma.cotReport.findMany({
        where: { assetCode },
        orderBy: { reportDate: 'desc' },
        take: parseInt(limit, 10)
      });

      return reply.send({
        assetCode,
        count: records.length,
        records: records.map((r: any) => ({
          ...r,
          reportDate: r.reportDate.toISOString().slice(0, 10)
        }))
      });
    } catch (err: any) {
      return reply.status(500).send({ error: 'Failed to fetch COT history' });
    }
  });
}
