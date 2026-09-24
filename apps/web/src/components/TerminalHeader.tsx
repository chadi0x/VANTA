'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useSquawk } from '../context/SquawkContext';
import { triggerVolatilitySimulation } from '../lib/api';
import { Activity, Radio, Shield, LogOut, Zap, Clock, Search, Volume2, VolumeX, Calculator, Camera } from 'lucide-react';

export function TerminalHeader() {
  const { user, logout } = useAuth();
  const { isConnected, latency } = useSocket();
  const { isEnabled: isSquawkOn, setIsEnabled: setIsSquawkOn, isSpeaking, speak } = useSquawk();
  const [utcTime, setUtcTime] = useState<string>('');
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().replace('GMT', 'UTC'));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSimulate = async () => {
    try {
      setSimulating(true);
      await triggerVolatilitySimulation();
    } catch (e) {
      console.error('Simulation error', e);
    } finally {
      setTimeout(() => setSimulating(false), 800);
    }
  };

  return (
    <header className="border-b border-vanta-border bg-vanta-950 px-4 py-2.5 flex flex-wrap items-center justify-between text-xs font-mono select-none">
      {/* Brand & Terminal Identifier */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 bg-vanta-green rounded-full shadow-[0_0_8px_#00ff66]" />
          <span className="font-bold tracking-widest text-sm text-white">
            CHADI0X <span className="text-vanta-green">VANTA</span>
          </span>
        </div>
        <span className="text-vanta-muted hidden sm:inline">|</span>
        <span className="text-neutral-400 hidden sm:inline tracking-wider">
          MACRO VOLATILITY &amp; INTELLIGENCE TERMINAL v1.0
        </span>

        {/* Global Command Palette Trigger */}
        <button
          onClick={() => {
            window.dispatchEvent(new CustomEvent('toggle-command-palette'));
          }}
          className="flex items-center space-x-2 bg-vanta-900 hover:bg-neutral-800 border border-vanta-border hover:border-vanta-green/50 text-neutral-400 hover:text-white px-3 py-1 rounded transition-colors text-[11px]"
          title="Open Command Palette (Cmd+K)"
        >
          <Search className="w-3.5 h-3.5 text-vanta-green" />
          <span>Universal Search</span>
          <kbd className="bg-black/60 border border-neutral-700 px-1 py-0.2 rounded text-[9px] text-neutral-400 font-sans">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Telemetry & Actions */}
      <div className="flex items-center space-x-4 mt-2 sm:mt-0">
        {/* UTC Clock */}
        <div className="flex items-center space-x-1.5 text-neutral-300 bg-vanta-900 border border-vanta-border px-2.5 py-1 rounded">
          <Clock className="w-3.5 h-3.5 text-vanta-cyan" />
          <span>{utcTime || 'SYNCING...'}</span>
        </div>

        {/* WebSocket Stream Indicator */}
        <div className="flex items-center space-x-2 bg-vanta-900 border border-vanta-border px-2.5 py-1 rounded">
          <Radio className={`w-3.5 h-3.5 ${isConnected ? 'text-vanta-green animate-pulse' : 'text-vanta-red'}`} />
          <span className="text-neutral-300 font-medium">
            {isConnected ? 'STREAM: LIVE' : 'STREAM: DISCONNECTED'}
          </span>
          <span className="text-neutral-500 text-[10px]">({latency}ms)</span>
        </div>

        {/* Audio Squawk Toggle Button */}
        <button
          onClick={() => {
            const next = !isSquawkOn;
            setIsSquawkOn(next);
            if (next) speak('Audio squawk active. Monitoring macroeconomic feeds.');
          }}
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded border transition-colors ${
            isSquawkOn
              ? 'bg-vanta-green/10 border-vanta-green text-vanta-green shadow-[0_0_8px_rgba(0,255,102,0.2)]'
              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
          }`}
          title={isSquawkOn ? 'Squawk Active (Click to Mute)' : 'Enable Synthesized Audio Squawk'}
        >
          {isSquawkOn ? (
            <Volume2 className={`w-3.5 h-3.5 ${isSpeaking ? 'animate-bounce text-vanta-green' : ''}`} />
          ) : (
            <VolumeX className="w-3.5 h-3.5" />
          )}
          <span className="font-bold tracking-wide">
            {isSquawkOn ? (isSpeaking ? 'SQUAWKING...' : 'SQUAWK: ON') : 'SQUAWK: OFF'}
          </span>
        </button>

        {/* Position Sizer & Risk Calculator Trigger */}
        <button
          onClick={() => {
            window.dispatchEvent(new CustomEvent('toggle-position-sizer'));
          }}
          className="flex items-center space-x-1.5 bg-neutral-900 hover:bg-neutral-800 border border-vanta-border hover:border-vanta-cyan text-neutral-300 hover:text-white px-2.5 py-1 rounded transition-colors"
          title="Open Institutional Position Sizer (Cmd+J)"
        >
          <Calculator className="w-3.5 h-3.5 text-vanta-cyan" />
          <span className="font-bold tracking-wide">CALC</span>
          <kbd className="bg-black/60 border border-neutral-700 px-1 py-0.2 rounded text-[9px] text-neutral-400 font-sans">
            ⌘J
          </kbd>
        </button>

        {/* Trade Journal & Screen Snapshot Trigger */}
        <button
          onClick={() => {
            window.dispatchEvent(new CustomEvent('toggle-trade-journal'));
          }}
          className="flex items-center space-x-1.5 bg-neutral-900 hover:bg-neutral-800 border border-vanta-border hover:border-vanta-green text-neutral-300 hover:text-white px-2.5 py-1 rounded transition-colors"
          title="Open Visual Trade Journal & Canvas Snap (Cmd+S)"
        >
          <Camera className="w-3.5 h-3.5 text-vanta-green" />
          <span className="font-bold tracking-wide">JOURNAL</span>
          <kbd className="bg-black/60 border border-neutral-700 px-1 py-0.2 rounded text-[9px] text-neutral-400 font-sans">
            ⌘S
          </kbd>
        </button>

        {/* Live Volatility Sim Button */}
        <button
          onClick={handleSimulate}
          disabled={simulating}
          className="flex items-center space-x-1.5 bg-neutral-900 hover:bg-neutral-800 border border-vanta-yellow/40 hover:border-vanta-yellow text-vanta-yellow px-2.5 py-1 rounded transition-colors active:scale-95 disabled:opacity-50"
          title="Inject an institutional surprise release into the live pipeline"
        >
          <Zap className={`w-3.5 h-3.5 ${simulating ? 'animate-bounce' : ''}`} />
          <span className="font-bold tracking-wide">SIMULATE SURPRISE</span>
        </button>

        {/* Operator Profile */}
        <div className="flex items-center space-x-2 bg-vanta-900 border border-vanta-border px-2.5 py-1 rounded">
          <Shield className="w-3.5 h-3.5 text-vanta-cyan" />
          <span className="text-neutral-300 font-bold uppercase">{user?.username || 'OPERATOR'}</span>
          <span className="text-[10px] text-vanta-muted uppercase">[{user?.role || 'DESK'}]</span>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="text-neutral-400 hover:text-vanta-red p-1 rounded transition-colors"
          title="Disconnect Terminal Session"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
