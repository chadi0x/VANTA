// ─── Base Types ───────────────────────────────────────────────────────────────

export type ImpactLevel = 'Low' | 'Medium' | 'High' | 'Critical' | 'None';
export type DeviationType = 'BEAT' | 'MISS' | 'NEUTRAL' | 'PENDING';
export type SentimentPolarity =
  | 'EXTREMELY_BULLISH'
  | 'BULLISH'
  | 'NEUTRAL'
  | 'BEARISH'
  | 'EXTREMELY_BEARISH';

export type MarketSession =
  | 'London/NY Overlap'
  | 'New York'
  | 'London'
  | 'Tokyo/Asia'
  | 'Sydney/Pacific';

export type ImpactRating = 'Critical' | 'High' | 'Moderate' | 'Informational';

// ─── Economic Events ──────────────────────────────────────────────────────────

export interface EconomicEvent {
  id: string;
  timestamp: string;
  timestamp_utc?: string;
  date_formatted?: string;
  time_formatted?: string;
  market_session?: MarketSession;
  time_ago?: string;
  asset: string;
  impact_level: ImpactLevel;
  actual_metric: string | null;
  forecast: string | null;
  previous: string | null;
  headline: string;
  source: string;
  deviation_type: DeviationType;
  deviation_score: number;
  sentiment_score?: number;
  sentiment_polarity?: SentimentPolarity;
  target_ticker?: string;
  target_asset_name?: string;
}

// ─── News / Intelligence Feed ─────────────────────────────────────────────────

export interface NewsWireItem {
  id: string;
  timestamp: string;
  timestamp_utc?: string;
  date_formatted?: string;
  time_formatted?: string;
  market_session?: MarketSession;
  time_ago?: string;
  source: string;
  title: string;
  link: string;
  sentiment_score?: number;
  sentiment_polarity?: SentimentPolarity;
  target_ticker?: string;
  target_asset_name?: string;
  impact_rating?: ImpactRating;
  key_takeaways?: string[];
  affected_instruments?: string[];
}

// ─── COT Analytics (v3 — 4 assets) ───────────────────────────────────────────

export type CotAssetName = 'GOLD' | 'SILVER' | 'CRUDE_OIL' | 'DXY';

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
  openInterest: number;
  openInterestWoWDelta: number;
  oiVelocity14d: number;
  speculatorLongs: number;
  speculatorShorts: number;
  speculatorNet: number;
  wowNetDelta: number;
  wowPercentageChange: number;
  commercialLongs: number;
  commercialShorts: number;
  commercialNet: number;
  commercialWoWDelta: number;
  percentile52w: number;
  min52wNet: number;
  max52wNet: number;
  verdict: CotBiasVerdict;
  isExtremeAlert: boolean;
  alertType?: 'OVERCROWDED_LONG' | 'OVERCROWDED_SHORT';
  opinionSummary: string;
  orderflowSignal: 'ACCUMULATION' | 'DISTRIBUTION' | 'SHORT_COVERING' | 'LONG_LIQUIDATION';
  contrarianAlert: ContrarianAlert;
  contrarianDescription: string;
  retailLongPercent?: number;
  retailShortPercent?: number;
  dataSource: 'LIVE_CFTC' | 'AWAITING_INGESTION';
  lastUpdatedUtc: string;
}

export interface CotLatestData {
  timestamp: string;
  reports: {
    GOLD?: CotAnalysisResult;
    SILVER?: CotAnalysisResult;
    CRUDE_OIL?: CotAnalysisResult;
    DXY?: CotAnalysisResult;
  };
  diagnostics?: Record<string, string>;
  dataMode?: string;
}

// ─── Retail Sentiment ─────────────────────────────────────────────────────────

export interface RetailSentimentRecord {
  asset: string;
  source: string;
  longPercent: number;
  shortPercent: number;
  longPositions?: number | null;
  shortPositions?: number | null;
  capturedAt: string;
}

export interface RetailSentimentData {
  timestamp: string;
  data: Record<string, RetailSentimentRecord | null>;
}

// ─── System Health ────────────────────────────────────────────────────────────

export interface ScraperWorkerHealth {
  workerName: string;
  status: 'HEALTHY' | 'DEGRADED' | 'FAILED' | 'RATE_LIMITED' | 'NO_DATA';
  lastRunAt: string | null;
  recordsIngested: number;
  errorMessage?: string | null;
  latencyMs?: number;
}

export interface SystemHealthData {
  timestamp: string;
  database: string;
  activeSocketClients: number;
  scraperWorkers: ScraperWorkerHealth[];
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

export interface DeviationAlert {
  event: EconomicEvent;
  alertTime: string;
  severity: 'CRITICAL' | 'ELEVATED';
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface UserSession {
  id: number;
  username: string;
  email: string;
  role: string;
  token: string;
}
