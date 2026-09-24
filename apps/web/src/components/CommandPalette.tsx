'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Command, ArrowRight, X, Newspaper, Calendar, Database, Mic, TrendingUp, Sparkles } from 'lucide-react';

interface SearchResult {
  id: string;
  category: 'news' | 'calendar' | 'cot' | 'speeches' | 'rates' | 'ticker' | 'action';
  title: string;
  subtitle: string;
  meta?: string;
  badge?: string;
  badgeColor?: string;
  payload?: any;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tabId: string) => void;
  onSelectTicker: (ticker: string) => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function CommandPalette({ isOpen, onClose, onNavigateTab, onSelectTicker }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Global Keyboard listener for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Debounced search query
  useEffect(() => {
    if (!query.trim()) {
      setResults([
        { id: 'act_cockpit', category: 'action', title: 'Terminal Cockpit', subtitle: 'Live execution cockpit & granular pulse stream', badge: '/cockpit', badgeColor: 'purple', payload: { tab: 'COCKPIT' } },
        { id: 'act_cot', category: 'action', title: 'COT & Smart Money Matrix', subtitle: 'Institutional accumulation & contrarian positioning', badge: '/cot', badgeColor: 'purple', payload: { tab: 'COT_MATRIX' } },
        { id: 'act_yields', category: 'action', title: 'Macro Yields & Intermarket', subtitle: 'Sovereign curve, 10Y-2Y spreads & cross-asset ratios', badge: '/yields', badgeColor: 'purple', payload: { tab: 'YIELDS' } },
        { id: 'act_rates', category: 'action', title: 'Central Bank & Rates', subtitle: 'FOMC rate probabilities & speech hawkish/dovish scores', badge: '/rates', badgeColor: 'purple', payload: { tab: 'CENTRAL_BANK' } },
        { id: 'act_liq', category: 'action', title: 'Global Liquidity & CB Balance Sheets', subtitle: 'Net Fed Liquidity, TGA, RRP, and G4 central bank aggregate', badge: '/liquidity', badgeColor: 'purple', payload: { tab: 'GLOBAL_LIQUIDITY' } },
        { id: 'act_gex', category: 'action', title: 'Options GEX & Dealer Structure', subtitle: 'Net dealer gamma by strike & volatility flip levels', badge: '/gex', badgeColor: 'purple', payload: { tab: 'OPTIONS_GEX' } },
        { id: 'act_cta', category: 'action', title: 'CTA & Systematic Flow Sentinel', subtitle: 'Algorithmic trend allocation & forced liquidation triggers', badge: '/cta', badgeColor: 'purple', payload: { tab: 'CTA_SYSTEMATIC' } },
        { id: 'act_playbook', category: 'action', title: 'Macro Event Playbooks & Simulator', subtitle: 'Interactive What-If surprise scenario price projection', badge: '/playbook', badgeColor: 'purple', payload: { tab: 'MACRO_PLAYBOOKS' } },
        { id: 'act_pca', category: 'action', title: 'Quant Macro Regimes (PCA)', subtitle: 'Principal component variance decomposition & factor betas', badge: '/pca', badgeColor: 'purple', payload: { tab: 'MACRO_PCA' } },
        { id: 'act_warroom', category: 'action', title: 'The Black Swan War Room', subtitle: 'Historical macro stress-testing & Monte Carlo VaR', badge: '/warroom', badgeColor: 'purple', payload: { tab: 'BLACK_SWAN' } },
        { id: 'act_carry', category: 'action', title: 'G10 Real Yield & Carry Matrix', subtitle: 'Inflation-adjusted policy yields & carry Sharpe ratios', badge: '/carry', badgeColor: 'purple', payload: { tab: 'G10_CARRY' } },
        { id: 'act_journal', category: 'action', title: 'Vanta Chronicle (Trade Journal)', subtitle: 'Visual trade review deck, canvas snapshots & debrief export', badge: '/journal', badgeColor: 'purple', payload: { tab: 'VANTA_CHRONICLE' } },
        { id: 'act_logs', category: 'action', title: 'Volatility & System Logs', subtitle: 'Real-time telemetry, VIX, MOVE & scraper health', badge: '/logs', badgeColor: 'purple', payload: { tab: 'SYSTEM_LOGS' } },
        { id: 't_gold', category: 'ticker', title: 'Gold Spot (XAU/USD)', subtitle: 'Switch Glass chart to OANDA:XAUUSD', badge: 'XAUUSD', badgeColor: 'blue', payload: { ticker: 'OANDA:XAUUSD', tab: 'COCKPIT' } },
        { id: 't_dxy', category: 'ticker', title: 'US Dollar Index', subtitle: 'Switch Glass chart to TVC:DXY', badge: 'DXY', badgeColor: 'blue', payload: { ticker: 'TVC:DXY', tab: 'COCKPIT' } }
      ]);
      setSelectedIndex(0);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(query)}&limit=15`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
          setSelectedIndex(0);
        }
      } catch (err) {
        console.error('[Search API Error]', err);
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (item: SearchResult) => {
    if (item.category === 'action' && item.payload?.tab) {
      onNavigateTab(item.payload.tab);
      onClose();
    } else if (item.category === 'ticker' && item.payload?.ticker) {
      onSelectTicker(item.payload.ticker);
      if (item.payload.tab) onNavigateTab(item.payload.tab);
      onClose();
    } else if (item.category === 'cot') {
      onNavigateTab('COT_MATRIX');
      onClose();
    } else if (item.category === 'speeches' || item.category === 'rates') {
      onNavigateTab('CENTRAL_BANK');
      onClose();
    } else if (item.category === 'news' || item.category === 'calendar') {
      onNavigateTab('COCKPIT');
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/80 backdrop-blur-sm p-4 font-mono select-none animate-in fade-in duration-100">
      <div 
        className="w-full max-w-2xl bg-vanta-950 border border-vanta-border shadow-2xl rounded-lg overflow-hidden flex flex-col max-h-[600px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-vanta-border bg-black/60">
          <Search className="w-4 h-4 text-vanta-green mr-3 animate-pulse" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search news, calendar, COT, rates, tickers or type /cockpit, /cot..."
            className="w-full bg-transparent text-xs text-white placeholder-neutral-500 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-neutral-500 hover:text-white mr-2">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="text-[10px] text-neutral-500 border border-neutral-800 px-1.5 py-0.5 rounded bg-neutral-900">
            ESC
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1.5 px-4 py-2 border-b border-vanta-border/60 bg-vanta-900/30 text-[10px] overflow-x-auto">
          <span className="text-neutral-500 font-bold uppercase mr-1">QUICK:</span>
          {['/news', '/calendar', '/cot', '/rates', '/liquidity', '/gex', '/cta', '/playbook', '/chart XAUUSD', '/chart DXY'].map((pill) => (
            <button
              key={pill}
              onClick={() => setQuery(pill)}
              className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 hover:border-vanta-green/50 text-neutral-400 hover:text-vanta-green transition-colors"
            >
              {pill}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto divide-y divide-vanta-border/30 max-h-[420px]">
          {loading && results.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-500 flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-vanta-green rounded-full animate-ping" />
              <span>SEARCHING POSTGRES &amp; MEMORY TRIE...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-500">
              No matching records found for "{query}".
            </div>
          ) : (
            results.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-4 py-2.5 flex items-start justify-between cursor-pointer transition-colors ${
                    isSelected ? 'bg-vanta-green/10 border-l-2 border-vanta-green' : 'hover:bg-neutral-900/40'
                  }`}
                >
                  <div className="flex items-start space-x-3 min-w-0 pr-3">
                    <div className="mt-0.5 text-neutral-400">
                      {item.category === 'news' && <Newspaper className="w-3.5 h-3.5 text-blue-400" />}
                      {item.category === 'calendar' && <Calendar className="w-3.5 h-3.5 text-amber-400" />}
                      {item.category === 'cot' && <Database className="w-3.5 h-3.5 text-emerald-400" />}
                      {item.category === 'speeches' && <Mic className="w-3.5 h-3.5 text-purple-400" />}
                      {item.category === 'ticker' && <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />}
                      {item.category === 'action' && <Sparkles className="w-3.5 h-3.5 text-vanta-green" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs font-semibold truncate ${isSelected ? 'text-vanta-green' : 'text-neutral-200'}`}>
                          {item.title}
                        </span>
                        {item.badge && (
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                            item.badgeColor === 'red' ? 'bg-red-950 text-red-400 border border-red-800' :
                            item.badgeColor === 'emerald' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                            item.badgeColor === 'amber' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                            item.badgeColor === 'blue' ? 'bg-blue-950 text-blue-400 border border-blue-800' :
                            item.badgeColor === 'purple' ? 'bg-purple-950 text-purple-400 border border-purple-800' :
                            'bg-neutral-800 text-neutral-400'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-neutral-400 truncate mt-0.5">
                        {item.subtitle}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center self-center flex-shrink-0 text-neutral-500">
                    <ArrowRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'text-vanta-green translate-x-1' : ''}`} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-vanta-border bg-vanta-950 text-[10px] text-neutral-500 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span><strong className="text-neutral-400">↑↓</strong> Navigate</span>
            <span><strong className="text-neutral-400">↵</strong> Select</span>
            <span><strong className="text-neutral-400">ESC</strong> Close</span>
          </div>
          <span className="text-vanta-green font-bold">CHADI0X PALETTE</span>
        </div>
      </div>
    </div>
  );
}
