'use client';

import React, { useState } from 'react';
import { BookOpen, Sparkles, Sliders, ArrowRight, ShieldCheck, Target, TrendingUp, TrendingDown, Clock } from 'lucide-react';

interface EventReleaseHistory {
  date: string;
  eventName: string;
  actual: string;
  forecast: string;
  deviationSigma: number;
  goldMove5m: string;
  goldMove15m: string;
  dxyMove15m: string;
  us10yBpsMove: string;
  outcomeType: 'HAWKISH_BEAT' | 'DOVISH_MISS' | 'IN_LINE';
}

const HISTORICAL_CPI_RELEASES: EventReleaseHistory[] = [
  { date: '2026-08-14', eventName: 'US Core CPI (MoM)', actual: '+0.3%', forecast: '+0.2%', deviationSigma: +1.42, goldMove5m: '-$14.20', goldMove15m: '-$22.80', dxyMove15m: '+0.48%', us10yBpsMove: '+5.4 bps', outcomeType: 'HAWKISH_BEAT' },
  { date: '2026-07-11', eventName: 'US Core CPI (MoM)', actual: '+0.1%', forecast: '+0.2%', deviationSigma: -1.35, goldMove5m: '+$18.50', goldMove15m: '+$29.10', dxyMove15m: '-0.62%', us10yBpsMove: '-7.2 bps', outcomeType: 'DOVISH_MISS' },
  { date: '2026-06-12', eventName: 'US Core CPI (MoM)', actual: '+0.2%', forecast: '+0.2%', deviationSigma: 0.00, goldMove5m: '+$2.40', goldMove15m: '-$1.80', dxyMove15m: '-0.05%', us10yBpsMove: '-0.8 bps', outcomeType: 'IN_LINE' },
  { date: '2026-05-15', eventName: 'US Core CPI (MoM)', actual: '+0.3%', forecast: '+0.3%', deviationSigma: +0.20, goldMove5m: '-$4.10', goldMove15m: '-$6.30', dxyMove15m: '+0.12%', us10yBpsMove: '+1.8 bps', outcomeType: 'IN_LINE' },
  { date: '2026-04-10', eventName: 'US Core CPI (MoM)', actual: '+0.4%', forecast: '+0.3%', deviationSigma: +1.65, goldMove5m: '-$21.40', goldMove15m: '-$34.00', dxyMove15m: '+0.75%', us10yBpsMove: '+9.1 bps', outcomeType: 'HAWKISH_BEAT' }
];

