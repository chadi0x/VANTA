'use client';

import React from 'react';
import { NewsWireItem } from '../lib/types';
import { Newspaper, ExternalLink } from 'lucide-react';

interface NewsTickerProps {
  news: NewsWireItem[];
}

export function NewsTicker({ news }: NewsTickerProps) {
  return (
    <div className="bg-vanta-950 border border-vanta-border rounded font-mono text-xs flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="border-b border-vanta-border bg-vanta-900 px-3 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Newspaper className="w-3.5 h-3.5 text-vanta-cyan" />
          <span className="font-bold text-neutral-200 tracking-wider">LIVE BREAKING NEWS WIRE</span>
        </div>
        <span className="text-[10px] text-vanta-green font-bold animate-pulse">STREAMING</span>
      </div>

      {/* News Items List */}
      <div className="overflow-y-auto divide-y divide-neutral-900 max-h-[280px] p-1">
        {news.length === 0 ? (
          <div className="p-4 text-center text-neutral-500 text-xs">
            AWAITING WIRE HEADLINES...
          </div>
        ) : (
          news.map((item) => (
            <div
              key={item.id}
              className="p-2 hover:bg-vanta-900/50 transition-colors flex items-baseline justify-between space-x-2"
            >
              <div className="flex items-baseline space-x-2 min-w-0">
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-neutral-900 border border-neutral-800 text-vanta-cyan uppercase shrink-0">
                  {item.source}
                </span>
                <span className="text-neutral-300 font-medium truncate text-[11px]">
                  {item.title}
                </span>
              </div>
              <span className="text-[10px] text-neutral-500 shrink-0">
                {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
