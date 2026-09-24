'use client';

import React, { useState, useEffect } from 'react';
import { Calculator, X, ShieldAlert, DollarSign, Percent, AlertCircle } from 'lucide-react';

interface PositionSizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type InstrumentType = 'XAUUSD' | 'XAGUSD' | 'EURUSD' | 'USOIL' | 'US10Y_FUT';

interface InstrumentSpec {
  name: string;
  contractSize: number; // 1 standard lot
  pipSize: number;
  pipValuePerLotUSD: number;
  currency: string;
}

const INSTRUMENT_SPECS: Record<InstrumentType, InstrumentSpec> = {
  XAUUSD: { name: 'Gold (100 oz Standard Lot)', contractSize: 100, pipSize: 0.10, pipValuePerLotUSD: 10, currency: 'USD' },
  XAGUSD: { name: 'Silver (5,000 oz Standard Lot)', contractSize: 5000, pipSize: 0.01, pipValuePerLotUSD: 50, currency: 'USD' },
  EURUSD: { name: 'EUR/USD (100,000 Units)', contractSize: 100000, pipSize: 0.0001, pipValuePerLotUSD: 10, currency: 'USD' },
  USOIL: { name: 'WTI Crude Oil (1,000 Barrels)', contractSize: 1000, pipSize: 0.01, pipValuePerLotUSD: 10, currency: 'USD' },
  US10Y_FUT: { name: '10Y Treasury Note Futures ($100k)', contractSize: 100000, pipSize: 0.015625, pipValuePerLotUSD: 15.625, currency: 'USD' }
};

export function PositionSizerModal({ isOpen, onClose }: PositionSizerModalProps) {
  const [accountBalance, setAccountBalance] = useState<number>(100000);
  const [riskPercent, setRiskPercent] = useState<number>(1.0);
  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentType>('XAUUSD');
  const [entryPrice, setEntryPrice] = useState<string>('2658.00');
  const [stopLossPrice, setStopLossPrice] = useState<string>('2646.00');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const spec = INSTRUMENT_SPECS[selectedInstrument];
  const entry = parseFloat(entryPrice) || 0;
  const sl = parseFloat(stopLossPrice) || 0;
  const priceDistance = Math.abs(entry - sl);

  // Risk capital in USD
  const maxRiskUSD = (accountBalance * riskPercent) / 100;

  // Number of pips / price units risked
  const pipsRisked = spec.pipSize > 0 ? priceDistance / spec.pipSize : 0;

  // Lot calculation: Risk USD / (Pips * Pip Value per lot)
  const calculatedLots = (pipsRisked > 0 && spec.pipValuePerLotUSD > 0)
    ? maxRiskUSD / (pipsRisked * spec.pipValuePerLotUSD)
    : 0;

  const totalNotionalUSD = calculatedLots * spec.contractSize * (entry || 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono select-none animate-in fade-in duration-100">
      <div 
        className="w-full max-w-lg bg-vanta-950 border border-vanta-border shadow-2xl rounded-lg overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-vanta-border bg-black/60">
          <div className="flex items-center space-x-2">
            <Calculator className="w-4 h-4 text-vanta-green" />
            <span className="text-xs font-bold text-white tracking-widest uppercase">
              INSTITUTIONAL POSITION SIZER &amp; RISK CALCULATOR
            </span>
          </div>
          <button onClick={onClose} className="text-neutral-500 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 space-y-4 text-xs">
          {/* Instrument Selector */}
          <div>
            <label className="text-[10px] text-neutral-400 font-bold uppercase block mb-1.5">
              TARGET INSTRUMENT:
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(INSTRUMENT_SPECS) as InstrumentType[]).map((inst) => (
                <button
                  key={inst}
                  onClick={() => setSelectedInstrument(inst)}
                  className={`py-1.5 px-2 rounded text-[11px] font-bold border transition-colors ${
                    selectedInstrument === inst
                      ? 'bg-vanta-green/10 border-vanta-green text-vanta-green'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {inst}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-neutral-500 mt-1">{spec.name}</p>
          </div>

          {/* Account Balance & Risk % */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-neutral-400 font-bold uppercase block mb-1">
                ACCOUNT BALANCE ($):
              </label>
              <div className="relative">
                <DollarSign className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-neutral-500" />
                <input
                  type="number"
                  value={accountBalance}
                  onChange={(e) => setAccountBalance(parseFloat(e.target.value) || 0)}
                  className="w-full bg-black border border-vanta-border rounded pl-8 pr-3 py-1.5 text-white font-mono focus:border-vanta-green focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-neutral-400 font-bold uppercase block mb-1">
                RISK ALLOCATION (%):
              </label>
              <div className="relative">
                <Percent className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-neutral-500" />
                <input
                  type="number"
                  step="0.25"
                  value={riskPercent}
                  onChange={(e) => setRiskPercent(parseFloat(e.target.value) || 0)}
                  className="w-full bg-black border border-vanta-border rounded pl-8 pr-3 py-1.5 text-white font-mono focus:border-vanta-green focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Entry & Stop Loss Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-neutral-400 font-bold uppercase block mb-1">
                ENTRY PRICE:
              </label>
              <input
                type="text"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                placeholder="2658.00"
                className="w-full bg-black border border-vanta-border rounded px-3 py-1.5 text-white font-mono focus:border-vanta-green focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] text-neutral-400 font-bold uppercase block mb-1">
                STOP LOSS PRICE:
              </label>
              <input
                type="text"
                value={stopLossPrice}
                onChange={(e) => setStopLossPrice(e.target.value)}
                placeholder="2646.00"
                className="w-full bg-black border border-vanta-border rounded px-3 py-1.5 text-white font-mono focus:border-vanta-green focus:outline-none"
              />
            </div>
          </div>

          {/* Calculated Output Card */}
          <div className="bg-vanta-900 border border-vanta-border/80 rounded-lg p-3.5 space-y-2.5 mt-2">
            <div className="flex items-center justify-between text-neutral-400 text-[11px] pb-2 border-b border-neutral-800">
              <span>Risk Capital At Stake:</span>
              <span className="font-bold text-vanta-red font-mono">
                ${maxRiskUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex items-center justify-between text-neutral-400 text-[11px] pb-2 border-b border-neutral-800">
              <span>Price Distance to Stop:</span>
              <span className="font-bold text-white font-mono">
                {priceDistance.toFixed(4)} ({pipsRisked.toFixed(1)} pips/ticks)
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-xs text-neutral-300 font-bold block">RECOMMENDED POSITION SIZE:</span>
                <span className="text-[10px] text-neutral-500">Standard Lots (1.0 = {spec.contractSize.toLocaleString()} units)</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-extrabold text-vanta-green tracking-tight font-mono">
                  {calculatedLots > 0 ? calculatedLots.toFixed(2) : '0.00'} LOTS
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-neutral-400 pt-1 border-t border-neutral-800/80">
              <span>Estimated Notional Exposure:</span>
              <span className="font-mono text-neutral-300">
                ${totalNotionalUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-vanta-border bg-black/60 flex items-center justify-between text-[10px] text-neutral-500">
          <span>Toggle with <kbd className="border border-neutral-700 bg-neutral-900 px-1 py-0.2 rounded text-neutral-400">⌘J</kbd></span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 font-bold"
          >
            DISMISS
          </button>
        </div>
      </div>
    </div>
  );
}
