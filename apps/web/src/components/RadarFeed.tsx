'use client';

import React, { useState, useEffect, useRef } from 'react';
import { EconomicEvent, NewsWireItem, DeviationType, MarketSession } from '../lib/types';
import {
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Lock,
  Unlock,
  Radio,
  ExternalLink,
  Zap,
  Globe2,
  Clock
} from 'lucide-react';

interface PulseItem {
  id: string;
  timestamp: string;
  timestamp_utc?: string;
  date_formatted?: string;
  time_formatted?: string;
  market_session?: MarketSession;
  time_ago?: string;
  source: string;
  headline: string;
  asset: string;
  target_ticker?: string;
  target_asset_name?: string;
  sentiment_score?: number;
  deviation_type?: DeviationType;
  deviation_score?: number;
  actual_metric?: string | null;
  forecast?: string | null;
  impact_level?: string;
}

interface RadarFeedProps {
  events: EconomicEvent[];
  news: NewsWireItem[];
  onSelectTicker: (ticker: string) => void;
  selectedTicker: string;
}

export function RadarFeed({
  events,
  news,
  onSelectTicker,
  selectedTicker
}: RadarFeedProps) {
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterType, setFilterType] = useState<'ALL' | 'VOLATILITY' | 'BULLISH' | 'BEARISH'>('ALL');
  const feedContainerRef = useRef<HTMLDivElement>(null);

  // Merge events and news into unified pulse stream
  const items: PulseItem[] = React.useMemo(() => {
    const combined: PulseItem[] = [];

    events.forEach((e) => {
      combined.push({
        id: e.id,
        timestamp: e.timestamp,
        timestamp_utc: e.timestamp_utc || e.timestamp,
        date_formatted: e.date_formatted,
        time_formatted: e.time_formatted,
        market_session: e.market_session,
        time_ago: e.time_ago,
        source: e.source,
        headline: e.headline,
        asset: e.asset,
        target_ticker: e.target_ticker || (e.asset === 'USD' ? 'CAPITALCOM:DXY' : `FX:${e.asset}USD`),
        target_asset_name: e.target_asset_name || e.asset,
        sentiment_score: e.sentiment_score ?? 0,
        deviation_type: e.deviation_type,
        deviation_score: e.deviation_score,
        actual_metric: e.actual_metric,
        forecast: e.forecast,
        impact_level: e.impact_level
      });
    });

    news.forEach((n) => {
      combined.push({
        id: n.id,
        timestamp: n.timestamp,
        timestamp_utc: n.timestamp_utc || n.timestamp,
        date_formatted: n.date_formatted,
        time_formatted: n.time_formatted,
        market_session: n.market_session,
        time_ago: n.time_ago,
        source: n.source,
        headline: n.title,
        asset: n.target_asset_name || 'WIRE',
        target_ticker: n.target_ticker || 'AMEX:SPY',
        target_asset_name: n.target_asset_name || 'Global',
        sentiment_score: n.sentiment_score ?? 0
      });
    });

    combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return combined;
  }, [events, news]);

  const filteredItems = items.filter((item) => {
    if (filterType === 'VOLATILITY') {
      return item.impact_level === 'High' || (item.deviation_type && item.deviation_type !== 'PENDING');
    }
    if (filterType === 'BULLISH') {
      return (item.sentiment_score || 0) > 15 || item.deviation_type === 'BEAT';
    }
    if (filterType === 'BEARISH') {
      return (item.sentiment_score || 0) < -15 || item.deviation_type === 'MISS';
    }
    return true;
  });

  useEffect(() => {
    if (autoScroll && feedContainerRef.current) {
      feedContainerRef.current.scrollTop = 0;
    }
  }, [items, autoScroll]);

  const getSessionBadge = (session?: MarketSession) => {
    const s = session || 'London/NY Overlap';
    let badgeStyle = 'bg-cyan-950 text-vanta-cyan border-vanta-cyan/40';

    if (s === 'London/NY Overlap') {
      badgeStyle = 'bg-amber-950/80 text-amber-400 border-amber-600/60 font-bold';
    } else if (s === 'New York') {
      badgeStyle = 'bg-emerald-950/80 text-emerald-400 border-emerald-600/60';
    } else if (s === 'London') {
      badgeStyle = 'bg-blue-950/80 text-blue-400 border-blue-600/60';
    } else if (s === 'Tokyo/Asia') {
      badgeStyle = 'bg-purple-950/80 text-purple-400 border-purple-600/60';
    }

    return (
      <span className={`inline-flex items-center space-x-1 px-1.5 py-0.2 rounded text-[9px] border uppercase ${badgeStyle}`}>
        <Globe2 className="w-2.5 h-2.5" />
        <span>{s}</span>
      </span>
    );
  };

  const getSentimentPill = (score: number = 0) => {
    let colorClass = 'bg-neutral-800 text-neutral-300 border-neutral-700';
    const text = `${score > 0 ? '+' : ''}${score}`;

    if (score >= 70) {
      colorClass = 'bg-vanta-green/20 text-vanta-green border-vanta-green font-bold shadow-[0_0_8px_rgba(0,255,102,0.3)] animate-pulse';
    } else if (score >= 20) {
      colorClass = 'bg-emerald-950 text-emerald-400 border-emerald-700/60';
    } else if (score <= -70) {
      colorClass = 'bg-vanta-red/20 text-vanta-red border-vanta-red font-bold shadow-[0_0_8px_rgba(255,51,68,0.3)] animate-pulse';
    } else if (score <= -20) {
      colorClass = 'bg-rose-950 text-rose-400 border-rose-700/60';
    } else {
      colorClass = 'bg-vanta-yellow/10 text-vanta-yellow border-vanta-yellow/30';
    }

    return (
      <div className={`px-1.5 py-0.5 rounded text-[10px] font-mono border flex items-center space-x-1 ${colorClass}`}>
        <span className="text-[8px] opacity-70">SENT:</span>
        <span className="font-extrabold">{text}</span>
      </div>
    );
  };

  return (
    <div className="bg-vanta-950 border border-vanta-border rounded font-mono text-xs flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="border-b border-vanta-border bg-vanta-900/90 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <Activity className="w-3.5 h-3.5 text-vanta-green animate-pulse" />
          <span className="font-bold text-white tracking-wider">THE PULSE</span>
          <span className="text-vanta-muted">|</span>
          <span className="text-[10px] text-vanta-cyan font-bold">HIGH-RES TIME WIRE</span>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-black/60 p-0.5 rounded border border-vanta-border">
            {(['ALL', 'VOLATILITY', 'BULLISH', 'BEARISH'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilterType(f)}
                className={`px-1.5 py-0.5 rounded text-[9px] font-semibold transition-colors ${
                  filterType === f
                    ? 'bg-vanta-green text-black font-bold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] border transition-colors ${
              autoScroll
                ? 'bg-vanta-green/10 border-vanta-green/40 text-vanta-green'
                : 'bg-neutral-800 border-neutral-700 text-neutral-400'
            }`}
          >
            {autoScroll ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
            <span className="text-[9px]">{autoScroll ? 'AUTO' : 'LOCK'}</span>
          </button>
        </div>
      </div>

      {/* Stream Items List */}
      <div
        ref={feedContainerRef}
        className="flex-1 overflow-y-auto divide-y divide-neutral-900/80 p-2 space-y-2 scroll-smooth"
      >
        {filteredItems.length === 0 ? (
          <div className="py-12 text-center text-neutral-500">
            AWAITING HIGH-VELOCITY PULSE STREAM...
          </div>
        ) : (
          filteredItems.map((item) => {
            const isBeat = item.deviation_type === 'BEAT';
            const isMiss = item.deviation_type === 'MISS';
            const isChartActive = item.target_ticker === selectedTicker;

            return (
              <div
                key={item.id}
                className={`p-2.5 rounded transition-all group ${
                  isChartActive
                    ? 'bg-vanta-green/5 border border-vanta-green/30'
                    : 'hover:bg-vanta-900/50 border border-transparent'
                }`}
              >
                {/* High-Resolution Temporal Line: Exact Time + Date + Market Session Badge + Latency */}
                <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5 text-[10px]">
                  <div className="flex items-center space-x-1.5 text-neutral-400">
                    <Clock className="w-3 h-3 text-vanta-cyan" />
                    <span className="text-white font-bold">
                      {item.time_formatted ||
                        new Date(item.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: false
                        }) + ' UTC'}
                    </span>
                    <span className="text-neutral-500 text-[9px] hidden sm:inline">
                      ({item.time_ago || 'recent'})
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    {/* Market Session Badge */}
                    {getSessionBadge(item.market_session)}
                    {/* Sentiment Meter */}
                    {getSentimentPill(item.sentiment_score)}
                  </div>
                </div>

                {/* Main Headline */}
                <div className="font-semibold text-neutral-200 text-[11px] leading-snug mb-1.5 group-hover:text-white">
                  {item.headline}
                </div>

                {/* Macro Deviation Data if available */}
                {item.actual_metric && (
                  <div className="flex items-center space-x-2 bg-black/70 px-2 py-1 rounded border border-neutral-900 mb-2 text-[10px]">
                    <span className="text-neutral-400">ACT:</span>
                    <span className={`font-bold ${isBeat ? 'text-vanta-green' : isMiss ? 'text-vanta-red' : 'text-white'}`}>
                      {item.actual_metric}
                    </span>
                    <span className="text-neutral-500">FCST:</span>
                    <span className="text-neutral-300">{item.forecast || 'N/A'}</span>

                    {item.deviation_type && item.deviation_type !== 'PENDING' && (
                      <span
                        className={`font-bold px-1 rounded text-[9px] ${
                          isBeat
                            ? 'bg-vanta-green/10 text-vanta-green'
                            : isMiss
                            ? 'bg-vanta-red/10 text-vanta-red'
                            : 'text-vanta-yellow'
                        }`}
                      >
                        {item.deviation_type}
                      </span>
                    )}
                  </div>
                )}

                {/* Interactive Ticker Pill & Source */}
                <div className="flex items-center justify-between pt-1">
                  {item.target_ticker ? (
                    <button
                      onClick={() => onSelectTicker(item.target_ticker!)}
                      className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded text-[10px] font-bold transition-all border ${
                        isChartActive
                          ? 'bg-vanta-cyan/20 border-vanta-cyan text-vanta-cyan'
                          : 'bg-black/80 hover:bg-neutral-800 border-neutral-800 text-neutral-300 hover:text-vanta-cyan hover:border-vanta-cyan/50'
                      }`}
                    >
                      <Zap className="w-3 h-3 text-vanta-cyan" />
                      <span>{item.target_ticker}</span>
                      <span className="text-[9px] text-neutral-500">({item.target_asset_name})</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-neutral-500">{item.asset}</span>
                  )}

                  <span className="text-[9px] text-neutral-500 uppercase">{item.source}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-vanta-border bg-vanta-900/80 px-3 py-1 flex justify-between items-center text-[10px] text-neutral-500">
        <div>STREAM: {filteredItems.length} ITEMS</div>
        <div>SESSION: LONDON/NY OVERLAP</div>
      </div>
    </div>
  );
}
