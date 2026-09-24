import * as cheerio from 'cheerio';
import axios from 'axios';
import { stealthBrowser } from '../browser.js';
import { NormalizedMacroEvent, normalizeCurrency, normalizeImpact, cleanText, generateEventId } from '../normalizer.js';

export async function scrapeForexFactory(): Promise<NormalizedMacroEvent[]> {
  const url = 'https://www.forexfactory.com/calendar';
  let html = '';

  try {
    // Fast path: Institutional spoofed HTTP request
    const response = await axios.get(url, {
      headers: {
        'User-Agent': stealthBrowser.getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache'
      },
      timeout: 10000
    });
    html = response.data;
  } catch (err: any) {
    console.warn(`[ForexFactory] Fast HTTP request failed (${err.message}). Escalating to Puppeteer-Extra Stealth...`);
    try {
      const page = await stealthBrowser.createStealthPage();
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      // Wait for calendar table
      await page.waitForSelector('.calendar__table', { timeout: 10000 }).catch(() => {});
      html = await page.content();
      await page.close();
    } catch (browserErr: any) {
      console.error(`[ForexFactory] Stealth Puppeteer failed: ${browserErr.message}`);
      return [];
    }
  }

  const $ = cheerio.load(html);
  const events: NormalizedMacroEvent[] = [];
  const currentDate = new Date().toISOString().slice(0, 10);

  $('.calendar__row').each((_, element) => {
    const row = $(element);
    
    // Ignore non-event rows (e.g. date header rows)
    if (row.hasClass('calendar__row--day-breaker')) return;

    const currencyRaw = row.find('.calendar__currency').text();
    const eventName = cleanText(row.find('.calendar__event').text());
    if (!eventName || !currencyRaw) return;

    const currency = normalizeCurrency(currencyRaw);

    // Determine impact from folder icon
    const impactEl = row.find('.calendar__impact span');
    let impactText = 'Low';
    if (impactEl.hasClass('icon--ff-impact-red') || impactEl.attr('title')?.includes('High')) {
      impactText = 'High';
    } else if (impactEl.hasClass('icon--ff-impact-ora') || impactEl.attr('title')?.includes('Medium')) {
      impactText = 'Medium';
    } else if (impactEl.hasClass('icon--ff-impact-yel') || impactEl.attr('title')?.includes('Low')) {
      impactText = 'Low';
    }

    const actual = cleanText(row.find('.calendar__actual').text()) || null;
    const forecast = cleanText(row.find('.calendar__forecast').text()) || null;
    const previous = cleanText(row.find('.calendar__previous').text()) || null;

    const timeRaw = cleanText(row.find('.calendar__time').text());
    let timestamp = new Date().toISOString();
    if (timeRaw && timeRaw.includes(':')) {
      const parsedTime = new Date(`${currentDate} ${timeRaw} UTC`);
      if (!isNaN(parsedTime.getTime())) {
        timestamp = parsedTime.toISOString();
      }
    }

    const eventId = generateEventId('FF', currency, eventName, timestamp);

    events.push({
      id: eventId,
      timestamp,
      asset: currency,
      impact_level: normalizeImpact(impactText),
      actual_metric: actual,
      forecast: forecast,
      previous: previous,
      headline: eventName,
      source: 'ForexFactory'
    });
  });

  console.log(`[ForexFactory] Successfully extracted ${events.length} macroeconomic calendar events.`);
  return events;
}
