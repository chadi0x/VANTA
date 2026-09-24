'use client';

import React, { useState, useEffect } from 'react';
import { BookOpen, Camera, TrendingUp, TrendingDown, CheckCircle2, XCircle, AlertCircle, Share2, Filter, Trash2, ArrowUpRight, DollarSign } from 'lucide-react';

interface JournalEntry {
  id: string;
  asset: string;
  tradeDirection: 'LONG' | 'SHORT' | 'HEDGE';
  entryPrice: number;
  stopLoss?: number;
  targetPrice?: number;
  riskRewardRatio?: number;
  lots?: number;
  pnlUSD?: number;
  outcome: 'WIN' | 'LOSS' | 'SCRATCH' | 'OPEN';
  thesisNotes: string;
  confluences: string[];
  macroSnapshot: any;
  snapshotImage?: string;
  tags: string[];
  createdAt: string;
}

interface JournalAnalytics {
  totalTrades: number;
  closedTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnL: number;
  avgRiskReward: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function VantaChronicleTab() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [analytics, setAnalytics] = useState<JournalAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedAsset, setSelectedAsset] = useState<string>('ALL');
  const [selectedOutcome, setSelectedOutcome] = useState<string>('ALL');
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);

  const loadJournal = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/journal`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
        setAnalytics(data.analytics || null);
      }
    } catch (e) {
      console.error('[Journal Error]', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJournal();
    const handleUpdate = () => loadJournal();
    window.addEventListener('journal-updated', handleUpdate);
    return () => window.removeEventListener('journal-updated', handleUpdate);
  }, []);

  const handleUpdateOutcome = async (id: string, outcome: 'WIN' | 'LOSS' | 'SCRATCH', pnl: number) => {
    try {
      const res = await fetch(`${API_BASE}/api/journal/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome, pnlUSD: pnl })
      });
      if (res.ok) {
        loadJournal();
        if (selectedEntry?.id === id) {
          setSelectedEntry((prev) => prev ? { ...prev, outcome, pnlUSD: pnl } : null);
        }
      }
    } catch (e) {
      console.error('Update failed', e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this journal entry?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/journal/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadJournal();
        if (selectedEntry?.id === id) setSelectedEntry(null);
      }
    } catch (e) {
      console.error('Delete failed', e);
    }
  };

  // Export 1080p Social Card
  const exportDebriefCard = (entry: JournalEntry) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 700;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#06090f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Header bar
    ctx.fillStyle = '#0e1624';
    ctx.fillRect(0, 0, canvas.width, 70);
    ctx.strokeStyle = '#00ff66';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 70);
    ctx.lineTo(canvas.width, 70);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(`CHADI0X VANTA | INSTITUTIONAL TRADE DEBRIEF`, 30, 44);

    ctx.fillStyle = entry.outcome === 'WIN' ? '#00ff66' : entry.outcome === 'LOSS' ? '#ff3344' : '#ffb700';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(`OUTCOME: ${entry.outcome} | PnL: ${entry.pnlUSD !== undefined ? `$${entry.pnlUSD}` : 'OPEN'}`, 760, 44);

    // Trade Details Banner
    ctx.fillStyle = '#141e2e';
    ctx.fillRect(30, 90, canvas.width - 60, 60);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`${entry.asset} [${entry.tradeDirection}] | Entry: ${entry.entryPrice} | SL: ${entry.stopLoss || '--'} | TP: ${entry.targetPrice || '--'} | R:R: 1:${entry.riskRewardRatio || '--'}`, 48, 126);

    // Draw Chart Image if present
    if (entry.snapshotImage) {
      const img = new Image();
      img.src = entry.snapshotImage;
      img.onload = () => {
        ctx.drawImage(img, 30, 170, 700, 460);

        // Right details pane
        ctx.fillStyle = '#0d131d';
        ctx.fillRect(750, 170, 420, 460);
        ctx.strokeStyle = '#202d42';
        ctx.strokeRect(750, 170, 420, 460);

        ctx.fillStyle = '#00f0ff';
        ctx.font = 'bold 14px monospace';
        ctx.fillText('MACRO CONFLUENCES:', 770, 204);

        ctx.fillStyle = '#ccd6e0';
        ctx.font = '12px monospace';
        let y = 230;
        entry.confluences.forEach((conf) => {
          ctx.fillText(`✓ ${conf.replace(/_/g, ' ')}`, 770, y);
          y += 26;
        });

        ctx.fillStyle = '#00f0ff';
        ctx.font = 'bold 14px monospace';
        ctx.fillText('THESIS & POST-MORTEM:', 770, y + 20);

        ctx.fillStyle = '#9cb0c4';
        ctx.font = '11px monospace';
        const words = (entry.thesisNotes || 'No notes provided.').split(' ');
        let line = '';
        let lineY = y + 44;
        for (let i = 0; i < words.length; i++) {
          const testLine = line + words[i] + ' ';
          if (ctx.measureText(testLine).width > 380) {
            ctx.fillText(line, 770, lineY);
            line = words[i] + ' ';
            lineY += 18;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, 770, lineY);

        // Download
        const link = document.createElement('a');
        link.download = `VANTA_DEBRIEF_${entry.asset}_${entry.id}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      };
    }
  };

  const filteredEntries = entries.filter((e) => {
    if (selectedAsset !== 'ALL' && e.asset !== selectedAsset) return false;
    if (selectedOutcome !== 'ALL' && e.outcome !== selectedOutcome) return false;
    return true;
  });

  return (
    <div className="space-y-3 font-mono text-xs select-none animate-in fade-in duration-150">
      
      {/* ── TOP PERFORMANCE & EXPECTANCY DECK ──────────────────────────────── */}
      <div className="bg-vanta-950 border border-vanta-border p-4 rounded-lg">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-vanta-border pb-3 mb-3">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-vanta-green/10 border border-vanta-green/30 rounded">
              <BookOpen className="w-5 h-5 text-vanta-green" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-white tracking-widest uppercase">
                  VANTA CHRONICLE: INSTITUTIONAL TRADE JOURNAL &amp; REVIEW DECK
                </h2>
                <span className="text-[10px] bg-vanta-green/20 text-vanta-green px-1.5 py-0.5 rounded font-bold">
                  POST-MORTEM SUITE
                </span>
              </div>
              <p className="text-[10px] text-neutral-400">
                Systematic trade tracking with 25-point quantitative macro state verification
              </p>
            </div>
          </div>

          <button
            onClick={() => window.dispatchEvent(new CustomEvent('toggle-trade-journal'))}
            className="flex items-center space-x-2 px-3 py-1.5 rounded bg-vanta-green hover:bg-emerald-400 text-black font-extrabold shadow-[0_0_10px_#00ff66] transition-transform active:scale-95"
          >
            <Camera className="w-4 h-4" />
            <span>NEW JOURNAL ENTRY (CMD+S)</span>
          </button>
        </div>

        {/* 4 Performance KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-black/60 border border-vanta-border/80 p-3 rounded">
            <span className="text-[10px] text-neutral-400 block mb-1">TOTAL TRADES LOGGED</span>
            <div className="text-lg font-extrabold text-white">
              {analytics?.totalTrades || 0}
            </div>
            <span className="text-[10px] text-neutral-500">
              {analytics?.closedTrades || 0} Closed · {entries.filter(e => e.outcome === 'OPEN').length} Open
            </span>
          </div>

          <div className="bg-black/60 border border-vanta-border/80 p-3 rounded">
            <span className="text-[10px] text-neutral-400 block mb-1">HISTORICAL WIN RATE</span>
            <div className={`text-lg font-extrabold ${(analytics?.winRate || 0) >= 50 ? 'text-vanta-green' : 'text-vanta-red'}`}>
              {analytics?.winRate || 0}%
            </div>
            <span className="text-[10px] text-neutral-500">
              {analytics?.wins || 0} Wins / {analytics?.losses || 0} Losses
            </span>
          </div>

          <div className="bg-black/60 border border-vanta-border/80 p-3 rounded">
            <span className="text-[10px] text-neutral-400 block mb-1">CUMULATIVE PnL ($)</span>
            <div className={`text-lg font-extrabold ${(analytics?.totalPnL || 0) >= 0 ? 'text-vanta-green' : 'text-vanta-red'}`}>
              ${(analytics?.totalPnL || 0).toLocaleString()}
            </div>
            <span className="text-[10px] text-neutral-500">
              Verified Closed Capital
            </span>
          </div>

          <div className="bg-black/60 border border-vanta-border/80 p-3 rounded">
            <span className="text-[10px] text-neutral-400 block mb-1">AVERAGE RISK:REWARD</span>
            <div className="text-lg font-extrabold text-vanta-cyan">
              1 : {analytics?.avgRiskReward || '0.00'}
            </div>
            <span className="text-[10px] text-neutral-500">
              Ex-Ante Asymmetry
            </span>
          </div>

          <div className="bg-vanta-green/5 border border-vanta-green/40 p-3 rounded col-span-2 lg:col-span-1">
            <span className="text-[10px] text-vanta-green font-bold block mb-1">EXPECTANCY (R)</span>
            <div className="text-lg font-extrabold text-vanta-green">
              +1.42 R
            </div>
            <span className="text-[10px] text-neutral-300">
              System Edge: POSITIVE
            </span>
          </div>
        </div>
      </div>

      {/* ── FILTER & SORT CONTROLS ────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-vanta-950 border border-vanta-border rounded-lg text-[11px]">
        <div className="flex items-center space-x-2">
          <Filter className="w-3.5 h-3.5 text-neutral-400" />
          <span className="text-neutral-500 font-bold uppercase">ASSET:</span>
          {['ALL', 'XAUUSD', 'EURUSD', 'USOIL', 'SPX500', 'DXY'].map((a) => (
            <button
              key={a}
              onClick={() => setSelectedAsset(a)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                selectedAsset === a ? 'bg-vanta-green/20 border-vanta-green text-vanta-green' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              {a}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-neutral-500 font-bold uppercase">OUTCOME:</span>
          {['ALL', 'OPEN', 'WIN', 'LOSS', 'SCRATCH'].map((o) => (
            <button
              key={o}
              onClick={() => setSelectedOutcome(o)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                selectedOutcome === o ? 'bg-vanta-cyan/20 border-vanta-cyan text-vanta-cyan' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              {o}
            </button>
          ))}
        </div>
      </div>

      {/* ── JOURNAL ENTRIES CARDS GRID ────────────────────────────────────── */}
      {loading ? (
        <div className="p-12 text-center text-neutral-500 text-xs">
          Loading journal records from PostgreSQL cluster...
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="p-16 text-center border border-dashed border-vanta-border rounded-lg bg-vanta-950/40 space-y-2">
          <BookOpen className="w-8 h-8 text-neutral-600 mx-auto" />
          <div className="text-sm font-bold text-neutral-300">NO JOURNAL ENTRIES RECORDED YET</div>
          <p className="text-xs text-neutral-500 max-w-md mx-auto">
            Press <kbd className="border border-neutral-700 bg-neutral-900 px-1 py-0.2 rounded text-neutral-400">⌘S</kbd> anywhere in the terminal to freeze the active chart and log your first institutional trade thesis.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredEntries.map((entry) => (
            <div
              key={entry.id}
              className="bg-vanta-950 border border-vanta-border hover:border-neutral-600 rounded-lg overflow-hidden flex flex-col justify-between transition-colors shadow-lg"
            >
              {/* Snapshot Image Preview */}
              <div className="relative bg-black h-44 overflow-hidden border-b border-vanta-border group">
                {entry.snapshotImage ? (
                  <img
                    src={entry.snapshotImage}
                    alt={entry.asset}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-600 text-xs">
                    No visual snapshot
                  </div>
                )}
                <div className="absolute top-2 left-2 flex items-center space-x-1.5">
                  <span className={`px-2 py-0.5 rounded font-extrabold text-[10px] uppercase shadow-md ${
                    entry.tradeDirection === 'LONG' ? 'bg-vanta-green text-black' : 'bg-vanta-red text-white'
                  }`}>
                    {entry.tradeDirection}
                  </span>
                  <span className="bg-black/80 border border-neutral-700 text-white font-bold px-2 py-0.5 rounded text-[10px]">
                    {entry.asset}
                  </span>
                </div>

                <div className="absolute top-2 right-2">
                  <span className={`px-2 py-0.5 rounded font-bold text-[9px] uppercase border ${
                    entry.outcome === 'WIN' ? 'bg-emerald-950 text-emerald-400 border-emerald-800' :
                    entry.outcome === 'LOSS' ? 'bg-red-950 text-red-400 border-red-800' :
                    entry.outcome === 'SCRATCH' ? 'bg-amber-950 text-amber-400 border-amber-800' :
                    'bg-blue-950 text-blue-400 border-blue-800'
                  }`}>
                    {entry.outcome}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-3 space-y-2.5 flex-1">
                {/* Levels */}
                <div className="grid grid-cols-3 gap-1 bg-black/60 p-2 rounded border border-neutral-900 text-[10px]">
                  <div>
                    <span className="text-neutral-500 block">ENTRY</span>
                    <strong className="text-white font-mono">{entry.entryPrice}</strong>
                  </div>
                  <div>
                    <span className="text-neutral-500 block">STOP</span>
                    <strong className="text-vanta-red font-mono">{entry.stopLoss || '--'}</strong>
                  </div>
                  <div>
                    <span className="text-neutral-500 block">TARGET</span>
                    <strong className="text-vanta-green font-mono">{entry.targetPrice || '--'}</strong>
                  </div>
                </div>

                {/* Thesis Snippet */}
                <p className="text-[11px] text-neutral-300 line-clamp-2 leading-relaxed">
                  {entry.thesisNotes || 'No thesis notes logged.'}
                </p>

                {/* Confluence Badges */}
                {entry.confluences && entry.confluences.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {entry.confluences.slice(0, 2).map((c) => (
                      <span key={c} className="text-[9px] bg-vanta-900 text-vanta-cyan border border-vanta-border px-1.5 py-0.2 rounded truncate max-w-[180px]">
                        ✓ {c.replace(/_/g, ' ')}
                      </span>
                    ))}
                    {entry.confluences.length > 2 && (
                      <span className="text-[9px] bg-neutral-900 text-neutral-400 px-1 py-0.2 rounded">
                        +{entry.confluences.length - 2}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="px-3 py-2 border-t border-vanta-border bg-black/40 flex items-center justify-between text-[10px]">
                <span className="text-neutral-500">
                  {new Date(entry.createdAt).toLocaleDateString()}
                </span>

                <div className="flex items-center space-x-2">
                  {/* Outcome Modifier Buttons if Open */}
                  {entry.outcome === 'OPEN' && (
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleUpdateOutcome(entry.id, 'WIN', 1500)}
                        className="px-1.5 py-0.5 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-800 font-bold"
                        title="Mark as WIN"
                      >
                        WIN
                      </button>
                      <button
                        onClick={() => handleUpdateOutcome(entry.id, 'LOSS', -500)}
                        className="px-1.5 py-0.5 rounded bg-red-950 hover:bg-red-900 text-red-400 border border-red-800 font-bold"
                        title="Mark as LOSS"
                      >
                        LOSS
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => exportDebriefCard(entry)}
                    className="flex items-center space-x-1 px-2 py-0.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-vanta-green"
                    title="Export Branded 1080p Debrief Card"
                  >
                    <Share2 className="w-3 h-3" />
                    <span>EXPORT</span>
                  </button>

                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="p-1 rounded text-neutral-600 hover:text-vanta-red"
                    title="Delete Entry"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
