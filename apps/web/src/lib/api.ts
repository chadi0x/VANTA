import { EconomicEvent, NewsWireItem, CotLatestData, RetailSentimentData, SystemHealthData } from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Shared fetch with cookie credentials
function apiFetch(url: string, opts?: RequestInit) {
  return fetch(url, {
    ...opts,
    credentials: 'include',  // Send httpOnly JWT cookie
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(opts?.headers || {})
    }
  });
}

export async function fetchEvents(filters?: {
  impact?: string;
  asset?: string;
  deviation?: string;
}): Promise<EconomicEvent[]> {
  const params = new URLSearchParams();
  if (filters?.impact) params.append('impact', filters.impact);
  if (filters?.asset) params.append('asset', filters.asset);
  if (filters?.deviation) params.append('deviation', filters.deviation);

  const res = await apiFetch(`${API_BASE}/api/events?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch events');
  return res.json();
}

export async function fetchNews(): Promise<NewsWireItem[]> {
  const res = await apiFetch(`${API_BASE}/api/events/news`);
  if (!res.ok) throw new Error('Failed to fetch news');
  return res.json();
}

export async function fetchCotLatest(): Promise<CotLatestData> {
  const res = await apiFetch(`${API_BASE}/api/cot/latest`);
  if (!res.ok) throw new Error('Failed to fetch COT latest data');
  return res.json();
}

export async function fetchCotHistory(assetCode: string, limit = 12): Promise<any> {
  const res = await apiFetch(`${API_BASE}/api/cot/history/${assetCode}?limit=${limit}`);
  if (!res.ok) throw new Error(`Failed to fetch COT history for ${assetCode}`);
  return res.json();
}

export async function fetchRetailSentiment(): Promise<RetailSentimentData> {
  const res = await apiFetch(`${API_BASE}/api/retail-sentiment`);
  if (!res.ok) throw new Error('Failed to fetch retail sentiment');
  return res.json();
}

export async function fetchSystemHealth(): Promise<SystemHealthData> {
  const res = await apiFetch(`${API_BASE}/api/system/health`);
  if (!res.ok) throw new Error('Failed to fetch system health');
  return res.json();
}

export async function fetchStreamLogs(): Promise<any> {
  const res = await apiFetch(`${API_BASE}/api/system/stream-logs`);
  if (!res.ok) throw new Error('Failed to fetch stream logs');
  return res.json();
}

export async function triggerVolatilitySimulation(scenario?: string): Promise<any> {
  const res = await apiFetch(`${API_BASE}/api/events/simulate`, {
    method: 'POST',
    body: JSON.stringify({ scenario })
  });
  if (!res.ok) throw new Error('Failed to trigger volatility simulation');
  return res.json();
}

export async function triggerCotSimulation(scenario?: 'OVERCROWDED' | 'STANDARD'): Promise<any> {
  const res = await apiFetch(`${API_BASE}/api/events/simulate`, {
    method: 'POST',
    body: JSON.stringify({ scenario })
  });
  if (!res.ok) throw new Error('Failed to trigger COT simulation');
  return res.json();
}

export async function loginUser(credentials: { username: string; password: string }) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Authentication Failed');
  return data;
}

export async function logoutUser() {
  await fetch(`${API_BASE}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include'
  });
}