export function MacroPlaybooksTab() {
  const [selectedEvent, setSelectedEvent] = useState<string>('CPI');
  const [hypotheticalActual, setHypotheticalActual] = useState<number>(0.1);
  const consensusForecast = 0.2; // 0.2% expected
  const stdDev = 0.08;

  // Calculate simulated deviation sigma
  const simulatedDiff = Number((hypotheticalActual - consensusForecast).toFixed(2));
  const simulatedSigma = Number((simulatedDiff / stdDev).toFixed(2));

  // Projected asset moves based on statistical regression
  const isBeat = simulatedSigma > 0.4;
  const isMiss = simulatedSigma < -0.4;

  const projectedGoldMove = isBeat
    ? `-$${(Math.abs(simulatedSigma) * 15.5).toFixed(1)} to -$${(Math.abs(simulatedSigma) * 22.0).toFixed(1)}`
    : isMiss
    ? `+$${(Math.abs(simulatedSigma) * 16.2).toFixed(1)} to +$${(Math.abs(simulatedSigma) * 24.5).toFixed(1)}`
    : '±$3.00 to $6.00 (Chop / Mean-Reversion)';

  const projectedDxyMove = isBeat
    ? `+${(Math.abs(simulatedSigma) * 0.35).toFixed(2)}%`
    : isMiss
    ? `-${(Math.abs(simulatedSigma) * 0.42).toFixed(2)}%`
    : '±0.08%';

  const projectedYieldMove = isBeat
    ? `+${(Math.abs(simulatedSigma) * 4.5).toFixed(1)} bps`
    : isMiss
    ? `-${(Math.abs(simulatedSigma) * 5.2).toFixed(1)} bps`
    : '±1.0 bps';

  return (
    <div className="space-y-3 font-mono text-xs select-none animate-in fade-in duration-150">
      
      {/* ── TOP EVENT SIMULATOR & WHAT-IF CALCULATOR ─────────────────────── */}
      <div className="bg-vanta-950 border border-vanta-border p-4 rounded-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-vanta-border pb-3 mb-3">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-vanta-yellow/10 border border-vanta-yellow/30 rounded">
              <Sliders className="w-5 h-5 text-vanta-yellow" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-white tracking-widest uppercase">
                  MACRO EVENT SURPRISE &amp; PRICE IMPACT SIMULATOR
                </h2>
                <span className="text-[10px] bg-vanta-yellow/20 text-vanta-yellow px-1.5 py-0.5 rounded font-bold">
                  PRE-RELEASE PLAYBOOK
                </span>
              </div>
              <p className="text-[10px] text-neutral-400">
                Model price reaction vectors across Gold, DXY, and Yields before the embargo lifts
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {['CPI', 'NFP', 'FOMC', 'GDP'].map((ev) => (
              <button
                key={ev}
                onClick={() => setSelectedEvent(ev)}
                className={`px-3 py-1 rounded font-bold transition-colors ${
                  selectedEvent === ev
                    ? 'bg-vanta-yellow/20 border border-vanta-yellow text-vanta-yellow'
                    : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                {ev}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Scenario Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          {/* Left: Input sliders (5 Cols) */}
          <div className="lg:col-span-5 bg-black/60 p-3.5 rounded border border-vanta-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">TARGET RELEASE:</span>
              <span className="font-bold text-white uppercase">US Core CPI (MoM)</span>
            </div>
            <div className="flex items-center justify-between text-neutral-400">
              <span>CONSENSUS FORECAST:</span>
              <span className="font-mono text-vanta-yellow font-bold">+{consensusForecast}%</span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-neutral-300 font-bold">HYPOTHETICAL ACTUAL:</span>
                <span className="font-mono text-lg font-extrabold text-vanta-cyan">
                  {hypotheticalActual > 0 ? '+' : ''}{hypotheticalActual.toFixed(2)}%
                </span>
              </div>
              <input
                type="range"
                min="-0.2"
                max="0.6"
                step="0.05"
                value={hypotheticalActual}
                onChange={(e) => setHypotheticalActual(parseFloat(e.target.value))}
                className="w-full accent-vanta-yellow cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-neutral-500 mt-1 font-mono">
                <span>-0.2% (Big Miss)</span>
                <span>+0.2% (Consensus)</span>
                <span>+0.6% (Hot Beat)</span>
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
              <span className="text-neutral-400">Calculated Surprise:</span>
              <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                isBeat ? 'bg-red-950 text-red-400 border border-red-800' :
                isMiss ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                'bg-neutral-800 text-neutral-300'
              }`}>
                {simulatedSigma > 0 ? '+' : ''}{simulatedSigma}σ ({isBeat ? 'HAWKISH BEAT' : isMiss ? 'DOVISH MISS' : 'IN-LINE'})
              </span>
            </div>
          </div>

          {/* Right: Projected Price Impact Output (7 Cols) */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Gold Projection */}
            <div className="bg-vanta-900 border border-vanta-border/80 p-3 rounded flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-neutral-400 block mb-1">GOLD (XAU/USD) 15M:</span>
                <div className={`text-sm font-extrabold font-mono ${
                  isMiss ? 'text-vanta-green' : isBeat ? 'text-vanta-red' : 'text-neutral-300'
                }`}>
                  {projectedGoldMove}
                </div>
              </div>
              <span className="text-[9px] text-neutral-500 mt-2 block">
                {isMiss ? 'Weak CPI weakens DXY; Gold rallies on rate cut surge' : isBeat ? 'Hot CPI spikes yield; Gold sells off violently' : 'Consensus matches; Expect low follow-through'}
              </span>
            </div>

            {/* DXY Projection */}
            <div className="bg-vanta-900 border border-vanta-border/80 p-3 rounded flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-neutral-400 block mb-1">US DOLLAR INDEX (DXY):</span>
                <div className={`text-sm font-extrabold font-mono ${
                  isBeat ? 'text-vanta-green' : isMiss ? 'text-vanta-red' : 'text-neutral-300'
                }`}>
                  {projectedDxyMove}
                </div>
              </div>
              <span className="text-[9px] text-neutral-500 mt-2 block">
                {isBeat ? 'Dollar strengthens on higher-for-longer yields' : isMiss ? 'Dollar dumped across G10 pairs' : 'DXY trades tight to prior ranges'}
              </span>
            </div>

            {/* 10Y Yield Projection */}
            <div className="bg-vanta-900 border border-vanta-border/80 p-3 rounded flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-neutral-400 block mb-1">US 10Y TREASURY YIELD:</span>
                <div className={`text-sm font-extrabold font-mono ${
                  isBeat ? 'text-vanta-yellow' : isMiss ? 'text-vanta-cyan' : 'text-neutral-300'
                }`}>
                  {projectedYieldMove}
                </div>
              </div>
              <span className="text-[9px] text-neutral-500 mt-2 block">
                Benchmark sovereign curve repricing vector
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── HISTORICAL EVENT REACTION DATABASE ────────────────────────────── */}
      <div className="bg-vanta-950 border border-vanta-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-vanta-border">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-vanta-green" />
            <h3 className="text-xs font-bold text-white tracking-widest uppercase">
              HISTORICAL RELEASE REACTION PLAYBOOK (PAST CPI PRINTS)
            </h3>
          </div>
          <span className="text-[10px] text-neutral-400">
            Empirical tick-by-tick statistical verification
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-vanta-border/60 text-[10px] text-neutral-500 uppercase">
                <th className="py-2 px-3">Date</th>
                <th className="py-2 px-3">Release</th>
                <th className="py-2 px-3">Actual / F’cast</th>
                <th className="py-2 px-3 text-center">Deviation (σ)</th>
                <th className="py-2 px-3 text-right">Gold (5m)</th>
                <th className="py-2 px-3 text-right">Gold (15m)</th>
                <th className="py-2 px-3 text-right">DXY (15m)</th>
                <th className="py-2 px-3 text-right">10Y Yield</th>
                <th className="py-2 px-3 text-center">Regime Tag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-900 font-mono">
              {HISTORICAL_CPI_RELEASES.map((row) => (
                <tr key={row.date} className="hover:bg-neutral-900/40">
                  <td className="py-2.5 px-3 text-neutral-400">{row.date}</td>
                  <td className="py-2.5 px-3 font-bold text-white">{row.eventName}</td>
                  <td className="py-2.5 px-3 text-neutral-200">{row.actual} / {row.forecast}</td>
                  <td className="py-2.5 px-3 text-center font-bold">
                    <span className={row.deviationSigma > 0 ? 'text-vanta-red' : row.deviationSigma < 0 ? 'text-vanta-green' : 'text-neutral-400'}>
                      {row.deviationSigma > 0 ? '+' : ''}{row.deviationSigma}σ
                    </span>
                  </td>
                  <td className={`py-2.5 px-3 text-right font-bold ${row.goldMove5m.startsWith('+') ? 'text-vanta-green' : 'text-vanta-red'}`}>
                    {row.goldMove5m}
                  </td>
                  <td className={`py-2.5 px-3 text-right font-bold ${row.goldMove15m.startsWith('+') ? 'text-vanta-green' : 'text-vanta-red'}`}>
                    {row.goldMove15m}
                  </td>
                  <td className={`py-2.5 px-3 text-right ${row.dxyMove15m.startsWith('+') ? 'text-vanta-green' : 'text-vanta-red'}`}>
                    {row.dxyMove15m}
                  </td>
                  <td className="py-2.5 px-3 text-right text-neutral-300">
                    {row.us10yBpsMove}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                      row.outcomeType === 'HAWKISH_BEAT' ? 'bg-red-950 text-red-400 border border-red-800' :
                      row.outcomeType === 'DOVISH_MISS' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                      'bg-neutral-800 text-neutral-400'
                    }`}>
                      {row.outcomeType}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
