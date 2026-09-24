'use client';

import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { triggerCotSimulation } from '../lib/api';
import { CotAnalysisResult } from '../lib/types';
import {
  Coins,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Flame,
  ShieldAlert,
  Zap,
  ArrowRight,
  Gauge,
  Layers,
  Scale
} from 'lucide-react';

interface CotMatrixProps {
  onSelectTicker: (ticker: string) => void;
  selectedTicker: string;
}

export function CotMatrix({ onSelectTicker, selectedTicker }: CotMatrixProps) {
  const { cotData } = useSocket();
  const [simulating, setSimulating] = useState(false);

  const gold = cotData?.reports?.GOLD;
  const silver = cotData?.reports?.SILVER;

  const handleSimulateCot = async (scenario: 'OVERCROWDED' | 'STANDARD') => {
    try {
      setSimulating(true);
      await triggerCotSimulation(scenario);
    } catch (e) {
      console.error('COT simulation error', e);
    } finally {
      setTimeout(() => setSimulating(false), 800);
    }
  };

  const renderCotCard = (report?: CotAnalysisResult) => {
    if (!report) {
      return (
        <div className="bg-black/60 border border-neutral-800 p-4 rounded text-center text-neutral-500">
          LOADING CFTC ORDERFLOW METRICS...
        </div>
      );
    }

    const isGold = report.assetName === 'GOLD';
    const isChartActive = report.tradingViewSymbol === selectedTicker;
    const isOvercrowded = report.percentile52w >= 90.0 || report.percentile52w <= 10.0;
    const isBullish = report.wowNetDelta >= 0;

    return (
      <div
        className={`bg-vanta-900 border rounded p-3 transition-all ${
          isOvercrowded
            ? 'border-vanta-red/70 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
            : isChartActive
            ? 'border-vanta-green/50 bg-vanta-green/5'
            : 'border-vanta-border hover:border-neutral-700'
        }`}
      >
        {/* Card Header: Asset, Code & Quick Chart Link */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Coins className={`w-4 h-4 ${isGold ? 'text-amber-400' : 'text-slate-300'}`} />
            <span className="font-bold text-white text-xs tracking-wider">
              {report.assetName} ({report.symbol})
            </span>
            <span className="text-[10px] text-neutral-500">CFTC #{report.assetCode}</span>
          </div>

          <button
            onClick={() => onSelectTicker(report.tradingViewSymbol)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all flex items-center space-x-1 ${
              isChartActive
                ? 'bg-vanta-cyan/20 border-vanta-cyan text-vanta-cyan'
                : 'bg-black/60 border-neutral-800 text-neutral-300 hover:text-vanta-cyan hover:border-vanta-cyan/50'
            }`}
          >
            <span>CHART</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Overcrowded Reversal Alert Flag */}
        {report.isExtremeAlert && (
          <div className="mb-2 bg-vanta-red/20 border border-vanta-red text-vanta-red px-2 py-1 rounded text-[10px] font-bold flex items-center space-x-1.5 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>OVERCROWDED POSITIONING // REVERSAL RISK</span>
          </div>
        )}

        {/* Speculator Net Position & WoW Delta */}
        <div className="grid grid-cols-2 gap-2 mb-2.5 bg-black/70 p-2 rounded border border-neutral-900">
          <div>
            <div className="text-[10px] text-neutral-400">SPECULATOR NET:</div>
            <div className="text-sm font-bold text-white">
              {report.speculatorNet >= 0 ? '+' : ''}
              {report.speculatorNet.toLocaleString()}
            </div>
            <div className="text-[9px] text-neutral-500">
              Longs: {report.speculatorLongs.toLocaleString()} | Shorts: {report.speculatorShorts.toLocaleString()}
            </div>
          </div>

          <div>
            <div className="text-[10px] text-neutral-400">WoW DELTA:</div>
            <div
              className={`text-sm font-bold flex items-center space-x-1 ${
                isBullish ? 'text-vanta-green' : 'text-vanta-red'
              }`}
            >
              {isBullish ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              <span>
                {report.wowNetDelta >= 0 ? '+' : ''}
                {report.wowNetDelta.toLocaleString()}
              </span>
            </div>
            <div className="text-[9px] text-neutral-500">
              {report.wowPercentageChange >= 0 ? '+' : ''}
              {report.wowPercentageChange}% shift WoW
            </div>
          </div>
        </div>

        {/* 52-Week Speculative Percentile Gauge */}
        <div className="mb-3">
          <div className="flex justify-between items-center text-[10px] mb-1">
            <span className="text-neutral-400 flex items-center space-x-1">
              <Gauge className="w-3 h-3 text-vanta-cyan" />
              <span>52-WEEK PERCENTILE:</span>
            </span>
            <span
              className={`font-bold ${
                report.percentile52w >= 90.0
                  ? 'text-vanta-red font-extrabold'
                  : report.percentile52w <= 10.0
                  ? 'text-amber-400 font-extrabold'
                  : 'text-vanta-green'
              }`}
            >
              {report.percentile52w}% {report.percentile52w >= 90.0 ? '(EXTREME FROTH)' : ''}
            </span>
          </div>

          {/* Visual Gauge Bar with 10% and 90% Threshold Markers */}
          <div className="w-full bg-neutral-900 h-2 rounded-full overflow-hidden relative border border-neutral-800">
            {/* 10% Marker line */}
            <div className="absolute top-0 bottom-0 left-[10%] w-[1px] bg-neutral-600 z-10" />
            {/* 90% Marker line */}
            <div className="absolute top-0 bottom-0 left-[90%] w-[1px] bg-vanta-red z-10" />

            {/* Filled Progress Bar */}
            <div
              className={`h-full transition-all duration-500 ${
                report.percentile52w >= 90.0
                  ? 'bg-gradient-to-r from-vanta-green via-amber-400 to-vanta-red'
                  : report.percentile52w <= 10.0
                  ? 'bg-amber-400'
                  : 'bg-gradient-to-r from-emerald-600 to-vanta-green'
              }`}
              style={{ width: `${Math.max(4, Math.min(100, report.percentile52w))}%` }}
            />
          </div>
          <div className="flex justify-between text-[8px] text-neutral-600 mt-0.5">
            <span>0% (Min)</span>
            <span>50% (Median)</span>
            <span>90% (Froth)</span>
            <span>100%</span>
          </div>
        </div>

        {/* Commercial Hedgers Breakdown */}
        <div className="flex justify-between items-center text-[10px] bg-black/40 px-2 py-1 rounded border border-neutral-900 mb-2.5">
          <span className="text-neutral-400 flex items-center space-x-1">
            <Scale className="w-3 h-3 text-neutral-500" />
            <span>COMMERCIAL HEDGERS NET:</span>
          </span>
          <span className="font-bold text-neutral-300">
            {report.commercialNet.toLocaleString()}
          </span>
        </div>

        {/* Algorithmic Opinion Summary Box */}
        <div className="bg-black/80 border border-neutral-800 p-2 rounded text-[11px] text-neutral-300 leading-relaxed">
          <div className="text-[9px] font-bold text-vanta-cyan uppercase tracking-wider mb-1 flex items-center space-x-1">
            <ShieldAlert className="w-3 h-3" />
            <span>INSTITUTIONAL VERDICT // {report.verdict}</span>
          </div>
          <p className="text-[10px] text-neutral-300">{report.opinionSummary}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-vanta-950 border border-vanta-border rounded font-mono text-xs flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="border-b border-vanta-border bg-vanta-900/90 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Scale className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-bold text-white tracking-wider">COT &amp; ORDERFLOW MATRIX</span>
        </div>

        {/* Quick Simulation Triggers */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => handleSimulateCot('OVERCROWDED')}
            disabled={simulating}
            className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-900 hover:bg-neutral-800 border border-vanta-red/40 text-vanta-red transition-all"
            title="Inject an overcrowded Gold long release"
          >
            FROTH SHOCK
          </button>
          <button
            onClick={() => handleSimulateCot('STANDARD')}
            disabled={simulating}
            className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-900 hover:bg-neutral-800 border border-vanta-green/40 text-vanta-green transition-all"
            title="Inject standard institutional accumulation"
          >
            ACCUM SHOCK
          </button>
        </div>
      </div>

      {/* COT Reports Container */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-3">
        {/* Gold COMEX Card */}
        {renderCotCard(gold)}

        {/* Silver COMEX Card */}
        {renderCotCard(silver)}

        {/* Macro Orderflow Guide */}
        <div className="bg-black/60 border border-neutral-900 p-2.5 rounded text-[10px] text-neutral-500 space-y-1">
          <div className="font-bold text-neutral-400">CFTC DISAGGREGATED INTERPRETATION:</div>
          <div>• Speculators (Managed Money): Trend-followers &amp; momentum funds.</div>
          <div>• Commercials: Producers &amp; bullion banks hedging physical supply.</div>
          <div>• Percentile &gt; 90% indicates historic long exhaustion &amp; squeeze risk.</div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-vanta-border bg-vanta-900/80 px-3 py-1 flex justify-between items-center text-[10px] text-neutral-500">
        <div>WEEKLY COMEX DISAGGREGATED DATA</div>
        <div className="text-vanta-green font-bold">REPORTS SYNCED</div>
      </div>
    </div>
  );
}
