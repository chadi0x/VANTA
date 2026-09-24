import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma, isDbConnected } from '../db/prismaClient.js';

interface JournalQuery {
  asset?: string;
  outcome?: string;
  tag?: string;
  limit?: string;
}

interface CreateJournalBody {
  asset: string;
  tradeDirection: 'LONG' | 'SHORT' | 'HEDGE';
  entryPrice: number;
  stopLoss?: number;
  targetPrice?: number;
  riskRewardRatio?: number;
  lots?: number;
  pnlUSD?: number;
  outcome?: 'WIN' | 'LOSS' | 'SCRATCH' | 'OPEN';
  thesisNotes: string;
  confluences?: string[];
  macroSnapshot?: any;
  snapshotImage?: string;
  tags?: string[];
}

export async function registerJournalRoutes(app: FastifyInstance) {
  
  // GET /api/journal — Fetch all entries with optional filters
  app.get('/api/journal', async (request: FastifyRequest<{ Querystring: JournalQuery }>, reply: FastifyReply) => {
    const { asset, outcome, tag, limit = '50' } = request.query;
    const maxEntries = Math.min(parseInt(limit, 10) || 50, 100);

    if (!isDbConnected()) {
      return reply.send({
        total: 0,
        entries: [],
        analytics: { winRate: 0, totalPnL: 0, avgRiskReward: 0, totalTrades: 0 }
      });
    }

    try {
      const where: any = {};
      if (asset) where.asset = asset.toUpperCase();
      if (outcome) where.outcome = outcome.toUpperCase();
      if (tag) where.tags = { has: tag };

      const entries = await prisma.tradeJournalEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: maxEntries
      });

      // Calculate performance analytics
      const totalTrades = entries.length;
      const closedTrades = entries.filter(e => e.outcome !== 'OPEN');
      const wins = entries.filter(e => e.outcome === 'WIN').length;
      const losses = entries.filter(e => e.outcome === 'LOSS').length;
      const winRate = closedTrades.length > 0 ? Number(((wins / closedTrades.length) * 100).toFixed(1)) : 0;
      const totalPnL = entries.reduce((acc, e) => acc + (e.pnlUSD || 0), 0);
      const avgRR = entries.filter(e => e.riskRewardRatio).reduce((acc, e, _, arr) => acc + (e.riskRewardRatio || 0) / arr.length, 0);

      return reply.send({
        total: totalTrades,
        entries,
        analytics: {
          totalTrades,
          closedTrades: closedTrades.length,
          wins,
          losses,
          winRate,
          totalPnL: Number(totalPnL.toFixed(2)),
          avgRiskReward: Number(avgRR.toFixed(2))
        }
      });
    } catch (err: any) {
      app.log.error('[Journal GET Error]', err);
      return reply.status(500).send({ error: 'Failed to fetch journal entries', detail: err.message });
    }
  });

  // POST /api/journal — Create a new journal entry with macro state & snapshot
  app.post('/api/journal', async (request: FastifyRequest<{ Body: CreateJournalBody }>, reply: FastifyReply) => {
    const body = request.body;
    if (!body?.asset || !body?.tradeDirection || !body?.entryPrice) {
      return reply.status(400).send({ error: 'asset, tradeDirection, and entryPrice are required' });
    }

    if (!isDbConnected()) {
      return reply.status(503).send({ error: 'Database offline. Cannot save journal entry in memory.' });
    }

    try {
      const entry = await prisma.tradeJournalEntry.create({
        data: {
          asset: body.asset.toUpperCase(),
          tradeDirection: body.tradeDirection.toUpperCase(),
          entryPrice: parseFloat(String(body.entryPrice)),
          stopLoss: body.stopLoss ? parseFloat(String(body.stopLoss)) : null,
          targetPrice: body.targetPrice ? parseFloat(String(body.targetPrice)) : null,
          riskRewardRatio: body.riskRewardRatio ? parseFloat(String(body.riskRewardRatio)) : null,
          lots: body.lots ? parseFloat(String(body.lots)) : null,
          pnlUSD: body.pnlUSD ? parseFloat(String(body.pnlUSD)) : null,
          outcome: body.outcome || 'OPEN',
          thesisNotes: body.thesisNotes || '',
          confluences: body.confluences || [],
          macroSnapshot: body.macroSnapshot || {},
          snapshotImage: body.snapshotImage || null,
          tags: body.tags || []
        }
      });

      return reply.status(201).send({ success: true, entry });
    } catch (err: any) {
      app.log.error('[Journal POST Error]', err);
      return reply.status(500).send({ error: 'Failed to create journal entry', detail: err.message });
    }
  });

  // PUT /api/journal/:id — Update outcome, PnL, or thesis post-mortem
  app.put('/api/journal/:id', async (request: FastifyRequest<{ Params: { id: string }; Body: Partial<CreateJournalBody> }>, reply: FastifyReply) => {
    const { id } = request.params;
    const body = request.body;

    if (!isDbConnected()) {
      return reply.status(503).send({ error: 'Database offline' });
    }

    try {
      const updated = await prisma.tradeJournalEntry.update({
        where: { id },
        data: {
          ...(body.outcome ? { outcome: body.outcome } : {}),
          ...(body.pnlUSD !== undefined ? { pnlUSD: body.pnlUSD } : {}),
          ...(body.thesisNotes ? { thesisNotes: body.thesisNotes } : {}),
          ...(body.tags ? { tags: body.tags } : {})
        }
      });

      return reply.send({ success: true, entry: updated });
    } catch (err: any) {
      return reply.status(500).send({ error: 'Failed to update journal entry', detail: err.message });
    }
  });

  // DELETE /api/journal/:id — Delete entry
  app.delete('/api/journal/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    if (!isDbConnected()) return reply.status(503).send({ error: 'Database offline' });

    try {
      await prisma.tradeJournalEntry.delete({ where: { id } });
      return reply.send({ success: true, id });
    } catch (err: any) {
      return reply.status(500).send({ error: 'Failed to delete journal entry', detail: err.message });
    }
  });
}
