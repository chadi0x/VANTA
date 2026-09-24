'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { fetchEvents, fetchNews } from '../lib/api';
import { TerminalHeader } from '../components/TerminalHeader';
import { WatchlistTickerBar } from '../components/WatchlistTickerBar';
import { CentralBankCountdown } from '../components/CentralBankCountdown';
import { DeviationAlertBanner } from '../components/DeviationAlertBanner';
import { RadarFeed } from '../components/RadarFeed';
import { TradingViewChart } from '../components/TradingViewChart';
import { CotMatrix } from '../components/CotMatrix';
import { CotSmartMoneyTab } from '../components/CotSmartMoneyTab';
import { MacroYieldsTab } from '../components/MacroYieldsTab';
import { CentralBankTab } from '../components/CentralBankTab';
import { GlobalLiquidityTab } from '../components/GlobalLiquidityTab';
import { OptionsGexTab } from '../components/OptionsGexTab';
import { CtaSystematicTab } from '../components/CtaSystematicTab';
import { MacroPlaybooksTab } from '../components/MacroPlaybooksTab';
import { MacroPcaTab } from '../components/MacroPcaTab';
import { BlackSwanWarRoomTab } from '../components/BlackSwanWarRoomTab';
import { G10CarryMatrixTab } from '../components/G10CarryMatrixTab';
import { VantaChronicleTab } from '../components/VantaChronicleTab';
import { SystemLogsTab } from '../components/SystemLogsTab';
import { QuantLabTab } from '../components/QuantLabTab';
import { CommandPalette } from '../components/CommandPalette';
import { PositionSizerModal } from '../components/PositionSizerModal';
import { TradeJournalModal } from '../components/TradeJournalModal';
import { SquawkProvider, useSquawk } from '../context/SquawkContext';

type TabId = 
  | 'COCKPIT' 
  | 'COT_MATRIX' 
  | 'MACRO_YIELDS' 
  | 'CENTRAL_BANK' 
  | 'GLOBAL_LIQUIDITY'
  | 'OPTIONS_GEX'
  | 'CTA_SYSTEMATIC'
  | 'MACRO_PLAYBOOKS'
  | 'MACRO_PCA'
  | 'BLACK_SWAN'
  | 'G10_CARRY'
  | 'VANTA_CHRONICLE'
  | 'QUANT_LAB'
  | 'SYSTEM_LOGS';

interface Tab {
  id: TabId;
  label: string;
  shortLabel: string;
}

const TABS: Tab[] = [
  { id: 'COCKPIT',          label: 'TERMINAL COCKPIT',              shortLabel: 'COCKPIT' },
  { id: 'COT_MATRIX',       label: 'COT & SMART MONEY MATRIX',      shortLabel: 'COT' },
  { id: 'MACRO_YIELDS',     label: 'MACRO YIELDS & INTERMARKET',    shortLabel: 'YIELDS' },
  { id: 'CENTRAL_BANK',     label: 'CENTRAL BANK & RATES',          shortLabel: 'CB RATES' },
  { id: 'GLOBAL_LIQUIDITY', label: 'GLOBAL LIQUIDITY & CB ASSETS',  shortLabel: 'LIQUIDITY' },
  { id: 'OPTIONS_GEX',      label: 'OPTIONS GEX & DEALER STRUCTURE',shortLabel: 'GEX' },
  { id: 'CTA_SYSTEMATIC',   label: 'CTA & SYSTEMATIC FLOWS',        shortLabel: 'CTA' },
  { id: 'MACRO_PLAYBOOKS',  label: 'EVENT PLAYBOOKS & SIMULATOR',   shortLabel: 'PLAYBOOKS' },
  { id: 'MACRO_PCA',        label: 'QUANT MACRO REGIMES (PCA)',     shortLabel: 'PCA REGIMES' },
  { id: 'BLACK_SWAN',       label: 'THE BLACK SWAN WAR ROOM',       shortLabel: 'WAR ROOM' },
  { id: 'G10_CARRY',        label: 'G10 REAL YIELD & CARRY',        shortLabel: 'CARRY' },
  { id: 'VANTA_CHRONICLE',  label: 'VANTA CHRONICLE (JOURNAL)',     shortLabel: 'JOURNAL' },
  { id: 'QUANT_LAB',        label: 'QUANT LAB & MONTE CARLO VaR',   shortLabel: 'QUANT LAB' },
  { id: 'SYSTEM_LOGS',      label: 'VOLATILITY & SYSTEM LOGS',      shortLabel: 'SYS LOGS' }
];

