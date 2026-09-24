import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { stealthBrowser } from '../browser.js';
import { NewsItem } from './rssFeeds.js';

const TIER3_FEEDS = [
  { source: 'CoinTelegraph', url: 'https://cointelegraph.com/rss' },
  { source: 'Benzinga', url: 'https://www.benzinga.com/feed' },
  { source: 'SEC Edgar', url: 'https://www.sec.gov/edgar/searchedgar/currentevents.rss' }
];

export async function fetchTier3CryptoEquities(): Promise<NewsItem[]> {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_'
  });

  const allItems: NewsItem[] = [];

  for (const feed of TIER3_FEEDS) {
    try {
      const response = await axios.get(feed.url, {
        headers: {
          'User-Agent': stealthBrowser.getRandomUserAgent(),
          'Accept': 'application/rss+xml, application/xml, text/xml, */*'
        },
        timeout: 9000
      });

      const parsed = parser.parse(response.data);
      const channel = parsed.rss?.channel || parsed.feed;
      if (!channel) continue;

      const rawItems = channel.item || channel.entry || [];
      const items = Array.isArray(rawItems) ? rawItems : [rawItems];

      for (const item of items.slice(0, 10)) {
        const title = item.title?.['#text'] || item.title || '';
        const link = item.link?.['@_href'] || item.link || '';
        const pubDate = item.pubDate || item.published || item.updated || new Date().toISOString();

        if (title) {
          const timestamp = !isNaN(new Date(pubDate).getTime())
            ? new Date(pubDate).toISOString()
            : new Date().toISOString();

          allItems.push({
            id: `TIER3_${feed.source}_${Buffer.from(title.toString()).toString('base64').slice(0, 16)}`,
            timestamp,
            source: feed.source,
            title: title.toString().trim(),
            link: typeof link === 'string' ? link : '#'
          });
        }
      }
    } catch (err: any) {
      console.warn(`[Tier3 Scraping] Feed ${feed.source} fetch warning: ${err.message}`);
    }
  }

  console.log(`[Tier3 Scraping] Ingested ${allItems.length} crypto, equities, and SEC Edgar headlines.`);
  return allItems;
}
