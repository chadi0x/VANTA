'use client';

import React, { useState } from 'react';
import { Target, Activity, Zap, Compass, ArrowRight, BarChart2, ShieldAlert } from 'lucide-react';

interface PcaFactorLoading {
  asset: string;
  name: string;
  category: 'EQUITIES' | 'RATES' | 'METALS' | 'ENERGY' | 'FX';
  pc1Growth: number;    // Loading on Global Growth / Risk (-1.0 to +1.0)
  pc2Tightening: number; // Loading on Real Rates / Tightening (-1.0 to +1.0)
  pc3Supply: number;    // Loading on Commodity Supply Shock (-1.0 to +1.0)
  rSquared: number;
}

const FACTOR_LOADINGS: PcaFactorLoading[] = [
  { asset: 'SPX500', name: 'S&P 500 Index', category: 'EQUITIES', pc1Growth: +0.86, pc2Tightening: -0.42, pc3Supply: -0.15, rSquared: 0.88 },
  { asset: 'COPPER', name: 'LME Copper (Doctor Copper)', category: 'METALS', pc1Growth: +0.78, pc2Tightening: -0.22, pc3Supply: +0.34, rSquared: 0.82 },
  { asset: 'XAUUSD', name: 'Gold Spot', category: 'METALS', pc1Growth: +0.18, pc2Tightening: -0.84, pc3Supply: +0.62, rSquared: 0.91 },
  { asset: 'DXY', name: 'US Dollar Index', category: 'FX', pc1Growth: -0.68, pc2Tightening: +0.76, pc3Supply: +0.28, rSquared: 0.86 },
  { asset: 'US10Y', name: '10Y Treasury Yield', category: 'RATES', pc1Growth: +0.44, pc2Tightening: +0.88, pc3Supply: +0.40, rSquared: 0.89 },
  { asset: 'USOIL', name: 'WTI Crude Oil', category: 'ENERGY', pc1Growth: +0.52, pc2Tightening: +0.12, pc3Supply: +0.89, rSquared: 0.94 }
];

