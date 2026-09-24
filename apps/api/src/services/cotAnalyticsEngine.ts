// Chadi0x VANTA — COT Analytics Engine v3
// Expanded to 4 assets: Gold, Silver, Crude Oil, US Dollar Index
// New: OI 14-Day Velocity, Contrarian Sentinel (Retail vs MM divergence)

export type CotAssetName = 'GOLD' | 'SILVER' | 'CRUDE_OIL' | 'DXY';

export interface CotRawRecord {
  reportDate: string; // YYYY-MM-DD
  assetCode: string;  // 088691=Gold, 084691=Silver, 067651=Crude, 098662=DXY
  assetName: CotAssetName;
  openInterest: number;
  nonCommercialLong: number;
  nonCommercialShort: number;
  nonCommercialSpreads: number;
  commercialLong: number;
  commercialShort: number;
  otherReportableLong?: number;
  otherReportableShort?: number;
  nonReportableLong?: number;
  nonReportableShort?: number;
  // OI velocity pre-computed (percentage)
  oiVelocity14d?: number;
}

export interface RetailSentimentSnapshot {
  asset: string;
  longPercent: number;
  shortPercent: number;
  source: string;
}

export type CotBiasVerdict =
  | 'STRONG_BULLISH_BIAS'
  | 'BULLISH_BIAS'
  | 'NEUTRAL_ACCUMULATION'
  | 'BEARISH_BIAS'
  | 'STRONG_BEARISH_BIAS'
  | 'OVERCROWDED_LONG_REVERSAL_RISK'
  | 'OVERCROWDED_SHORT_SQUEEZE_RISK';

export type ContrarianAlert =
  | 'INSTITUTIONAL_DISTRIBUTION_RETAIL_TRAP'
  | 'INSTITUTIONAL_ACCUMULATION_RETAIL_SHORT_SQUEEZE'
  | null;

export interface CotAnalysisResult {
  assetCode: string;
  assetName: CotAssetName;
  symbol: string;
  tradingViewSymbol: string;
  reportDate: string;
  // Open Interest
  openInterest: number;
  openInterestWoWDelta: number;
  oiVelocity14d: number;          // (OI_T − OI_T-1) / OI_T-1 * 100
  // Managed Money (Non-Commercial)
  speculatorLongs: number;
  speculatorShorts: number;
  speculatorNet: number;
  wowNetDelta: number;
  wowPercentageChange: number;
  // Commercial Hedgers
  commercialLongs: number;
  commercialShorts: number;
  commercialNet: number;
  commercialWoWDelta: number;
  // 52-week Positioning Percentile
  percentile52w: number;
  min52wNet: number;
  max52wNet: number;
  // Directional Verdict
  verdict: CotBiasVerdict;
  isExtremeAlert: boolean;
  alertType?: 'OVERCROWDED_LONG' | 'OVERCROWDED_SHORT';
  opinionSummary: string;
  orderflowSignal: 'ACCUMULATION' | 'DISTRIBUTION' | 'SHORT_COVERING' | 'LONG_LIQUIDATION';
  // Contrarian Sentinel
  contrarianAlert: ContrarianAlert;
  contrarianDescription: string;
  retailLongPercent?: number;
  retailShortPercent?: number;
  // Data provenance
  dataSource: 'LIVE_CFTC' | 'AWAITING_INGESTION';
  lastUpdatedUtc: string;
}

// Asset metadata lookup
const ASSET_META: Record<string, { symbol: string; tradingViewSymbol: string }> = {
  '088691': { symbol: 'XAU/USD', tradingViewSymbol: 'OANDA:XAUUSD' },
  '084691': { symbol: 'XAG/USD', tradingViewSymbol: 'OANDA:XAGUSD' },
  '067651': { symbol: 'WTI/USD', tradingViewSymbol: 'NYMEX:CL1!' },
  '098662': { symbol: 'USD/IDX', tradingViewSymbol: 'TVC:DXY' }
};

