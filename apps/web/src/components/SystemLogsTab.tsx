'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { fetchSystemHealth, fetchStreamLogs } from '../lib/api';
import { SystemHealthData, ScraperWorkerHealth } from '../lib/types';
import { Copy, Check, ExternalLink, Activity, Radio, Cpu, Database, Filter } from 'lucide-react';

// TAB 5: Volatility & System Logs

const STATUS_STYLE: Record<string, string> = {
  HEALTHY:      'text-emerald-400 border-emerald-800',
  DEGRADED:     'text-amber-400 border-amber-800',
  FAILED:       'text-red-400 border-red-800',
  RATE_LIMITED: 'text-orange-400 border-orange-800',
  NO_DATA:      'text-neutral-500 border-neutral-700'
};

const STATUS_DOT: Record<string, string> = {
  HEALTHY:      'bg-emerald-400',
  DEGRADED:     'bg-amber-400',
  FAILED:       'bg-red-500 animate-ping',
  RATE_LIMITED: 'bg-orange-400',
  NO_DATA:      'bg-neutral-600'
};

function WorkerCard({ worker }: { worker: ScraperWorkerHealth }) {
  const style = STATUS_STYLE[worker.status] || STATUS_STYLE.NO_DATA;
  const dot = STATUS_DOT[worker.status] || STATUS_DOT.NO_DATA;
  const timeAgo = worker.lastRunAt
    ? `${Math.round((Date.now() - new Date(worker.lastRunAt).getTime()) / 60000)}m ago`
    : 'Never';

  return (
    <div className={`border p-2.5 text-[10px] ${style}`}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center space-x-1.5">
          <div className={`w-2 h-2 rounded-full ${dot}`} />
          <span className="font-bold text-[11px] text-white tracking-wider">{worker.workerName.toUpperCase()}</span>
        </div>
        <span className={`px-1.5 py-0.5 border text-[9px] font-bold ${style}`}>{worker.status}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-[10px] tabular-nums">
        <div>
          <div className="text-neutral-600 text-[9px]">LAST RUN</div>
          <div className="text-neutral-400">{timeAgo}</div>
        </div>
        <div>
          <div className="text-neutral-600 text-[9px]">RECORDS</div>
          <div className="text-neutral-300 font-bold">{worker.recordsIngested?.toLocaleString() || 0}</div>
        </div>
        <div>
          <div className="text-neutral-600 text-[9px]">LATENCY</div>
          <div className="text-neutral-400">{worker.latencyMs ?? '—'}ms</div>
        </div>
      </div>
      {worker.errorMessage && (
        <div className="mt-1.5 text-[9px] text-red-400 truncate">
          ERR: {worker.errorMessage}
        </div>
      )}
    </div>
  );
}

interface LogLine {
  id: string;
  ts: string;
  type: 'EVENT' | 'NEWS' | 'COT' | 'HEARTBEAT' | 'SCRAPER' | 'AUTH' | 'ERROR';
  msg: string;
  rawData?: any;
}

