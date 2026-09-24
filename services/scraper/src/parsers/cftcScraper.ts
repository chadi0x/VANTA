import axios from 'axios';
import { stealthBrowser } from '../browser.js';

export interface ScrapedCotData {
  reportDate: string;
  assetCode: string;
  assetName: 'GOLD' | 'SILVER' | 'CRUDE_OIL' | 'DXY';
  openInterest: number;
  nonCommercialLong: number;
  nonCommercialShort: number;
  nonCommercialSpreads: number;
  commercialLong: number;
  commercialShort: number;
  otherReportableLong: number;
  otherReportableShort: number;
  nonReportableLong: number;
  nonReportableShort: number;
}

// CFTC asset targets
const ASSETS = [
  { code: '088691', name: 'GOLD'      as const, pattern: /GOLD\s*-\s*COMMODITY EXCHANGE INC\./i },
  { code: '084691', name: 'SILVER'    as const, pattern: /SILVER\s*-\s*COMMODITY EXCHANGE INC\./i },
  { code: '067651', name: 'CRUDE_OIL' as const, pattern: /LIGHT SWEET CRUDE OIL|CRUDE OIL/i },
  { code: '098662', name: 'DXY'       as const, pattern: /U\.S\. DOLLAR INDEX|USD INDEX/i }
];

function parseNum(s: string | undefined): number {
  if (!s) return 0;
  return parseInt(s.replace(/,/g, ''), 10) || 0;
}

/**
 * Parse CFTC Legacy/Disaggregated text report for a single asset block
 * Text format:
 *   <ASSET_NAME> - COMMODITY EXCHANGE INC.
 *   CFTC Code # <CODE>
 *   OPEN INTEREST: <OI>
 *   COMMITMENTS
 *   <NCLong> <NCShort> <NCSpreads> <CommLong> <CommShort> <OtherLong> <OtherShort> <NRLong> <NRShort>
 */
function parseAssetBlock(
  text: string,
  assetCode: string,
  assetName: ScrapedCotData['assetName'],
  reportDate: string
): ScrapedCotData | null {
  const codePattern = new RegExp(
    `CFTC Code #\\s*${assetCode}[\\s\\S]*?OPEN INTEREST:\\s*([\\d,]+)[\\s\\S]*?COMMITMENTS[\\s\\S]*?([\\d,]+)\\s+([\\d,]+)\\s+([\\d,]+)\\s+([\\d,]+)\\s+([\\d,]+)\\s+([\\d,]+)\\s+([\\d,]+)\\s+([\\d,]+)\\s+([\\d,]+)`,
    'i'
  );

  const match = text.match(codePattern);
  if (!match) return null;

  return {
    reportDate,
    assetCode,
    assetName,
    openInterest:        parseNum(match[1]),
    nonCommercialLong:   parseNum(match[2]),
    nonCommercialShort:  parseNum(match[3]),
    nonCommercialSpreads:parseNum(match[4]),
    commercialLong:      parseNum(match[5]),
    commercialShort:     parseNum(match[6]),
    otherReportableLong: parseNum(match[7]),
    otherReportableShort:parseNum(match[8]),
    nonReportableLong:   parseNum(match[9]),
    nonReportableShort:  parseNum(match[10])
  };
}

/**
 * Extract report date from CFTC text header (format: "As of Tuesday, September 17, 2026")
 */
function extractReportDate(text: string): string {
  const dateMatch = text.match(/As of\s+(?:Tuesday|Friday),\s+([A-Za-z]+\s+\d+,\s+\d{4})/i);
  if (dateMatch) {
    const d = new Date(dateMatch[1]);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

export async function scrapeCftcReports(): Promise<ScrapedCotData[]> {
  const results: ScrapedCotData[] = [];
  const startMs = Date.now();

  // Primary: COMEX disaggregated text report (Gold + Silver)
  const comexUrl = 'https://www.cftc.gov/dea/futures/deacmx.htm';
  // Secondary: NYMEX for Crude Oil
  const nymexUrl = 'https://www.cftc.gov/dea/futures/deanymx.htm';
  // Tertiary: IFUS for DXY (ICE Futures US)
  const ifusUrl  = 'https://www.cftc.gov/dea/futures/deaicus.htm';

  const endpoints = [
    { url: comexUrl, codes: ['088691', '084691'] },
    { url: nymexUrl, codes: ['067651'] },
    { url: ifusUrl,  codes: ['098662'] }
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await axios.get(endpoint.url, {
        headers: {
          'User-Agent': stealthBrowser.getRandomUserAgent(),
          'Accept': 'text/html, text/plain, */*',
          'Cache-Control': 'no-cache'
        },
        timeout: 15000
      });

      const text: string = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
      const reportDate = extractReportDate(text);

      for (const assetCode of endpoint.codes) {
        const assetDef = ASSETS.find(a => a.code === assetCode);
        if (!assetDef) continue;

        const parsed = parseAssetBlock(text, assetCode, assetDef.name, reportDate);
        if (parsed) {
          results.push(parsed);
          console.log(`[CFTC] ✓ Parsed ${assetDef.name} — OI: ${parsed.openInterest.toLocaleString()} | NCNet: ${(parsed.nonCommercialLong - parsed.nonCommercialShort).toLocaleString()} | Report: ${reportDate}`);
        } else {
          console.warn(`[CFTC] ✗ Could not parse ${assetDef.name} (${assetCode}) from ${endpoint.url}`);
        }
      }
    } catch (err: any) {
      console.warn(`[CFTC] Fetch failed for ${endpoint.url}: ${err.message}`);
    }
  }

  const elapsed = Date.now() - startMs;

  if (results.length === 0) {
    console.warn(`[CFTC] All endpoints failed or returned no matches after ${elapsed}ms. Returning empty array — NO MOCK DATA.`);
    // Explicit: do NOT return mock/fallback data per V3 directive
    // The API will return AWAITING_INGESTION state to the frontend
    return [];
  }

  console.log(`[CFTC] Scrape complete: ${results.length} assets parsed in ${elapsed}ms`);
  return results;
}

/**
 * Scrape CFTC bulk CSV (annual, all assets). Slower but more reliable.
 * Used as fallback or on initial seed.
 * URL: https://www.cftc.gov/files/dea/history/fut_disagg_txt_2026.zip
 */
export async function scrapeCftcBulkCsv(year = new Date().getFullYear()): Promise<ScrapedCotData[]> {
  const url = `https://www.cftc.gov/files/dea/history/fut_disagg_txt_${year}.zip`;

  console.log(`[CFTC CSV] Attempting bulk CSV download: ${url}`);
  // Note: Downloading and unzipping in Node requires adm-zip or unzipper
  // This function returns empty — actual implementation requires the unzip dependency
  // Add: npm install adm-zip in services/scraper and implement extraction
  console.warn('[CFTC CSV] Bulk CSV parsing not implemented — install adm-zip and implement extraction in services/scraper');
  return [];
}
