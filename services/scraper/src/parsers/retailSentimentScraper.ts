import axios from 'axios';
import * as cheerio from 'cheerio';
import { stealthBrowser } from '../browser.js';

export interface RetailSentimentRecord {
  asset: string;     // XAUUSD, XAGUSD, USOIL, USIDX
  source: string;    // MYFXBOOK, OANDA, IG
  longPercent: number;
  shortPercent: number;
  longPositions?: number;
  shortPositions?: number;
}

function clampPercent(n: number): number {
  return Math.max(0, Math.min(100, n));
}

// ────────────────────────────────────────────────────────────────────────────
// MYFXBOOK Community Outlook (public JSON endpoint)
// https://www.myfxbook.com/api/get-community-outlook.json
// ────────────────────────────────────────────────────────────────────────────
async function scrapeMyfxbook(): Promise<RetailSentimentRecord[]> {
  const results: RetailSentimentRecord[] = [];

  try {
    const res = await axios.get('https://www.myfxbook.com/api/get-community-outlook.json', {
      headers: {
        'User-Agent': stealthBrowser.getRandomUserAgent(),
        'Accept': 'application/json'
      },
      timeout: 12000
    });

    const data = res.data;
    if (!data?.symbols) throw new Error('Unexpected Myfxbook response shape');

    // Map Myfxbook symbol names to our asset codes
    const symbolMap: Record<string, string> = {
      'XAUUSD': 'XAUUSD',
      'XAGUSD': 'XAGUSD',
      'USOIL':  'USOIL',
      'USDOLLAR': 'USIDX',
      'DXY':    'USIDX'
    };

    for (const sym of data.symbols) {
      const mappedAsset = symbolMap[sym.name?.toUpperCase()];
      if (!mappedAsset) continue;

      const longPct = parseFloat(sym.longPercentage) || 0;
      const shortPct = parseFloat(sym.shortPercentage) || 0;

      results.push({
        asset: mappedAsset,
        source: 'MYFXBOOK',
        longPercent: clampPercent(longPct),
        shortPercent: clampPercent(shortPct),
        longPositions: parseInt(sym.longPositions) || undefined,
        shortPositions: parseInt(sym.shortPositions) || undefined
      });
    }

    console.log(`[RetailSentiment] Myfxbook: Parsed ${results.length} assets`);
  } catch (err: any) {
    console.warn(`[RetailSentiment] Myfxbook failed: ${err.message}`);
  }

  return results;
}

// ────────────────────────────────────────────────────────────────────────────
// OANDA Order Book / Open Position Ratios
// OANDA publishes public ratio pages — HTML scrape
// ────────────────────────────────────────────────────────────────────────────
async function scrapeOanda(): Promise<RetailSentimentRecord[]> {
  const results: RetailSentimentRecord[] = [];

  const targets = [
    { url: 'https://www.oanda.com/us-en/trading/technical-analysis/order-book/xauusd/', asset: 'XAUUSD' },
    { url: 'https://www.oanda.com/us-en/trading/technical-analysis/order-book/xagusd/', asset: 'XAGUSD' },
    { url: 'https://www.oanda.com/us-en/trading/technical-analysis/order-book/usoil/',  asset: 'USOIL' }
  ];

  for (const t of targets) {
    try {
      const res = await axios.get(t.url, {
        headers: {
          'User-Agent': stealthBrowser.getRandomUserAgent(),
          'Accept': 'text/html'
        },
        timeout: 15000
      });

      const $ = cheerio.load(res.data);

      // OANDA renders long/short percentages in specific spans
      // Try multiple selector patterns
      let longPct = 0;
      let shortPct = 0;

      // Pattern 1: data attributes
      const longEl = $('[data-long-ratio], .long-ratio, [class*="long"]').first();
      const shortEl = $('[data-short-ratio], .short-ratio, [class*="short"]').first();

      if (longEl.length && shortEl.length) {
        longPct = parseFloat(longEl.text().replace('%', '')) || 0;
        shortPct = parseFloat(shortEl.text().replace('%', '')) || 0;
      }

      // Pattern 2: scan all text for XX% long / XX% short patterns
      if (!longPct && !shortPct) {
        const bodyText = $('body').text();
        const longMatch = bodyText.match(/(\d+\.?\d*)\s*%\s*(?:Long|LONG|long)/);
        const shortMatch = bodyText.match(/(\d+\.?\d*)\s*%\s*(?:Short|SHORT|short)/);
        if (longMatch) longPct = parseFloat(longMatch[1]);
        if (shortMatch) shortPct = parseFloat(shortMatch[1]);
      }

      if (longPct > 0 || shortPct > 0) {
        // Normalize if needed
        const total = longPct + shortPct;
        if (total > 0 && Math.abs(total - 100) > 5) {
          longPct = (longPct / total) * 100;
          shortPct = (shortPct / total) * 100;
        }

        results.push({
          asset: t.asset,
          source: 'OANDA',
          longPercent: clampPercent(longPct),
          shortPercent: clampPercent(shortPct)
        });
        console.log(`[RetailSentiment] OANDA ${t.asset}: ${longPct.toFixed(1)}% L / ${shortPct.toFixed(1)}% S`);
      } else {
        console.warn(`[RetailSentiment] OANDA ${t.asset}: No ratio found in page`);
      }
    } catch (err: any) {
      console.warn(`[RetailSentiment] OANDA ${t.asset} failed: ${err.message}`);
    }
  }

  return results;
}

