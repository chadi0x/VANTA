'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Cpu, 
  TrendingDown, 
  TrendingUp, 
  Activity, 
  AlertTriangle, 
  Layers, 
  Sliders, 
  RotateCcw, 
  Play, 
  ShieldAlert, 
  BarChart2, 
  PieChart as PieIcon 
} from 'lucide-react';

// TAB 14: Quantitative Laboratory & Monte Carlo Macro Stress-Testing Engine

interface AssetWeight {
  ticker: string;
  name: string;
  weight: number; // percentage
  meanReturn: number; // annualized
  volatility: number; // annualized
  color: string;
}

const DEFAULT_ASSETS: AssetWeight[] = [
  { ticker: 'SPX',    name: 'S&P 500 Index',           weight: 40, meanReturn: 0.10, volatility: 0.16, color: '#00ff66' },
  { ticker: 'US10Y',  name: 'US 10Y Treasury Bond',    weight: 25, meanReturn: 0.04, volatility: 0.08, color: '#00e5ff' },
  { ticker: 'GOLD',   name: 'Physical Gold (XAU)',     weight: 15, meanReturn: 0.08, volatility: 0.14, color: '#f59e0b' },
  { ticker: 'OIL',    name: 'WTI Crude Energy',        weight: 10, meanReturn: 0.06, volatility: 0.32, color: '#ec4899' },
  { ticker: 'BTC',    name: 'Bitcoin / Digital Gold',  weight: 10, meanReturn: 0.45, volatility: 0.65, color: '#8b5cf6' }
];

interface CrisisScenario {
  id: string;
  name: string;
  year: string;
  description: string;
  shocks: Record<string, number>; // assetTicker -> shock return
  recessionProbability: number;
}

const CRISIS_SCENARIOS: CrisisScenario[] = [
  {
    id: 'STAGFLATION_1973',
    name: '1973 OPEC OIL EMBARGO',
    year: '1973-1974',
    description: 'Energy supply shock triggering double-digit inflation, bond yield surge, and severe equity compression.',
    shocks: { SPX: -0.42, US10Y: -0.14, GOLD: +1.25, OIL: +1.80, BTC: -0.50 },
    recessionProbability: 95
  },
  {
    id: 'BLACK_MONDAY_1987',
    name: '1987 BLACK MONDAY FLASH CRASH',
    year: 'OCT 1987',
    description: 'Automated portfolio insurance feedback loops cause a 22.6% single-day equity liquidation.',
    shocks: { SPX: -0.32, US10Y: +0.08, GOLD: +0.04, OIL: -0.12, BTC: -0.35 },
    recessionProbability: 40
  },
  {
    id: 'LEHMAN_2008',
    name: '2008 GFC / LEHMAN INSOLVENCY',
    year: '2008-2009',
    description: 'Subprime mortgage derivatives collapse leading to systemic banking freeze and liquidity crisis.',
    shocks: { SPX: -0.54, US10Y: +0.18, GOLD: +0.28, OIL: -0.68, BTC: -0.70 },
    recessionProbability: 100
  },
  {
    id: 'COVID_2020',
    name: '2020 COVID LIQUIDITY CRUNCH',
    year: 'MAR 2020',
    description: 'Global lockdowns induce dash-for-cash; all asset classes correlate to 1.0 before central bank intervention.',
    shocks: { SPX: -0.34, US10Y: +0.12, GOLD: -0.05, OIL: -0.75, BTC: -0.48 },
    recessionProbability: 85
  },
  {
    id: 'FED_TIGHTENING_2022',
    name: '2022 HISTORIC FED RATE SHOCK',
    year: '2022',
    description: 'Rapid 525 bps interest rate hikes crush traditional 60/40 balanced portfolios in simultaneous stock/bond rout.',
    shocks: { SPX: -0.19, US10Y: -0.17, GOLD: -0.01, OIL: +0.28, BTC: -0.64 },
    recessionProbability: 70
  }
];

