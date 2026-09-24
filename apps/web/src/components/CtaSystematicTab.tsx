'use client';

import React, { useState } from 'react';
import { Cpu, ArrowUpDown, AlertCircle, ShieldAlert, Zap, TrendingUp, TrendingDown, Eye } from 'lucide-react';

interface CtaAssetAllocation {
  asset: string;
  ticker: string;
  name: string;
  currentPrice: string;
  ctaAllocationPct: number; // -100 (Max Short) to +100 (Max Long)
  priorWeekPct: number;
  direction: 'LONG' | 'SHORT' | 'NEUTRAL';
  unwindTrigger: string;
  shortFlipTrigger: string;
  modelConfidence: number;
}

const CTA_ASSETS: CtaAssetAllocation[] = [
  { asset: 'GOLD', ticker: 'XAU/USD', name: 'COMEX Gold', currentPrice: '$2,658.40', ctaAllocationPct: 92, priorWeekPct: 84, direction: 'LONG', unwindTrigger: '< $2,638', shortFlipTrigger: '< $2,580', modelConfidence: 94 },
  { asset: 'SILVER', ticker: 'XAG/USD', name: 'COMEX Silver', currentPrice: '$31.85', ctaAllocationPct: 78, priorWeekPct: 65, direction: 'LONG', unwindTrigger: '< $30.90', shortFlipTrigger: '< $29.40', modelConfidence: 88 },
  { asset: 'CRUDE_OIL', ticker: 'WTI/USD', name: 'WTI Crude Oil', currentPrice: '$71.18', ctaAllocationPct: -64, priorWeekPct: -72, direction: 'SHORT', unwindTrigger: '> $73.40', shortFlipTrigger: '> $76.80', modelConfidence: 86 },
  { asset: 'DXY', ticker: 'USD/IDX', name: 'US Dollar Index', currentPrice: '100.82', ctaAllocationPct: -55, priorWeekPct: -40, direction: 'SHORT', unwindTrigger: '> 101.60', shortFlipTrigger: '> 102.80', modelConfidence: 91 },
  { asset: 'US10Y', ticker: 'US10Y_FUT', name: '10Y Treasury Note', currentPrice: '114-12', ctaAllocationPct: 62, priorWeekPct: 48, direction: 'LONG', unwindTrigger: '< 113-18', shortFlipTrigger: '< 112-04', modelConfidence: 85 },
  { asset: 'SPX', ticker: 'SPX500', name: 'S&P 500 Index', currentPrice: '5,732.10', ctaAllocationPct: 98, priorWeekPct: 95, direction: 'LONG', unwindTrigger: '< 5,660', shortFlipTrigger: '< 5,520', modelConfidence: 96 }
];

interface DarkPoolPrint {
  id: string;
  time: string;
  symbol: string;
  price: string;
  sizeLots: number;
  notionalUSD: string;
  side: 'BUY' | 'SELL' | 'CROSS';
  exchange: string;
}

const RECENT_DARK_POOL_PRINTS: DarkPoolPrint[] = [
  { id: 'DP-901', time: '19:12:04 UTC', symbol: 'GLD', price: '$245.48', sizeLots: 185000, notionalUSD: '$45.4M', side: 'BUY', exchange: 'FINRA Dark / SIG' },
  { id: 'DP-902', time: '19:08:42 UTC', symbol: 'SPY', price: '$571.90', sizeLots: 120000, notionalUSD: '$68.6M', side: 'CROSS', exchange: 'Barclays ATS' },
  { id: 'DP-903', time: '18:54:19 UTC', symbol: 'TLT', price: '$98.32', sizeLots: 310000, notionalUSD: '$30.4M', side: 'BUY', exchange: 'Citadel Connect' },
  { id: 'DP-904', time: '18:41:05 UTC', symbol: 'USO', price: '$72.10', sizeLots: 140000, notionalUSD: '$10.1M', side: 'SELL', exchange: 'Goldman Sigma X' }
];

