import * as cheerio from 'cheerio';
import axios from 'axios';
import { stealthBrowser } from '../browser.js';
import { NormalizedMacroEvent, normalizeCurrency, normalizeImpact, cleanText, generateEventId } from '../normalizer.js';

export async function scrapeInvestingCom(): Promise<NormalizedMacroEvent[]> {
  const url = 'https://www.investing.com/economic-calendar/';
  let html = '';

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': stealthBrowser.getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.google.com/'
      },
      timeout: 10000
    });
    html = response.data;
  } catch (err: any) {
    console.warn(`[Investing.com] Direct request challenge (${err.message}). Activating Puppeteer-Extra Stealth...`);
    try {
      const page = await stealthBrowser.createStealthPage();
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await page.waitForSelector('#economicCalendarData', { timeout: 12000 }).catch(() => {});
      html = await page.content();
      await page.close();
    } catch (browserErr: any) {
      console.error(`[Investing.com] Stealth Puppeteer failed: ${browserErr.message}`);
      return [];
    }
  }

  const $ = cheerio.load(html);
  const events: NormalizedMacroEvent[] = [];
  const currentDate = new Date().toISOString().slice(0, 10);

  $('#economicCalendarData tr.js-event-item').each((_, element) => {
    const row = $(element);
    const eventName = cleanText(row.find('td.event a, td.event').text());
    const currencyRaw = cleanText(row.find('td.flagCur').text());

    if (!eventName || !currencyRaw) return;

    // Detect 3-star volatility (high impact)
    const starsCount = row.find('td.sentiment i.grayFullBullishIcon').length ||
                       row.find('td.sentiment [data-img_key*="bull"]').length;

    let impactText = 'Low';
    if (starsCount >= 3) {
      impactText = 'High';
    } else if (starsCount === 2) {
      impactText = 'Medium';
    }

    const actual = cleanText(row.find('td.act').text()) || null;
    const forecast = cleanText(row.find('td.fore').text()) || null;
    const previous = cleanText(row.find('td.prev').text()) || null;
    const timeRaw = cleanText(row.find('td.time').text());

    let timestamp = new Date().toISOString();
    if (timeRaw && timeRaw.includes(':')) {
      const parsedTime = new Date(`${currentDate} ${timeRaw} UTC`);
      if (!isNaN(parsedTime.getTime())) {
        timestamp = parsedTime.toISOString();
      }
    }

    const currency = normalizeCurrency(currencyRaw);
    const eventId = generateEventId('INV', currency, eventName, timestamp);

    events.push({
      id: eventId,
      timestamp,
      asset: currency,
      impact_level: normalizeImpact(impactText),
      actual_metric: actual,
      forecast: forecast,
      previous: previous,
      headline: eventName,
      source: 'InvestingCom'
    });
  });

  console.log(`[Investing.com] Successfully extracted ${events.length} calendar events (High impact focus).`);
  return events;
}
