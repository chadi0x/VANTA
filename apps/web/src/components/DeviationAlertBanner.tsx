'use client';

import React from 'react';
import { useSocket } from '../context/SocketContext';
import { AlertOctagon, TrendingUp, TrendingDown, X, Zap } from 'lucide-react';

export function DeviationAlertBanner() {
  const { latestAlert, clearAlert } = useSocket();

  if (!latestAlert) return null;

  const { event } = latestAlert;
  const isBeat = event.deviation_type === 'BEAT';
  const isMiss = event.deviation_type === 'MISS';

  return (
    <div
      className={`border px-4 py-3 rounded relative font-mono text-xs flex flex-wrap items-center justify-between shadow-2xl transition-all animate-bounce duration-500 ${
        isBeat
          ? 'bg-vanta-green/10 border-vanta-green text-neutral-100 shadow-[0_0_20px_rgba(0,255,102,0.2)]'
          : isMiss
          ? 'bg-vanta-red/10 border-vanta-red text-neutral-100 shadow-[0_0_20px_rgba(255,51,68,0.2)]'
          : 'bg-vanta-yellow/10 border-vanta-yellow text-neutral-100 shadow-[0_0_20px_rgba(255,204,0,0.2)]'
      }`}
    >
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1.5 font-bold uppercase tracking-wider">
          <AlertOctagon
            className={`w-4 h-4 ${
              isBeat ? 'text-vanta-green' : isMiss ? 'text-vanta-red' : 'text-vanta-yellow'
            } animate-spin`}
          />
          <span className="text-white">VOLATILITY ALERT //</span>
          <span
            className={
              isBeat ? 'text-vanta-green font-extrabold' : isMiss ? 'text-vanta-red font-extrabold' : 'text-vanta-yellow'
            }
          >
            {event.deviation_type} DETECTED
          </span>
        </div>

        <span className="text-neutral-500 hidden md:inline">|</span>

        <div className="flex items-center space-x-2">
          <span className="px-1.5 py-0.5 rounded bg-black/60 font-bold border border-neutral-700">
            {event.asset}
          </span>
          <span className="font-semibold text-neutral-200">{event.headline}</span>
        </div>
      </div>

      <div className="flex items-center space-x-4 mt-2 sm:mt-0">
        <div className="flex items-center space-x-2 bg-black/70 px-2 py-1 rounded border border-neutral-800">
          <span className="text-neutral-400">ACTUAL:</span>
          <span className={`font-bold ${isBeat ? 'text-vanta-green' : isMiss ? 'text-vanta-red' : 'text-white'}`}>
            {event.actual_metric}
          </span>
          <span className="text-neutral-500">vs FCST:</span>
          <span className="text-neutral-300">{event.forecast || 'N/A'}</span>
          <span className="text-neutral-500">DEV:</span>
          <span
            className={`font-bold ${
              isBeat ? 'text-vanta-green' : isMiss ? 'text-vanta-red' : 'text-vanta-yellow'
            }`}
          >
            {event.deviation_score > 0 ? '+' : ''}
            {(event.deviation_score * 100).toFixed(1)}%
          </span>
        </div>

        <button
          onClick={clearAlert}
          className="text-neutral-400 hover:text-white p-1 hover:bg-black/50 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
