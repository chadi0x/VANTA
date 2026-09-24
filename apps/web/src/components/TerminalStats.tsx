'use client';

import React from 'react';
import { EconomicEvent } from '../lib/types';
import { BarChart3, TrendingUp, TrendingDown, Layers, Server } from 'lucide-react';

interface TerminalStatsProps {
  events: EconomicEvent[];
}

export function TerminalStats({ events }: TerminalStatsProps) {
  const beats = events.filter((e) => e.deviation_type === 'BEAT').length;
  const misses = events.filter((e) => e.deviation_type === 'MISS').length;
  const highVol = events.filter((e) => e.impact_level === 'High').length;
  const pending = events.filter((e) => e.deviation_type === 'PENDING').length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono text-xs">
      {/* Stat 1 */}
      <div className="bg-vanta-900 border border-vanta-border p-2.5 rounded">
        <div className="flex items-center justify-between text-neutral-400 mb-1">
          <span>MONITORED EVENTS</span>
          <Layers className="w-3.5 h-3.5 text-vanta-cyan" />
        </div>
        <div className="text-lg font-bold text-white">{events.length}</div>
        <div className="text-[10px] text-neutral-500">{pending} Pending Release</div>
      </div>

      {/* Stat 2 */}
      <div className="bg-vanta-900 border border-vanta-border p-2.5 rounded">
        <div className="flex items-center justify-between text-neutral-400 mb-1">
          <span>BULLISH BEATS</span>
          <TrendingUp className="w-3.5 h-3.5 text-vanta-green" />
        </div>
        <div className="text-lg font-bold text-vanta-green">{beats}</div>
        <div className="text-[10px] text-neutral-500">Above Forecast</div>
      </div>

      {/* Stat 3 */}
      <div className="bg-vanta-900 border border-vanta-border p-2.5 rounded">
        <div className="flex items-center justify-between text-neutral-400 mb-1">
          <span>BEARISH MISSES</span>
          <TrendingDown className="w-3.5 h-3.5 text-vanta-red" />
        </div>
        <div className="text-lg font-bold text-vanta-red">{misses}</div>
        <div className="text-[10px] text-neutral-500">Below Forecast</div>
      </div>

      {/* Stat 4 */}
      <div className="bg-vanta-900 border border-vanta-border p-2.5 rounded">
        <div className="flex items-center justify-between text-neutral-400 mb-1">
          <span>HIGH VOL TARGETS</span>
          <Server className="w-3.5 h-3.5 text-vanta-yellow" />
        </div>
        <div className="text-lg font-bold text-vanta-yellow">{highVol}</div>
        <div className="text-[10px] text-neutral-500">Market Moving Volatility</div>
      </div>
    </div>
  );
}