// ────────────────────────────────────────────────────────────────────────────
// IG Client Sentiment (public page)
// ────────────────────────────────────────────────────────────────────────────
async function scrapeIgSentiment(): Promise<RetailSentimentRecord[]> {
  const results: RetailSentimentRecord[] = [];

  const targets = [
    { url: 'https://www.ig.com/us/trading-opportunities/market-sentiment/gold', asset: 'XAUUSD' },
    { url: 'https://www.ig.com/us/trading-opportunities/market-sentiment/silver', asset: 'XAGUSD' },
    { url: 'https://www.ig.com/us/trading-opportunities/market-sentiment/oil-us-crude', asset: 'USOIL' }
  ];

  for (const t of targets) {
    try {
      const res = await axios.get(t.url, {
        headers: {
          'User-Agent': stealthBrowser.getRandomUserAgent(),
          'Accept': 'text/html'
        },
        timeout: 15000
      });

      const $ = cheerio.load(res.data);
      const bodyText = $('body').text();

      // IG sentiment typically shows "XX% of clients are net long"
      const longMatch = bodyText.match(/(\d+(?:\.\d+)?)\s*%\s*(?:of\s+clients\s+)?(?:are\s+)?(?:net\s+)?long/i);
      const shortMatch = bodyText.match(/(\d+(?:\.\d+)?)\s*%\s*(?:of\s+clients\s+)?(?:are\s+)?(?:net\s+)?short/i);

      let longPct = longMatch ? parseFloat(longMatch[1]) : 0;
      let shortPct = shortMatch ? parseFloat(shortMatch[1]) : 0;

      // If only long found, derive short
      if (longPct > 0 && shortPct === 0) shortPct = 100 - longPct;
      if (shortPct > 0 && longPct === 0) longPct = 100 - shortPct;

      if (longPct > 0 || shortPct > 0) {
        results.push({
          asset: t.asset,
          source: 'IG',
          longPercent: clampPercent(longPct),
          shortPercent: clampPercent(shortPct)
        });
        console.log(`[RetailSentiment] IG ${t.asset}: ${longPct.toFixed(1)}% L / ${shortPct.toFixed(1)}% S`);
      } else {
        console.warn(`[RetailSentiment] IG ${t.asset}: Sentiment ratio not found in page`);
      }
    } catch (err: any) {
      console.warn(`[RetailSentiment] IG ${t.asset} failed: ${err.message}`);
    }
  }

  return results;
}

// ────────────────────────────────────────────────────────────────────────────
// Main orchestrator
// ────────────────────────────────────────────────────────────────────────────
export async function scrapeRetailSentiment(): Promise<RetailSentimentRecord[]> {
  console.log('[RetailSentiment] Starting multi-source retail sentiment scrape...');
  const startMs = Date.now();

  const [myfxbookResults, oandaResults, igResults] = await Promise.allSettled([
    scrapeMyfxbook(),
    scrapeOanda(),
    scrapeIgSentiment()
  ]);

  const allResults: RetailSentimentRecord[] = [
    ...(myfxbookResults.status === 'fulfilled' ? myfxbookResults.value : []),
    ...(oandaResults.status === 'fulfilled' ? oandaResults.value : []),
    ...(igResults.status === 'fulfilled' ? igResults.value : [])
  ];

  const elapsed = Date.now() - startMs;

  if (allResults.length === 0) {
    console.warn(`[RetailSentiment] All sources failed (${elapsed}ms). Returning empty — NO MOCK DATA per V3 directive.`);
    return [];
  }

  console.log(`[RetailSentiment] Complete: ${allResults.length} records from all sources in ${elapsed}ms`);
  return allResults;
}
