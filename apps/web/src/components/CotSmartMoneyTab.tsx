'use client';

import React, { useEffect, useState, useRef } from 'react';
import { fetchCotLatest, fetchCotHistory, fetchRetailSentiment } from '../lib/api';
import { CotAnalysisResult, CotLatestData, CotAssetName } from '../lib/types';
import { TradingViewChart } from './TradingViewChart';

interface CotSmartMoneyTabProps {
  onSelectTicker: (ticker: string) => void;
}

const ASSET_TABS: { key: CotAssetName; code: string; label: string; symbol: string }[] = [
  { key: 'GOLD',      code: '088691', label: 'GOLD',      symbol: 'XAU/USD' },
  { key: 'SILVER',    code: '084691', label: 'SILVER',    symbol: 'XAG/USD' },
  { key: 'CRUDE_OIL', code: '067651', label: 'CRUDE OIL', symbol: 'WTI/USD' },
  { key: 'DXY',       code: '098662', label: 'DXY',       symbol: 'USD IDX' }
];

const VERDICT_STYLE: Record<string, string> = {
  STRONG_BULLISH_BIAS:              'text-emerald-400',
  BULLISH_BIAS:                     'text-green-400',
  NEUTRAL_ACCUMULATION:             'text-neutral-400',
  BEARISH_BIAS:                     'text-orange-400',
  STRONG_BEARISH_BIAS:              'text-red-500',
  OVERCROWDED_LONG_REVERSAL_RISK:   'text-amber-400',
  OVERCROWDED_SHORT_SQUEEZE_RISK:   'text-cyan-400'
};

const ORDERFLOW_COLOR: Record<string, string> = {
  ACCUMULATION:    'text-emerald-400',
  SHORT_COVERING:  'text-cyan-400',
  DISTRIBUTION:    'text-red-400',
  LONG_LIQUIDATION:'text-orange-400'
};

function fmt(n: number, suffix = '') {
  if (!n && n !== 0) return '—';
  const abs = Math.abs(n);
  if (abs >= 1000) return `${(n / 1000).toFixed(1)}K${suffix}`;
  return `${n.toLocaleString()}${suffix}`;
}

function sign(n: number) { return n >= 0 ? '+' : ''; }

function PercentileBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  let barColor = 'bg-vanta-green';
  if (pct >= 90) barColor = 'bg-amber-400';
  else if (pct <= 10) barColor = 'bg-cyan-400';
  else if (pct >= 70) barColor = 'bg-emerald-400';
  else if (pct <= 30) barColor = 'bg-orange-400';

  return (
    <div className="flex items-center space-x-2 w-full">
      <div className="flex-1 h-[3px] bg-vanta-border relative overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-[11px] font-bold tabular-nums w-10 text-right ${pct >= 90 ? 'text-amber-400' : pct <= 10 ? 'text-cyan-400' : 'text-vanta-green'}`}>
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

function AwaitingCard({ assetName }: { assetName: string }) {
  return (
    <div className="border border-vanta-border p-4 space-y-2">
      <div className="text-[11px] text-neutral-500 font-bold tracking-widest">{assetName}</div>
      <div className="text-vanta-green text-[11px] animate-pulse">
        ◈ AWAITING CFTC INGESTION — SOURCE SYNC PENDING
      </div>
      <div className="text-[10px] text-neutral-600">
        CFTC Disaggregated reports released Friday 15:30 ET.<br/>
        Ensure scraper workers are connected and DB is online.
      </div>
      <div className="mt-2 text-[10px] text-neutral-700 border-t border-vanta-border pt-2">
        Connect: docker compose up -d &amp;&amp; npm run dev (services/scraper)
      </div>
    </div>
  );
}

export function CotSmartMoneyTab({ onSelectTicker }: CotSmartMoneyTabProps) {
  const [cotData, setCotData] = useState<CotLatestData | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<CotAssetName>('GOLD');
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const intervalRef = useRef<NodeJS.Timeout>();

  async function load() {
    try {
      const [cot, hist] = await Promise.all([
        fetchCotLatest(),
        fetchCotHistory(ASSET_TABS.find(a => a.key === selectedAsset)?.code || '088691', 8)
      ]);
      setCotData(cot);
      setHistory(hist.records || []);
      setLastUpdate(new Date().toISOString());
    } catch (e) {
      console.error('[COT Tab] Fetch error', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, 30000); // Refresh every 30s
    return () => clearInterval(intervalRef.current);
  }, [selectedAsset]);

  const report = cotData?.reports?.[selectedAsset] as CotAnalysisResult | undefined;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-2 min-h-[680px]">

      {/* Left: Asset Selector + Cards */}
      <div className="xl:col-span-4 flex flex-col space-y-2">

        {/* Asset Tab Selector */}
        <div className="flex border border-vanta-border">
          {ASSET_TABS.map(a => (
            <button
              key={a.key}
              onClick={() => { setSelectedAsset(a.key); onSelectTicker(cotData?.reports?.[a.key]?.tradingViewSymbol || 'OANDA:XAUUSD'); }}
              className={[
                'flex-1 py-1.5 text-[10px] font-bold tracking-widest uppercase border-r border-vanta-border last:border-r-0',
                selectedAsset === a.key
                  ? 'bg-vanta-green text-black'
                  : 'text-neutral-500 hover:text-white bg-black'
              ].join(' ')}
            >
              {a.label}
            </button>
          ))}
        </div>

        {/* Main COT Card */}
        {!report || report.dataSource === 'AWAITING_INGESTION' ? (
          <AwaitingCard assetName={selectedAsset.replace('_', ' ')} />
        ) : (
          <div className="border border-vanta-border p-3 space-y-3 text-[11px]">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-vanta-border pb-2">
              <div>
                <div className="text-[13px] font-bold text-white tracking-widest">{report.symbol}</div>
                <div className="text-neutral-500 text-[10px]">CODE: {report.assetCode} | REPORT: {report.reportDate || '—'}</div>
              </div>
              <div className={`text-[10px] font-bold px-2 py-0.5 border ${report.dataSource === 'LIVE_CFTC' ? 'border-vanta-green text-vanta-green' : 'border-amber-700 text-amber-500'}`}>
                {report.dataSource}
              </div>
            </div>

            {/* Verdict */}
            <div className="space-y-1">
              <div className="text-neutral-500 text-[9px] tracking-widest uppercase">ALGORITHMIC VERDICT</div>
              <div className={`font-bold text-[12px] tracking-wide ${VERDICT_STYLE[report.verdict] || 'text-white'}`}>
                {report.verdict.replace(/_/g, ' ')}
              </div>
              {report.isExtremeAlert && (
                <div className="text-amber-400 text-[10px] font-bold animate-pulse">
                  ⚡ EXTREME POSITIONING ALERT
                </div>
              )}
            </div>

            {/* 52-Week Percentile */}
            <div className="space-y-1">
              <div className="text-neutral-500 text-[9px] tracking-widest uppercase">52-WEEK PERCENTILE</div>
              <PercentileBar value={report.percentile52w} />
              <div className="flex justify-between text-[10px] text-neutral-600 tabular-nums">
                <span>MIN: {fmt(report.min52wNet)}</span>
                <span>MAX: {fmt(report.max52wNet)}</span>
              </div>
            </div>

            {/* Position Grid */}
            <div className="grid grid-cols-2 gap-2 border border-vanta-border/50 p-2">
              <div>
                <div className="text-neutral-500 text-[9px]">SPECULATOR NET</div>
                <div className="text-white font-bold tabular-nums">{fmt(report.speculatorNet)}</div>
                <div className={`text-[10px] tabular-nums ${report.wowNetDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {sign(report.wowNetDelta)}{fmt(report.wowNetDelta)} WoW
                </div>
              </div>
              <div>
                <div className="text-neutral-500 text-[9px]">COMMERCIAL NET</div>
                <div className="text-white font-bold tabular-nums">{fmt(report.commercialNet)}</div>
                <div className={`text-[10px] tabular-nums ${report.commercialWoWDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {sign(report.commercialWoWDelta)}{fmt(report.commercialWoWDelta)} WoW
                </div>
              </div>
              <div>
                <div className="text-neutral-500 text-[9px]">OPEN INTEREST</div>
                <div className="text-white font-bold tabular-nums">{fmt(report.openInterest)}</div>
                <div className={`text-[10px] tabular-nums ${report.openInterestWoWDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {sign(report.openInterestWoWDelta)}{fmt(report.openInterestWoWDelta)} WoW
                </div>
              </div>
              <div>
                <div className="text-neutral-500 text-[9px]">OI VELOCITY 14D</div>
                <div className={`font-bold tabular-nums ${report.oiVelocity14d >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {sign(report.oiVelocity14d)}{report.oiVelocity14d?.toFixed(2)}%
                </div>
              </div>
            </div>

            {/* Longs / Shorts detail */}
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="space-y-1">
                <div className="text-neutral-500 text-[9px]">MANAGED MONEY LONGS</div>
                <div className="text-emerald-400 font-bold tabular-nums">{fmt(report.speculatorLongs)}</div>
                <div className="text-neutral-500 text-[9px] mt-1">COMMERCIAL LONGS</div>
                <div className="text-emerald-400 tabular-nums">{fmt(report.commercialLongs)}</div>
              </div>
              <div className="space-y-1">
                <div className="text-neutral-500 text-[9px]">MANAGED MONEY SHORTS</div>
                <div className="text-red-400 font-bold tabular-nums">{fmt(report.speculatorShorts)}</div>
                <div className="text-neutral-500 text-[9px] mt-1">COMMERCIAL SHORTS</div>
                <div className="text-red-400 tabular-nums">{fmt(report.commercialShorts)}</div>
              </div>
            </div>

            {/* Orderflow Signal */}
            <div className="flex items-center justify-between border-t border-vanta-border pt-2">
              <div className="text-neutral-500 text-[9px] uppercase tracking-widest">ORDERFLOW SIGNAL</div>
              <div className={`font-bold text-[10px] ${ORDERFLOW_COLOR[report.orderflowSignal]}`}>
                {report.orderflowSignal.replace('_', ' ')}
              </div>
            </div>

            {/* Contrarian Sentinel */}
            {report.contrarianAlert && (
              <div className={`border p-2 text-[10px] ${
                report.contrarianAlert === 'INSTITUTIONAL_DISTRIBUTION_RETAIL_TRAP'
                  ? 'border-red-800 text-red-400 bg-red-950/20'
                  : 'border-cyan-800 text-cyan-400 bg-cyan-950/20'
              }`}>
                <div className="font-bold mb-1">⚡ CONTRARIAN SENTINEL TRIGGERED</div>
                <div className="text-[9px] leading-relaxed">{report.contrarianDescription}</div>
              </div>
            )}

            {!report.contrarianAlert && report.contrarianDescription && (
              <div className="text-[9px] text-neutral-600 border-t border-vanta-border pt-2">
                {report.contrarianDescription}
              </div>
            )}
          </div>
        )}

        {/* Last Update */}
        {lastUpdate && (
          <div className="text-[10px] text-neutral-700 text-right">
            LAST SYNC: {new Date(lastUpdate).toISOString().replace('T', ' ').slice(0, 19)} UTC
          </div>
        )}
      </div>

      {/* Center: Full 12-week Historical Table */}
      <div className="xl:col-span-5 flex flex-col space-y-2">
        <div className="border border-vanta-border text-[10px]">
          <div className="flex items-center justify-between px-3 py-2 border-b border-vanta-border bg-vanta-950">
            <span className="font-bold tracking-widest text-neutral-300 text-[11px]">
              {selectedAsset.replace('_', ' ')} — WEEKLY COT HISTORY (T vs T-1)
            </span>
            <span className="text-neutral-600">{history.length} WEEKS</span>
          </div>

          {history.length === 0 ? (
            <div className="p-6 text-center text-neutral-600">
              AWAITING INGESTION — No historical records in database yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse font-mono tabular-nums text-[10px]">
                <thead>
                  <tr className="text-neutral-500 border-b border-vanta-border">
                    <th className="px-2 py-1 text-left font-normal">DATE</th>
                    <th className="px-2 py-1 text-right font-normal">MM LONGS</th>
                    <th className="px-2 py-1 text-right font-normal">MM SHORTS</th>
                    <th className="px-2 py-1 text-right font-normal">NET</th>
                    <th className="px-2 py-1 text-right font-normal">COMM NET</th>
                    <th className="px-2 py-1 text-right font-normal">OPEN INT</th>
                    <th className="px-2 py-1 text-right font-normal">OI VEL</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((r: any, i: number) => {
                    const net = r.nonCommercialLong - r.nonCommercialShort;
                    const commNet = r.commercialLong - r.commercialShort;
                    const prevNet = history[i + 1]
                      ? history[i + 1].nonCommercialLong - history[i + 1].nonCommercialShort
                      : net;
                    const delta = net - prevNet;
                    return (
                      <tr key={r.id || r.reportDate} className="border-b border-vanta-border/50 hover:bg-neutral-900/30">
                        <td className="px-2 py-1 text-neutral-400">{r.reportDate}</td>
                        <td className="px-2 py-1 text-right text-emerald-400">{fmt(r.nonCommercialLong)}</td>
                        <td className="px-2 py-1 text-right text-red-400">{fmt(r.nonCommercialShort)}</td>
                        <td className={`px-2 py-1 text-right font-bold ${net >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {fmt(net)} <span className={`text-[9px] ${delta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>({sign(delta)}{fmt(delta)})</span>
                        </td>
                        <td className={`px-2 py-1 text-right ${commNet >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{fmt(commNet)}</td>
                        <td className="px-2 py-1 text-right text-neutral-400">{fmt(r.openInterest)}</td>
                        <td className={`px-2 py-1 text-right ${(r.oiVelocity14d ?? 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                          {sign(r.oiVelocity14d ?? 0)}{(r.oiVelocity14d ?? 0).toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Opinion Summary */}
        {report && report.dataSource !== 'AWAITING_INGESTION' && (
          <div className="border border-vanta-border p-3 text-[10px] leading-relaxed text-neutral-400">
            <div className="text-neutral-500 text-[9px] tracking-widest uppercase mb-1">QUANTITATIVE OPINION SUMMARY</div>
            {report.opinionSummary}
          </div>
        )}
      </div>

      {/* Right: Chart */}
      <div className="xl:col-span-3 min-h-[500px]">
        <TradingViewChart
          currentSymbol={report?.tradingViewSymbol || 'OANDA:XAUUSD'}
          onSymbolChange={onSelectTicker}
        />
      </div>
    </div>
  );
}
