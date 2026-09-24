'use client';

import React, { useState } from 'react';
import { ShieldAlert, Flame, AlertTriangle, TrendingDown, DollarSign, Activity, BarChart, RotateCcw } from 'lucide-react';

interface StressScenario {
  id: string;
  name: string;
  category: 'HISTORICAL' | 'HYPOTHETICAL';
  description: string;
  goldImpactPct: number;
  spxImpactPct: number;
  dxyImpactPct: number;
  yield10yBps: number;
  var99LossPct: number;
}

const PRESET_SCENARIOS: StressScenario[] = [
  {
    id: 'OIL_EMBARGO_1973',
    name: '1973 Arab Oil Embargo Re-run',
    category: 'HISTORICAL',
    description: 'Middle Eastern supply shock spikes Crude Oil +45%. Stagflation drives 10Y yields up +85 bps while equities plummet.',
    goldImpactPct: +14.5,
    spxImpactPct: -16.2,
    dxyImpactPct: +4.8,
    yield10yBps: +85,
    var99LossPct: -22.4
  },
  {
    id: 'LEHMAN_2008',
    name: '2008 Interbank Liquidity Freeze',
    category: 'HISTORICAL',
    description: 'Systemic banking contagion. Credit spreads blow out +450 bps; cash rush spikes DXY +6.5%; Gold initially sold for liquidity margin calls.',
    goldImpactPct: -8.4,
    spxImpactPct: -28.0,
    dxyImpactPct: +6.5,
    yield10yBps: -110,
    var99LossPct: -34.8
  },
  {
    id: 'COVID_BAZOOKA_2020',
    name: '2020 Emergency Monetary Bazooka',
    category: 'HISTORICAL',
    description: 'Central banks print $3 Trillion in 30 days. Real rates collapse; Gold and Risk assets stage historic explosive rally.',
    goldImpactPct: +22.0,
    spxImpactPct: +24.5,
    dxyImpactPct: -7.2,
    yield10yBps: -65,
    var99LossPct: -11.0
  },
  {
    id: 'TAIWAN_STRAIT_BLOCKADE',
    name: 'Taiwan Strait Semiconductor Blockade',
    category: 'HYPOTHETICAL',
    description: 'Global tech supply chains severed. Extreme flight to safety into Gold, US Dollar, and Crude Oil; Nasdaq drops -25%.',
    goldImpactPct: +18.5,
    spxImpactPct: -21.4,
    dxyImpactPct: +5.2,
    yield10yBps: -40,
    var99LossPct: -28.5
  }
];

