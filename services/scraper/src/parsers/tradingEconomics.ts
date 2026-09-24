import * as cheerio from 'cheerio';
import axios from 'axios';
import { stealthBrowser } from '../browser.js';
import { NormalizedMacroEvent, normalizeCurrency, normalizeImpact, cleanText, generateEventId } from '../normalizer.js';

export async function scrapeTradingEconomics(): Promise<NormalizedMacroEvent[]> {
  const url = 'https://tradingeconomics.com/calendar';
  let html = '';

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': stealthBrowser.getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 10000
    });
    html = response.data;
  } catch (err: any) {
    console.warn(`[TradingEconomics] Direct request fallback (${err.message}). Attempting stealth page...`);
    try {
      const page = await stealthBrowser.createStealthPage();
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForSelector('#calendar', { timeout: 10000 }).catch(() => {});
      html = await page.content();
      await page.close();
    } catch (bErr: any) {
      console.error(`[TradingEconomics] Stealth extraction failed: ${bErr.message}`);
      return [];
    }
  }

  const $ = cheerio.load(html);
  const events: NormalizedMacroEvent[] = [];
  const currentDate = new Date().toISOString().slice(0, 10);

  $('#calendar tr[data-symbol]').each((_, el) => {
    const row = $(el);
    const countryOrAsset = cleanText(row.find('td:nth-child(2)').text());
    const eventName = cleanText(row.find('td:nth-child(3) a, td:nth-child(3)').text());

    if (!eventName || !countryOrAsset) return;

    const actual = cleanText(row.find('span[id*="actual"]').text()) || null;
    const previous = cleanText(row.find('span[id*="previous"]').text()) || null;
    const forecast = cleanText(row.find('span[id*="forecast"]').text()) || null;

    // Detect volatility / impact stars
    const stars = row.find('td:nth-child(3) i.calendar-sparkle, td i.fa-star').length;
    let impactText = 'Medium';
    if (stars >= 3) impactText = 'High';
    else if (stars <= 1) impactText = 'Low';

    const currency = normalizeCurrency(countryOrAsset);
    const timestamp = new Date().toISOString();
    const eventId = generateEventId('TE', currency, eventName, timestamp);

    events.push({
      id: eventId,
      timestamp,
      asset: currency,
      impact_level: normalizeImpact(impactText),
      actual_metric: actual,
      forecast: forecast,
      previous: previous,
      headline: eventName,
      source: 'TradingEconomics'
    });
  });

  console.log(`[TradingEconomics] Extracted ${events.length} cross-verification macro events.`);
  return events;
}
