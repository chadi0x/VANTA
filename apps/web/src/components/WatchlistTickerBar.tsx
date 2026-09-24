'use client';

import React from 'react';
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';

interface WatchlistTicker {
  symbol: string;
  name: string;
  tradingViewSymbol: string;
  price: string;
  change: string;
  isPositive: boolean;
  category: 'METALS' | 'FX' | 'RATES' | 'ENERGY' | 'EQUITIES';
}

const DEFAULT_TICKERS: WatchlistTicker[] = [
  { symbol: 'XAU/USD', name: 'Gold Spot', tradingViewSymbol: 'OANDA:XAUUSD', price: '2,658.40', change: '+0.84%', isPositive: true, category: 'METALS' },
  { symbol: 'XAG/USD', name: 'Silver Spot', tradingViewSymbol: 'OANDA:XAGUSD', price: '31.85', change: '+1.42%', isPositive: true, category: 'METALS' },
  { symbol: 'DXY', name: 'US Dollar Idx', tradingViewSymbol: 'TVC:DXY', price: '100.82', change: '-0.31%', isPositive: false, category: 'FX' },
  { symbol: 'US10Y', name: '10Y Yield', tradingViewSymbol: 'TVC:US10Y', price: '3.742%', change: '-4.2 bps', isPositive: false, category: 'RATES' },
  { symbol: 'US02Y', name: '02Y Yield', tradingViewSymbol: 'TVC:US02Y', price: '3.590%', change: '-6.8 bps', isPositive: false, category: 'RATES' },
  { symbol: '10Y-2Y', name: 'Yield Curve', tradingViewSymbol: 'TVC:US10Y-TVC:US02Y', price: '+15.2 bps', change: '+2.6 bps', isPositive: true, category: 'RATES' },
  { symbol: 'WTI/USD', name: 'Crude Oil', tradingViewSymbol: 'NYMEX:CL1!', price: '71.18', change: '-1.12%', isPositive: false, category: 'ENERGY' },
  { symbol: 'EUR/USD', name: 'Euro Dollar', tradingViewSymbol: 'OANDA:EURUSD', price: '1.1162', change: '+0.38%', isPositive: true, category: 'FX' },
  { symbol: 'SPX500', name: 'S&P 500', tradingViewSymbol: 'FOREXCOM:SPX500', price: '5,732.10', change: '+0.45%', isPositive: true, category: 'EQUITIES' }
];

interface WatchlistTickerBarProps {
  currentSymbol: string;
  onSelectTicker: (tvSymbol: string) => void;
}

export function WatchlistTickerBar({ currentSymbol, onSelectTicker }: WatchlistTickerBarProps) {
  return (
    <div className="bg-black border-y border-vanta-border px-3 py-1.5 flex items-center space-x-3 overflow-x-auto text-[11px] font-mono select-none scrollbar-none">
      <div className="flex items-center space-x-1 text-[10px] text-vanta-muted font-bold uppercase tracking-wider flex-shrink-0 mr-1">
        <span className="w-1.5 h-1.5 rounded-full bg-vanta-green animate-pulse" />
        <span>MACRO BENCHMARKS:</span>
      </div>

      <div className="flex items-center space-x-2.5">
        {DEFAULT_TICKERS.map((ticker) => {
          const isActive = currentSymbol === ticker.tradingViewSymbol;
          return (
            <button
              key={ticker.symbol}
              onClick={() => onSelectTicker(ticker.tradingViewSymbol)}
              className={`flex items-center space-x-2 px-2.5 py-1 rounded border transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-vanta-green/10 border-vanta-green text-white shadow-[0_0_8px_rgba(0,255,102,0.2)]'
                  : 'bg-vanta-950 border-vanta-border/80 text-neutral-300 hover:border-neutral-600 hover:bg-vanta-900/60'
              }`}
              title={`Click to bind Glass chart to ${ticker.name} (${ticker.tradingViewSymbol})`}
            >
              <div className="flex items-baseline space-x-1.5">
                <span className={`font-bold tracking-tight ${isActive ? 'text-vanta-green' : 'text-neutral-200'}`}>
                  {ticker.symbol}
                </span>
                <span className="text-[10px] text-neutral-400 font-semibold">
                  {ticker.price}
                </span>
              </div>

              <div className={`flex items-center space-x-0.5 text-[10px] font-bold ${
                ticker.isPositive ? 'text-vanta-green' : 'text-vanta-red'
              }`}>
                {ticker.isPositive ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                <span>{ticker.change}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
