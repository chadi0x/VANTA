import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { stealthBrowser } from '../browser.js';

export interface NewsItem {
  id: string;
  timestamp: string;
  source: string;
  title: string;
  link: string;
}

const RSS_FEEDS = [
  // Institutional Squawk & Macro
  { source: 'ForexLive', url: 'https://www.forexlive.com/feed/news' },
  { source: 'ZeroHedge', url: 'https://feeds.feedburner.com/zerohedge/feed' },
  { source: 'FinancialJuice', url: 'https://www.financialjuice.com/feed.ashx' },
  // Reuters & Bloomberg Markets
  { source: 'Reuters', url: 'https://www.reutersagency.com/feed/?taxonomy=markets&post_type=best' },
  { source: 'Bloomberg', url: 'https://feeds.bloomberg.com/markets/news.rss' }
];

export async function fetchRssFeeds(): Promise<NewsItem[]> {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_'
  });

  const allNews: NewsItem[] = [];

  for (const feed of RSS_FEEDS) {
    try {
      const response = await axios.get(feed.url, {
        headers: {
          'User-Agent': stealthBrowser.getRandomUserAgent(),
          'Accept': 'application/rss+xml, application/xml, text/xml, */*'
        },
        timeout: 8000
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

          allNews.push({
            id: `RSS_${feed.source}_${Buffer.from(title.toString()).toString('base64').slice(0, 16)}`,
            timestamp,
            source: feed.source,
            title: title.toString().trim(),
            link: typeof link === 'string' ? link : '#'
          });
        }
      }
    } catch (err: any) {
      console.warn(`[RSS Ingest] Failed fetching ${feed.source} feed: ${err.message}`);
    }
  }

  console.log(`[RSS Ingest] Gathered ${allNews.length} breaking institutional news wire items.`);
  return allNews;
}
