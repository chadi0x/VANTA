import { initQueue, scraperQueue } from './queue.js';
import { startBullMqWorker, processScrapeTask } from './worker.js';
import { stealthBrowser } from './browser.js';

const SCRAPE_INTERVAL_MS = parseInt(process.env.SCRAPE_INTERVAL_MS || '60000', 10);
const RETAIL_INTERVAL_MS = parseInt(process.env.RETAIL_SCRAPE_INTERVAL_MS || '300000', 10); // 5min
const CFTC_INTERVAL_MS   = parseInt(process.env.CFTC_SCRAPE_INTERVAL_MS || '3600000', 10);  // 1hr (CFTC only updates Friday 15:30 ET)
const RSS_INTERVAL_MS    = 30000; // 30s

const ALL_TARGETS = [
  'forexfactory',
  'investingcom',
  'tradingeconomics',
  'fxstreet',
  'rss',
  'tier3',
  'cftc',
  'retail-sentiment',
  'treasury',
  'fedwatch'
];

function getInterval(target: string): number {
  if (target === 'rss' || target === 'tier3') return RSS_INTERVAL_MS;
  if (target === 'cftc') return CFTC_INTERVAL_MS;
  if (target === 'retail-sentiment') return RETAIL_INTERVAL_MS;
  if (target === 'treasury') return 300000; // 5 min
  if (target === 'fedwatch') return 600000; // 10 min
  return SCRAPE_INTERVAL_MS;
}

async function bootstrap() {
  console.log('====================================================');
  console.log('  CHADI0X VANTA — INSTITUTIONAL SCRAPING ENGINE v3  ');
  console.log('  TARGETS: FOREX · MACRO · RSS · CFTC · RETAIL      ');
  console.log('  STEALTH ANTI-BOT: ACTIVE                          ');
  console.log(`  BASE CADENCE: ${SCRAPE_INTERVAL_MS}ms             `);
  console.log('====================================================');

  const queue = await initQueue();

  if (queue) {
    // Redis + BullMQ mode
    startBullMqWorker();

    for (const target of ALL_TARGETS) {
      const interval = getInterval(target);
      await queue.add(
        `scrape-${target}`,
        { target },
        { repeat: { every: interval } }
      );
      // Immediate first execution
      await queue.add(`scrape-${target}-init`, { target });
    }
    console.log('[Scheduler] BullMQ repeatable jobs scheduled for all targets.');
  } else {
    // Fallback: in-process multi-tier scheduler
    console.log('[Scheduler] Redis unavailable — using in-process scheduler.');

    const runTarget = async (target: string) => {
      try {
        const result = await processScrapeTask(target);
        console.log(`[InProcess] ✓ ${target}:`, result);
      } catch (err: any) {
        console.warn(`[InProcess] ✗ ${target}: ${err.message}`);
      }
    };

    // Run all targets immediately
    for (const target of ALL_TARGETS) {
      await runTarget(target);
    }

    // Schedule each at its own interval
    for (const target of ALL_TARGETS) {
      const interval = getInterval(target);
      setInterval(() => runTarget(target), interval);
    }
  }

  // Graceful shutdown
  const shutdown = async () => {
    console.log('[Scraper] Gracefully closing browser and connections...');
    await stealthBrowser.closeBrowser();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch(err => {
  console.error('Fatal Scraper Pipeline Error:', err);
  process.exit(1);
});
