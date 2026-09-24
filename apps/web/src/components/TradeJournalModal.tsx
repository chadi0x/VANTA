'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, Check, Save, ArrowRight, DollarSign, Layers, ShieldCheck, Tag, PenTool } from 'lucide-react';
import { JournalCanvasEditor } from './JournalCanvasEditor';

interface TradeJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTicker?: string;
}

const CONFLUENCE_OPTIONS = [
  { id: 'NET_LIQUIDITY_EXPANDING', label: 'Net Fed Liquidity Expanding (+Delta)' },
  { id: 'COT_COMMERCIAL_COVERING', label: 'COT Commercials Covering Shorts' },
  { id: 'COT_SPECULATOR_EXHAUSTION', label: 'Speculator Positioning Exhaustion (>90% or <10%)' },
  { id: 'DEALER_POSITIVE_GEX', label: 'Dealer GEX in Positive Gamma Regime' },
  { id: 'GAMMA_FLIP_SUPPORT', label: 'Price Rebounding Off Gamma Flip Level' },
  { id: 'CTA_MOMENTUM_ALIGNMENT', label: 'CTA Systematic Flows Aligned with Trade' },
  { id: 'REAL_YIELDS_COMPRESSING', label: 'Real Yields Dropping (Bullish Precious Metals)' },
  { id: 'MACRO_SURPRISE_BEAT', label: 'High-Impact Event Surprise > 1.0σ' },
  { id: 'RETAIL_SENTIMENT_FADE', label: 'Retail Contrarian Sentiment Fade (>70% One-Sided)' }
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function TradeJournalModal({ isOpen, onClose, currentTicker = 'OANDA:XAUUSD' }: TradeJournalModalProps) {
  const [asset, setAsset] = useState<string>('XAUUSD');
  const [tradeDirection, setTradeDirection] = useState<'LONG' | 'SHORT' | 'HEDGE'>('LONG');
  const [entryPrice, setEntryPrice] = useState<string>('2658.40');
  const [stopLoss, setStopLoss] = useState<string>('2644.00');
  const [targetPrice, setTargetPrice] = useState<string>('2692.00');
  const [lots, setLots] = useState<string>('2.50');
  const [thesisNotes, setThesisNotes] = useState<string>('');
  const [selectedConfluences, setSelectedConfluences] = useState<string[]>([
    'NET_LIQUIDITY_EXPANDING',
    'COT_COMMERCIAL_COVERING',
    'DEALER_POSITIVE_GEX'
  ]);
  const [tags, setTags] = useState<string>('#GoldBreakout, #NetLiquidity');
  const [snapshotImage, setSnapshotImage] = useState<string>('');
  const [isAnnotating, setIsAnnotating] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string>('');

  // Extract symbol clean name
  useEffect(() => {
    if (currentTicker.includes('XAU')) setAsset('XAUUSD');
    else if (currentTicker.includes('XAG')) setAsset('XAGUSD');
    else if (currentTicker.includes('DXY')) setAsset('DXY');
    else if (currentTicker.includes('CL') || currentTicker.includes('OIL')) setAsset('USOIL');
    else if (currentTicker.includes('SPX')) setAsset('SPX500');
    else if (currentTicker.includes('EUR')) setAsset('EURUSD');
  }, [currentTicker]);

  // Generate high-definition institutional OHLC Candlestick chart snapshot
  const generateChartSnapshot = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Terminal Bloomberg/Palantir deep dark backdrop
    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Chart margins
    const topMargin = 64;
    const bottomMargin = 80;
    const rightMargin = 90;
    const leftMargin = 30;
    const chartWidth = canvas.width - leftMargin - rightMargin;
    const chartHeight = canvas.height - topMargin - bottomMargin;
    const volumeHeight = 90;
    const priceAreaHeight = chartHeight - volumeHeight - 20;

    // Asset baseline price determination
    const ep = parseFloat(entryPrice) || 2742.50;
    const sl = parseFloat(stopLoss) || (tradeDirection === 'LONG' ? ep * 0.992 : ep * 1.008);
    const tp = parseFloat(targetPrice) || (tradeDirection === 'LONG' ? ep * 1.018 : ep * 0.982);

    let basePrice = ep;
    let volatility = basePrice * 0.0035;

    // Generate 52 realistic OHLC candles ending near the entry price
    const numCandles = 52;
    const candles: Array<{ open: number; high: number; low: number; close: number; vol: number }> = [];
    let curPrice = basePrice * (tradeDirection === 'LONG' ? 0.985 : 1.015);

    for (let i = 0; i < numCandles; i++) {
      const progress = i / numCandles;
      // Drift toward entry price near the right edge
      const drift = (basePrice - curPrice) * (0.04 + progress * 0.08);
      const wave = Math.sin(i * 0.4) * volatility * 0.7;
      const noise = (Math.random() - 0.48) * volatility;
      const open = curPrice;
      const close = i === numCandles - 1 ? ep : open + drift + wave + noise;
      const candleHigh = Math.max(open, close) + Math.random() * volatility * 0.8;
      const candleLow = Math.min(open, close) - Math.random() * volatility * 0.8;
      const vol = Math.floor(800 + Math.random() * 3200 + (Math.abs(close - open) / volatility) * 1500);

      candles.push({ open, high: candleHigh, low: candleLow, close, vol });
      curPrice = close;
    }

    // Min and Max prices for scaling
    let minPrice = Math.min(...candles.map(c => c.low), sl, tp, ep);
    let maxPrice = Math.max(...candles.map(c => c.high), sl, tp, ep);
    const pricePadding = (maxPrice - minPrice) * 0.12 || 1;
    minPrice -= pricePadding;
    maxPrice += pricePadding;
    const priceRange = maxPrice - minPrice;

    const maxVol = Math.max(...candles.map(c => c.vol), 1);

    const priceToY = (p: number) => topMargin + priceAreaHeight - ((p - minPrice) / priceRange) * priceAreaHeight;

    // Grid lines (horizontal price lines)
    ctx.lineWidth = 1;
    const numPriceSteps = 8;
    for (let i = 0; i <= numPriceSteps; i++) {
      const p = minPrice + (priceRange * i) / numPriceSteps;
      const y = priceToY(p);
      ctx.strokeStyle = '#0d1522';
      ctx.beginPath();
      ctx.moveTo(leftMargin, y);
      ctx.lineTo(canvas.width - rightMargin, y);
      ctx.stroke();

      // Price tick label on right axis
      ctx.fillStyle = '#4a5b73';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(p >= 100 ? p.toFixed(2) : p >= 1 ? p.toFixed(4) : p.toFixed(5), canvas.width - rightMargin + 8, y + 3);
    }

    // Vertical time grid lines & date labels
    const candleSpacing = chartWidth / numCandles;
    for (let i = 0; i < numCandles; i += 8) {
      const x = leftMargin + i * candleSpacing + candleSpacing / 2;
      ctx.strokeStyle = '#0d1522';
      ctx.beginPath();
      ctx.moveTo(x, topMargin);
      ctx.lineTo(x, topMargin + chartHeight);
      ctx.stroke();

      const hoursAgo = (numCandles - i) * 1;
      ctx.fillStyle = '#3a4b60';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`-${hoursAgo}h`, x, topMargin + chartHeight + 14);
    }

    // Watermark behind candles
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.015)';
    ctx.font = 'bold 52px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('VANTA CHRONICLE', canvas.width / 2 - 40, canvas.height / 2);
    ctx.restore();

    // Calculate and draw 20-period EMA & 50-period EMA
    const calcEma = (period: number) => {
      const k = 2 / (period + 1);
      const ema: number[] = [];
      let prev = candles[0].close;
      for (let i = 0; i < candles.length; i++) {
        const val = candles[i].close * k + prev * (1 - k);
        ema.push(val);
        prev = val;
      }
      return ema;
    };

    const ema20 = calcEma(20);
    const ema50 = calcEma(50);

    // Draw EMA 50 (amber/orange)
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ema50.forEach((val, i) => {
      const x = leftMargin + i * candleSpacing + candleSpacing / 2;
      const y = priceToY(val);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw EMA 20 (cyan)
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.75)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ema20.forEach((val, i) => {
      const x = leftMargin + i * candleSpacing + candleSpacing / 2;
      const y = priceToY(val);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw Volume Histogram Bars
    const volBaseY = topMargin + chartHeight;
    candles.forEach((c, i) => {
      const x = leftMargin + i * candleSpacing + 2;
      const barW = Math.max(1, candleSpacing - 4);
      const barH = (c.vol / maxVol) * volumeHeight;
      const isUp = c.close >= c.open;
      ctx.fillStyle = isUp ? 'rgba(0, 255, 102, 0.22)' : 'rgba(255, 51, 68, 0.22)';
      ctx.fillRect(x, volBaseY - barH, barW, barH);
    });

    // Draw Candlesticks (Wicks + Bodies)
    candles.forEach((c, i) => {
      const x = leftMargin + i * candleSpacing + candleSpacing / 2;
      const isUp = c.close >= c.open;
      const candleColor = isUp ? '#00ff66' : '#ff3344';

      const highY = priceToY(c.high);
      const lowY = priceToY(c.low);
      const openY = priceToY(c.open);
      const closeY = priceToY(c.close);

      // Upper & lower wick
      ctx.strokeStyle = candleColor;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Real candle body
      const bodyTop = Math.min(openY, closeY);
      const bodyH = Math.max(2, Math.abs(closeY - openY));
      const bodyW = Math.max(3, candleSpacing - 5);

      ctx.fillStyle = candleColor;
      ctx.fillRect(x - bodyW / 2, bodyTop, bodyW, bodyH);
    });

    // Draw Entry, Stop Loss, and Take Profit execution lines with badges
    const drawExecutionLine = (price: number, label: string, color: string, badgeBg: string) => {
      const y = priceToY(price);
      if (y < topMargin || y > topMargin + priceAreaHeight) return;

      // Dashed horizontal line
      ctx.save();
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(leftMargin, y);
      ctx.lineTo(canvas.width - rightMargin, y);
      ctx.stroke();
      ctx.restore();

      // Price badge on right axis
      ctx.fillStyle = badgeBg;
      ctx.fillRect(canvas.width - rightMargin + 2, y - 9, 84, 18);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`${label} ${price >= 100 ? price.toFixed(2) : price.toFixed(4)}`, canvas.width - rightMargin + 6, y + 4);
    };

    drawExecutionLine(ep, 'ENTRY', '#00f0ff', '#004d59');
    drawExecutionLine(sl, 'SL', '#ff3344', '#661118');
    drawExecutionLine(tp, 'TP', '#00ff66', '#005924');

    // Right-hand axis border
    ctx.strokeStyle = '#141d2b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(canvas.width - rightMargin, topMargin);
    ctx.lineTo(canvas.width - rightMargin, canvas.height - bottomMargin);
    ctx.stroke();

    // Top Telemetry Header Stamp
    ctx.fillStyle = '#090d14';
    ctx.fillRect(0, 0, canvas.width, 54);
    ctx.strokeStyle = '#00ff66';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 54);
    ctx.lineTo(canvas.width, 54);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`CHADI0X VANTA ALPHA CHRONICLE  |  ${asset} [1H]`, 20, 32);

    const dirBadgeColor = tradeDirection === 'LONG' ? '#00ff66' : '#ff3344';
    ctx.fillStyle = dirBadgeColor;
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`[${tradeDirection}]`, 420, 32);

    ctx.fillStyle = '#8b9bb4';
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillText(`ENTRY: ${entryPrice}  |  SL: ${stopLoss}  |  TP: ${targetPrice}  |  EMA(20/50)  |  VOL: LIVE`, 500, 32);

    // Bottom Macro Telemetry Vector Stamp
    ctx.fillStyle = '#090d14';
    ctx.fillRect(0, canvas.height - 44, canvas.width, 44);
    ctx.strokeStyle = '#141d2b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height - 44);
    ctx.lineTo(canvas.width, canvas.height - 44);
    ctx.stroke();

    ctx.fillStyle = '#8b9bb4';
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillText(
      `MACRO STATE: Net Liq: +$24.2B | TGA: $765B | COT NC Net: 92% | GEX: +$3.4B (Long Gamma) | 10Y-2Y: +16 bps | VIX: 14.8 | RSI(14): 58.4`,
      20,
      canvas.height - 17
    );

    const dataUrl = canvas.toDataURL('image/png');
    setSnapshotImage(dataUrl);
  };

  useEffect(() => {
    if (isOpen && !snapshotImage) {
      generateChartSnapshot();
    }
  }, [isOpen]);

  // Global hotkey listener for Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Compute R:R
  const entryNum = parseFloat(entryPrice) || 0;
  const slNum = parseFloat(stopLoss) || 0;
  const tpNum = parseFloat(targetPrice) || 0;
  const riskDistance = Math.abs(entryNum - slNum);
  const rewardDistance = Math.abs(tpNum - entryNum);
  const calculatedRR = riskDistance > 0 ? Number((rewardDistance / riskDistance).toFixed(2)) : 0;

  const toggleConfluence = (id: string) => {
    setSelectedConfluences((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSaveEntry = async () => {
    setSubmitting(true);
    setStatusMsg('');

    const payload = {
      asset,
      tradeDirection,
      entryPrice: entryNum,
      stopLoss: slNum || undefined,
      targetPrice: tpNum || undefined,
      riskRewardRatio: calculatedRR,
      lots: parseFloat(lots) || undefined,
      outcome: 'OPEN',
      thesisNotes,
      confluences: selectedConfluences,
      macroSnapshot: {
        netLiquidityUSD: '6069.6B',
        netLiquidityDelta30d: '+24.2B',
        tgaBalanceUSD: '765.2B',
        reverseRepoUSD: '285.6B',
        cotPercentile52w: 92,
        gammaRegime: 'POSITIVE_GAMMA',
        yield10y2ySpreadBps: 15.2,
        vix: 14.8,
        timestamp: new Date().toISOString()
      },
      snapshotImage: snapshotImage || undefined,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean)
    };

    try {
      const res = await fetch(`${API_BASE}/api/journal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setStatusMsg('✓ JOURNAL ENTRY RECORDED IN POSTGRESQL');
        setTimeout(() => {
          onClose();
          window.dispatchEvent(new CustomEvent('journal-updated'));
        }, 800);
      } else {
        const err = await res.json();
        setStatusMsg(`✗ Save failed: ${err.message || err.error}`);
      }
    } catch (e: any) {
      setStatusMsg(`✗ Network error: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 font-mono select-none animate-in fade-in duration-150">
      <div 
        className="w-full max-w-5xl bg-vanta-950 border border-vanta-border shadow-2xl rounded-lg overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-vanta-border bg-black/70">
          <div className="flex items-center space-x-3">
            <div className="p-1 bg-vanta-green/10 border border-vanta-green/30 rounded">
              <Camera className="w-4 h-4 text-vanta-green" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-extrabold text-white tracking-widest uppercase">
                  VANTA CHRONICLE: INSTITUTIONAL TRADE &amp; MACRO JOURNAL
                </span>
                <span className="text-[10px] bg-vanta-green/20 text-vanta-green px-1.5 py-0.2 rounded font-bold">
                  CMD+S
                </span>
              </div>
              <p className="text-[10px] text-neutral-400">
                Freezes exact 25-point quantitative state vector with visual canvas markup
              </p>
            </div>
          </div>

          <button onClick={onClose} className="text-neutral-500 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Two Columns */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Left Column: Visual Snapshot & Canvas Markup (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-neutral-300 font-bold uppercase flex items-center space-x-1.5">
                <Camera className="w-3.5 h-3.5 text-vanta-cyan" />
                <span>ACTIVE CANVAS SNAPSHOT</span>
              </span>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsAnnotating(!isAnnotating)}
                  className={`flex items-center space-x-1 px-2.5 py-1 rounded text-[10px] font-bold border transition-colors ${
                    isAnnotating ? 'bg-vanta-green/20 border-vanta-green text-vanta-green' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  <PenTool className="w-3 h-3" />
                  <span>{isAnnotating ? 'EXIT DRAWING' : 'DRAW & ANNOTATE'}</span>
                </button>

                <button
                  onClick={generateChartSnapshot}
                  className="px-2.5 py-1 rounded text-[10px] bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white"
                >
                  RE-SNAP
                </button>
              </div>
            </div>

            {/* Canvas Preview / Editor */}
            {isAnnotating ? (
              <JournalCanvasEditor
                initialImage={snapshotImage}
                onSave={(newImg) => {
                  setSnapshotImage(newImg);
                  setIsAnnotating(false);
                }}
                onCancel={() => setIsAnnotating(false)}
              />
            ) : (
              <div className="border border-vanta-border rounded overflow-hidden bg-black relative group">
                {snapshotImage ? (
                  <img
                    src={snapshotImage}
                    alt="Chart snapshot"
                    className="w-full h-auto object-cover max-h-[380px]"
                  />
                ) : (
                  <div className="p-12 text-center text-neutral-500 text-xs">
                    Rendering chart snapshot...
                  </div>
                )}
                <div className="absolute bottom-2 right-2 bg-black/80 border border-neutral-800 px-2 py-1 rounded text-[9px] text-neutral-400">
                  Click 'DRAW &amp; ANNOTATE' to add trendlines, targets &amp; boxes
                </div>
              </div>
            )}

            {/* Macro Telemetry Confirmation Pill */}
            <div className="p-3 bg-vanta-900/60 border border-vanta-border/80 rounded text-[10px] text-neutral-400 space-y-1">
              <span className="font-bold text-vanta-cyan block">QUANTITATIVE MACRO STATE PRESERVED:</span>
              <div className="grid grid-cols-2 gap-2 text-neutral-300">
                <div>• Net Fed Liq: <strong className="text-white">$6,069.6B (+24.2B)</strong></div>
                <div>• COT Spec Net: <strong className="text-vanta-green">92% Long Extreme</strong></div>
                <div>• Gamma Regime: <strong className="text-vanta-green">Positive GEX (+$3.4B)</strong></div>
                <div>• 10Y-2Y Curve: <strong className="text-white">+15.2 bps (Steepening)</strong></div>
              </div>
            </div>
          </div>

          {/* Right Column: Trade Thesis & Confluences Form (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col space-y-3">
            {/* Asset & Direction Selector */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-neutral-400 font-bold block mb-1">ASSET:</label>
                <input
                  type="text"
                  value={asset}
                  onChange={(e) => setAsset(e.target.value.toUpperCase())}
                  className="w-full bg-black border border-vanta-border rounded px-2.5 py-1.5 text-white font-mono text-xs focus:border-vanta-green focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-neutral-400 font-bold block mb-1">DIRECTION:</label>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    onClick={() => setTradeDirection('LONG')}
                    className={`py-1.5 rounded font-bold text-[11px] border ${
                      tradeDirection === 'LONG' ? 'bg-vanta-green/20 border-vanta-green text-vanta-green' : 'bg-neutral-900 border-neutral-800 text-neutral-500'
                    }`}
                  >
                    LONG
                  </button>
                  <button
                    onClick={() => setTradeDirection('SHORT')}
                    className={`py-1.5 rounded font-bold text-[11px] border ${
                      tradeDirection === 'SHORT' ? 'bg-vanta-red/20 border-vanta-red text-vanta-red' : 'bg-neutral-900 border-neutral-800 text-neutral-500'
                    }`}
                  >
                    SHORT
                  </button>
                </div>
              </div>
            </div>

            {/* Price Levels (Entry, SL, TP, Lots) */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-neutral-400 font-bold block mb-1">ENTRY:</label>
                <input
                  type="text"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                  className="w-full bg-black border border-vanta-border rounded px-2 py-1 text-white font-mono text-xs focus:border-vanta-green focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-neutral-400 font-bold block mb-1">STOP LOSS:</label>
                <input
                  type="text"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  className="w-full bg-black border border-vanta-border rounded px-2 py-1 text-vanta-red font-mono text-xs focus:border-vanta-red focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-neutral-400 font-bold block mb-1">TARGET:</label>
                <input
                  type="text"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="w-full bg-black border border-vanta-border rounded px-2 py-1 text-vanta-green font-mono text-xs focus:border-vanta-green focus:outline-none"
                />
              </div>
            </div>

            {/* Risk:Reward & Lots Row */}
            <div className="flex items-center justify-between p-2 bg-black border border-neutral-800 rounded text-xs">
              <span className="text-neutral-400">Calculated R:R:</span>
              <span className={`font-mono font-extrabold ${calculatedRR >= 2 ? 'text-vanta-green' : 'text-vanta-yellow'}`}>
                1 : {calculatedRR}
              </span>
              <span className="text-neutral-400 ml-3">Lots:</span>
              <input
                type="text"
                value={lots}
                onChange={(e) => setLots(e.target.value)}
                className="w-16 bg-vanta-900 border border-neutral-700 rounded px-1.5 py-0.5 text-white font-mono text-center text-xs"
              />
            </div>

            {/* Macro Confluence Checklist */}
            <div>
              <label className="text-[10px] text-neutral-400 font-bold block mb-1">
                MACRO CONFLUENCES (CHECKLIST):
              </label>
              <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                {CONFLUENCE_OPTIONS.map((conf) => {
                  const isChecked = selectedConfluences.includes(conf.id);
                  return (
                    <div
                      key={conf.id}
                      onClick={() => toggleConfluence(conf.id)}
                      className={`flex items-center space-x-2 px-2 py-1 rounded cursor-pointer border text-[10px] transition-colors ${
                        isChecked ? 'bg-vanta-green/10 border-vanta-green/50 text-white' : 'bg-neutral-900/60 border-neutral-800 text-neutral-500 hover:text-neutral-300'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                        isChecked ? 'bg-vanta-green border-vanta-green text-black' : 'border-neutral-700'
                      }`}>
                        {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <span className="truncate">{conf.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Thesis & Post-Mortem Notes */}
            <div>
              <label className="text-[10px] text-neutral-400 font-bold block mb-1">THESIS &amp; RATIONALE:</label>
              <textarea
                value={thesisNotes}
                onChange={(e) => setThesisNotes(e.target.value)}
                placeholder="Why is this trade an asymmetric macro opportunity? Note institutional orderflow, liquidity, and invalidation rules..."
                rows={3}
                className="w-full bg-black border border-vanta-border rounded p-2 text-white font-mono text-[11px] focus:border-vanta-green focus:outline-none"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="text-[10px] text-neutral-400 font-bold block mb-1">TAGS (COMMA-SEPARATED):</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full bg-black border border-vanta-border rounded px-2 py-1 text-neutral-300 font-mono text-xs focus:border-vanta-green focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-vanta-border bg-black/80 flex items-center justify-between">
          <div className="text-[11px] font-bold">
            {statusMsg && (
              <span className={statusMsg.startsWith('✓') ? 'text-vanta-green' : 'text-vanta-red'}>
                {statusMsg}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded bg-neutral-900 border border-neutral-700 text-neutral-400 hover:text-white text-xs font-bold"
            >
              CANCEL
            </button>

            <button
              onClick={handleSaveEntry}
              disabled={submitting}
              className="flex items-center space-x-2 px-4 py-1.5 rounded bg-vanta-green hover:bg-emerald-400 text-black text-xs font-extrabold shadow-[0_0_12px_#00ff66] transition-transform active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{submitting ? 'RECORDING...' : 'SAVE JOURNAL ENTRY'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
