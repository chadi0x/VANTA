import * as cheerio from 'cheerio';
import axios from 'axios';
import { stealthBrowser } from '../browser.js';
import { NormalizedMacroEvent, normalizeCurrency, normalizeImpact, cleanText, generateEventId } from '../normalizer.js';

export async function scrapeFxStreet(): Promise<NormalizedMacroEvent[]> {
  const url = 'https://www.fxstreet.com/economic-calendar';
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
    console.warn(`[FXStreet] Direct fetch challenged (${err.message}). Attempting stealth page...`);
    try {
      const page = await stealthBrowser.createStealthPage();
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForSelector('.fxs_c_table', { timeout: 10000 }).catch(() => {});
      html = await page.content();
      await page.close();
    } catch (bErr: any) {
      console.error(`[FXStreet] Stealth page failed: ${bErr.message}`);
      return [];
    }
  }

  const $ = cheerio.load(html);
  const events: NormalizedMacroEvent[] = [];
  const currentDate = new Date().toISOString().slice(0, 10);

  $('tr.fxs_c_table_row, tr[class*="event-row"]').each((_, el) => {
    const row = $(el);
    const eventName = cleanText(row.find('.fxs_c_table_event, td:nth-child(4)').text());
    const currencyRaw = cleanText(row.find('.fxs_c_table_currency, td:nth-child(3)').text());

    if (!eventName || !currencyRaw) return;

    const actual = cleanText(row.find('.fxs_c_table_actual, td:nth-child(5)').text()) || null;
    const forecast = cleanText(row.find('.fxs_c_table_consensus, td:nth-child(6)').text()) || null;
    const previous = cleanText(row.find('.fxs_c_table_previous, td:nth-child(7)').text()) || null;

    let impactText = 'Medium';
    if (row.find('.fxs_c_volatility_high, [class*="high"]').length > 0) impactText = 'High';
    else if (row.find('.fxs_c_volatility_low, [class*="low"]').length > 0) impactText = 'Low';

    const currency = normalizeCurrency(currencyRaw);
    const timestamp = new Date().toISOString();
    const eventId = generateEventId('FXS', currency, eventName, timestamp);

    events.push({
      id: eventId,
      timestamp,
      asset: currency,
      impact_level: normalizeImpact(impactText),
      actual_metric: actual,
      forecast: forecast,
      previous: previous,
      headline: eventName,
      source: 'FXStreet'
    });
  });

  console.log(`[FXStreet] Extracted ${events.length} macroeconomic calendar events.`);
  return events;
}
