'use client';

import React, { useState } from 'react';
import { Landmark, TrendingUp, TrendingDown, Layers, DollarSign, Activity, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';

interface CentralBankLiquidity {
  name: string;
  code: string;
  currency: string;
  totalAssetsUSD: number; // in Billions
  momChangePct: number;
  yoyChangePct: number;
  policyStance: 'QT' | 'QE' | 'NEUTRAL';
  lastUpdated: string;
}

const G4_CENTRAL_BANKS: CentralBankLiquidity[] = [
  { name: 'US Federal Reserve', code: 'FED', currency: 'USD', totalAssetsUSD: 7120, momChangePct: -0.42, yoyChangePct: -11.2, policyStance: 'QT', lastUpdated: '2026-09-18' },
  { name: 'European Central Bank', code: 'ECB', currency: 'EUR', totalAssetsUSD: 6840, momChangePct: -0.65, yoyChangePct: -14.8, policyStance: 'QT', lastUpdated: '2026-09-15' },
  { name: 'Bank of Japan', code: 'BOJ', currency: 'JPY', totalAssetsUSD: 5210, momChangePct: +0.18, yoyChangePct: -2.4, policyStance: 'NEUTRAL', lastUpdated: '2026-09-20' },
  { name: 'People\'s Bank of China', code: 'PBOC', currency: 'CNY', totalAssetsUSD: 6150, momChangePct: +1.24, yoyChangePct: +5.8, policyStance: 'QE', lastUpdated: '2026-09-22' }
];

export function GlobalLiquidityTab() {
  // Live US Net Liquidity metrics (Billions USD)
  const [fedAssets] = useState(7120.4);
  const [tgaBalance] = useState(765.2);
  const [reverseRepo] = useState(285.6);

  // Formula: Net Liquidity = Fed Assets - TGA - RRP
  const netFedLiquidity = Number((fedAssets - tgaBalance - reverseRepo).toFixed(1));
  const priorNetLiquidity = 6010.5;
  const netLiquidityDelta = Number((netFedLiquidity - priorNetLiquidity).toFixed(1));
  const isLiquidityExpanding = netLiquidityDelta > 0;

  const totalG4LiquidityUSD = G4_CENTRAL_BANKS.reduce((acc, cb) => acc + cb.totalAssetsUSD, 0);

  return (
    <div className="space-y-3 font-mono text-xs select-none animate-in fade-in duration-150">
      
      {/* ── TOP KPI BANNER: NET FED LIQUIDITY FORMULA ────────────────────────── */}
      <div className="bg-vanta-950 border border-vanta-border p-4 rounded-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-vanta-border pb-3 mb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-vanta-green/10 border border-vanta-green/30 rounded">
              <Landmark className="w-5 h-5 text-vanta-green" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-white tracking-widest uppercase">
                  US NET FED LIQUIDITY MONITOR
                </h2>
                <span className="text-[10px] bg-vanta-green/20 text-vanta-green px-1.5 py-0.5 rounded font-bold">
                  MACRO REGIME ENGINE
                </span>
              </div>
              <p className="text-[10px] text-neutral-400">
                Formula: Net Liquidity = Fed Total Assets (WALCL) − Treasury General Account (TGA) − Overnight Reverse Repo (ON RRP)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <span className="text-[10px] text-neutral-500 block uppercase">30-Day Liquidity Trend:</span>
              <div className={`flex items-center space-x-1 font-bold ${isLiquidityExpanding ? 'text-vanta-green' : 'text-vanta-red'}`}>
                {isLiquidityExpanding ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span className="text-sm">{isLiquidityExpanding ? '+' : ''}${netLiquidityDelta}B ({isLiquidityExpanding ? 'EXPANDING' : 'CONTRACTING'})</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Pillars of the Equation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Fed Assets */}
          <div className="bg-black/60 border border-vanta-border/80 p-3 rounded">
            <div className="flex items-center justify-between text-neutral-400 text-[10px] mb-1">
              <span>FED TOTAL ASSETS (WALCL)</span>
              <span className="text-neutral-500">Weekly H.4.1</span>
            </div>
            <div className="text-lg font-extrabold text-white">
              ${fedAssets.toLocaleString()}B
            </div>
            <div className="flex items-center space-x-1 text-[10px] text-neutral-500 mt-1">
              <span>QT Pace: -$60B/mo (Treasuries + MBS)</span>
            </div>
          </div>

          {/* Card 2: TGA */}
          <div className="bg-black/60 border border-vanta-border/80 p-3 rounded">
            <div className="flex items-center justify-between text-neutral-400 text-[10px] mb-1">
              <span>TREASURY GENERAL ACCT (TGA)</span>
              <span className="text-vanta-red font-bold">(-) LIQUIDITY DRAIN</span>
            </div>
            <div className="text-lg font-extrabold text-vanta-red">
              ${tgaBalance.toLocaleString()}B
            </div>
            <div className="flex items-center space-x-1 text-[10px] text-neutral-500 mt-1">
              <span>US Treasury Cash Buffer @ NY Fed</span>
            </div>
          </div>

          {/* Card 3: ON RRP */}
          <div className="bg-black/60 border border-vanta-border/80 p-3 rounded">
            <div className="flex items-center justify-between text-neutral-400 text-[10px] mb-1">
              <span>OVERNIGHT REVERSE REPO (ON RRP)</span>
              <span className="text-vanta-cyan font-bold">SHOCK ABSORBER</span>
            </div>
            <div className="text-lg font-extrabold text-neutral-200">
              ${reverseRepo.toLocaleString()}B
            </div>
            <div className="flex items-center space-x-1 text-[10px] text-neutral-500 mt-1">
              <span>Money Market Fund Liquidity Buffer</span>
            </div>
          </div>

          {/* Card 4: NET LIQUIDITY RESULT */}
          <div className="bg-vanta-green/5 border border-vanta-green/40 p-3 rounded shadow-[0_0_12px_rgba(0,255,102,0.1)]">
            <div className="flex items-center justify-between text-vanta-green text-[10px] font-bold mb-1">
              <span>NET FED LIQUIDITY</span>
              <span>TAILWIND SCORE: 68/100</span>
            </div>
            <div className="text-xl font-extrabold text-vanta-green">
              ${netFedLiquidity.toLocaleString()}B
            </div>
            <div className="flex items-center space-x-1 text-[10px] text-neutral-300 mt-1">
              <span>Bullish regime for Gold ($XAUUSD) &amp; SPX</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── MIDDLE GRID: G4 CENTRAL BANK AGGREGATE & REFUNDING SCHEDULE ──────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        
        {/* Left Column: G4 Balance Sheet Aggregate (7 Cols) */}
        <div className="lg:col-span-7 bg-vanta-950 border border-vanta-border rounded-lg p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-vanta-border">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-vanta-cyan" />
                <h3 className="text-xs font-bold text-white tracking-widest uppercase">
                  G4 CENTRAL BANK AGGREGATE BALANCE SHEETS
                </h3>
              </div>
              <span className="text-[10px] text-neutral-400 font-bold">
                AGGREGATE: <span className="text-white">${(totalG4LiquidityUSD / 1000).toFixed(2)} TRILLION USD</span>
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-vanta-border/60 text-[10px] text-neutral-500 uppercase">
                    <th className="py-2 px-2.5">Central Bank</th>
                    <th className="py-2 px-2.5">Total Assets (USD)</th>
                    <th className="py-2 px-2.5 text-right">MoM %</th>
                    <th className="py-2 px-2.5 text-right">YoY %</th>
                    <th className="py-2 px-2.5 text-center">Policy Stance</th>
                    <th className="py-2 px-2.5 text-right">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900">
                  {G4_CENTRAL_BANKS.map((cb) => (
                    <tr key={cb.code} className="hover:bg-neutral-900/40">
                      <td className="py-2.5 px-2.5 font-bold text-neutral-200">
                        {cb.name} <span className="text-[10px] text-neutral-500">({cb.code})</span>
                      </td>
                      <td className="py-2.5 px-2.5 font-mono text-white">
                        ${cb.totalAssetsUSD.toLocaleString()}B
                      </td>
                      <td className={`py-2.5 px-2.5 text-right font-mono font-bold ${
                        cb.momChangePct > 0 ? 'text-vanta-green' : 'text-vanta-red'
                      }`}>
                        {cb.momChangePct > 0 ? '+' : ''}{cb.momChangePct}%
                      </td>
                      <td className={`py-2.5 px-2.5 text-right font-mono ${
                        cb.yoyChangePct > 0 ? 'text-vanta-green' : 'text-vanta-red'
                      }`}>
                        {cb.yoyChangePct > 0 ? '+' : ''}{cb.yoyChangePct}%
                      </td>
                      <td className="py-2.5 px-2.5 text-center">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          cb.policyStance === 'QE' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                          cb.policyStance === 'QT' ? 'bg-red-950 text-red-400 border border-red-800' :
                          'bg-neutral-800 text-neutral-400'
                        }`}>
                          {cb.policyStance}
                        </span>
                      </td>
                      <td className="py-2.5 px-2.5 text-right text-[10px] text-neutral-500 font-mono">
                        {cb.lastUpdated}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 p-2.5 bg-vanta-900 border border-vanta-border/60 rounded text-[10px] text-neutral-400">
            <span className="text-vanta-cyan font-bold block mb-0.5">INSTITUTIONAL MACRO TAKEAWAY:</span>
            Global central banks remain in a net Quantitative Tightening (QT) cycle driven by the Federal Reserve and ECB balance sheet run-offs. However, the PBOC's aggressive reserve requirement ratio (RRR) cuts and stimulus measures are beginning to offset Western contraction, injecting baseline support into Copper and Commodities.
          </div>
        </div>

        {/* Right Column: Treasury Quarterly Refunding (QRA) Breakdown (5 Cols) */}
        <div className="lg:col-span-5 bg-vanta-950 border border-vanta-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-vanta-border">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-vanta-yellow" />
              <h3 className="text-xs font-bold text-white tracking-widest uppercase">
                US TREASURY DEBT ISSUANCE (QRA)
              </h3>
            </div>
            <span className="text-[10px] bg-vanta-yellow/20 text-vanta-yellow px-1.5 py-0.5 rounded font-bold">
              DURATION MIX
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-neutral-400">Short-Term T-Bills (&lt; 1 Year):</span>
                <span className="text-white font-bold font-mono">68% ($840B)</span>
              </div>
              <div className="w-full bg-neutral-900 h-2.5 rounded overflow-hidden">
                <div className="bg-vanta-cyan h-full rounded" style={{ width: '68%' }} />
              </div>
              <span className="text-[10px] text-neutral-500 mt-0.5 block">Absorbed primarily by Money Market Funds via Reverse Repo drain (Low yield impact)</span>
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-neutral-400">Coupons / Long Bonds (&gt; 2 Years):</span>
                <span className="text-white font-bold font-mono">32% ($395B)</span>
              </div>
              <div className="w-full bg-neutral-900 h-2.5 rounded overflow-hidden">
                <div className="bg-vanta-yellow h-full rounded" style={{ width: '32%' }} />
              </div>
              <span className="text-[10px] text-neutral-500 mt-0.5 block">Heavy supply here spikes the 10Y/30Y yield and steepens the yield curve</span>
            </div>

            <div className="p-3 bg-black/60 border border-neutral-800 rounded space-y-2 mt-4">
              <span className="text-xs font-bold text-white block">Next Refunding Announcement:</span>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-neutral-400">Target Release Date:</span>
                <span className="text-vanta-green font-bold font-mono">November 01, 2026 (08:30 ET)</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-neutral-400">Expected Borrowing Need:</span>
                <span className="text-white font-mono">$1,235 Billion</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-neutral-400">Duration Sensitivity:</span>
                <span className="text-vanta-red font-bold">HIGH (Yield Volatility Risk)</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
