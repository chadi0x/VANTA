import axios from 'axios';
import * as cheerio from 'cheerio';

export interface TreasuryYieldCurveData {
  recordDate: string;
  bc1Month: number | null;
  bc3Month: number | null;
  bc6Month: number | null;
  bc1Year: number | null;
  bc2Year: number | null;
  bc5Year: number | null;
  bc10Year: number | null;
  bc30Year: number | null;
  spread10y2y: number | null;
  spread10y3m: number | null;
}

/**
 * Scrapes the US Department of the Treasury XML/HTML Yield Curve data
 * Target: Daily Treasury Par Yield Curve Rates XML / CSV Feed
 */
export async function scrapeTreasuryYields(): Promise<TreasuryYieldCurveData | null> {
  const currentYear = new Date().getFullYear();
  const url = `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value=${currentYear}`;

  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/xml, text/xml, */*'
      },
      timeout: 10000
    });

    const $ = cheerio.load(res.data, { xmlMode: true });
    // Treasury XML uses Atom feed entry structure: <entry><content type="application/xml"><m:properties>...
    const entries = $('entry');
    if (entries.length === 0) {
      console.warn('[Treasury Scraper] No XML entries found in Treasury feed');
      return null;
    }

    // Get the most recent entry (last entry in Atom XML)
    const latest = entries.last();
    const props = latest.find('m\\:properties, properties');

    const parseRate = (tag: string): number | null => {
      const val = props.find(`d\\:${tag}, ${tag}`).text().trim();
      const num = parseFloat(val);
      return isNaN(num) ? null : num;
    };

    const dateStr = props.find('d\\:NEW_DATE, NEW_DATE').text().trim();
    const bc1Month = parseRate('BC_1MONTH');
    const bc3Month = parseRate('BC_3MONTH');
    const bc6Month = parseRate('BC_6MONTH');
    const bc1Year = parseRate('BC_1YEAR');
    const bc2Year = parseRate('BC_2YEAR');
    const bc5Year = parseRate('BC_5YEAR');
    const bc10Year = parseRate('BC_10YEAR');
    const bc30Year = parseRate('BC_30YEAR');

    const spread10y2y = (bc10Year !== null && bc2Year !== null) ? Number((bc10Year - bc2Year).toFixed(3)) : null;
    const spread10y3m = (bc10Year !== null && bc3Month !== null) ? Number((bc10Year - bc3Month).toFixed(3)) : null;

    const data: TreasuryYieldCurveData = {
      recordDate: dateStr ? new Date(dateStr).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      bc1Month,
      bc3Month,
      bc6Month,
      bc1Year,
      bc2Year,
      bc5Year,
      bc10Year,
      bc30Year,
      spread10y2y,
      spread10y3m
    };

    console.log(`[Treasury Yields] Ingested rates for ${data.recordDate}: 2Y=${bc2Year}%, 10Y=${bc10Year}%, 10Y-2Y Spread=${spread10y2y}%`);
    return data;
  } catch (err: any) {
    console.warn(`[Treasury Yields] Fetch error: ${err.message}`);
    return null;
  }
}
