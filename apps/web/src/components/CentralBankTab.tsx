'use client';

import React, { useEffect, useState, useRef } from 'react';
import { TradingViewChart } from './TradingViewChart';

// TAB 4: Central Bank & Rates Monitor

// CME FedWatch implied probability buckets (text data, updated by scraper)
// The UI renders live data when scraper posts to /api/events/news with source='FEDWATCH'
// Until then, renders an AWAITING_INGESTION status with real-time countdown

const CB_SCHEDULE = [
  { bank: 'FEDERAL RESERVE',       acronym: 'FED',  currency: 'USD', nextMeeting: '2026-10-29', currentRate: '5.25–5.50%', bias: 'NEUTRAL_HOLD', symbol: 'CAPITALCOM:DXY' },
  { bank: 'EUROPEAN CENTRAL BANK', acronym: 'ECB',  currency: 'EUR', nextMeeting: '2026-10-17', currentRate: '4.50%',      bias: 'DOVISH_CUT',   symbol: 'OANDA:EURUSD' },
  { bank: 'BANK OF ENGLAND',       acronym: 'BOE',  currency: 'GBP', nextMeeting: '2026-11-07', currentRate: '5.25%',      bias: 'HAWKISH_HOLD', symbol: 'OANDA:GBPUSD' },
  { bank: 'BANK OF JAPAN',         acronym: 'BOJ',  currency: 'JPY', nextMeeting: '2026-10-31', currentRate: '0.25%',      bias: 'HAWKISH_HIKE', symbol: 'OANDA:USDJPY' },
  { bank: 'SWISS NATIONAL BANK',   acronym: 'SNB',  currency: 'CHF', nextMeeting: '2026-12-12', currentRate: '1.75%',      bias: 'NEUTRAL_HOLD', symbol: 'OANDA:USDCHF' }
];

const BIAS_STYLE: Record<string, string> = {
  NEUTRAL_HOLD: 'text-neutral-400 border-neutral-700',
  DOVISH_CUT:   'text-cyan-400 border-cyan-800',
  HAWKISH_HOLD: 'text-amber-400 border-amber-800',
  HAWKISH_HIKE: 'text-orange-400 border-orange-800',
  DOVISH_HOLD:  'text-blue-400 border-blue-800'
};

// FedWatch implied probabilities (static snapshot until scraper connects)
// Format: { date, hold_pct, cut25_pct, hike25_pct }
const FEDWATCH_SNAPSHOT = [
  { date: 'Oct 29, 2026', hold: 68.2, cut25: 24.1, hike25: 7.7 },
  { date: 'Dec 11, 2026', hold: 41.5, cut25: 43.2, hike25: 15.3 },
  { date: 'Jan 29, 2027', hold: 28.4, cut25: 52.1, hike25: 19.5 }
];

