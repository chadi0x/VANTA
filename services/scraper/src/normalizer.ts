export type ImpactLevel = 'High' | 'Medium' | 'Low' | 'None';

export interface NormalizedMacroEvent {
  id: string;
  timestamp: string; // ISO 8601
  asset: string;     // Currency code: USD, EUR, GBP, JPY, CAD, AUD, etc.
  impact_level: ImpactLevel;
  actual_metric: string | null;
  forecast: string | null;
  previous: string | null;
  headline: string;
  source: string;
  deviation_type?: 'BEAT' | 'MISS' | 'NEUTRAL' | 'PENDING';
  deviation_score?: number;
}

export function cleanText(text: string | null | undefined): string {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').trim();
}

export function normalizeCurrency(curr: string | null | undefined): string {
  if (!curr) return 'GLOBAL';
  const c = cleanText(curr).toUpperCase();
  const known = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'NZD', 'CHF', 'CNY', 'XAU', 'BTC', 'OIL'];
  for (const k of known) {
    if (c.includes(k)) return k;
  }
  return c.slice(0, 5);
}

export function normalizeImpact(val: string | null | undefined): ImpactLevel {
  if (!val) return 'Low';
  const v = val.toLowerCase();
  if (v.includes('high') || v.includes('red') || v.includes('3') || v.includes('three')) return 'High';
  if (v.includes('med') || v.includes('orange') || v.includes('2') || v.includes('two')) return 'Medium';
  if (v.includes('low') || v.includes('yellow') || v.includes('1') || v.includes('one')) return 'Low';
  return 'None';
}

export function generateEventId(source: string, asset: string, headline: string, dateStr: string): string {
  const sanitizedHeadline = headline.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
  const sanitizedDate = new Date(dateStr).toISOString().slice(0, 10);
  return `${source}_${asset}_${sanitizedHeadline}_${sanitizedDate}`;
}