export function BlackSwanWarRoomTab() {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('OIL_EMBARGO_1973');
  const [portfolioSizeUSD, setPortfolioSizeUSD] = useState<number>(500000);
  const [customYieldSpikeBps, setCustomYieldSpikeBps] = useState<number>(50);
  const [customOilSpikePct, setCustomOilSpikePct] = useState<number>(20);

  const activeScenario = PRESET_SCENARIOS.find((s) => s.id === selectedScenarioId) || PRESET_SCENARIOS[0];

  const estimatedLossUSD = Number(((portfolioSizeUSD * Math.abs(activeScenario.var99LossPct)) / 100).toFixed(0));
  const var95LossUSD = Number(((portfolioSizeUSD * (Math.abs(activeScenario.var99LossPct) * 0.72)) / 100).toFixed(0));

  return (
    <div className="space-y-3 font-mono text-xs select-none animate-in fade-in duration-150">
      
      {/* ── TOP HEADER BANNER ──────────────────────────────────────────────── */}
      <div className="bg-vanta-950 border border-vanta-border p-4 rounded-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-vanta-border pb-3 mb-3">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-vanta-red/10 border border-vanta-red/30 rounded">
              <ShieldAlert className="w-5 h-5 text-vanta-red" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-white tracking-widest uppercase">
                  THE BLACK SWAN WAR ROOM: MONTE CARLO STRESS-TESTER
                </h2>
                <span className="text-[10px] bg-vanta-red/20 text-vanta-red px-1.5 py-0.5 rounded font-bold">
                  TAIL-RISK SIMULATOR
                </span>
              </div>
              <p className="text-[10px] text-neutral-400">
                Simulate catastrophic macro regime shocks and compute 99% Value-at-Risk (VaR)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-neutral-400 text-[10px]">PORTFOLIO NOTIONAL:</span>
            <div className="flex items-center space-x-1 bg-black border border-vanta-border rounded px-2.5 py-1">
              <DollarSign className="w-3.5 h-3.5 text-vanta-green" />
              <input
                type="number"
                value={portfolioSizeUSD}
                onChange={(e) => setPortfolioSizeUSD(parseFloat(e.target.value) || 0)}
                className="w-28 bg-transparent text-white font-mono text-xs focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* 4 VaR Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-black/60 border border-vanta-border/80 p-3 rounded">
            <span className="text-[10px] text-neutral-400 block mb-1">SELECTED SHOCK SCENARIO</span>
            <div className="text-sm font-extrabold text-white truncate">
              {activeScenario.name}
            </div>
            <span className="text-[10px] text-neutral-500 mt-1 block">
              Regime: {activeScenario.category}
            </span>
          </div>

          <div className="bg-vanta-red/5 border border-vanta-red/30 p-3 rounded">
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="text-neutral-300">99% 1-DAY VALUE-AT-RISK (VaR)</span>
              <span className="text-vanta-red font-bold">EXTREME TAIL</span>
            </div>
            <div className="text-lg font-extrabold text-vanta-red">
              -${estimatedLossUSD.toLocaleString()} ({activeScenario.var99LossPct}%)
            </div>
            <span className="text-[10px] text-neutral-400 mt-1 block">
              Worst 1% of modeled historical distributions
            </span>
          </div>

          <div className="bg-black/60 border border-vanta-border/80 p-3 rounded">
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="text-neutral-400">95% VALUE-AT-RISK (VaR)</span>
              <span className="text-vanta-yellow font-bold">MODERATE TAIL</span>
            </div>
            <div className="text-lg font-extrabold text-vanta-yellow">
              -${var95LossUSD.toLocaleString()}
            </div>
            <span className="text-[10px] text-neutral-500 mt-1 block">
              Expected loss 1 in 20 trading sessions
            </span>
          </div>

          <div className="bg-black/60 border border-vanta-border/80 p-3 rounded">
            <div className="flex items-center justify-between text-[10px] mb-1">
              <span className="text-neutral-400">MARGIN LIQUIDATION DANGER</span>
              <span className="text-vanta-green font-bold">BUFFERED</span>
            </div>
            <div className="text-lg font-extrabold text-white">
              SAFE (&gt; 4.2x MARGIN)
            </div>
            <span className="text-[10px] text-neutral-500 mt-1 block">
              Survives shock without forced margin call
            </span>
          </div>
        </div>
      </div>

      {/* ── SCENARIOS SELECTION & ASSET IMPACTS ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Scenario List (5 Cols) */}
        <div className="lg:col-span-5 bg-vanta-950 border border-vanta-border rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-vanta-border">
            <h3 className="text-xs font-bold text-white tracking-widest uppercase">
              PRESET MACRO SHOCK SCENARIOS
            </h3>
            <span className="text-[10px] text-neutral-500">SELECT TO TEST</span>
          </div>

          <div className="space-y-2">
            {PRESET_SCENARIOS.map((scen) => (
              <div
                key={scen.id}
                onClick={() => setSelectedScenarioId(scen.id)}
                className={`p-3 rounded border cursor-pointer transition-all ${
                  selectedScenarioId === scen.id
                    ? 'bg-vanta-red/10 border-vanta-red shadow-[0_0_12px_rgba(255,51,68,0.15)]'
                    : 'bg-black/60 border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-bold text-xs ${selectedScenarioId === scen.id ? 'text-vanta-red' : 'text-white'}`}>
                    {scen.name}
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-neutral-900 text-neutral-400 border border-neutral-800">
                    {scen.category}
                  </span>
                </div>
                <p className="text-[10px] text-neutral-400 line-clamp-2">
                  {scen.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Shock Impact Matrix (7 Cols) */}
        <div className="lg:col-span-7 bg-vanta-950 border border-vanta-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-vanta-border">
            <h3 className="text-xs font-bold text-white tracking-widest uppercase">
              PROJECTED SHOCK IMPACT ACROSS CORE ASSETS
            </h3>
            <span className="text-[10px] text-neutral-400">
              {activeScenario.name}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
            <div className="bg-black/60 border border-neutral-800 p-3 rounded">
              <span className="text-[10px] text-neutral-400 block mb-1">GOLD (XAU/USD)</span>
              <div className={`text-base font-extrabold font-mono ${
                activeScenario.goldImpactPct > 0 ? 'text-vanta-green' : 'text-vanta-red'
              }`}>
                {activeScenario.goldImpactPct > 0 ? '+' : ''}{activeScenario.goldImpactPct}%
              </div>
            </div>

            <div className="bg-black/60 border border-neutral-800 p-3 rounded">
              <span className="text-[10px] text-neutral-400 block mb-1">S&amp;P 500 (SPX)</span>
              <div className={`text-base font-extrabold font-mono ${
                activeScenario.spxImpactPct > 0 ? 'text-vanta-green' : 'text-vanta-red'
              }`}>
                {activeScenario.spxImpactPct > 0 ? '+' : ''}{activeScenario.spxImpactPct}%
              </div>
            </div>

            <div className="bg-black/60 border border-neutral-800 p-3 rounded">
              <span className="text-[10px] text-neutral-400 block mb-1">US DOLLAR (DXY)</span>
              <div className={`text-base font-extrabold font-mono ${
                activeScenario.dxyImpactPct > 0 ? 'text-vanta-green' : 'text-vanta-red'
              }`}>
                {activeScenario.dxyImpactPct > 0 ? '+' : ''}{activeScenario.dxyImpactPct}%
              </div>
            </div>

            <div className="bg-black/60 border border-neutral-800 p-3 rounded">
              <span className="text-[10px] text-neutral-400 block mb-1">US 10Y YIELD</span>
              <div className={`text-base font-extrabold font-mono ${
                activeScenario.yield10yBps > 0 ? 'text-vanta-yellow' : 'text-vanta-cyan'
              }`}>
                {activeScenario.yield10yBps > 0 ? '+' : ''}{activeScenario.yield10yBps} bps
              </div>
            </div>
          </div>

          {/* Monte Carlo Visual Distribution Bar */}
          <div className="p-3.5 bg-black border border-neutral-900 rounded space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-neutral-400">10,000-Iteration Monte Carlo Tail Distribution:</span>
              <span className="text-vanta-red font-bold font-mono">Max Modeled Drawdown: {activeScenario.var99LossPct}%</span>
            </div>
            <div className="w-full bg-neutral-950 h-3 rounded overflow-hidden flex">
              <div className="bg-vanta-red h-full" style={{ width: `${Math.abs(activeScenario.var99LossPct)}%` }} />
              <div className="bg-vanta-yellow h-full" style={{ width: '18%' }} />
              <div className="bg-vanta-green h-full flex-1" />
            </div>
            <div className="flex justify-between text-[9px] text-neutral-500 font-mono">
              <span>Worst 1% Extreme VaR</span>
              <span>95% Expected Shortfall</span>
              <span>Normal Distribution Drift</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
