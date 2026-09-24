import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma, isDbConnected, inMemoryStore } from '../db/prismaClient.js';
import { DeviationEngine } from '../services/deviationEngine.js';
import { FinancialSentimentEngine } from '../services/sentimentEngine.js';
import { AssetMapper } from '../services/assetMapper.js';
import { TemporalEngine } from '../services/temporalEngine.js';
import { StreamHandler } from '../sockets/streamHandler.js';

export async function registerEventsRoutes(app: FastifyInstance, streamHandler: StreamHandler) {

  // GET /api/events — Query macroeconomic events
  app.get('/api/events', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { impact, asset, deviation } = request.query as {
        impact?: string; asset?: string; deviation?: string;
      };

      if (isDbConnected()) {
        const where: any = {};
        if (impact) where.impactLevel = impact;
        if (asset) where.asset = asset.toUpperCase();
        if (deviation) where.deviationType = deviation;

        const events = await prisma.economicEvent.findMany({
          where,
          orderBy: { timestampUtc: 'desc' },
          take: 100
        });

        return reply.send(events.map((e: any) => ({
          ...e,
          timestamp: e.timestampUtc.toISOString(),
          timestamp_utc: e.timestampUtc.toISOString(),
          date_formatted: e.dateFormatted,
          time_formatted: e.timeFormatted,
          market_session: e.marketSession,
          impact_level: e.impactLevel,
          actual_metric: e.actualMetric,
          deviation_type: e.deviationType,
          deviation_score: e.deviationScore,
          sentiment_score: e.sentimentScore,
          sentiment_polarity: e.sentimentPolarity,
          target_ticker: e.targetTicker,
          target_asset_name: e.targetAssetName
        })));
      } else {
        let events = Array.from(inMemoryStore.events.values());
        if (impact) events = events.filter(e => e.impact_level === impact);
        if (asset) events = events.filter(e => e.asset === asset.toUpperCase());
        if (deviation) events = events.filter(e => e.deviation_type === deviation);
        events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return reply.send(events.slice(0, 100));
      }
    } catch (err: any) {
      app.log.error('[Events GET Error]', err);
      return reply.status(500).send({ error: 'Failed to retrieve economic events' });
    }
  });

  // POST /api/events/ingest — Ingestion endpoint for scraping workers
  app.post('/api/events/ingest', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const rawEvents = Array.isArray(request.body) ? request.body as any[] : [request.body];
      const processed: any[] = [];

      for (const item of rawEvents) {
        if (!item.headline || !item.asset) continue;

        const deviation = DeviationEngine.analyze(item.actual_metric, item.forecast, item.previous);
        const sentiment = FinancialSentimentEngine.analyze(item.headline);
        const mapped = AssetMapper.map(item.headline, item.asset);
        const temporal = TemporalEngine.normalize(item.timestamp);

        const eventId = item.id || `${item.source || 'SRC'}_${item.asset}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

        const normalized = {
          id: eventId,
          timestamp: temporal.timestamp_utc,
          timestamp_utc: temporal.timestamp_utc,
          date_formatted: temporal.date_formatted,
          time_formatted: temporal.time_formatted,
          market_session: temporal.market_session,
          time_ago: temporal.time_ago,
          asset: item.asset.toUpperCase(),
          impact_level: item.impact_level || 'Medium',
          actual_metric: item.actual_metric || null,
          forecast: item.forecast || null,
          previous: item.previous || null,
          headline: item.headline,
          source: item.source || 'Scraper',
          deviation_type: deviation.deviationType,
          deviation_score: deviation.deviationScore,
          sentiment_score: sentiment.score,
          sentiment_polarity: sentiment.polarity,
          target_ticker: mapped.tradingViewSymbol,
          target_asset_name: mapped.primaryAsset
        };

        if (isDbConnected()) {
          await prisma.economicEvent.upsert({
            where: { id: eventId },
            update: {
              actualMetric: normalized.actual_metric,
              deviationType: normalized.deviation_type,
              deviationScore: normalized.deviation_score
            },
            create: {
              id: eventId,
              timestampUtc: new Date(temporal.timestamp_utc),
              dateFormatted: temporal.date_formatted,
              timeFormatted: temporal.time_formatted,
              marketSession: temporal.market_session,
              asset: normalized.asset,
              impactLevel: normalized.impact_level,
              actualMetric: normalized.actual_metric,
              forecast: normalized.forecast,
              previous: normalized.previous,
              headline: normalized.headline,
              source: normalized.source,
              deviationType: normalized.deviation_type,
              deviationScore: normalized.deviation_score,
              sentimentScore: sentiment.score,
              sentimentPolarity: sentiment.polarity,
              targetTicker: mapped.tradingViewSymbol || null,
              targetAssetName: mapped.primaryAsset || null
            }
          });
        } else {
          inMemoryStore.events.set(eventId, normalized);
        }

        streamHandler.broadcastEvent(normalized);
        processed.push(normalized);
      }

      return reply.send({ success: true, count: processed.length });
    } catch (err: any) {
      app.log.error('[Events Ingest Error]', err);
      return reply.status(500).send({ error: 'Ingestion pipeline failure', detail: err.message });
    }
  });

  // POST /api/events/simulate — Deterministic simulation trigger (no Math.random for scenario selection)
  app.post('/api/events/simulate', async (request: FastifyRequest, reply: FastifyReply) => {
    const { scenario } = (request.body as any) || {};

    const scenarios: Record<string, any> = {
      NFP_BEAT: {
        asset: 'USD', headline: 'US NON-FARM PAYROLLS SURGE TO 310K — BLOWS PAST 185K CONSENSUS ESTIMATE',
        impact_level: 'High', actual_metric: '310K', forecast: '185K', previous: '175K', source: 'ForexFactory'
      },
      OPEC_CUT: {
        asset: 'OIL', headline: 'OPEC+ EMERGENCY MEETING: SURPRISE CRUDE PRODUCTION CUT OF 1.2M BPD',
        impact_level: 'High', actual_metric: '-1.2M BPD', forecast: '0.0', previous: '0.0', source: 'Reuters'
      },
      GOLD_CB: {
        asset: 'XAU', headline: 'GLOBAL CENTRAL BANKS ACCELERATE GOLD BULLION PURCHASES — 340 TONNES Q3',
        impact_level: 'High', actual_metric: '340T', forecast: '180T', previous: '160T', source: 'Reuters'
      },
      EUR_CPI_MISS: {
        asset: 'EUR', headline: 'EUROZONE CORE HICP DROPS TO 1.9% — ACCELERATES ECB RATE CUT CYCLE',
        impact_level: 'High', actual_metric: '1.9%', forecast: '2.5%', previous: '2.7%', source: 'Bloomberg'
      },
      NVIDIA_BEAT: {
        asset: 'EQUITY', headline: 'NVIDIA BEATS WALL STREET Q3: REVENUE $38.2B ON AI DATA CENTER SURGE',
        impact_level: 'High', actual_metric: '$38.2B', forecast: '$32.5B', previous: '$26.0B', source: 'Benzinga'
      }
    };

    // Use requested scenario or cycle deterministically by minute
    const keys = Object.keys(scenarios);
    const key = scenario && scenarios[scenario] ? scenario : keys[Math.floor(Date.now() / 60000) % keys.length];
    const randomScenario = scenarios[key];

    const eventPayload = {
      ...randomScenario,
      id: `SIM_${key}_${Date.now()}`,
      timestamp: new Date().toISOString()
    };

    const deviation = DeviationEngine.analyze(eventPayload.actual_metric, eventPayload.forecast, eventPayload.previous);
    const sentiment = FinancialSentimentEngine.analyze(eventPayload.headline);
    const mapped = AssetMapper.map(eventPayload.headline, eventPayload.asset);
    const temporal = TemporalEngine.normalize();

    const normalized = {
      ...eventPayload,
      timestamp: temporal.timestamp_utc,
      timestamp_utc: temporal.timestamp_utc,
      date_formatted: temporal.date_formatted,
      time_formatted: temporal.time_formatted,
      market_session: temporal.market_session,
      time_ago: temporal.time_ago,
      deviation_type: deviation.deviationType,
      deviation_score: deviation.deviationScore,
      sentiment_score: sentiment.score,
      sentiment_polarity: sentiment.polarity,
      target_ticker: mapped.tradingViewSymbol,
      target_asset_name: mapped.primaryAsset
    };

    if (isDbConnected()) {
      await prisma.economicEvent.upsert({
        where: { id: normalized.id },
        update: { actualMetric: normalized.actual_metric },
        create: {
          id: normalized.id,
          timestampUtc: new Date(temporal.timestamp_utc),
          dateFormatted: temporal.date_formatted,
          timeFormatted: temporal.time_formatted,
          marketSession: temporal.market_session,
          asset: normalized.asset,
          impactLevel: normalized.impact_level,
          actualMetric: normalized.actual_metric,
          forecast: normalized.forecast,
          previous: normalized.previous,
          headline: normalized.headline,
          source: normalized.source,
          deviationType: normalized.deviation_type,
          deviationScore: normalized.deviation_score,
          sentimentScore: sentiment.score,
          sentimentPolarity: sentiment.polarity,
          targetTicker: mapped.tradingViewSymbol || null,
          targetAssetName: mapped.primaryAsset || null
        }
      }).catch(() => {});
    } else {
      inMemoryStore.events.set(normalized.id, normalized);
    }

    streamHandler.broadcastEvent(normalized);

    const newsItem = {
      id: `NW_${normalized.id}`,
      timestamp: normalized.timestamp_utc,
      source: normalized.source,
      title: normalized.headline,
      link: '#',
      sentiment_score: sentiment.score,
      sentiment_polarity: sentiment.polarity,
      target_ticker: mapped.tradingViewSymbol,
      target_asset_name: mapped.primaryAsset
    };
    streamHandler.broadcastNews(newsItem);

    return reply.send({ success: true, scenario: key, simulated: normalized, deviation, sentiment, mappedAsset: mapped });
  });

  // GET /api/events/news — Breaking news wire
  app.get('/api/events/news', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (isDbConnected()) {
        const items = await prisma.intelligenceFeed.findMany({
          orderBy: { timestampUtc: 'desc' },
          take: 60
        });
        return reply.send(items.map((item: any) => {
          const temporal = TemporalEngine.normalize(item.timestampUtc.toISOString());
          return {
            id: item.id,
            timestamp: item.timestampUtc.toISOString(),
            timestamp_utc: item.timestampUtc.toISOString(),
            date_formatted: temporal.date_formatted,
            time_formatted: temporal.time_formatted,
            market_session: temporal.market_session,
            time_ago: temporal.time_ago,
            source: item.source,
            title: item.headline,
            link: item.link,
            sentiment_score: item.sentimentScore,
            sentiment_polarity: item.sentimentPolarity,
            impact_rating: item.impactRating,
            key_takeaways: item.keyTakeaways,
            affected_instruments: item.affectedInstruments
          };
        }));
      } else {
        const items = Array.from(inMemoryStore.news.values());
        items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return reply.send(items.slice(0, 60));
      }
    } catch (err: any) {
      return reply.status(500).send({ error: 'Failed to retrieve news wire' });
    }
  });

  // POST /api/events/news/ingest — Ingest intelligence feed items
  app.post('/api/events/news/ingest', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const items = Array.isArray(request.body) ? request.body as any[] : [request.body];
      for (const item of items) {
        if (!item.title && !item.headline) continue;

        const headline = item.headline || item.title;
        const sent = FinancialSentimentEngine.analyze(headline);
        const mapped = AssetMapper.map(headline);
        const temporal = TemporalEngine.normalize(item.timestamp);

        const newsItem = {
          id: item.id || `NEWS_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          timestamp: temporal.timestamp_utc,
          timestamp_utc: temporal.timestamp_utc,
          date_formatted: temporal.date_formatted,
          time_formatted: temporal.time_formatted,
          market_session: temporal.market_session,
          time_ago: temporal.time_ago,
          source: item.source || 'Newswire',
          title: headline,
          link: item.link || '#',
          sentiment_score: sent.score,
          sentiment_polarity: sent.polarity,
          target_ticker: mapped.tradingViewSymbol,
          target_asset_name: mapped.primaryAsset,
          impact_rating: item.impact_rating || 'Informational',
          key_takeaways: item.key_takeaways || [],
          affected_instruments: item.affected_instruments || []
        };

        if (isDbConnected()) {
          await prisma.intelligenceFeed.upsert({
            where: { id: newsItem.id },
            update: {},
            create: {
              id: newsItem.id,
              timestampUtc: new Date(temporal.timestamp_utc),
              source: newsItem.source,
              headline,
              keyTakeaways: newsItem.key_takeaways,
              impactRating: newsItem.impact_rating,
              affectedInstruments: newsItem.affected_instruments,
              sentimentScore: sent.score,
              sentimentPolarity: sent.polarity,
              marketSession: temporal.market_session,
              link: newsItem.link
            }
          });
        } else {
          inMemoryStore.news.set(newsItem.id, newsItem);
        }

        streamHandler.broadcastNews(newsItem);
      }

      return reply.send({ success: true, count: items.length });
    } catch (err: any) {
      return reply.status(500).send({ error: 'News ingestion failure', detail: err.message });
    }
  });
}