export function MacroPcaTab() {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'30D' | '90D' | '1Y'>('90D');

  return (
    <div className="space-y-3 font-mono text-xs select-none animate-in fade-in duration-150">
      
      {/* ── TOP HEADER BANNER ──────────────────────────────────────────────── */}
      <div className="bg-vanta-950 border border-vanta-border p-4 rounded-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-vanta-border pb-3 mb-3">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-vanta-cyan/10 border border-vanta-cyan/30 rounded">
              <Compass className="w-5 h-5 text-vanta-cyan" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-white tracking-widest uppercase">
                  QUANTITATIVE MACRO REGIME &amp; PCA VARIANCE DECOMPOSITION
                </h2>
                <span className="text-[10px] bg-vanta-cyan/20 text-vanta-cyan px-1.5 py-0.5 rounded font-bold">
                  FACTOR EIGEN-MODEL
                </span>
              </div>
              <p className="text-[10px] text-neutral-400">
                Principal Component Analysis (PCA) decomposes 92% of global market variance into 3 fundamental drivers
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            {['30D', '90D', '1Y'].map((tf) => (
              <button
                key={tf}
                onClick={() => setSelectedTimeframe(tf as any)}
                className={`px-3 py-1 rounded font-bold transition-colors ${
                  selectedTimeframe === tf
                    ? 'bg-vanta-cyan/20 border border-vanta-cyan text-vanta-cyan'
                    : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* 3 Core Eigen-Factors */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-black/60 border border-vanta-border/80 p-3.5 rounded">
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="text-neutral-400">FACTOR 1: GLOBAL RISK &amp; GROWTH</span>
              <span className="text-vanta-green font-bold">52.4% OF VARIANCE</span>
            </div>
            <div className="text-lg font-extrabold text-white">
              EIGENVALUE: 6.28
            </div>
            <p className="text-[10px] text-neutral-500 mt-1">
              Drives Equities, Copper &amp; Emerging Markets. Currently: <strong className="text-vanta-green">+0.74 (Strong Growth Momentum)</strong>
            </p>
          </div>

          <div className="bg-black/60 border border-vanta-border/80 p-3.5 rounded">
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="text-neutral-400">FACTOR 2: MONETARY POLICY &amp; RATES</span>
              <span className="text-vanta-yellow font-bold">28.1% OF VARIANCE</span>
            </div>
            <div className="text-lg font-extrabold text-white">
              EIGENVALUE: 3.37
            </div>
            <p className="text-[10px] text-neutral-500 mt-1">
              Drives 10Y Yields, DXY &amp; Discount Rates. Currently: <strong className="text-vanta-yellow">-0.42 (Policy Easing Tailwinds)</strong>
            </p>
          </div>

          <div className="bg-black/60 border border-vanta-border/80 p-3.5 rounded">
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="text-neutral-400">FACTOR 3: COMMODITY SUPPLY SHOCK</span>
              <span className="text-vanta-red font-bold">11.8% OF VARIANCE</span>
            </div>
            <div className="text-lg font-extrabold text-white">
              EIGENVALUE: 1.41
            </div>
            <p className="text-[10px] text-neutral-500 mt-1">
              Drives Crude Oil, Energy &amp; Gold safe-haven bids. Currently: <strong className="text-vanta-red">+0.22 (Low Supply Friction)</strong>
            </p>
          </div>
        </div>
      </div>

      {/* ── BRIDGEWATER 4-QUADRANT MACRO REGIME MATRIX ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Quadrant Visualizer (5 Cols) */}
        <div className="lg:col-span-5 bg-vanta-950 border border-vanta-border rounded-lg p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-vanta-border">
              <div className="flex items-center space-x-2">
                <Target className="w-4 h-4 text-vanta-green" />
                <h3 className="text-xs font-bold text-white tracking-widest uppercase">
                  BRIDGEWATER 4-QUADRANT MATRIX
                </h3>
              </div>
              <span className="text-[10px] bg-vanta-green/20 text-vanta-green px-2 py-0.5 rounded font-bold">
                ACTIVE: GOLDILOCKS
              </span>
            </div>

            {/* 2x2 Quadrant Grid */}
            <div className="grid grid-cols-2 gap-2 h-64 p-2 bg-black border border-neutral-900 rounded relative">
              {/* Top-Left: Reflation */}
              <div className="p-3 border border-neutral-800 rounded bg-neutral-950/40 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-vanta-yellow font-bold block">QUADRANT II: REFLATION</span>
                  <span className="text-[9px] text-neutral-500">Growth ↑ | Inflation ↑</span>
                </div>
                <span className="text-[9px] text-neutral-400">Favors: Commodities, Value, EM</span>
              </div>

              {/* Top-Right: Goldilocks (ACTIVE) */}
              <div className="p-3 border-2 border-vanta-green rounded bg-vanta-green/10 flex flex-col justify-between shadow-[0_0_15px_rgba(0,255,102,0.15)] relative">
                <span className="absolute top-1 right-1 text-[8px] bg-vanta-green text-black font-extrabold px-1 rounded">
                  CURRENT REGIME
                </span>
                <div>
                  <span className="text-[10px] text-vanta-green font-extrabold block">QUADRANT I: GOLDILOCKS</span>
                  <span className="text-[9px] text-neutral-300">Growth ↑ | Inflation ↓</span>
                </div>
                <span className="text-[9px] text-neutral-300 font-bold">Favors: Tech, Gold, High Beta</span>
              </div>

              {/* Bottom-Left: Stagflation */}
              <div className="p-3 border border-neutral-800 rounded bg-neutral-950/40 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-vanta-red font-bold block">QUADRANT IV: STAGFLATION</span>
                  <span className="text-[9px] text-neutral-500">Growth ↓ | Inflation ↑</span>
                </div>
                <span className="text-[9px] text-neutral-400">Favors: Gold, Cash, Energy</span>
              </div>

              {/* Bottom-Right: Deflation */}
              <div className="p-3 border border-neutral-800 rounded bg-neutral-950/40 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-vanta-cyan font-bold block">QUADRANT III: DEFLATION</span>
                  <span className="text-[9px] text-neutral-500">Growth ↓ | Inflation ↓</span>
                </div>
                <span className="text-[9px] text-neutral-400">Favors: Long Treasuries, USD</span>
              </div>
            </div>
          </div>

          <div className="mt-3 p-2.5 bg-vanta-900 border border-vanta-border/60 rounded text-[10px] text-neutral-400">
            <span className="text-vanta-green font-bold block mb-0.5">CURRENT MACRO IMPLICATION:</span>
            Global markets are priced in the Goldilocks sweet spot: resilient US consumer spending with central banks providing liquidity insurance via rate cuts. Highly supportive for Gold and Equities.
          </div>
        </div>

        {/* Right Column: Factor Loading Matrix Table (7 Cols) */}
        <div className="lg:col-span-7 bg-vanta-950 border border-vanta-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-vanta-border">
            <div className="flex items-center space-x-2">
              <BarChart2 className="w-4 h-4 text-vanta-cyan" />
              <h3 className="text-xs font-bold text-white tracking-widest uppercase">
                ASSET FACTOR LOADING BETA (β) MATRIX
              </h3>
            </div>
            <span className="text-[10px] text-neutral-400">
              Positive (+1.0) = Strong Alignment | Negative (-1.0) = Inverse
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-vanta-border/60 text-[10px] text-neutral-500 uppercase">
                  <th className="py-2 px-3">Asset</th>
                  <th className="py-2 px-3 text-right">PC1 (Growth)</th>
                  <th className="py-2 px-3 text-right">PC2 (Rates)</th>
                  <th className="py-2 px-3 text-right">PC3 (Supply)</th>
                  <th className="py-2 px-3 text-right">Model R²</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900 font-mono">
                {FACTOR_LOADINGS.map((row) => (
                  <tr key={row.asset} className="hover:bg-neutral-900/50">
                    <td className="py-2.5 px-3 font-bold text-white">
                      {row.name} <span className="text-[10px] text-neutral-500">({row.asset})</span>
                    </td>
                    <td className={`py-2.5 px-3 text-right font-bold ${
                      row.pc1Growth > 0 ? 'text-vanta-green' : 'text-vanta-red'
                    }`}>
                      {row.pc1Growth > 0 ? '+' : ''}{row.pc1Growth.toFixed(2)}
                    </td>
                    <td className={`py-2.5 px-3 text-right font-bold ${
                      row.pc2Tightening > 0 ? 'text-vanta-yellow' : 'text-vanta-cyan'
                    }`}>
                      {row.pc2Tightening > 0 ? '+' : ''}{row.pc2Tightening.toFixed(2)}
                    </td>
                    <td className={`py-2.5 px-3 text-right font-bold ${
                      row.pc3Supply > 0 ? 'text-vanta-red' : 'text-neutral-400'
                    }`}>
                      {row.pc3Supply > 0 ? '+' : ''}{row.pc3Supply.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-neutral-300 font-bold">
                      {(row.rSquared * 100).toFixed(0)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}
