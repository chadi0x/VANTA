'use client';

import React, { useState } from 'react';
import { Compass, Flame, ShieldAlert, TrendingUp, TrendingDown, Crosshair, BarChart3, Info } from 'lucide-react';

interface StrikeGex {
  strike: number;
  callGexUSD: number; // Millions
  putGexUSD: number;  // Millions
  netGexUSD: number;  // Millions
  openInterest: number;
  isFlipZone?: boolean;
}

interface AssetGexProfile {
  ticker: string;
  name: string;
  spotPrice: number;
  gammaFlipLevel: number;
  netGexTotalUSD: number; // Billions
  regime: 'POSITIVE_GAMMA' | 'NEGATIVE_GAMMA';
  regimeDescription: string;
  zeroDteSharePct: number;
  putCallRatio: number;
  strikes: StrikeGex[];
}

const GEX_PROFILES: Record<string, AssetGexProfile> = {
  SPX: {
    ticker: 'SPX',
    name: 'S&P 500 Index',
    spotPrice: 5732,
    gammaFlipLevel: 5685,
    netGexTotalUSD: 3.42, // +$3.42B Long Gamma
    regime: 'POSITIVE_GAMMA',
    regimeDescription: 'Dealers are LONG GAMMA above 5,685. Market makers sell rips and buy dips, pinning volatility and creating range-bound mean-reverting price action.',
    zeroDteSharePct: 48.5,
    putCallRatio: 0.82,
    strikes: [
      { strike: 5600, callGexUSD: 40, putGexUSD: -320, netGexUSD: -280, openInterest: 42000 },
      { strike: 5650, callGexUSD: 85, putGexUSD: -240, netGexUSD: -155, openInterest: 38000 },
      { strike: 5685, callGexUSD: 180, putGexUSD: -180, netGexUSD: 0, openInterest: 51000, isFlipZone: true },
      { strike: 5700, callGexUSD: 420, putGexUSD: -120, netGexUSD: +300, openInterest: 64000 },
      { strike: 5725, callGexUSD: 580, putGexUSD: -90, netGexUSD: +490, openInterest: 72000 },
      { strike: 5750, callGexUSD: 890, putGexUSD: -50, netGexUSD: +840, openInterest: 94000 },
      { strike: 5800, callGexUSD: 1100, putGexUSD: -20, netGexUSD: +1080, openInterest: 112000 }
    ]
  },
  GLD: {
    ticker: 'GLD',
    name: 'SPDR Gold Shares (Proxy for XAU/USD)',
    spotPrice: 245.5,
    gammaFlipLevel: 241.0,
    netGexTotalUSD: 0.86,
    regime: 'POSITIVE_GAMMA',
    regimeDescription: 'Dealers are Long Gamma above $241 (Gold $2,610/oz). Massive call open interest concentrated at $250 strike ($2,700/oz magnet).',
    zeroDteSharePct: 22.4,
    putCallRatio: 0.58,
    strikes: [
      { strike: 235, callGexUSD: 12, putGexUSD: -85, netGexUSD: -73, openInterest: 18000 },
      { strike: 238, callGexUSD: 25, putGexUSD: -60, netGexUSD: -35, openInterest: 22000 },
      { strike: 241, callGexUSD: 45, putGexUSD: -45, netGexUSD: 0, openInterest: 29000, isFlipZone: true },
      { strike: 245, callGexUSD: 140, putGexUSD: -30, netGexUSD: +110, openInterest: 48000 },
      { strike: 248, callGexUSD: 260, putGexUSD: -15, netGexUSD: +245, openInterest: 62000 },
      { strike: 250, callGexUSD: 490, putGexUSD: -8, netGexUSD: +482, openInterest: 88000 }
    ]
  },
  TLT: {
    ticker: 'TLT',
    name: 'iShares 20+ Year Treasury Bond ETF',
    spotPrice: 98.2,
    gammaFlipLevel: 99.5,
    netGexTotalUSD: -0.42, // Negative Gamma
    regime: 'NEGATIVE_GAMMA',
    regimeDescription: 'Dealers are SHORT GAMMA below $99.50. Dealer hedging is accelerating bond yield volatility; dips get sold aggressively and rallies trigger fast covering squeezes.',
    zeroDteSharePct: 15.8,
    putCallRatio: 1.34,
    strikes: [
      { strike: 94, callGexUSD: 10, putGexUSD: -120, netGexUSD: -110, openInterest: 31000 },
      { strike: 96, callGexUSD: 20, putGexUSD: -95, netGexUSD: -75, openInterest: 42000 },
      { strike: 98, callGexUSD: 45, putGexUSD: -70, netGexUSD: -25, openInterest: 58000 },
      { strike: 99.5, callGexUSD: 60, putGexUSD: -60, netGexUSD: 0, openInterest: 61000, isFlipZone: true },
      { strike: 101, callGexUSD: 110, putGexUSD: -35, netGexUSD: +75, openInterest: 39000 },
      { strike: 103, callGexUSD: 180, putGexUSD: -15, netGexUSD: +165, openInterest: 28000 }
    ]
  }
};

