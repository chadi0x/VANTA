import puppeteerExtra from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';

// Register stealth plugin to evade Cloudflare, Datadome, and perimeter heuristics
puppeteerExtra.use(StealthPlugin());

const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15'
];

export class StealthBrowserManager {
  private browser: Browser | null = null;
  private proxies: string[] = [];
  private proxyIndex: number = 0;

  constructor() {
    const rawProxies = process.env.PROXY_LIST || '';
    if (rawProxies.trim()) {
      this.proxies = rawProxies.split(',').map(p => p.trim()).filter(Boolean);
    }
  }

  private getNextProxy(): string | null {
    if (this.proxies.length === 0) return null;
    const proxy = this.proxies[this.proxyIndex % this.proxies.length];
    this.proxyIndex++;
    return proxy;
  }

  public getRandomUserAgent(): string {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  }

  public async getBrowser(): Promise<Browser> {
    if (this.browser && this.browser.connected) {
      return this.browser;
    }

    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-infobars',
      '--window-position=0,0',
      '--ignore-certifcate-errors',
      '--ignore-certifcate-errors-spki-list',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process'
    ];

    const proxy = this.getNextProxy();
    if (proxy) {
      args.push(`--proxy-server=${proxy}`);
    }

    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;

    this.browser = await (puppeteerExtra as any).launch({
      headless: true,
      args,
      executablePath,
      ignoreHTTPSErrors: true
    });

    return this.browser!;
  }

  public async createStealthPage(): Promise<Page> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    const ua = this.getRandomUserAgent();
    await page.setUserAgent(ua);
    await page.setViewport({
      width: 1920 + Math.floor(Math.random() * 100),
      height: 1080 + Math.floor(Math.random() * 100),
      deviceScaleFactor: 1
    });

    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"macOS"',
      'Upgrade-Insecure-Requests': '1'
    });

    return page;
  }

  public async closeBrowser(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (e) {
        // ignore
      }
      this.browser = null;
    }
  }
}

export const stealthBrowser = new StealthBrowserManager();