export function CtaSystematicTab() {
  return (
    <div className="space-y-3 font-mono text-xs select-none animate-in fade-in duration-150">
      
      {/* ── TOP HEADER BANNER ──────────────────────────────────────────────── */}
      <div className="bg-vanta-950 border border-vanta-border p-4 rounded-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-vanta-border pb-3 mb-3">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-purple-500/10 border border-purple-500/30 rounded">
              <Cpu className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-white tracking-widest uppercase">
                  CTA TREND-FOLLOWING &amp; SYSTEMATIC FLOW SENTINEL
                </h2>
                <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded font-bold">
                  $350B+ QUANT POOL
                </span>
              </div>
              <p className="text-[10px] text-neutral-400">
                Estimates algorithmic trend allocations and forced institutional liquidation price points
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-[10px] text-neutral-400 bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            <span>ESTIMATED CTA BETA: <strong className="text-white">+0.84 EXPANSION</strong></span>
          </div>
        </div>

        {/* Overview Notice */}
        <div className="p-3 bg-purple-950/20 border border-purple-800/40 rounded text-[11px] text-neutral-300">
          <span className="text-purple-400 font-bold block mb-0.5">ALGORITHMIC ORDERFLOW DIRECTIVE:</span>
          Systematic Trend-Followers (CTAs) are currently at near-maximum long allocation in Gold ($XAUUSD at 92%) and S&P 500 (98%). When allocations hit &gt; 90%, buying momentum exhausts and the market becomes hypersensitive to downside cascade selling if the <strong className="text-white">Unwind Trigger</strong> is breached.
        </div>
      </div>

      {/* ── CTA ASSET ALLOCATION & TRIGGER MATRIX ─────────────────────────── */}
      <div className="bg-vanta-950 border border-vanta-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-vanta-border">
          <div className="flex items-center space-x-2">
            <ArrowUpDown className="w-4 h-4 text-purple-400" />
            <h3 className="text-xs font-bold text-white tracking-widest uppercase">
              CTA POSITIONING ALLOCATION &amp; TRIGGER LEVELS
            </h3>
          </div>
          <span className="text-[10px] text-neutral-400">
            Triggers represent modeled forced-liquidation levels
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-vanta-border/60 text-[10px] text-neutral-500 uppercase">
                <th className="py-2 px-3">Asset</th>
                <th className="py-2 px-3">Spot Price</th>
                <th className="py-2 px-3">CTA Allocation (% Max)</th>
                <th className="py-2 px-3 text-center">Direction</th>
                <th className="py-2 px-3 text-vanta-yellow">Unwind Long Trigger</th>
                <th className="py-2 px-3 text-vanta-red">Flip to Short Trigger</th>
                <th className="py-2 px-3 text-right">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900">
              {CTA_ASSETS.map((asset) => {
                const isLong = asset.ctaAllocationPct > 0;
                return (
                  <tr key={asset.asset} className="hover:bg-neutral-900/50">
                    <td className="py-2.5 px-3 font-bold text-white">
                      {asset.name} <span className="text-[10px] text-neutral-500">({asset.ticker})</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-neutral-200">
                      {asset.currentPrice}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center space-x-2">
                        <span className={`font-mono font-bold w-12 ${isLong ? 'text-vanta-green' : 'text-vanta-red'}`}>
                          {isLong ? '+' : ''}{asset.ctaAllocationPct}%
                        </span>
                        <div className="w-24 bg-neutral-900 h-2 rounded overflow-hidden">
                          <div
                            className={`h-full rounded ${isLong ? 'bg-vanta-green' : 'bg-vanta-red'}`}
                            style={{ width: `${Math.abs(asset.ctaAllocationPct)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                        isLong
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : 'bg-red-950 text-red-400 border border-red-800'
                      }`}>
                        {asset.direction}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-vanta-yellow">
                      {asset.unwindTrigger}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-vanta-red">
                      {asset.shortFlipTrigger}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-neutral-400">
                      {asset.modelConfidence}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── DARK POOL & INSTITUTIONAL BLOCK PRINT RADAR ───────────────────── */}
      <div className="bg-vanta-950 border border-vanta-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-vanta-border">
          <div className="flex items-center space-x-2">
            <Eye className="w-4 h-4 text-vanta-cyan" />
            <h3 className="text-xs font-bold text-white tracking-widest uppercase">
              INSTITUTIONAL DARK POOL &amp; BLOCK TRADE SCANNER (&gt; $10M NOTIONAL)
            </h3>
          </div>
          <span className="text-[10px] text-vanta-green font-bold flex items-center space-x-1">
            <span className="w-1.5 h-1.5 bg-vanta-green rounded-full animate-ping" />
            <span>LIVE ATS FEED</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-vanta-border/60 text-[10px] text-neutral-500 uppercase">
                <th className="py-2 px-3">Time</th>
                <th className="py-2 px-3">Symbol</th>
                <th className="py-2 px-3">Print Price</th>
                <th className="py-2 px-3 text-right">Size (Shares/Contracts)</th>
                <th className="py-2 px-3 text-right">Notional Value</th>
                <th className="py-2 px-3 text-center">Aggression Side</th>
                <th className="py-2 px-3">ATS / Venue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900 font-mono">
              {RECENT_DARK_POOL_PRINTS.map((print) => (
                <tr key={print.id} className="hover:bg-neutral-900/40">
                  <td className="py-2.5 px-3 text-neutral-400">{print.time}</td>
                  <td className="py-2.5 px-3 font-bold text-white">{print.symbol}</td>
                  <td className="py-2.5 px-3 text-neutral-200">{print.price}</td>
                  <td className="py-2.5 px-3 text-right text-neutral-300">{print.sizeLots.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-vanta-green">{print.notionalUSD}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                      print.side === 'BUY' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                      print.side === 'SELL' ? 'bg-red-950 text-red-400 border border-red-800' :
                      'bg-neutral-800 text-neutral-400'
                    }`}>
                      {print.side}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-[10px] text-neutral-400">{print.exchange}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
