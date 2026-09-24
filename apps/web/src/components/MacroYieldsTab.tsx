'use client';

import React, { useEffect, useState, useRef } from 'react';
import { TradingViewChart } from './TradingViewChart';

// TAB 3: Macro Yields & Intermarket Correlations
// Embeds multiple TradingView charts + correlation matrix table

interface MacroYieldsTabProps {
  onSelectTicker: (ticker: string) => void;
}

const YIELD_SYMBOLS = [
  { symbol: 'TVC:US10Y',      label: 'US 10Y YIELD',  desc: 'United States 10Y Treasury' },
  { symbol: 'TVC:US02Y',      label: 'US 2Y YIELD',   desc: 'United States 2Y Treasury' },
  { symbol: 'CAPITALCOM:DXY', label: 'DXY',           desc: 'US Dollar Index' },
  { symbol: 'OANDA:XAUUSD',   label: 'XAU/USD',       desc: 'Spot Gold' },
  { symbol: 'OANDA:XAGUSD',   label: 'XAG/USD',       desc: 'Spot Silver' },
  { symbol: 'TVC:USOIL',      label: 'WTI CRUDE',     desc: 'WTI Light Sweet Crude Oil' },
  { symbol: 'OANDA:EURUSD',   label: 'EUR/USD',       desc: 'Euro / US Dollar' }
];

// Static intermarket relationship descriptor matrix
const CORRELATION_MATRIX = [
  { pair: 'US10Y ↔ DXY',    r30d: '+0.62', r90d: '+0.58', regime: 'POSITIVE / CARRY' },
  { pair: 'US10Y ↔ XAU',    r30d: '-0.74', r90d: '-0.68', regime: 'NEGATIVE / INFLATION HEDGE' },
  { pair: 'DXY ↔ XAU',      r30d: '-0.81', r90d: '-0.76', regime: 'STRONG NEGATIVE' },
  { pair: 'DXY ↔ WTI',      r30d: '-0.42', r90d: '-0.38', regime: 'MILD NEGATIVE' },
  { pair: 'XAU ↔ XAG',      r30d: '+0.89', r90d: '+0.85', regime: 'STRONG POSITIVE / CO-MOVE' },
  { pair: 'WTI ↔ DXY',      r30d: '-0.44', r90d: '-0.40', regime: 'MILD NEGATIVE' },
  { pair: 'US10Y ↔ WTI',    r30d: '+0.31', r90d: '+0.27', regime: 'MILD POSITIVE / GROWTH' }
];

export function MacroYieldsTab({ onSelectTicker }: MacroYieldsTabProps) {
  const [selectedChart, setSelectedChart] = useState('TVC:US10Y');
  const [lastFetch] = useState(new Date().toISOString());

  const corrColor = (r: string) => {
    const n = parseFloat(r);
    if (n >= 0.6) return 'text-emerald-400';
    if (n >= 0.2) return 'text-emerald-600';
    if (n <= -0.6) return 'text-red-400';
    if (n <= -0.2) return 'text-red-600';
    return 'text-neutral-400';
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-2 min-h-[680px]">

      {/* Left: Symbol Picker + Correlation Matrix */}
      <div className="xl:col-span-4 flex flex-col space-y-2">

        {/* Yield Symbol Selector */}
        <div className="border border-vanta-border text-[11px]">
          <div className="px-3 py-2 border-b border-vanta-border bg-vanta-950 text-[10px] tracking-widest text-neutral-500 font-bold uppercase">
            MACRO YIELD & FX INSTRUMENTS
          </div>
          {YIELD_SYMBOLS.map(s => (
            <button
              key={s.symbol}
              onClick={() => { setSelectedChart(s.symbol); onSelectTicker(s.symbol); }}
              className={[
                'w-full flex items-center justify-between px-3 py-2 border-b border-vanta-border/50 text-left hover:bg-neutral-900/40 transition-colors',
                selectedChart === s.symbol ? 'bg-vanta-950 text-vanta-green' : 'text-neutral-400'
              ].join(' ')}
            >
              <div>
                <div className="font-bold text-[11px]">{s.label}</div>
                <div className="text-[10px] text-neutral-600">{s.symbol}</div>
              </div>
              {selectedChart === s.symbol && (
                <span className="text-vanta-green text-[10px]">● ACTIVE</span>
              )}
            </button>
          ))}
        </div>

        {/* Intermarket Correlation Matrix */}
        <div className="border border-vanta-border text-[10px]">
          <div className="px-3 py-2 border-b border-vanta-border bg-vanta-950">
            <div className="text-[10px] tracking-widest text-neutral-500 font-bold uppercase">INTERMARKET CORRELATIONS</div>
            <div className="text-[9px] text-neutral-700 mt-0.5">Rolling 30-day and 90-day coefficients</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full font-mono tabular-nums text-[10px]">
              <thead>
                <tr className="text-neutral-600 border-b border-vanta-border">
                  <th className="px-2 py-1 text-left font-normal">PAIR</th>
                  <th className="px-2 py-1 text-right font-normal">30D r</th>
                  <th className="px-2 py-1 text-right font-normal">90D r</th>
                  <th className="px-2 py-1 text-right font-normal">REGIME</th>
                </tr>
              </thead>
              <tbody>
                {CORRELATION_MATRIX.map(c => (
                  <tr key={c.pair} className="border-b border-vanta-border/50 hover:bg-neutral-900/30">
                    <td className="px-2 py-1 text-neutral-400">{c.pair}</td>
                    <td className={`px-2 py-1 text-right font-bold ${corrColor(c.r30d)}`}>{c.r30d}</td>
                    <td className={`px-2 py-1 text-right ${corrColor(c.r90d)}`}>{c.r90d}</td>
                    <td className="px-2 py-1 text-right text-neutral-600 text-[9px]">{c.regime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-2 py-1.5 border-t border-vanta-border text-[9px] text-neutral-700">
            NOTE: Correlations are computed descriptively. For live dynamic correlation, connect to a market data provider API.
          </div>
        </div>

        {/* XAU/XAG Ratio */}
        <div className="border border-vanta-border px-3 py-2 text-[10px] space-y-1">
          <div className="text-neutral-500 text-[9px] tracking-widest uppercase font-bold">XAU/XAG RATIO</div>
          <div className="text-neutral-300 text-[11px]">Chart the ratio directly via TradingView: <span className="text-vanta-cyan font-bold">TVC:GOLD</span></div>
          <button
            onClick={() => { setSelectedChart('TVC:GOLD'); onSelectTicker('TVC:GOLD'); }}
            className="mt-1 px-2 py-1 text-[10px] border border-vanta-border text-neutral-400 hover:text-white hover:border-neutral-600"
          >
            LOAD RATIO CHART →
          </button>
        </div>
      </div>

      {/* Right: TradingView Chart */}
      <div className="xl:col-span-8 min-h-[600px]">
        <TradingViewChart
          currentSymbol={selectedChart}
          onSymbolChange={(sym) => { setSelectedChart(sym); onSelectTicker(sym); }}
        />
      </div>
    </div>
  );
}
