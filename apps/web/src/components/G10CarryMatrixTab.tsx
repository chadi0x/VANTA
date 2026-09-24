'use client';

import React, { useState } from 'react';
import { DollarSign, Percent, TrendingUp, TrendingDown, AlertTriangle, ShieldCheck, ArrowRight, Gauge } from 'lucide-react';

interface G10CurrencyRate {
  code: string;
  name: string;
  centralBank: string;
  policyRatePct: number;
  cpiInflationPct: number;
  realYieldPct: number; // policyRate - cpiInflation
  flagUrl: string;
}

const G10_RATES: G10CurrencyRate[] = [
  { code: 'USD', name: 'US Dollar', centralBank: 'Federal Reserve', policyRatePct: 5.00, cpiInflationPct: 2.50, realYieldPct: +2.50, flagUrl: '🇺🇸' },
  { code: 'GBP', name: 'British Pound', centralBank: 'Bank of England', policyRatePct: 5.00, cpiInflationPct: 2.20, realYieldPct: +2.80, flagUrl: '🇬🇧' },
  { code: 'AUD', name: 'Australian Dollar', centralBank: 'RBA', policyRatePct: 4.35, cpiInflationPct: 3.80, realYieldPct: +0.55, flagUrl: '🇦🇺' },
  { code: 'NZD', name: 'New Zealand Dollar', centralBank: 'RBNZ', policyRatePct: 5.25, cpiInflationPct: 3.30, realYieldPct: +1.95, flagUrl: '🇳🇿' },
  { code: 'CAD', name: 'Canadian Dollar', centralBank: 'Bank of Canada', policyRatePct: 4.25, cpiInflationPct: 2.00, realYieldPct: +2.25, flagUrl: '🇨🇦' },
  { code: 'EUR', name: 'Euro', centralBank: 'ECB', policyRatePct: 3.65, cpiInflationPct: 2.20, realYieldPct: +1.45, flagUrl: '🇪🇺' },
  { code: 'CHF', name: 'Swiss Franc', centralBank: 'SNB', policyRatePct: 1.00, cpiInflationPct: 1.10, realYieldPct: -0.10, flagUrl: '🇨🇭' },
  { code: 'JPY', name: 'Japanese Yen', centralBank: 'Bank of Japan', policyRatePct: 0.25, cpiInflationPct: 2.80, realYieldPct: -2.55, flagUrl: '🇯🇵' }
];

interface CarryPair {
  pair: string;
  longCurrency: string;
  shortCurrency: string;
  rateSpreadPct: number;
  impliedVol30dPct: number;
  sharpeRatio: number;
  unwindRisk: 'LOW' | 'MODERATE' | 'HIGH';
}

const CARRY_PAIRS: CarryPair[] = [
  { pair: 'USD/JPY', longCurrency: 'USD (5.00%)', shortCurrency: 'JPY (0.25%)', rateSpreadPct: +4.75, impliedVol30dPct: 10.4, sharpeRatio: 0.46, unwindRisk: 'HIGH' },
  { pair: 'GBP/JPY', longCurrency: 'GBP (5.00%)', shortCurrency: 'JPY (0.25%)', rateSpreadPct: +4.75, impliedVol30dPct: 11.2, sharpeRatio: 0.42, unwindRisk: 'HIGH' },
  { pair: 'USD/CHF', longCurrency: 'USD (5.00%)', shortCurrency: 'CHF (1.00%)', rateSpreadPct: +4.00, impliedVol30dPct: 6.8, sharpeRatio: 0.59, unwindRisk: 'LOW' },
  { pair: 'EUR/CHF', longCurrency: 'EUR (3.65%)', shortCurrency: 'CHF (1.00%)', rateSpreadPct: +2.65, impliedVol30dPct: 5.2, sharpeRatio: 0.51, unwindRisk: 'LOW' },
  { pair: 'AUD/JPY', longCurrency: 'AUD (4.35%)', shortCurrency: 'JPY (0.25%)', rateSpreadPct: +4.10, impliedVol30dPct: 12.1, sharpeRatio: 0.34, unwindRisk: 'HIGH' }
];

