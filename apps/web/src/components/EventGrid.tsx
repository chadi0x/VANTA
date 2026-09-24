'use client';

import React, { useState } from 'react';
import { EconomicEvent, ImpactLevel, DeviationType } from '../lib/types';
import { Filter, ArrowUpRight, ArrowDownRight, Minus, Clock, ExternalLink } from 'lucide-react';

interface EventGridProps {
  events: EconomicEvent[];
}

export function EventGrid({ events }: EventGridProps) {
  const [selectedAsset, setSelectedAsset] = useState<string>('ALL');
  const [selectedImpact, setSelectedImpact] = useState<string>('ALL');
  const [selectedDeviation, setSelectedDeviation] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const currencies = ['ALL', 'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF'];

  const filteredEvents = events.filter((ev) => {
    if (selectedAsset !== 'ALL' && ev.asset !== selectedAsset) return false;
    if (selectedImpact !== 'ALL' && ev.impact_level !== selectedImpact) return false;
    if (selectedDeviation !== 'ALL' && ev.deviation_type !== selectedDeviation) return false;
    if (searchQuery.trim() && !ev.headline.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  const getImpactBadge = (impact: ImpactLevel) => {
    switch (impact) {
      case 'High':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-vanta-red/20 text-vanta-red border border-vanta-red/40 animate-pulse">
            HIGH VOL
          </span>
        );
      case 'Medium':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-vanta-orange/20 text-vanta-orange border border-vanta-orange/40">
            MED VOL
          </span>
        );
      case 'Low':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-neutral-800 text-neutral-400 border border-neutral-700">
            LOW VOL
          </span>
        );
      default:
        return <span className="text-[10px] text-neutral-500">NONE</span>;
    }
  };

  const getDeviationBadge = (type: DeviationType, score?: number) => {
    switch (type) {
      case 'BEAT':
        return (
          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-vanta-green/15 text-vanta-green border border-vanta-green/30">
            <ArrowUpRight className="w-3 h-3" />
            <span>BEAT {score !== undefined && score !== 0 ? `(+${(score * 100).toFixed(0)}%)` : ''}</span>
          </span>
        );
      case 'MISS':
        return (
          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-vanta-red/15 text-vanta-red border border-vanta-red/30">
            <ArrowDownRight className="w-3 h-3" />
            <span>MISS {score !== undefined && score !== 0 ? `(${(score * 100).toFixed(0)}%)` : ''}</span>
          </span>
        );
      case 'NEUTRAL':
        return (
          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-vanta-yellow/15 text-vanta-yellow border border-vanta-yellow/30">
            <Minus className="w-3 h-3" />
            <span>IN-LINE</span>
          </span>
        );
      case 'PENDING':
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-neutral-400 bg-neutral-900 border border-neutral-800">
            <Clock className="w-3 h-3 text-neutral-500" />
            <span>PENDING</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-vanta-950 border border-vanta-border rounded font-mono text-xs flex flex-col h-full overflow-hidden">
      {/* Terminal Filter Controls */}
      <div className="border-b border-vanta-border bg-vanta-900/90 p-3 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Asset Tabs */}
          <div className="flex items-center space-x-1 bg-black/60 p-0.5 rounded border border-vanta-border">
            {currencies.map((curr) => (
              <button
                key={curr}
                onClick={() => setSelectedAsset(curr)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                  selectedAsset === curr
                    ? 'bg-vanta-green text-black font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {curr}
              </button>
            ))}
          </div>

          {/* Impact Filter */}
          <select
            value={selectedImpact}
            onChange={(e) => setSelectedImpact(e.target.value)}
            className="bg-black border border-vanta-border text-neutral-300 px-2 py-1 rounded text-xs focus:outline-none focus:border-vanta-cyan"
          >
            <option value="ALL">All Impacts</option>
            <option value="High">High Volatility Only</option>
            <option value="Medium">Medium Volatility</option>
            <option value="Low">Low Volatility</option>
          </select>

          {/* Deviation Filter */}
          <select
            value={selectedDeviation}
            onChange={(e) => setSelectedDeviation(e.target.value)}
            className="bg-black border border-vanta-border text-neutral-300 px-2 py-1 rounded text-xs focus:outline-none focus:border-vanta-cyan"
          >
            <option value="ALL">All Outcomes</option>
            <option value="BEAT">Beats (Bullish)</option>
            <option value="MISS">Misses (Bearish)</option>
            <option value="NEUTRAL">In-Line</option>
            <option value="PENDING">Pending Release</option>
          </select>
        </div>

        {/* Search */}
        <div className="w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search economic indicator..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 bg-black border border-vanta-border px-2.5 py-1 rounded text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-vanta-cyan"
          />
        </div>
      </div>

      {/* Terminal Data Table */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-vanta-border bg-vanta-900 text-neutral-400 font-semibold tracking-wider text-[11px]">
              <th className="py-2.5 px-3">TIME (UTC)</th>
              <th className="py-2.5 px-3">ASSET</th>
              <th className="py-2.5 px-3">IMPACT</th>
              <th className="py-2.5 px-4 min-w-[240px]">MACROECONOMIC INDICATOR</th>
              <th className="py-2.5 px-3 text-right">ACTUAL</th>
              <th className="py-2.5 px-3 text-right">FORECAST</th>
              <th className="py-2.5 px-3 text-right">PREVIOUS</th>
              <th className="py-2.5 px-3">DEVIATION / SURPRISE</th>
              <th className="py-2.5 px-3 text-neutral-500">SOURCE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-900/90">
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-neutral-500">
                  NO MACROECONOMIC DATA MATCHES CURRENT TERMINAL CRITERIA
                </td>
              </tr>
            ) : (
              filteredEvents.map((ev) => {
                const isBeat = ev.deviation_type === 'BEAT';
                const isMiss = ev.deviation_type === 'MISS';

                return (
                  <tr
                    key={ev.id}
                    className="hover:bg-vanta-900/60 transition-colors group cursor-default"
                  >
                    {/* Time */}
                    <td className="py-2 px-3 text-neutral-400 whitespace-nowrap">
                      {new Date(ev.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                      })}
                    </td>

                    {/* Currency / Asset */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className="font-bold text-white bg-black/80 border border-neutral-800 px-1.5 py-0.5 rounded text-[11px]">
                        {ev.asset}
                      </span>
                    </td>

                    {/* Impact Level */}
                    <td className="py-2 px-3 whitespace-nowrap">{getImpactBadge(ev.impact_level)}</td>

                    {/* Headline */}
                    <td className="py-2 px-4 font-medium text-neutral-200">{ev.headline}</td>

                    {/* Actual */}
                    <td
                      className={`py-2 px-3 text-right font-bold whitespace-nowrap ${
                        isBeat
                          ? 'text-vanta-green'
                          : isMiss
                          ? 'text-vanta-red'
                          : ev.actual_metric
                          ? 'text-white'
                          : 'text-neutral-600'
                      }`}
                    >
                      {ev.actual_metric || '--'}
                    </td>

                    {/* Forecast */}
                    <td className="py-2 px-3 text-right text-neutral-300 whitespace-nowrap font-medium">
                      {ev.forecast || '--'}
                    </td>

                    {/* Previous */}
                    <td className="py-2 px-3 text-right text-neutral-400 whitespace-nowrap">
                      {ev.previous || '--'}
                    </td>

                    {/* Deviation Badge */}
                    <td className="py-2 px-3 whitespace-nowrap">
                      {getDeviationBadge(ev.deviation_type, ev.deviation_score)}
                    </td>

                    {/* Source */}
                    <td className="py-2 px-3 whitespace-nowrap text-neutral-500 text-[10px]">
                      {ev.source}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Grid Status Footer */}
      <div className="border-t border-vanta-border bg-vanta-900/80 px-3 py-1.5 flex justify-between items-center text-[10px] text-neutral-500">
        <div>TOTAL MONITORED RELEASES: {filteredEvents.length}</div>
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-vanta-green" />
            <span>BEAT = BULLISH SURPRISE</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-vanta-red" />
            <span>MISS = BEARISH SURPRISE</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-vanta-yellow" />
            <span>IN-LINE</span>
          </span>
        </div>
      </div>
    </div>
  );
}