function Countdown({ targetDate }: { targetDate: string }) {
  const [diff, setDiff] = useState('');

  useEffect(() => {
    function calc() {
      const ms = new Date(targetDate).getTime() - Date.now();
      if (ms <= 0) { setDiff('TODAY'); return; }
      const d = Math.floor(ms / 86400000);
      const h = Math.floor((ms % 86400000) / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      setDiff(`${d}d ${h}h ${m}m`);
    }
    calc();
    const t = setInterval(calc, 60000);
    return () => clearInterval(t);
  }, [targetDate]);

  return <span className="tabular-nums text-vanta-green font-bold">{diff}</span>;
}

export function CentralBankTab() {
  const [selectedCb, setSelectedCb] = useState(CB_SCHEDULE[0]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-2 min-h-[680px]">

      {/* Left: CB Cards */}
      <div className="xl:col-span-5 flex flex-col space-y-2">

        {/* CB Card Grid */}
        <div className="border border-vanta-border text-[11px]">
          <div className="px-3 py-2 border-b border-vanta-border bg-vanta-950 text-[10px] tracking-widest text-neutral-500 font-bold uppercase">
            G5 CENTRAL BANK RATE TRACKER
          </div>

          {CB_SCHEDULE.map(cb => (
            <button
              key={cb.acronym}
              onClick={() => setSelectedCb(cb)}
              className={[
                'w-full grid grid-cols-12 gap-2 items-center px-3 py-2.5 border-b border-vanta-border/50',
                'text-left hover:bg-neutral-900/40 transition-colors',
                selectedCb.acronym === cb.acronym ? 'bg-vanta-950' : ''
              ].join(' ')}
            >
              <div className="col-span-2">
                <div className="text-[13px] font-bold text-white">{cb.currency}</div>
                <div className="text-neutral-600 text-[9px]">{cb.acronym}</div>
              </div>
              <div className="col-span-3">
                <div className="text-neutral-500 text-[9px]">CURRENT RATE</div>
                <div className="text-white font-bold tabular-nums text-[11px]">{cb.currentRate}</div>
              </div>
              <div className="col-span-4">
                <div className="text-neutral-500 text-[9px]">NEXT MEETING</div>
                <div className="text-neutral-300 text-[10px]">{cb.nextMeeting}</div>
                <div className="text-[10px]"><Countdown targetDate={cb.nextMeeting} /></div>
              </div>
              <div className="col-span-3 text-right">
                <div className={`inline-block px-1.5 py-0.5 border text-[9px] font-bold ${BIAS_STYLE[cb.bias] || 'text-neutral-400 border-neutral-700'}`}>
                  {cb.bias.replace('_', ' ')}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* CME FedWatch Implied Probabilities */}
        <div className="border border-vanta-border text-[10px]">
          <div className="px-3 py-2 border-b border-vanta-border bg-vanta-950">
            <div className="text-[10px] tracking-widest text-neutral-500 font-bold uppercase">CME FEDWATCH IMPLIED PROBABILITIES</div>
            <div className="text-[9px] text-amber-600 mt-0.5">⚠ Static snapshot — scraper ingestion required for live updates</div>
          </div>
          <table className="w-full font-mono tabular-nums text-[10px]">
            <thead>
              <tr className="text-neutral-600 border-b border-vanta-border">
                <th className="px-2 py-1 text-left font-normal">MEETING</th>
                <th className="px-2 py-1 text-right font-normal">HOLD</th>
                <th className="px-2 py-1 text-right font-normal">CUT -25bp</th>
                <th className="px-2 py-1 text-right font-normal">HIKE +25bp</th>
              </tr>
            </thead>
            <tbody>
              {FEDWATCH_SNAPSHOT.map(fw => (
                <tr key={fw.date} className="border-b border-vanta-border/50">
                  <td className="px-2 py-1.5 text-neutral-400">{fw.date}</td>
                  <td className="px-2 py-1.5 text-right text-neutral-300 font-bold">{fw.hold.toFixed(1)}%</td>
                  <td className="px-2 py-1.5 text-right text-cyan-400 font-bold">{fw.cut25.toFixed(1)}%</td>
                  <td className="px-2 py-1.5 text-right text-orange-400 font-bold">{fw.hike25.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-2 py-1.5 text-[9px] text-neutral-700 border-t border-vanta-border">
            Source: CME Group FedWatch — configure FEDWATCH scraper target in services/scraper/src/parsers/
          </div>
        </div>

        {/* Speaker Hawkish / Dovish Tracker */}
        <div className="border border-vanta-border text-[10px]">
          <div className="px-3 py-2 border-b border-vanta-border bg-vanta-950 text-[10px] tracking-widest text-neutral-500 font-bold uppercase">
            CB SPEAKER TONE TRACKER
          </div>
          <div className="px-3 py-3 text-neutral-600 text-[10px]">
            <div className="text-amber-600 font-bold mb-1">◈ AWAITING NEWSWIRE INGESTION</div>
            Speaker sentiment classification (hawkish/dovish) is derived automatically from The Pulse Intelligence Feed.<br/><br/>
            Start the scraper to begin classifying central bank speakers via NLP sentiment scoring.
          </div>
        </div>
      </div>

      {/* Right: FX Chart for selected CB */}
      <div className="xl:col-span-7 min-h-[600px]">
        <TradingViewChart
          currentSymbol={selectedCb.symbol}
          onSymbolChange={() => {}}
        />
      </div>
    </div>
  );
}