export function G10CarryMatrixTab() {
  return (
    <div className="space-y-3 font-mono text-xs select-none animate-in fade-in duration-150">
      
      {/* ── TOP HEADER BANNER ──────────────────────────────────────────────── */}
      <div className="bg-vanta-950 border border-vanta-border p-4 rounded-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-vanta-border pb-3 mb-3">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded">
              <Percent className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-white tracking-widest uppercase">
                  G10 REAL YIELD &amp; CURRENCY CARRY TRADE MATRIX
                </h2>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">
                  RELATIVE VALUE ARBITRAGE
                </span>
              </div>
              <p className="text-[10px] text-neutral-400">
                Calculates real policy rates (Nominal − CPI) and Sharpe-adjusted FX carry yields
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded text-[10px]">
            <span className="w-2 h-2 rounded-full bg-vanta-yellow animate-pulse" />
            <span className="text-neutral-300">YEN CARRY UNWIND RISK: <strong className="text-vanta-yellow">ELEVATED</strong></span>
          </div>
        </div>

        {/* Narrative Box */}
        <div className="p-3 bg-emerald-950/20 border border-emerald-800/40 rounded text-[11px] text-neutral-300">
          <span className="text-emerald-400 font-bold block mb-0.5">FX MACRO REGIME DIRECTIVE:</span>
          The British Pound (+2.80%) and US Dollar (+2.50%) offer the highest real yields in the G10 space, making them dominant funding receivers. The Japanese Yen (-2.55% real yield) remains the global funding currency of choice, but carries asymmetric flush risk whenever BOJ hike expectations accelerate.
        </div>
      </div>

      {/* ── REAL YIELD RANKINGS & CARRY PAIRS GRID ────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        
        {/* Left: G10 Real Yield Table (6 Cols) */}
        <div className="lg:col-span-6 bg-vanta-950 border border-vanta-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-vanta-border">
            <h3 className="text-xs font-bold text-white tracking-widest uppercase">
              G10 REAL POLICY YIELD RANKINGS
            </h3>
            <span className="text-[10px] text-neutral-500">SORTED BY REAL RATE</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-vanta-border/60 text-[10px] text-neutral-500 uppercase">
                  <th className="py-2 px-2.5">Currency</th>
                  <th className="py-2 px-2.5 text-right">Policy Rate</th>
                  <th className="py-2 px-2.5 text-right">Core CPI</th>
                  <th className="py-2 px-2.5 text-right">Real Yield</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900 font-mono">
                {[...G10_RATES].sort((a, b) => b.realYieldPct - a.realYieldPct).map((curr, idx) => (
                  <tr key={curr.code} className="hover:bg-neutral-900/40">
                    <td className="py-2.5 px-2.5 font-bold text-white flex items-center space-x-2">
                      <span className="text-base">{curr.flagUrl}</span>
                      <span>{curr.code}</span>
                      <span className="text-[10px] text-neutral-500">({curr.name})</span>
                    </td>
                    <td className="py-2.5 px-2.5 text-right text-neutral-300">
                      {curr.policyRatePct.toFixed(2)}%
                    </td>
                    <td className="py-2.5 px-2.5 text-right text-neutral-400">
                      {curr.cpiInflationPct.toFixed(2)}%
                    </td>
                    <td className={`py-2.5 px-2.5 text-right font-bold text-xs ${
                      curr.realYieldPct > 0 ? 'text-vanta-green' : 'text-vanta-red'
                    }`}>
                      {curr.realYieldPct > 0 ? '+' : ''}{curr.realYieldPct.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Volatility-Adjusted Carry Trade Matrix (6 Cols) */}
        <div className="lg:col-span-6 bg-vanta-950 border border-vanta-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-vanta-border">
            <h3 className="text-xs font-bold text-white tracking-widest uppercase">
              SHARPE-ADJUSTED CARRY TRADE OPPORTUNITIES
            </h3>
            <span className="text-[10px] text-neutral-500">VOLATILITY ADJUSTED</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="border-b border-vanta-border/60 text-[10px] text-neutral-500 uppercase">
                  <th className="py-2 px-2.5">Pair</th>
                  <th className="py-2 px-2.5 text-right">Spread</th>
                  <th className="py-2 px-2.5 text-right">30D Implied Vol</th>
                  <th className="py-2 px-2.5 text-right">Sharpe Ratio</th>
                  <th className="py-2 px-2.5 text-center">Unwind Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-900 font-mono">
                {CARRY_PAIRS.map((pair) => (
                  <tr key={pair.pair} className="hover:bg-neutral-900/40">
                    <td className="py-2.5 px-2.5 font-bold text-white">
                      {pair.pair}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-bold text-vanta-green">
                      +{pair.rateSpreadPct.toFixed(2)}%
                    </td>
                    <td className="py-2.5 px-2.5 text-right text-neutral-400">
                      {pair.impliedVol30dPct}%
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-extrabold text-vanta-cyan">
                      {pair.sharpeRatio.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-2.5 text-center">
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                        pair.unwindRisk === 'HIGH' ? 'bg-red-950 text-red-400 border border-red-800' :
                        pair.unwindRisk === 'MODERATE' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                        'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      }`}>
                        {pair.unwindRisk}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-3 bg-black/60 border border-neutral-800 rounded text-[10px] text-neutral-400">
            <span className="text-white font-bold block mb-1">CARRY SHARPE FORMULA:</span>
            <p className="font-mono text-vanta-cyan my-1">
              {"Carry Sharpe = (Nominal Rate Differential) / (30-Day Implied FX Volatility)"}
            </p>
            High Sharpe with LOW unwind risk represents optimal institutional carry funding (e.g. Long USD/CHF).
          </div>
        </div>

      </div>

    </div>
  );
}