export function OptionsGexTab() {
  const [selectedAsset, setSelectedAsset] = useState<string>('SPX');
  const profile = GEX_PROFILES[selectedAsset];

  return (
    <div className="space-y-3 font-mono text-xs select-none animate-in fade-in duration-150">
      
      {/* ── TOP ASSET SELECTOR & REGIME HEADER ─────────────────────────────── */}
      <div className="bg-vanta-950 border border-vanta-border p-4 rounded-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-vanta-border pb-3 mb-3">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-vanta-cyan/10 border border-vanta-cyan/30 rounded">
              <Compass className="w-5 h-5 text-vanta-cyan" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-white tracking-widest uppercase">
                  OPTIONS DEALER GAMMA EXPOSURE (GEX)
                </h2>
                <span className="text-[10px] bg-vanta-cyan/20 text-vanta-cyan px-1.5 py-0.5 rounded font-bold">
                  VOLATILITY REGIME RADAR
                </span>
              </div>
              <p className="text-[10px] text-neutral-400">
                Quantifies dealer dynamic hedging feedback loops across strike distributions
              </p>
            </div>
          </div>

          {/* Ticker Selector */}
          <div className="flex items-center space-x-1.5">
            {Object.keys(GEX_PROFILES).map((ticker) => (
              <button
                key={ticker}
                onClick={() => setSelectedAsset(ticker)}
                className={`px-3 py-1.5 rounded font-bold transition-colors ${
                  selectedAsset === ticker
                    ? 'bg-vanta-cyan/20 border border-vanta-cyan text-vanta-cyan shadow-[0_0_8px_rgba(0,255,255,0.2)]'
                    : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                {ticker}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Quantitative Regime Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Spot vs Flip */}
          <div className="bg-black/60 border border-vanta-border/80 p-3 rounded">
            <div className="flex items-center justify-between text-neutral-400 text-[10px] mb-1">
              <span>CURRENT SPOT PRICE</span>
              <span className="text-neutral-500">{profile.name}</span>
            </div>
            <div className="text-lg font-extrabold text-white">
              {profile.spotPrice.toLocaleString()}
            </div>
            <div className="flex items-center space-x-1 text-[10px] text-neutral-400 mt-1">
              <span>Gamma Flip Point:</span>
              <span className="font-bold text-vanta-yellow">{profile.gammaFlipLevel.toLocaleString()}</span>
            </div>
          </div>

          {/* Card 2: Net GEX */}
          <div className={`p-3 rounded border ${
            profile.netGexTotalUSD > 0
              ? 'bg-vanta-green/5 border-vanta-green/30'
              : 'bg-vanta-red/5 border-vanta-red/30'
          }`}>
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="text-neutral-300">NET DEALER GAMMA (GEX)</span>
              <span className={`font-bold ${profile.netGexTotalUSD > 0 ? 'text-vanta-green' : 'text-vanta-red'}`}>
                {profile.netGexTotalUSD > 0 ? 'STABILIZING' : 'EXPANDING VOL'}
              </span>
            </div>
            <div className={`text-lg font-extrabold ${profile.netGexTotalUSD > 0 ? 'text-vanta-green' : 'text-vanta-red'}`}>
              {profile.netGexTotalUSD > 0 ? '+' : ''}${profile.netGexTotalUSD} BILLION
            </div>
            <div className="text-[10px] text-neutral-400 mt-1">
              {profile.netGexTotalUSD > 0 ? 'Dealers Long: Suppressing Volatility' : 'Dealers Short: Accelerating Moves'}
            </div>
          </div>

          {/* Card 3: 0DTE Share */}
          <div className="bg-black/60 border border-vanta-border/80 p-3 rounded">
            <div className="flex items-center justify-between text-neutral-400 text-[10px] mb-1">
              <span>0DTE VOLUME SHARE</span>
              <span className="text-vanta-cyan font-bold">SAME-DAY EXPIRY</span>
            </div>
            <div className="text-lg font-extrabold text-vanta-cyan">
              {profile.zeroDteSharePct}%
            </div>
            <div className="text-[10px] text-neutral-500 mt-1">
              Intraday Gamma Squeeze Risk: MODERATE
            </div>
          </div>

          {/* Card 4: Put/Call Ratio */}
          <div className="bg-black/60 border border-vanta-border/80 p-3 rounded">
            <div className="flex items-center justify-between text-neutral-400 text-[10px] mb-1">
              <span>PUT / CALL SKEW RATIO</span>
              <span className="text-neutral-500">25-DELTA</span>
            </div>
            <div className="text-lg font-extrabold text-white">
              {profile.putCallRatio.toFixed(2)}
            </div>
            <div className="text-[10px] text-neutral-400 mt-1">
              {profile.putCallRatio < 1.0 ? 'Bullish Call Skew Dominance' : 'Defensive Put Hedging Heavy'}
            </div>
          </div>
        </div>

        {/* Narrative Regime Banner */}
        <div className="mt-3 p-3 bg-vanta-900 border border-vanta-border/80 rounded flex items-start space-x-2.5">
          <Info className="w-4 h-4 text-vanta-cyan flex-shrink-0 mt-0.5" />
          <div className="text-[11px] text-neutral-300">
            <span className="font-bold text-white uppercase mr-1">DEALER POSITIONING REGIME:</span>
            {profile.regimeDescription}
          </div>
        </div>
      </div>

      {/* ── STRIKE DISTRIBUTION & GAMMA PROFILE TABLE ─────────────────────── */}
      <div className="bg-vanta-950 border border-vanta-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-vanta-border">
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4 text-vanta-green" />
            <h3 className="text-xs font-bold text-white tracking-widest uppercase">
              STRIKE-BY-STRIKE GAMMA EXPOSURE PROFILE ({profile.ticker})
            </h3>
          </div>
          <span className="text-[10px] text-neutral-400">
            Green = Positive Dealer Gamma | Red = Negative Dealer Gamma
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-vanta-border/60 text-[10px] text-neutral-500 uppercase">
                <th className="py-2 px-3">Strike</th>
                <th className="py-2 px-3 text-right">Call Gamma ($M)</th>
                <th className="py-2 px-3 text-right">Put Gamma ($M)</th>
                <th className="py-2 px-3 text-right">Net Gamma ($M)</th>
                <th className="py-2 px-3 text-right">Open Interest</th>
                <th className="py-2 px-4">Gamma Visual Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {profile.strikes.map((stk) => {
                const isPositive = stk.netGexUSD >= 0;
                const barWidth = Math.min(Math.abs(stk.netGexUSD) / 10, 100);
                return (
                  <tr
                    key={stk.strike}
                    className={`hover:bg-neutral-900/50 ${
                      stk.isFlipZone ? 'bg-vanta-yellow/10 font-bold' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-mono font-bold text-white flex items-center space-x-2">
                      <span>{stk.strike.toLocaleString()}</span>
                      {stk.isFlipZone && (
                        <span className="text-[9px] bg-vanta-yellow/20 text-vanta-yellow border border-vanta-yellow/40 px-1 py-0.2 rounded uppercase">
                          FLIP LEVEL
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-vanta-green">
                      +${stk.callGexUSD}M
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-vanta-red">
                      ${stk.putGexUSD}M
                    </td>
                    <td className={`py-2.5 px-3 text-right font-mono font-bold ${
                      isPositive ? 'text-vanta-green' : 'text-vanta-red'
                    }`}>
                      {isPositive ? '+' : ''}${stk.netGexUSD}M
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-neutral-400">
                      {stk.openInterest.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 w-1/3">
                      <div className="w-full bg-neutral-900 h-2 rounded flex items-center">
                        <div
                          className={`h-full rounded transition-all ${
                            isPositive ? 'bg-vanta-green' : 'bg-vanta-red'
                          }`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