function DashboardContent() {
  const { user, loading } = useAuth();
  const { events, news, setEvents, setNews } = useSocket();
  const { speak } = useSquawk();
  const [selectedTicker, setSelectedTicker] = useState('OANDA:XAUUSD');
  const [activeTab, setActiveTab] = useState<TabId>('COCKPIT');
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isSizerOpen, setIsSizerOpen] = useState(false);
  const [isJournalOpen, setIsJournalOpen] = useState(false);
  const lastSpokenIdRef = useRef<string>('');

  // Global Command Palette, Position Sizer & Journal Event Listeners
  useEffect(() => {
    const handleTogglePalette = () => setIsPaletteOpen((prev) => !prev);
    const handleToggleSizer = () => setIsSizerOpen((prev) => !prev);
    const handleToggleJournal = () => setIsJournalOpen((prev) => !prev);

    window.addEventListener('toggle-command-palette', handleTogglePalette);
    window.addEventListener('toggle-position-sizer', handleToggleSizer);
    window.addEventListener('toggle-trade-journal', handleToggleJournal);

    return () => {
      window.removeEventListener('toggle-command-palette', handleTogglePalette);
      window.removeEventListener('toggle-position-sizer', handleToggleSizer);
      window.removeEventListener('toggle-trade-journal', handleToggleJournal);
    };
  }, []);

  // Audio Squawk trigger on critical/high impact incoming items
  useEffect(() => {
    if (news && news.length > 0) {
      const latest = news[0];
      if (latest && latest.id !== lastSpokenIdRef.current) {
        if (latest.impact_rating === 'Critical' || latest.impact_rating === 'High') {
          lastSpokenIdRef.current = latest.id;
          speak(`Breaking Macro News: ${latest.title}`, 'high');
        }
      }
    }
  }, [news, speak]);

  const loadData = useCallback(async () => {
    try {
      const [evs, nws] = await Promise.all([
        fetchEvents().catch(() => []),
        fetchNews().catch(() => [])
      ]);
      if (evs && evs.length > 0) setEvents(evs);
      if (nws && nws.length > 0) setNews(nws);
    } catch (err) {
      console.error('[Dashboard] Initial data load error', err);
    }
  }, [setEvents, setNews]);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center font-mono text-xs text-neutral-400">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-vanta-green rounded-full animate-ping" />
          <span>AUTHENTICATING TERMINAL SESSION...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col font-mono selection:bg-vanta-green selection:text-black">
      {/* Top Header */}
      <TerminalHeader />

      {/* Macro Benchmarks Watchlist Ticker Bar */}
      <WatchlistTickerBar
        currentSymbol={selectedTicker}
        onSelectTicker={(ticker) => setSelectedTicker(ticker)}
      />

      {/* Main Body */}
      <main className="flex-1 flex flex-col p-2 sm:p-2.5 space-y-2 max-w-[2200px] mx-auto w-full">

        {/* Deviation Alert Banner */}
        <DeviationAlertBanner />

        {/* Central Bank Countdown Row */}
        <CentralBankCountdown />

        {/* ── 13-TAB NAVIGATION ─────────────────────────────────────── */}
        <nav className="flex items-end bg-vanta-950 border border-vanta-border overflow-x-auto scrollbar-none">
          {TABS.map((tab, idx) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={[
                'flex-shrink-0 px-3.5 py-2 text-[11px] font-bold tracking-widest uppercase transition-all border-r border-vanta-border',
                'whitespace-nowrap focus:outline-none',
                activeTab === tab.id
                  ? 'bg-black text-vanta-green border-b-2 border-b-vanta-green -mb-px'
                  : 'text-neutral-500 hover:text-neutral-200 hover:bg-neutral-900/50'
              ].join(' ')}
            >
              <span className="hidden sm:inline">[{String(idx + 1).padStart(2, '0')}] {tab.label}</span>
              <span className="sm:hidden">{tab.shortLabel}</span>
            </button>
          ))}
        </nav>

        {/* ── TAB CONTENT ───────────────────────────────────────────── */}
        <div className="flex-1 min-h-0">

          {/* TAB 1: Terminal Cockpit — Pulse | Glass | COT */}
          {activeTab === 'COCKPIT' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 h-full min-h-[680px]">
              {/* The Pulse */}
              <div className="lg:col-span-4 xl:col-span-3 h-[680px] lg:h-[calc(100vh-270px)] min-h-[500px]">
                <RadarFeed
                  events={events}
                  news={news}
                  onSelectTicker={(ticker) => setSelectedTicker(ticker)}
                  selectedTicker={selectedTicker}
                />
              </div>
              {/* The Glass */}
              <div className="lg:col-span-5 xl:col-span-6 h-[680px] lg:h-[calc(100vh-270px)] min-h-[500px]">
                <TradingViewChart
                  currentSymbol={selectedTicker}
                  onSymbolChange={(ticker) => setSelectedTicker(ticker)}
                />
              </div>
              {/* COT Compact */}
              <div className="lg:col-span-3 xl:col-span-3 h-[680px] lg:h-[calc(100vh-270px)] min-h-[500px]">
                <CotMatrix
                  onSelectTicker={(ticker) => setSelectedTicker(ticker)}
                  selectedTicker={selectedTicker}
                />
              </div>
            </div>
          )}

          {/* TAB 2: COT & Smart Money Matrix */}
          {activeTab === 'COT_MATRIX' && (
            <CotSmartMoneyTab onSelectTicker={(ticker) => setSelectedTicker(ticker)} />
          )}

          {/* TAB 3: Macro Yields & Intermarket */}
          {activeTab === 'MACRO_YIELDS' && (
            <MacroYieldsTab onSelectTicker={(ticker) => setSelectedTicker(ticker)} />
          )}

          {/* TAB 4: Central Bank & Rates */}
          {activeTab === 'CENTRAL_BANK' && (
            <CentralBankTab />
          )}

          {/* TAB 5: Global Liquidity & CB Balance Sheets */}
          {activeTab === 'GLOBAL_LIQUIDITY' && (
            <GlobalLiquidityTab />
          )}

          {/* TAB 6: Options GEX & Dealer Structure */}
          {activeTab === 'OPTIONS_GEX' && (
            <OptionsGexTab />
          )}

          {/* TAB 7: CTA & Systematic Flows */}
          {activeTab === 'CTA_SYSTEMATIC' && (
            <CtaSystematicTab />
          )}

          {/* TAB 8: Event Playbooks & Surprise Simulator */}
          {activeTab === 'MACRO_PLAYBOOKS' && (
            <MacroPlaybooksTab />
          )}

          {/* TAB 9: Quantitative Macro Regimes (PCA) */}
          {activeTab === 'MACRO_PCA' && (
            <MacroPcaTab />
          )}

          {/* TAB 10: The Black Swan War Room */}
          {activeTab === 'BLACK_SWAN' && (
            <BlackSwanWarRoomTab />
          )}

          {/* TAB 11: G10 Real Yield & Carry Matrix */}
          {activeTab === 'G10_CARRY' && (
            <G10CarryMatrixTab />
          )}

          {/* TAB 12: Vanta Chronicle (Visual Trade Journal) */}
          {activeTab === 'VANTA_CHRONICLE' && (
            <VantaChronicleTab />
          )}

          {/* TAB 14: Quant Lab & Monte Carlo VaR Stress Engine */}
          {activeTab === 'QUANT_LAB' && (
            <QuantLabTab />
          )}

          {/* TAB 13: Volatility & System Logs */}
          {activeTab === 'SYSTEM_LOGS' && (
            <SystemLogsTab />
          )}
        </div>
      </main>

      {/* Command Palette Overlay (Cmd+K) */}
      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        onNavigateTab={(tab) => setActiveTab(tab as TabId)}
        onSelectTicker={(ticker) => setSelectedTicker(ticker)}
      />

      {/* Position Sizer & Risk Calculator Modal (Cmd+J) */}
      <PositionSizerModal
        isOpen={isSizerOpen}
        onClose={() => setIsSizerOpen(false)}
      />

      {/* Visual Trade Journal Modal (Cmd+S) */}
      <TradeJournalModal
        isOpen={isJournalOpen}
        onClose={() => setIsJournalOpen(false)}
        currentTicker={selectedTicker}
      />
    </div>
  );
}

export default function TerminalDashboard() {
  return (
    <SquawkProvider>
      <DashboardContent />
    </SquawkProvider>
  );
}