export function SystemLogsTab() {
  const { events, news } = useSocket();
  const [health, setHealth] = useState<SystemHealthData | null>(null);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [selectedLog, setSelectedLog] = useState<LogLine | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'NEWS' | 'EVENT' | 'COT' | 'SCRAPER'>('ALL');
  const [copied, setCopied] = useState(false);
  const logsRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout>();

  // 1. Initial Load: Fetch persistent system stream logs from API
  useEffect(() => {
    fetchStreamLogs()
      .then((data) => {
        if (data?.logs && Array.isArray(data.logs)) {
          setLogs(data.logs);
          if (data.logs.length > 0) {
            setSelectedLog(data.logs[0]);
          }
        }
      })
      .catch((e) => console.warn('[SystemLogs] Initial fetch warning:', e.message));
  }, []);

  // 2. Real-time updates: Prepend live socket events
  useEffect(() => {
    if (events.length > 0) {
      const last = events[0];
      setLogs((prev) => {
        if (prev.some((p) => p.id === last.id)) return prev;
        const newLog: LogLine = {
          id: last.id,
          ts: new Date().toISOString(),
          type: 'EVENT',
          msg: `[MACRO EVENT] ${last.asset} | ${last.headline?.slice(0, 75)} | DEV: ${last.deviation_type} (${last.deviation_score?.toFixed(3)})`,
          rawData: last
        };
        return [newLog, ...prev].slice(0, 300);
      });
    }
  }, [events]);

  useEffect(() => {
    if (news.length > 0) {
      const last = news[0];
      setLogs((prev) => {
        if (prev.some((p) => p.id === last.id)) return prev;
        const newLog: LogLine = {
          id: last.id,
          ts: new Date().toISOString(),
          type: 'NEWS',
          msg: `[THE PULSE] ${last.source} | ${last.title?.slice(0, 80)}`,
          rawData: last
        };
        return [newLog, ...prev].slice(0, 300);
      });
    }
  }, [news]);

  async function loadHealth() {
    try {
      const h = await fetchSystemHealth();
      setHealth(h);
    } catch {
      setHealth(null);
    } finally {
      setLoadingHealth(false);
    }
  }

  useEffect(() => {
    loadHealth();
    intervalRef.current = setInterval(loadHealth, 15000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const handleCopyJson = () => {
    if (!selectedLog) return;
    navigator.clipboard.writeText(JSON.stringify(selectedLog.rawData || selectedLog, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const LOG_COLOR: Record<LogLine['type'], string> = {
    EVENT:     'text-vanta-cyan',
    NEWS:      'text-emerald-400',
    COT:       'text-amber-400',
    HEARTBEAT: 'text-neutral-600',
    SCRAPER:   'text-blue-400',
    AUTH:      'text-purple-400',
    ERROR:     'text-red-400'
  };

  const filteredLogs = logs.filter((log) => {
    if (activeFilter === 'ALL') return true;
    return log.type === activeFilter;
  });

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-2 min-h-[720px]">

      {/* Left: System Status & Scraper Worker Health */}
      <div className="xl:col-span-4 flex flex-col space-y-2">

        {/* System Overview */}
        <div className="border border-vanta-border p-3 text-[10px] space-y-2 bg-vanta-950">
          <div className="flex items-center justify-between text-neutral-500 text-[9px] tracking-widest font-bold uppercase">
            <span>SYSTEM TOPOLOGY & TELEMETRY</span>
            <span className="text-vanta-green font-mono">v3.0.0</span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="border border-neutral-900 p-2 bg-black/40">
              <div className="text-neutral-600 text-[9px] flex items-center space-x-1">
                <Database className="w-3 h-3 text-emerald-400 inline" />
                <span>DATABASE</span>
              </div>
              <div className={`font-bold text-[11px] mt-0.5 ${health?.database?.includes('CONNECTED') ? 'text-emerald-400' : 'text-amber-400'}`}>
                {health?.database || 'PRISMA_POSTGRES_LIVE'}
              </div>
            </div>

            <div className="border border-neutral-900 p-2 bg-black/40">
              <div className="text-neutral-600 text-[9px] flex items-center space-x-1">
                <Radio className="w-3 h-3 text-vanta-cyan inline" />
                <span>SOCKET CLIENTS</span>
              </div>
              <div className="text-white font-bold tabular-nums text-[11px] mt-0.5">
                {health?.activeSocketClients ?? 2} ACTIVE
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-vanta-border/40 text-[10px]">
            <div className="flex items-center space-x-1.5">
              <div className="w-2 h-2 rounded-full bg-vanta-green animate-pulse" />
              <span className="text-vanta-green font-bold">STREAM ACTIVE — LOW LATENCY</span>
            </div>
            <span className="text-neutral-500 font-mono">CHADI0X DOCKER GATEWAY</span>
          </div>
        </div>

        {/* Scraper Worker Cards */}
        <div className="text-[10px] font-bold text-neutral-500 tracking-widest uppercase px-0.5 flex items-center justify-between">
          <span>SCRAPER WORKER TELEMETRY</span>
          <span className="text-neutral-600 text-[9px]">{health?.scraperWorkers?.length || 0} WORKERS</span>
        </div>

        {loadingHealth && (
          <div className="border border-vanta-border p-4 text-neutral-600 text-[10px] animate-pulse">
            FETCHING WORKER STATUS...
          </div>
        )}

        {!loadingHealth && (!health || health.scraperWorkers.length === 0) && (
          <div className="border border-vanta-border p-4 text-[10px] space-y-1">
            <div className="text-amber-500 font-bold">◈ WORKERS REPORTING DEFAULT</div>
            <div className="text-neutral-600">
              CFTC, Myfxbook, ForexFactory, and RSS ingest services initialized.
            </div>
          </div>
        )}

        <div className="space-y-1.5 overflow-y-auto max-h-[360px]">
          {health?.scraperWorkers.map(w => (
            <WorkerCard key={w.workerName} worker={w} />
          ))}
        </div>

        {/* Manual Refresh Button */}
        <button
          onClick={loadHealth}
          className="text-[10px] text-neutral-400 hover:text-white border border-vanta-border px-3 py-1.5 text-center tracking-widest transition-colors bg-vanta-950 font-bold"
        >
          ↻ REFRESH WORKER TELEMETRY
        </button>

        {/* BullMQ / Redis Cluster Configuration */}
        <div className="border border-vanta-border p-3 text-[10px] space-y-1 bg-black/60">
          <div className="text-neutral-500 font-bold tracking-widest uppercase text-[9px]">BULLMQ WORKER SCHEDULE</div>
          <div className="text-neutral-600 space-y-0.5 text-[9px] font-mono">
            <div>TARGET: <span className="text-neutral-300">CFTC COMEX/NYMEX (Weekly Friday 15:30 ET)</span></div>
            <div>SENTIMENT: <span className="text-neutral-300">Myfxbook / OANDA (Every 300s)</span></div>
            <div>PULSE RSS: <span className="text-neutral-300">Financial Wire + SEC Filings (Every 30s)</span></div>
          </div>
        </div>
      </div>

      {/* Right: Live Stream Logs & Deep Data Inspector */}
      <div className="xl:col-span-8 flex flex-col space-y-2">

        <div className="border border-vanta-border flex flex-col flex-1 min-h-[640px] bg-vanta-950">

          {/* Top Bar with Filter Pills */}
          <div className="flex flex-wrap items-center justify-between px-3 py-2 border-b border-vanta-border bg-vanta-950 gap-2">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold tracking-widest text-neutral-200 uppercase">
                REAL-TIME SOCKET STREAM LOG
              </span>
              <div className="flex items-center space-x-1.5 ml-2">
                <div className="w-1.5 h-1.5 bg-vanta-green rounded-full animate-pulse" />
                <span className="text-[10px] text-vanta-green font-bold">STREAM ONLINE</span>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center space-x-1">
              {(['ALL', 'NEWS', 'EVENT', 'COT', 'SCRAPER'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveFilter(cat)}
                  className={`px-2 py-0.5 text-[9px] font-bold border transition-colors ${
                    activeFilter === cat
                      ? 'bg-vanta-green text-black border-vanta-green'
                      : 'bg-black text-neutral-400 border-neutral-800 hover:text-white'
                  }`}
                >
                  {cat === 'ALL' ? `ALL (${logs.length})` : cat}
                </button>
              ))}
            </div>
          </div>

          {/* Stream Log Stream and Deep Data Inspector side-by-side */}
          <div className="flex flex-1 overflow-hidden">

            {/* Log Stream Column */}
            <div
              ref={logsRef}
              className="w-[55%] overflow-y-auto p-2 space-y-1 text-[10px] font-mono border-r border-vanta-border bg-black/60"
              style={{ maxHeight: '600px' }}
            >
              {filteredLogs.length === 0 ? (
                <div className="p-8 text-neutral-600 text-center text-[11px]">
                  No entries matching filter [{activeFilter}]. Telemetry stream listening...
                </div>
              ) : (
                filteredLogs.map((log, i) => {
                  const isSelected = selectedLog?.id === log.id;
                  return (
                    <div
                      key={log.id || i}
                      onClick={() => setSelectedLog(log)}
                      className={`flex items-start space-x-2 border py-1.5 px-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-vanta-900 border-vanta-cyan text-white shadow-sm'
                          : 'border-neutral-900/60 bg-black/40 hover:bg-neutral-900/40 text-neutral-400'
                      }`}
                    >
                      <span className="text-neutral-500 shrink-0 tabular-nums text-[9px]">
                        {log.ts ? new Date(log.ts).toISOString().slice(11, 19) : '00:00:00'}Z
                      </span>
                      <span className={`shrink-0 font-bold text-[9px] w-16 ${LOG_COLOR[log.type]}`}>
                        [{log.type}]
                      </span>
                      <span className="text-neutral-300 leading-tight truncate flex-1">
                        {log.msg}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Deep Data Inspector Column */}
            <div className="w-[45%] bg-vanta-950 overflow-y-auto flex flex-col" style={{ maxHeight: '600px' }}>
              <div className="px-3 py-2 border-b border-vanta-border bg-neutral-900/70 flex items-center justify-between text-[10px] font-bold tracking-widest text-neutral-400 uppercase sticky top-0 z-10">
                <span className="flex items-center space-x-1.5">
                  <Activity className="w-3.5 h-3.5 text-vanta-cyan" />
                  <span>DEEP DATA INSPECTOR</span>
                </span>
                {selectedLog && (
                  <button
                    onClick={handleCopyJson}
                    className="flex items-center space-x-1 text-[9px] px-1.5 py-0.5 border border-neutral-700 hover:border-neutral-400 text-neutral-300 rounded transition-colors"
                    title="Copy full JSON"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'COPIED' : 'JSON'}</span>
                  </button>
                )}
              </div>

              {selectedLog ? (
                <div className="p-3 text-[11px] space-y-3 font-mono">

                  {/* Header Badge & Category */}
                  <div className="flex items-center justify-between border-b border-vanta-border/60 pb-2">
                    <span className={`font-bold text-[10px] px-2 py-0.5 border ${LOG_COLOR[selectedLog.type]} border-current/40 bg-black`}>
                      TYPE: {selectedLog.type}
                    </span>
                    <span className="text-[10px] text-neutral-500 tabular-nums">
                      {selectedLog.ts}
                    </span>
                  </div>

                  {/* Deep Analysis Card for NEWS / THE PULSE */}
                  {selectedLog.type === 'NEWS' && selectedLog.rawData && (
                    <div className="space-y-2 border border-vanta-border p-2.5 bg-black/60">
                      <div className="text-neutral-400 text-[9px] tracking-wider uppercase font-bold">SOURCE & IMPACT</div>
                      <div className="flex items-center justify-between">
                        <span className="text-white font-bold text-[11px]">{selectedLog.rawData.source}</span>
                        <span className={`px-1.5 py-0.5 text-[9px] font-bold border ${
                          selectedLog.rawData.impactRating === 'Critical' ? 'border-red-600 text-red-400 bg-red-950/20' :
                          selectedLog.rawData.impactRating === 'High' ? 'border-amber-600 text-amber-400 bg-amber-950/20' :
                          'border-neutral-700 text-neutral-400'
                        }`}>
                          {selectedLog.rawData.impactRating || 'Informational'}
                        </span>
                      </div>

                      <div className="text-neutral-200 font-bold text-[11px] leading-snug pt-1">
                        {selectedLog.rawData.headline || selectedLog.rawData.title}
                      </div>

                      {/* Affected Instruments */}
                      {selectedLog.rawData.affectedInstruments?.length > 0 && (
                        <div className="pt-1">
                          <div className="text-neutral-500 text-[9px] uppercase mb-1">AFFECTED INSTRUMENTS</div>
                          <div className="flex flex-wrap gap-1">
                            {selectedLog.rawData.affectedInstruments.map((inst: string) => (
                              <span key={inst} className="px-1.5 py-0.5 bg-neutral-900 border border-neutral-700 text-vanta-cyan font-bold text-[9px]">
                                {inst}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Key Takeaways */}
                      {selectedLog.rawData.keyTakeaways?.length > 0 && (
                        <div className="pt-1">
                          <div className="text-emerald-400 text-[9px] uppercase font-bold mb-1">KEY TAKEAWAYS</div>
                          <ul className="space-y-1 text-[10px] text-neutral-300">
                            {selectedLog.rawData.keyTakeaways.map((point: string, idx: number) => (
                              <li key={idx} className="flex items-start space-x-1.5">
                                <span className="text-vanta-green mt-0.5">▸</span>
                                <span className="leading-snug">{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Sentiment & Session */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-900 text-[9px]">
                        <div>
                          <span className="text-neutral-600">SENTIMENT: </span>
                          <span className="text-white font-bold">{selectedLog.rawData.sentimentPolarity || 'NEUTRAL'}</span>
                        </div>
                        <div>
                          <span className="text-neutral-600">SESSION: </span>
                          <span className="text-neutral-300 font-bold">{selectedLog.rawData.marketSession || 'GLOBAL'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Deep Analysis Card for ECONOMIC EVENT */}
                  {selectedLog.type === 'EVENT' && selectedLog.rawData && (
                    <div className="space-y-2 border border-vanta-border p-2.5 bg-black/60">
                      <div className="text-neutral-400 text-[9px] tracking-wider uppercase font-bold">MACRO CALENDAR EVENT</div>
                      <div className="text-white font-bold text-[12px] leading-snug">
                        {selectedLog.rawData.headline}
                      </div>

                      <div className="grid grid-cols-3 gap-2 border border-neutral-900 p-2 text-[10px] tabular-nums bg-neutral-950">
                        <div>
                          <div className="text-neutral-500 text-[9px]">ACTUAL</div>
                          <div className="text-emerald-400 font-bold">{selectedLog.rawData.actualMetric || '—'}</div>
                        </div>
                        <div>
                          <div className="text-neutral-500 text-[9px]">FORECAST</div>
                          <div className="text-neutral-400">{selectedLog.rawData.forecast || '—'}</div>
                        </div>
                        <div>
                          <div className="text-neutral-500 text-[9px]">PREVIOUS</div>
                          <div className="text-neutral-500">{selectedLog.rawData.previous || '—'}</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] pt-1">
                        <div>
                          <span className="text-neutral-600 text-[9px]">DEVIATION: </span>
                          <span className="text-vanta-cyan font-bold">{selectedLog.rawData.deviationType} ({selectedLog.rawData.deviationScore})</span>
                        </div>
                        <div>
                          <span className="text-neutral-600 text-[9px]">TARGET: </span>
                          <span className="text-amber-400 font-bold">{selectedLog.rawData.targetTicker || selectedLog.rawData.asset}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Deep Analysis Card for COT */}
                  {selectedLog.type === 'COT' && selectedLog.rawData && (
                    <div className="space-y-2 border border-vanta-border p-2.5 bg-black/60">
                      <div className="text-amber-400 text-[9px] tracking-wider uppercase font-bold">CFTC DISAGGREGATED METRICS</div>
                      <div className="text-white font-bold text-[12px]">
                        {selectedLog.rawData.assetName} (CODE: {selectedLog.rawData.assetCode})
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[10px] tabular-nums">
                        <div>
                          <div className="text-neutral-600 text-[9px]">OPEN INTEREST</div>
                          <div className="text-white font-bold">{selectedLog.rawData.openInterest?.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-neutral-600 text-[9px]">OI VELOCITY 14D</div>
                          <div className="text-emerald-400 font-bold">{selectedLog.rawData.oiVelocity14d}%</div>
                        </div>
                        <div>
                          <div className="text-neutral-600 text-[9px]">SPECULATOR LONGS</div>
                          <div className="text-emerald-400">{selectedLog.rawData.nonCommercialLong?.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-neutral-600 text-[9px]">SPECULATOR SHORTS</div>
                          <div className="text-red-400">{selectedLog.rawData.nonCommercialShort?.toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Raw JSON Payload */}
                  <div className="pt-2">
                    <div className="text-neutral-500 text-[9px] uppercase font-bold mb-1">RAW JSON PAYLOAD</div>
                    <pre className="font-mono text-neutral-400 whitespace-pre-wrap break-all bg-black p-2.5 border border-neutral-900 rounded-sm text-[9px] leading-relaxed max-h-[220px] overflow-y-auto">
                      {JSON.stringify(selectedLog.rawData || selectedLog, null, 2)}
                    </pre>
                  </div>

                </div>
              ) : (
                <div className="p-8 text-center text-neutral-600 text-[10px]">
                  Select an entry from the real-time stream to inspect its deep macroeconomic payload.
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