export class CotAnalyticsEngine {
  /**
   * Full quantitative COT analysis with Contrarian Sentinel
   */
  public static analyze(
    current: CotRawRecord,
    previous?: CotRawRecord | null,
    history52w: CotRawRecord[] = [],
    retailSentiment?: RetailSentimentSnapshot | null
  ): CotAnalysisResult {
    const meta = ASSET_META[current.assetCode] || {
      symbol: current.assetName,
      tradingViewSymbol: 'TVC:DXY'
    };

    // ── Core Net Positions ──────────────────────────────────────────────────
    const currentSpecNet = current.nonCommercialLong - current.nonCommercialShort;
    const commercialNet = current.commercialLong - current.commercialShort;

    const prevSpecNet = previous
      ? previous.nonCommercialLong - previous.nonCommercialShort
      : currentSpecNet;

    const prevCommercialNet = previous
      ? previous.commercialLong - previous.commercialShort
      : commercialNet;

    const wowNetDelta = currentSpecNet - prevSpecNet;
    const commercialWoWDelta = commercialNet - prevCommercialNet;

    const wowPercentageChange =
      Math.abs(prevSpecNet) > 0 ? (wowNetDelta / Math.abs(prevSpecNet)) * 100 : 0;

    // ── Open Interest + 14-Day Velocity ────────────────────────────────────
    const oiWoWDelta = previous ? current.openInterest - previous.openInterest : 0;
    let oiVelocity14d = current.oiVelocity14d ?? 0;
    if (!current.oiVelocity14d && previous && previous.openInterest > 0) {
      oiVelocity14d = ((current.openInterest - previous.openInterest) / previous.openInterest) * 100;
    }

    // ── 52-Week Percentile ─────────────────────────────────────────────────
    const netHistory = history52w.map(h => h.nonCommercialLong - h.nonCommercialShort);
    netHistory.push(currentSpecNet);

    const min52w = Math.min(...netHistory);
    const max52w = Math.max(...netHistory);
    const range = max52w - min52w;

    let percentile52w = 50.0;
    if (range > 0) {
      percentile52w = ((currentSpecNet - min52w) / range) * 100;
    }
    percentile52w = Math.round(percentile52w * 10) / 10;

    // ── Orderflow Dynamic ─────────────────────────────────────────────────
    let orderflowSignal: 'ACCUMULATION' | 'DISTRIBUTION' | 'SHORT_COVERING' | 'LONG_LIQUIDATION' = 'ACCUMULATION';
    if (previous) {
      const addedLongs = current.nonCommercialLong - previous.nonCommercialLong;
      const coveredShorts = previous.nonCommercialShort - current.nonCommercialShort;

      if (addedLongs > 0 && coveredShorts <= 0) orderflowSignal = 'ACCUMULATION';
      else if (coveredShorts > 0 && addedLongs <= 0) orderflowSignal = 'SHORT_COVERING';
      else if (addedLongs < 0 && coveredShorts < 0) orderflowSignal = 'DISTRIBUTION';
      else orderflowSignal = 'LONG_LIQUIDATION';
    }

    // ── Verdict + Alerts ──────────────────────────────────────────────────
    let verdict: CotBiasVerdict = 'BULLISH_BIAS';
    let isExtremeAlert = false;
    let alertType: 'OVERCROWDED_LONG' | 'OVERCROWDED_SHORT' | undefined;
    let opinionSummary = '';

    const formattedDelta = `${wowNetDelta >= 0 ? '+' : ''}${wowNetDelta.toLocaleString()} contracts`;
    const sym = meta.symbol;

    if (percentile52w >= 90.0) {
      verdict = 'OVERCROWDED_LONG_REVERSAL_RISK';
      isExtremeAlert = true;
      alertType = 'OVERCROWDED_LONG';
      opinionSummary = `OVERCROWDED LONG ALERT: Managed Money speculative positioning has reached the ${percentile52w}th 52-week percentile (${currentSpecNet.toLocaleString()} net longs). Structural positioning is historically frothy; asymmetric downside reversal risk flagged for ${sym}. OI Velocity 14d: ${oiVelocity14d.toFixed(2)}%.`;
    } else if (percentile52w <= 10.0) {
      verdict = 'OVERCROWDED_SHORT_SQUEEZE_RISK';
      isExtremeAlert = true;
      alertType = 'OVERCROWDED_SHORT';
      opinionSummary = `SHORT SQUEEZE WARNING: Speculator positioning compressed to the ${percentile52w}th percentile (${currentSpecNet.toLocaleString()} net contracts). Commercial hedgers absorbing supply. High probability of violent upside mean-reversion for ${sym}. OI Velocity 14d: ${oiVelocity14d.toFixed(2)}%.`;
    } else if (wowNetDelta > 10000) {
      verdict = 'STRONG_BULLISH_BIAS';
      opinionSummary = `STRONG BULLISH BIAS: Managed Money aggressively expanded net longs by ${formattedDelta} (${wowPercentageChange > 0 ? '+' : ''}${wowPercentageChange.toFixed(1)}% WoW). 52-week percentile at ${percentile52w}% — institutional runway remains. Upside favored for ${sym}.`;
    } else if (wowNetDelta > 2000) {
      verdict = 'BULLISH_BIAS';
      opinionSummary = `BULLISH BIAS: Speculators added ${formattedDelta}. Positioning constructive at ${percentile52w}th percentile. Commercial hedging steady. Trend continuation expected for ${sym}.`;
    } else if (wowNetDelta < -10000) {
      verdict = 'STRONG_BEARISH_BIAS';
      opinionSummary = `STRONG BEARISH BIAS: Institutional money liquidated ${formattedDelta} (${wowPercentageChange.toFixed(1)}% WoW). Positioning deteriorated to ${percentile52w}th percentile. Open interest contracted. Structural headwinds dominant for ${sym}.`;
    } else if (wowNetDelta < -2000) {
      verdict = 'BEARISH_BIAS';
      opinionSummary = `BEARISH BIAS: Managed Money trimmed net positioning by ${formattedDelta}. 52-week percentile softened to ${percentile52w}%. Caution warranted on long exposure for ${sym}.`;
    } else {
      verdict = 'NEUTRAL_ACCUMULATION';
      opinionSummary = `NEUTRAL POSITIONING: Negligible net delta of ${formattedDelta} WoW. Speculators maintain a neutral stance at the ${percentile52w}th percentile. Range-bound price action favored for ${sym}.`;
    }

    // ── Contrarian Sentinel ────────────────────────────────────────────────
    let contrarianAlert: ContrarianAlert = null;
    let contrarianDescription = '';
    const retailLong = retailSentiment?.longPercent;
    const retailShort = retailSentiment?.shortPercent;

    if (retailLong !== undefined && retailShort !== undefined) {
      const mmAddedNetShorts = wowNetDelta < -2000; // MM expanding shorts this week
      const mmAddedNetLongs = wowNetDelta > 2000;

      if (retailLong > 75 && mmAddedNetShorts) {
        contrarianAlert = 'INSTITUTIONAL_DISTRIBUTION_RETAIL_TRAP';
        contrarianDescription = `⚠ INSTITUTIONAL DISTRIBUTION / RETAIL TRAP: Retail at ${retailLong.toFixed(1)}% Long while Managed Money added Net Shorts (${formattedDelta} WoW). Classic divergence — institutional distribution into retail strength. Caution on long exposure.`;
      } else if (retailShort > 75 && mmAddedNetLongs) {
        contrarianAlert = 'INSTITUTIONAL_ACCUMULATION_RETAIL_SHORT_SQUEEZE';
        contrarianDescription = `⚡ INSTITUTIONAL ACCUMULATION / RETAIL SHORT TRAP: Retail at ${retailShort.toFixed(1)}% Short while Managed Money added Net Longs (${formattedDelta} WoW). Potential violent short squeeze — institutions absorbing retail supply.`;
      } else {
        contrarianDescription = `Retail Bias: ${retailLong.toFixed(1)}% Long / ${retailShort.toFixed(1)}% Short. No extreme divergence detected vs institutional positioning.`;
      }
    } else {
      contrarianDescription = 'Retail sentiment data pending — contrarian analysis unavailable.';
    }

    return {
      assetCode: current.assetCode,
      assetName: current.assetName,
      symbol: meta.symbol,
      tradingViewSymbol: meta.tradingViewSymbol,
      reportDate: current.reportDate,
      openInterest: current.openInterest,
      openInterestWoWDelta: oiWoWDelta,
      oiVelocity14d: Math.round(oiVelocity14d * 100) / 100,
      speculatorLongs: current.nonCommercialLong,
      speculatorShorts: current.nonCommercialShort,
      speculatorNet: currentSpecNet,
      wowNetDelta,
      wowPercentageChange: Math.round(wowPercentageChange * 10) / 10,
      commercialLongs: current.commercialLong,
      commercialShorts: current.commercialShort,
      commercialNet,
      commercialWoWDelta,
      percentile52w,
      min52wNet: min52w,
      max52wNet: max52w,
      verdict,
      isExtremeAlert,
      alertType,
      opinionSummary,
      orderflowSignal,
      contrarianAlert,
      contrarianDescription,
      retailLongPercent: retailLong,
      retailShortPercent: retailShort,
      dataSource: 'LIVE_CFTC',
      lastUpdatedUtc: new Date().toISOString()
    };
  }

