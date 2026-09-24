import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma, isDbConnected } from '../db/prismaClient.js';

interface SearchQuery {
  q?: string;
  category?: 'all' | 'news' | 'calendar' | 'cot' | 'speeches' | 'rates';
  limit?: string;
}

export async function registerSearchRoutes(app: FastifyInstance) {
  app.get('/api/search', async (request: FastifyRequest<{ Querystring: SearchQuery }>, reply: FastifyReply) => {
    const { q = '', category = 'all', limit = '15' } = request.query;
    const query = q.trim();
    const maxResults = Math.min(parseInt(limit, 10) || 15, 50);

    if (!query) {
      return reply.send({
        query: '',
        category,
        total: 0,
        results: []
      });
    }

    const results: Array<{
      id: string;
      category: 'news' | 'calendar' | 'cot' | 'speeches' | 'ticker' | 'action';
      title: string;
      subtitle: string;
      meta?: string;
      badge?: string;
      badgeColor?: string;
      payload?: any;
    }> = [];

    // Quick Command / Ticker Navigation matches
    const upperQ = query.toUpperCase();
    const TICKER_MAP: Record<string, { name: string; symbol: string; tab: string }> = {
      'XAUUSD': { name: 'Gold Spot', symbol: 'OANDA:XAUUSD', tab: 'COCKPIT' },
      'GOLD': { name: 'Gold Spot', symbol: 'OANDA:XAUUSD', tab: 'COCKPIT' },
      'XAGUSD': { name: 'Silver Spot', symbol: 'OANDA:XAGUSD', tab: 'COCKPIT' },
      'SILVER': { name: 'Silver Spot', symbol: 'OANDA:XAGUSD', tab: 'COCKPIT' },
      'DXY': { name: 'US Dollar Index', symbol: 'TVC:DXY', tab: 'COCKPIT' },
      'USD': { name: 'US Dollar Index', symbol: 'TVC:DXY', tab: 'COCKPIT' },
      'US10Y': { name: 'US 10-Year Yield', symbol: 'TVC:US10Y', tab: 'YIELDS' },
      'US02Y': { name: 'US 2-Year Yield', symbol: 'TVC:US02Y', tab: 'YIELDS' },
      'USOIL': { name: 'Crude Oil WTI', symbol: 'NYMEX:CL1!', tab: 'COCKPIT' },
      'OIL': { name: 'Crude Oil WTI', symbol: 'NYMEX:CL1!', tab: 'COCKPIT' },
      'EURUSD': { name: 'Euro / US Dollar', symbol: 'OANDA:EURUSD', tab: 'CENTRAL_BANK' },
      'GBPUSD': { name: 'British Pound / US Dollar', symbol: 'OANDA:GBPUSD', tab: 'CENTRAL_BANK' },
      'USDJPY': { name: 'US Dollar / Japanese Yen', symbol: 'OANDA:USDJPY', tab: 'CENTRAL_BANK' },
      'SPX': { name: 'S&P 500 Index', symbol: 'FOREXCOM:SPX500', tab: 'COCKPIT' }
    };

    if (TICKER_MAP[upperQ] || Object.keys(TICKER_MAP).some(k => k.includes(upperQ))) {
      const matchKey = TICKER_MAP[upperQ] ? upperQ : Object.keys(TICKER_MAP).find(k => k.includes(upperQ))!;
      const match = TICKER_MAP[matchKey];
      results.push({
        id: `ticker_${matchKey}`,
        category: 'ticker',
        title: `Switch Chart to ${match.name} (${matchKey})`,
        subtitle: `Set active glass ticker to ${match.symbol} on ${match.tab} tab`,
        badge: matchKey,
        badgeColor: 'blue',
        payload: { ticker: match.symbol, tab: match.tab }
      });
    }

    if (query.startsWith('/')) {
      const cmd = query.toLowerCase();
      if ('/cockpit'.startsWith(cmd)) {
        results.push({ id: 'cmd_cockpit', category: 'action', title: 'Go to Cockpit', subtitle: 'Live execution terminal & news pulse', badge: 'TAB', badgeColor: 'purple', payload: { tab: 'COCKPIT' } });
      }
      if ('/cot'.startsWith(cmd)) {
        results.push({ id: 'cmd_cot', category: 'action', title: 'Go to COT & Smart Money', subtitle: 'Institutional vs Retail positioning matrix', badge: 'TAB', badgeColor: 'purple', payload: { tab: 'COT_MATRIX' } });
      }
      if ('/yields'.startsWith(cmd) || '/intermarket'.startsWith(cmd)) {
        results.push({ id: 'cmd_yields', category: 'action', title: 'Go to Macro Yields & Intermarket', subtitle: 'Sovereign curve, spreads & correlation matrix', badge: 'TAB', badgeColor: 'purple', payload: { tab: 'YIELDS' } });
      }
      if ('/rates'.startsWith(cmd) || '/fomc'.startsWith(cmd)) {
        results.push({ id: 'cmd_rates', category: 'action', title: 'Go to Central Bank & Rates', subtitle: 'CME FedWatch probabilities & policy commentary', badge: 'TAB', badgeColor: 'purple', payload: { tab: 'CENTRAL_BANK' } });
      }
      if ('/liquidity'.startsWith(cmd) || '/tga'.startsWith(cmd) || '/fed'.startsWith(cmd)) {
        results.push({ id: 'cmd_liq', category: 'action', title: 'Go to Global Liquidity & CB Balance Sheets', subtitle: 'Net Fed Liquidity, TGA, RRP, and G4 aggregate balance sheets', badge: 'TAB', badgeColor: 'purple', payload: { tab: 'GLOBAL_LIQUIDITY' } });
      }
      if ('/gex'.startsWith(cmd) || '/gamma'.startsWith(cmd) || '/options'.startsWith(cmd)) {
        results.push({ id: 'cmd_gex', category: 'action', title: 'Go to Options GEX & Dealer Structure', subtitle: 'Net dealer gamma exposure by strike & volatility flip levels', badge: 'TAB', badgeColor: 'purple', payload: { tab: 'OPTIONS_GEX' } });
      }
      if ('/cta'.startsWith(cmd) || '/darkpool'.startsWith(cmd) || '/flows'.startsWith(cmd)) {
        results.push({ id: 'cmd_cta', category: 'action', title: 'Go to CTA & Systematic Flow Sentinel', subtitle: 'Algorithmic trend allocation & forced liquidation triggers', badge: 'TAB', badgeColor: 'purple', payload: { tab: 'CTA_SYSTEMATIC' } });
      }
      if ('/playbook'.startsWith(cmd) || '/simulator'.startsWith(cmd) || '/cpi'.startsWith(cmd) || '/nfp'.startsWith(cmd)) {
        results.push({ id: 'cmd_playbook', category: 'action', title: 'Go to Macro Event Playbooks & Simulator', subtitle: 'Interactive What-If surprise scenario price projection', badge: 'TAB', badgeColor: 'purple', payload: { tab: 'MACRO_PLAYBOOKS' } });
      }
      if ('/logs'.startsWith(cmd) || '/telemetry'.startsWith(cmd)) {
        results.push({ id: 'cmd_logs', category: 'action', title: 'Go to Volatility & System Logs', subtitle: 'Infrastructure health, VIX, and socket feed stream', badge: 'TAB', badgeColor: 'purple', payload: { tab: 'SYSTEM_LOGS' } });
      }
    }

    if (!isDbConnected()) {
      return reply.send({
        query,
        category,
        total: results.length,
        results
      });
    }

    try {
      // 1. Search Intelligence Feed (News)
      if (category === 'all' || category === 'news') {
        const news = await prisma.intelligenceFeed.findMany({
          where: {
            OR: [
              { headline: { contains: query, mode: 'insensitive' } },
              { source: { contains: query, mode: 'insensitive' } },
              { marketSession: { contains: query, mode: 'insensitive' } }
            ]
          },
          orderBy: { timestampUtc: 'desc' },
          take: maxResults
        });

        for (const item of news) {
          results.push({
            id: `news_${item.id}`,
            category: 'news',
            title: item.headline,
            subtitle: `${item.source} · ${new Date(item.timestampUtc).toLocaleTimeString()} UTC · Session: ${item.marketSession || 'ALL'}`,
            meta: item.keyTakeaways?.join(' ') || '',
            badge: item.impactRating || 'INFO',
            badgeColor: item.impactRating === 'Critical' ? 'red' : item.impactRating === 'High' ? 'amber' : 'gray',
            payload: item
          });
        }
      }

      // 2. Search Economic Events Calendar
      if (category === 'all' || category === 'calendar') {
        const events = await prisma.economicEvent.findMany({
          where: {
            OR: [
              { headline: { contains: query, mode: 'insensitive' } },
              { asset: { contains: query, mode: 'insensitive' } },
              { source: { contains: query, mode: 'insensitive' } }
            ]
          },
          orderBy: { timestampUtc: 'desc' },
          take: maxResults
        });

        for (const ev of events) {
          results.push({
            id: `event_${ev.id}`,
            category: 'calendar',
            title: `${ev.asset}: ${ev.headline}`,
            subtitle: `Actual: ${ev.actualMetric || 'Pending'} | Forecast: ${ev.forecast || '--'} | Prior: ${ev.previous || '--'} · ${ev.source}`,
            badge: ev.impactLevel || 'MACRO',
            badgeColor: ev.impactLevel === 'High' ? 'red' : 'blue',
            payload: ev
          });
        }
      }

      // 3. Search COT Reports
      if (category === 'all' || category === 'cot') {
        const cot = await prisma.cotReport.findMany({
          where: {
            OR: [
              { assetName: { contains: query, mode: 'insensitive' } },
              { assetCode: { contains: query, mode: 'insensitive' } }
            ]
          },
          orderBy: { reportDate: 'desc' },
          take: 6
        });

        for (const c of cot) {
          results.push({
            id: `cot_${c.id}`,
            category: 'cot',
            title: `COT Report: ${c.assetName} (${c.assetCode})`,
            subtitle: `Speculator Net: ${c.speculatorNet.toLocaleString()} | Open Interest: ${c.openInterest.toLocaleString()} · Report: ${new Date(c.reportDate).toLocaleDateString()}`,
            badge: 'CFTC',
            badgeColor: 'emerald',
            payload: c
          });
        }
      }

      // 4. Search Central Bank Speeches
      if (category === 'all' || category === 'speeches' || category === 'rates') {
        const speeches = await prisma.centralBankSpeech.findMany({
          where: {
            OR: [
              { speakerName: { contains: query, mode: 'insensitive' } },
              { title: { contains: query, mode: 'insensitive' } },
              { centralBank: { contains: query, mode: 'insensitive' } }
            ]
          },
          orderBy: { publishedAt: 'desc' },
          take: maxResults
        });

        for (const sp of speeches) {
          results.push({
            id: `speech_${sp.id}`,
            category: 'speeches',
            title: `${sp.speakerName} (${sp.centralBank}): ${sp.title}`,
            subtitle: `Tone Score: ${sp.hawkishScore > 0 ? '+' : ''}${sp.hawkishScore.toFixed(1)} · ${new Date(sp.publishedAt).toLocaleDateString()}`,
            badge: sp.hawkishScore > 1 ? 'HAWKISH' : sp.hawkishScore < -1 ? 'DOVISH' : 'NEUTRAL',
            badgeColor: sp.hawkishScore > 1 ? 'red' : sp.hawkishScore < -1 ? 'emerald' : 'blue',
            payload: sp
          });
        }
      }

      return reply.send({
        query,
        category,
        total: results.length,
        results: results.slice(0, maxResults)
      });
    } catch (err: any) {
      app.log.error('[Search API Error]', err);
      return reply.status(500).send({
        error: 'Search query execution failed',
        detail: err.message,
        results
      });
    }
  });
}
