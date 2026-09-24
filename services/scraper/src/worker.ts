import { Worker, Job } from 'bullmq';
import axios from 'axios';
import { redisConnection, SCRAPER_QUEUE_NAME } from './queue.js';
import { scrapeForexFactory } from './parsers/forexFactory.js';
import { scrapeInvestingCom } from './parsers/investingCom.js';
import { scrapeTradingEconomics } from './parsers/tradingEconomics.js';
import { scrapeFxStreet } from './parsers/fxStreet.js';
import { fetchRssFeeds } from './parsers/rssFeeds.js';
import { fetchTier3CryptoEquities } from './parsers/cryptoEquities.js';
import { scrapeCftcReports } from './parsers/cftcScraper.js';
import { scrapeRetailSentiment } from './parsers/retailSentimentScraper.js';
import { scrapeTreasuryYields } from './parsers/treasuryYields.js';
import { scrapeCmeFedWatch } from './parsers/cmeFedWatch.js';

const API_BASE = process.env.API_BASE_URL || 'http://localhost:4000';
const apiIngestUrl         = `${API_BASE}/api/events/ingest`;
const apiNewsIngestUrl     = `${API_BASE}/api/events/news/ingest`;
const apiCotIngestUrl      = `${API_BASE}/api/cot/ingest`;
const apiRetailSentimentUrl = `${API_BASE}/api/retail-sentiment/ingest`;
const apiTreasuryIngestUrl = `${API_BASE}/api/system/treasury/ingest`;
const apiFedWatchIngestUrl = `${API_BASE}/api/system/fedwatch/ingest`;
const apiScraperHealthUrl  = `${API_BASE}/api/system/scraper-health`;

async function reportHealth(
  workerName: string,
  status: string,
  recordsIngested: number,
  latencyMs: number,
  errorMessage?: string
) {
  await axios.post(apiScraperHealthUrl, {
    workerName,
    status,
    recordsIngested,
    latencyMs,
    errorMessage: errorMessage || null
  }).catch(() => {}); // Non-blocking health ping
}

export async function processScrapeTask(taskType: string) {
  console.log(`[Scraper Pipeline] Executing target task: ${taskType}`);
  const startMs = Date.now();

  switch (taskType) {
    case 'forexfactory': {
      const events = await scrapeForexFactory();
      if (events.length > 0) await axios.post(apiIngestUrl, events).catch(e => console.warn(`[Ingest] FF: ${e.message}`));
      await reportHealth('forex-factory', events.length > 0 ? 'HEALTHY' : 'DEGRADED', events.length, Date.now() - startMs);
      return { source: 'ForexFactory', count: events.length };
    }

    case 'investingcom': {
      const events = await scrapeInvestingCom();
      if (events.length > 0) await axios.post(apiIngestUrl, events).catch(e => console.warn(`[Ingest] IC: ${e.message}`));
      await reportHealth('investing-com', events.length > 0 ? 'HEALTHY' : 'DEGRADED', events.length, Date.now() - startMs);
      return { source: 'InvestingCom', count: events.length };
    }

    case 'tradingeconomics': {
      const events = await scrapeTradingEconomics();
      if (events.length > 0) await axios.post(apiIngestUrl, events).catch(e => console.warn(`[Ingest] TE: ${e.message}`));
      await reportHealth('trading-economics', events.length > 0 ? 'HEALTHY' : 'DEGRADED', events.length, Date.now() - startMs);
      return { source: 'TradingEconomics', count: events.length };
    }

    case 'fxstreet': {
      const events = await scrapeFxStreet();
      if (events.length > 0) await axios.post(apiIngestUrl, events).catch(e => console.warn(`[Ingest] FX: ${e.message}`));
      await reportHealth('fxstreet', events.length > 0 ? 'HEALTHY' : 'DEGRADED', events.length, Date.now() - startMs);
      return { source: 'FXStreet', count: events.length };
    }

    case 'rss': {
      const news = await fetchRssFeeds();
      if (news.length > 0) await axios.post(apiNewsIngestUrl, news).catch(e => console.warn(`[Ingest] RSS: ${e.message}`));
      await reportHealth('rss-feeds', news.length > 0 ? 'HEALTHY' : 'DEGRADED', news.length, Date.now() - startMs);
      return { source: 'RSS', count: news.length };
    }

    case 'tier3': {
      const news = await fetchTier3CryptoEquities();
      if (news.length > 0) await axios.post(apiNewsIngestUrl, news).catch(e => console.warn(`[Ingest] T3: ${e.message}`));
      await reportHealth('crypto-equities', news.length > 0 ? 'HEALTHY' : 'DEGRADED', news.length, Date.now() - startMs);
      return { source: 'Tier3_Crypto_Equities_SEC', count: news.length };
    }

    case 'cftc': {
      const reports = await scrapeCftcReports();
      if (reports.length > 0) await axios.post(apiCotIngestUrl, reports).catch(e => console.warn(`[Ingest] CFTC: ${e.message}`));
      await reportHealth(
        'cftc-comex',
        reports.length > 0 ? 'HEALTHY' : 'DEGRADED',
        reports.length,
        Date.now() - startMs,
        reports.length === 0 ? 'No CFTC data parsed — check endpoint availability' : undefined
      );
      return { source: 'CFTC_COT', count: reports.length };
    }

    case 'retail-sentiment': {
      const records = await scrapeRetailSentiment();
      if (records.length > 0) await axios.post(apiRetailSentimentUrl, records).catch(e => console.warn(`[Ingest] RS: ${e.message}`));
      await reportHealth(
        'retail-sentiment',
        records.length > 0 ? 'HEALTHY' : 'DEGRADED',
        records.length,
        Date.now() - startMs,
        records.length === 0 ? 'No retail sentiment scraped — check Myfxbook/OANDA/IG' : undefined
      );
      return { source: 'RetailSentiment', count: records.length };
    }

    case 'treasury': {
      const yieldData = await scrapeTreasuryYields();
      if (yieldData) await axios.post(apiTreasuryIngestUrl, yieldData).catch(e => console.warn(`[Ingest] Treasury: ${e.message}`));
      await reportHealth('us-treasury', yieldData ? 'HEALTHY' : 'DEGRADED', yieldData ? 1 : 0, Date.now() - startMs);
      return { source: 'USTreasuryYields', count: yieldData ? 1 : 0 };
    }

    case 'fedwatch': {
      const probData = await scrapeCmeFedWatch();
      if (probData.length > 0) await axios.post(apiFedWatchIngestUrl, probData).catch(e => console.warn(`[Ingest] FedWatch: ${e.message}`));
      await reportHealth('cme-fedwatch', probData.length > 0 ? 'HEALTHY' : 'DEGRADED', probData.length, Date.now() - startMs);
      return { source: 'CME_FedWatch', count: probData.length };
    }

    default:
      throw new Error(`Unknown scraper task type: ${taskType}`);
  }
}

export function startBullMqWorker(): Worker | null {
  try {
    const worker = new Worker(
      SCRAPER_QUEUE_NAME,
      async (job: Job) => {
        return await processScrapeTask(job.data.target);
      },
      {
        connection: redisConnection,
        concurrency: 2
      }
    );

    worker.on('completed', (job: Job, returnvalue: any) => {
      console.log(`[BullMQ Worker] Job ${job.id} completed:`, returnvalue);
    });

    worker.on('failed', (job: Job | undefined, err: Error) => {
      console.error(`[BullMQ Worker] Job ${job?.id} failed:`, err.message);
    });

    return worker;
  } catch (err: any) {
    console.warn(`[BullMQ Worker] Could not start: ${err.message}`);
    return null;
  }
}
