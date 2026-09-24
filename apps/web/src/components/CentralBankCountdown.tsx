'use client';

import React, { useState, useEffect } from 'react';
import { Landmark, TrendingUp, AlertTriangle } from 'lucide-react';

interface CentralBankTarget {
  name: string;
  code: string;
  currency: string;
  currentRate: string;
  nextMeetingDate: string; // ISO string or future date
  bias: 'HAWKISH' | 'DOVISH' | 'NEUTRAL';
}

const CENTRAL_BANKS: CentralBankTarget[] = [
  {
    name: 'Federal Reserve',
    code: 'FOMC',
    currency: 'USD',
    currentRate: '5.25 - 5.50%',
    nextMeetingDate: new Date(Date.now() + 1000 * (60 * 60 * 18 + 42 * 60 + 15)).toISOString(),
    bias: 'NEUTRAL'
  },
  {
    name: 'European Central Bank',
    code: 'ECB',
    currency: 'EUR',
    currentRate: '3.75%',
    nextMeetingDate: new Date(Date.now() + 1000 * (60 * 60 * 52 + 15 * 60 + 30)).toISOString(),
    bias: 'DOVISH'
  },
  {
    name: 'Bank of England',
    code: 'BOE',
    currency: 'GBP',
    currentRate: '5.25%',
    nextMeetingDate: new Date(Date.now() + 1000 * (60 * 60 * 114 + 8 * 60)).toISOString(),
    bias: 'HAWKISH'
  },
  {
    name: 'Bank of Japan',
    code: 'BOJ',
    currency: 'JPY',
    currentRate: '0.10%',
    nextMeetingDate: new Date(Date.now() + 1000 * (60 * 60 * 4 + 19 * 60 + 50)).toISOString(),
    bias: 'HAWKISH'
  }
];

export function CentralBankCountdown() {
  const [timeLefts, setTimeLefts] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const updateCountdowns = () => {
      const now = Date.now();
      const updated: { [key: string]: string } = {};

      CENTRAL_BANKS.forEach((cb) => {
        const target = new Date(cb.nextMeetingDate).getTime();
        const diff = Math.max(0, target - now);

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        updated[cb.code] = `${hours.toString().padStart(2, '0')}h ${minutes
          .toString()
          .padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
      });

      setTimeLefts(updated);
    };

    updateCountdowns();
    const interval = setInterval(updateCountdowns, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 font-mono text-xs">
      {CENTRAL_BANKS.map((cb) => (
        <div
          key={cb.code}
          className="bg-vanta-900 border border-vanta-border p-2.5 rounded relative overflow-hidden group hover:border-neutral-600 transition-all"
        >
          {/* Top Row: Central Bank & Asset */}
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center space-x-1.5">
              <Landmark className="w-3.5 h-3.5 text-vanta-cyan" />
              <span className="font-bold text-neutral-200">{cb.code}</span>
              <span className="text-neutral-500">({cb.currency})</span>
            </div>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                cb.bias === 'HAWKISH'
                  ? 'border-vanta-green/30 text-vanta-green bg-vanta-green/5'
                  : cb.bias === 'DOVISH'
                  ? 'border-vanta-red/30 text-vanta-red bg-vanta-red/5'
                  : 'border-vanta-yellow/30 text-vanta-yellow bg-vanta-yellow/5'
              }`}
            >
              {cb.bias}
            </span>
          </div>

          {/* Rate & Target */}
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-[11px] text-neutral-400">BENCHMARK:</span>
            <span className="text-white font-bold">{cb.currentRate}</span>
          </div>

          {/* Live Countdown Display */}
          <div className="bg-black/60 border border-neutral-800/80 px-2 py-1 rounded flex items-center justify-between">
            <span className="text-[10px] text-vanta-muted">COUNTDOWN:</span>
            <span className="text-vanta-cyan font-bold tracking-wider animate-pulse">
              {timeLefts[cb.code] || '--:--:--'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