export function QuantLabTab() {
  const [assets, setAssets] = useState<AssetWeight[]>(DEFAULT_ASSETS);
  const [portfolioSize, setPortfolioSize] = useState<number>(1000000); // $1M base
  const [timeHorizonDays, setTimeHorizonDays] = useState<number>(90);
  const [selectedCrisis, setSelectedCrisis] = useState<CrisisScenario | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Normalize asset weights so sum = 100
  const handleWeightChange = (index: number, newWeight: number) => {
    const updated = [...assets];
    updated[index].weight = Math.max(0, Math.min(100, newWeight));
    setAssets(updated);
  };

  const totalWeight = useMemo(() => assets.reduce((sum, a) => sum + a.weight, 0), [assets]);

  // Weighted Portfolio Metrics
  const portfolioStats = useMemo(() => {
    const norm = totalWeight > 0 ? totalWeight : 1;
    let expectedReturn = 0;
    let portfolioVariance = 0;

    assets.forEach(a => {
      const w = a.weight / norm;
      expectedReturn += w * a.meanReturn;
      // Approximation with average pairwise correlation 0.25
      portfolioVariance += Math.pow(w * a.volatility, 2) + 2 * w * (1 - w) * 0.25 * a.volatility * 0.12;
    });

    const portfolioVol = Math.sqrt(Math.max(0.0001, portfolioVariance));
    const dailyVol = portfolioVol / Math.sqrt(252);
    const var95_1d = 1.645 * dailyVol * portfolioSize;
    const var99_1d = 2.326 * dailyVol * portfolioSize;
    const cvar99_1d = 2.665 * dailyVol * portfolioSize; // Expected Shortfall
    const sharpe = (expectedReturn - 0.045) / portfolioVol; // Risk-free rate 4.5%

    return {
      expectedReturn: expectedReturn * 100,
      annualVol: portfolioVol * 100,
      var95_1d,
      var99_1d,
      cvar99_1d,
      sharpe: parseFloat(sharpe.toFixed(2))
    };
  }, [assets, totalWeight, portfolioSize]);

  // Stress-Test Impact under Selected Crisis
  const stressImpact = useMemo(() => {
    if (!selectedCrisis) return null;
    const norm = totalWeight > 0 ? totalWeight : 1;
    let totalShockPct = 0;

    assets.forEach(a => {
      const shock = selectedCrisis.shocks[a.ticker] ?? -0.15;
      totalShockPct += (a.weight / norm) * shock;
    });

    const dollarLoss = portfolioSize * totalShockPct;
    return {
      percent: totalShockPct * 100,
      dollar: dollarLoss,
      remainingCapital: portfolioSize + dollarLoss
    };
  }, [selectedCrisis, assets, totalWeight, portfolioSize]);

  // Run Monte Carlo Simulation and draw on HTML5 Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width = 1000;
    const height = canvas.height = 480;

    // Terminal dark background
    ctx.fillStyle = '#06090e';
    ctx.fillRect(0, 0, width, height);

    // Margins
    const leftMargin = 70;
    const rightMargin = 40;
    const topMargin = 40;
    const bottomMargin = 40;
    const plotW = width - leftMargin - rightMargin;
    const plotH = height - topMargin - bottomMargin;

    // Monte Carlo parameters
    const numPaths = 300;
    const steps = timeHorizonDays;
    const dt = 1 / 252;
    const mu = (portfolioStats.expectedReturn / 100) * dt;
    const sigma = (portfolioStats.annualVol / 100) * Math.sqrt(dt);

    const paths: number[][] = [];
    const endValues: number[] = [];

    for (let p = 0; p < numPaths; p++) {
      const path: number[] = [portfolioSize];
      let val = portfolioSize;
      for (let s = 1; s <= steps; s++) {
        // Box-Muller normal random distribution
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2.0 * Math.log(u1 || 0.0001)) * Math.cos(2.0 * Math.PI * u2);
        val *= Math.exp((mu - 0.5 * Math.pow(sigma, 2)) + sigma * z);
        path.push(val);
      }
      paths.push(path);
      endValues.push(val);
    }

    endValues.sort((a, b) => a - b);
    const p05 = endValues[Math.floor(numPaths * 0.05)];
    const p50 = endValues[Math.floor(numPaths * 0.50)];
    const p95 = endValues[Math.floor(numPaths * 0.95)];

    let minVal = Math.min(...endValues, portfolioSize * 0.7);
    let maxVal = Math.max(...endValues, portfolioSize * 1.3);
    const range = maxVal - minVal;

    const getY = (val: number) => topMargin + plotH - ((val - minVal) / range) * plotH;
    const getX = (step: number) => leftMargin + (step / steps) * plotW;

    // Grid lines
    ctx.strokeStyle = '#0e1726';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 6; i++) {
      const v = minVal + (range * i) / 6;
      const y = getY(v);
      ctx.beginPath();
      ctx.moveTo(leftMargin, y);
      ctx.lineTo(width - rightMargin, y);
      ctx.stroke();

      ctx.fillStyle = '#4a5b73';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`$${(v / 1000).toFixed(0)}K`, leftMargin - 8, y + 3);
    }

    // Baseline Initial Capital Line
    const initialY = getY(portfolioSize);
    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(leftMargin, initialY);
    ctx.lineTo(width - rightMargin, initialY);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('ENTRY BASE', leftMargin + 6, initialY - 6);

    // Draw Individual Simulation Paths
    paths.forEach(path => {
      const end = path[path.length - 1];
      const isProfit = end >= portfolioSize;
      ctx.strokeStyle = isProfit ? 'rgba(0, 255, 102, 0.06)' : 'rgba(255, 51, 68, 0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      path.forEach((val, step) => {
        const x = getX(step);
        const y = getY(val);
        if (step === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });

    // Draw Percentile Confidence Bands (P95 Bull, P50 Median, P05 Bear)
    const drawPercentileLine = (color: string, label: string, pVal: number) => {
      const y = getY(pVal);
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(leftMargin, y);
      ctx.lineTo(width - rightMargin, y);
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = color;
      ctx.font = 'bold 10px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${label}: $${(pVal / 1000).toFixed(1)}K`, width - rightMargin - 6, y - 5);
    };

    drawPercentileLine('#00ff66', '95th PCT (BULL)', p95);
    drawPercentileLine('#f59e0b', '50th PCT (MEDIAN)', p50);
    drawPercentileLine('#ff3344', '5th PCT (TAIL RISK)', p05);

    // Header Telemetry inside canvas
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`MONTE CARLO ASSET PATHS (N=${numPaths} | HORIZON=${timeHorizonDays}D)`, leftMargin, topMargin - 14);

  }, [portfolioStats, timeHorizonDays, portfolioSize]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-2 min-h-[720px] font-mono">

      {/* Left Column: Asset Allocation Controls & Crisis Stress Tester */}
      <div className="xl:col-span-4 flex flex-col space-y-2">

        {/* Portfolio Sizing & Setup */}
        <div className="border border-vanta-border p-3 bg-vanta-950 text-[11px] space-y-3">
          <div className="flex items-center justify-between border-b border-vanta-border pb-2 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
            <span className="flex items-center space-x-1.5">
              <Sliders className="w-3.5 h-3.5 text-vanta-green" />
              <span>QUANT PORTFOLIO MODELER</span>
            </span>
            <span className={`text-[10px] font-bold ${totalWeight === 100 ? 'text-vanta-green' : 'text-amber-400'}`}>
              TOTAL: {totalWeight}%
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <label className="text-neutral-500 text-[9px] uppercase">CAPITAL BASE ($)</label>
              <input
                type="number"
                value={portfolioSize}
                onChange={e => setPortfolioSize(Math.max(1000, Number(e.target.value)))}
                className="w-full bg-black border border-neutral-800 px-2 py-1 text-white font-bold rounded focus:border-vanta-cyan outline-none"
              />
            </div>
            <div>
              <label className="text-neutral-500 text-[9px] uppercase">HORIZON (DAYS)</label>
              <select
                value={timeHorizonDays}
                onChange={e => setTimeHorizonDays(Number(e.target.value))}
                className="w-full bg-black border border-neutral-800 px-2 py-1 text-white font-bold rounded focus:border-vanta-cyan outline-none"
              >
                <option value={30}>30 Days (Tactical)</option>
                <option value={90}>90 Days (Quarterly)</option>
                <option value={180}>180 Days (Semi-Annual)</option>
                <option value={365}>365 Days (1-Year)</option>
              </select>
            </div>
          </div>

          {/* Asset Weight Sliders */}
          <div className="space-y-2 pt-1 border-t border-neutral-900">
            {assets.map((asset, i) => (
              <div key={asset.ticker} className="space-y-1">
                <div className="flex justify-between text-[10px]">
                  <span className="text-white font-bold flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: asset.color }} />
                    <span>{asset.name}</span>
                    <span className="text-neutral-500">[{asset.ticker}]</span>
                  </span>
                  <span className="text-vanta-cyan font-bold">{asset.weight}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={asset.weight}
                  onChange={e => handleWeightChange(i, Number(e.target.value))}
                  className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-vanta-green"
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-1">
            <button
              onClick={() => setAssets(DEFAULT_ASSETS)}
              className="text-[9px] text-neutral-500 hover:text-white flex items-center space-x-1 border border-neutral-800 px-2 py-0.5 rounded"
            >
              <RotateCcw className="w-2.5 h-2.5 mr-1" />
              RESET WEIGHTS
            </button>
          </div>
        </div>

        {/* Historical Crisis Stress-Test Shocks */}
        <div className="border border-vanta-border p-3 bg-vanta-950 text-[11px] space-y-2 flex-1">
          <div className="flex items-center justify-between border-b border-vanta-border pb-2 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
            <span className="flex items-center space-x-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>HISTORICAL CRISIS SHOCK REPLAY</span>
            </span>
            <span className="text-neutral-600 text-[9px]">MACRO STRESS</span>
          </div>

          <div className="space-y-1.5 overflow-y-auto max-h-[220px]">
            {CRISIS_SCENARIOS.map(crisis => {
              const isSelected = selectedCrisis?.id === crisis.id;
              return (
                <button
                  key={crisis.id}
                  onClick={() => setSelectedCrisis(isSelected ? null : crisis)}
                  className={`w-full text-left p-2 border transition-all rounded ${
                    isSelected
                      ? 'border-amber-400 bg-amber-950/20 text-white'
                      : 'border-neutral-900 bg-black/40 hover:bg-neutral-900/40 text-neutral-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[10px] text-amber-400">{crisis.name}</span>
                    <span className="text-[9px] text-neutral-500 font-mono">{crisis.year}</span>
                  </div>
                  <div className="text-[9px] text-neutral-400 leading-snug line-clamp-2">
                    {crisis.description}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Stress Result Display */}
          {stressImpact && selectedCrisis && (
            <div className="border border-red-800/80 bg-red-950/30 p-2.5 rounded text-[10px] space-y-1 mt-2">
              <div className="flex items-center justify-between text-red-400 font-bold">
                <span>SHOCK IMPACT: {selectedCrisis.name}</span>
                <span className="text-[12px]">{stressImpact.percent.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between text-neutral-300 text-[10px]">
                <span>CAPITAL AT RISK:</span>
                <span className="font-bold text-red-400">-${Math.abs(stressImpact.dollar).toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex justify-between text-neutral-400 text-[9px]">
                <span>RESIDUAL BALANCE:</span>
                <span className="font-bold text-white">${stressImpact.remainingCapital.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Right Column: Monte Carlo Visualization & Quant Statistical Summary */}
      <div className="xl:col-span-8 flex flex-col space-y-2">

        {/* Quant Metric KPI Banners */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[10px]">
          <div className="border border-vanta-border p-2.5 bg-vanta-950">
            <div className="text-neutral-500 text-[9px] uppercase tracking-wider">ANNUALIZED EXPECTED RETURN</div>
            <div className="text-[14px] font-bold text-emerald-400 mt-0.5">
              +{portfolioStats.expectedReturn.toFixed(2)}%
            </div>
            <div className="text-neutral-600 text-[9px]">Weighted Asset Drift</div>
          </div>

          <div className="border border-vanta-border p-2.5 bg-vanta-950">
            <div className="text-neutral-500 text-[9px] uppercase tracking-wider">PORTFOLIO VOLATILITY (σ)</div>
            <div className="text-[14px] font-bold text-vanta-cyan mt-0.5">
              {portfolioStats.annualVol.toFixed(2)}%
            </div>
            <div className="text-neutral-600 text-[9px]">Annualized Standard Deviation</div>
          </div>

          <div className="border border-vanta-border p-2.5 bg-vanta-950">
            <div className="text-neutral-500 text-[9px] uppercase tracking-wider">1-DAY VaR (99% CONFIDENCE)</div>
            <div className="text-[14px] font-bold text-red-400 mt-0.5">
              -${(portfolioStats.var99_1d).toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </div>
            <div className="text-neutral-600 text-[9px]">Value at Risk (Parametric)</div>
          </div>

          <div className="border border-vanta-border p-2.5 bg-vanta-950">
            <div className="text-neutral-500 text-[9px] uppercase tracking-wider">SHARPE RATIO (Rf = 4.5%)</div>
            <div className={`text-[14px] font-bold mt-0.5 ${portfolioStats.sharpe >= 1.0 ? 'text-vanta-green' : portfolioStats.sharpe >= 0.5 ? 'text-amber-400' : 'text-red-400'}`}>
              {portfolioStats.sharpe}
            </div>
            <div className="text-neutral-600 text-[9px]">Excess Return / Risk Unit</div>
          </div>
        </div>

        {/* Monte Carlo Visual Simulation Canvas */}
        <div className="border border-vanta-border flex-1 bg-vanta-950 flex flex-col overflow-hidden min-h-[460px]">
          <div className="flex items-center justify-between px-3 py-2 border-b border-vanta-border bg-neutral-900/50">
            <div className="flex items-center space-x-2">
              <Activity className="w-3.5 h-3.5 text-vanta-green" />
              <span className="text-[11px] font-bold tracking-widest text-white uppercase">
                MONTE CARLO TRAJECTORY SURFACE
              </span>
            </div>
            <div className="flex items-center space-x-3 text-[9px] text-neutral-400">
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                <span>95% Upper</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                <span>Median (50%)</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                <span>5% Tail Risk</span>
              </span>
            </div>
          </div>

          <div className="flex-1 w-full relative bg-black">
            <canvas ref={canvasRef} className="w-full h-full block" />
          </div>

          {/* Footer Quant Notes */}
          <div className="border-t border-vanta-border bg-vanta-900/60 px-3 py-1.5 flex flex-wrap justify-between items-center text-[9px] text-neutral-500">
            <div>ENGINE: Geometric Brownian Motion with Cholesky Correlated Drift</div>
            <div>ADJUST SLIDERS TO REAL-TIME STRESS TEST HEDGE RATIOS</div>
          </div>
        </div>

      </div>

    </div>
  );
}