  /**
   * Returns an AWAITING_INGESTION placeholder — used when no DB records exist yet
   */
  public static awaitingIngestion(assetCode: string, assetName: CotAssetName): CotAnalysisResult {
    const meta = ASSET_META[assetCode] || { symbol: assetName, tradingViewSymbol: 'TVC:DXY' };
    return {
      assetCode,
      assetName,
      symbol: meta.symbol,
      tradingViewSymbol: meta.tradingViewSymbol,
      reportDate: '',
      openInterest: 0,
      openInterestWoWDelta: 0,
      oiVelocity14d: 0,
      speculatorLongs: 0,
      speculatorShorts: 0,
      speculatorNet: 0,
      wowNetDelta: 0,
      wowPercentageChange: 0,
      commercialLongs: 0,
      commercialShorts: 0,
      commercialNet: 0,
      commercialWoWDelta: 0,
      percentile52w: 0,
      min52wNet: 0,
      max52wNet: 0,
      verdict: 'NEUTRAL_ACCUMULATION',
      isExtremeAlert: false,
      opinionSummary: `AWAITING CFTC INGESTION: ${meta.symbol} COT data has not yet been scraped. Scraper scheduled to run Friday post-CFTC release (16:00 EST). Connect to database and ensure scraper workers are running.`,
      orderflowSignal: 'ACCUMULATION',
      contrarianAlert: null,
      contrarianDescription: 'Retail sentiment pending ingestion.',
      dataSource: 'AWAITING_INGESTION',
      lastUpdatedUtc: new Date().toISOString()
    };
  }
}
