'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Pencil, Square, ArrowUpRight, Type, Undo, RotateCcw, Check, Palette } from 'lucide-react';

interface JournalCanvasEditorProps {
  initialImage: string; // Base64 data URL
  onSave: (annotatedImage: string) => void;
  onCancel: () => void;
}

type ToolMode = 'brush' | 'line' | 'rect' | 'arrow' | 'text';

const COLORS = [
  { name: 'Neon Green', hex: '#00ff66' },
  { name: 'Red Stop', hex: '#ff3344' },
  { name: 'Cyan Target', hex: '#00f0ff' },
  { name: 'Yellow Warning', hex: '#ffb700' },
  { name: 'White', hex: '#ffffff' }
];

export function JournalCanvasEditor({ initialImage, onSave, onCancel }: JournalCanvasEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentTool, setCurrentTool] = useState<ToolMode>('brush');
  const [currentColor, setCurrentColor] = useState<string>('#00ff66');
  const [lineWidth, setLineWidth] = useState<number>(3);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const historyRef = useRef<ImageData[]>([]);

  // Load initial image into canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = initialImage;
    img.onload = () => {
      canvas.width = img.width || 800;
      canvas.height = img.height || 480;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      // Save initial snapshot
      historyRef.current = [ctx.getImageData(0, 0, canvas.width, canvas.height)];
    };
  }, [initialImage]);

  const saveHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (historyRef.current.length > 15) historyRef.current.shift();
    historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  };

  const handleUndo = () => {
    const canvas = canvasRef.current;
    if (!canvas || historyRef.current.length <= 1) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    historyRef.current.pop();
    const prev = historyRef.current[historyRef.current.length - 1];
    if (prev) ctx.putImageData(prev, 0, 0);
  };

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const coords = getCanvasCoords(e);
    setStartPos(coords);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = currentColor;
    ctx.fillStyle = currentColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (currentTool === 'brush') {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const coords = getCanvasCoords(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (currentTool === 'brush') {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
  };

  const stopDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const coords = getCanvasCoords(e);
    const canvas = canvasRef.current;
    if (!canvas || !startPos) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = currentColor;
    ctx.fillStyle = currentColor;
    ctx.lineWidth = lineWidth;

    if (currentTool === 'line') {
      ctx.beginPath();
      ctx.moveTo(startPos.x, startPos.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    } else if (currentTool === 'rect') {
      const width = coords.x - startPos.x;
      const height = coords.y - startPos.y;
      ctx.strokeRect(startPos.x, startPos.y, width, height);
    } else if (currentTool === 'arrow') {
      // Draw straight line
      ctx.beginPath();
      ctx.moveTo(startPos.x, startPos.y);
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
      // Draw arrowhead
      const angle = Math.atan2(coords.y - startPos.y, coords.x - startPos.x);
      const headLen = 14;
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.lineTo(coords.x - headLen * Math.cos(angle - Math.PI / 6), coords.y - headLen * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(coords.x, coords.y);
      ctx.lineTo(coords.x - headLen * Math.cos(angle + Math.PI / 6), coords.y - headLen * Math.sin(angle + Math.PI / 6));
      ctx.stroke();
    } else if (currentTool === 'text') {
      const text = prompt('Enter annotation callout:');
      if (text) {
        ctx.font = 'bold 16px monospace';
        ctx.fillText(text, coords.x, coords.y);
      }
    }

    saveHistory();
  };

  const handleExport = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <div className="flex flex-col space-y-3 font-mono text-xs select-none">
      {/* Editor Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-black border border-vanta-border rounded">
        {/* Tool Mode Buttons */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setCurrentTool('brush')}
            className={`p-1.5 rounded border transition-colors ${
              currentTool === 'brush' ? 'bg-vanta-green/20 border-vanta-green text-vanta-green' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
            }`}
            title="Freehand Brush"
          >
            <Pencil className="w-4 h-4" />
          </button>

          <button
            onClick={() => setCurrentTool('line')}
            className={`p-1.5 rounded border transition-colors ${
              currentTool === 'line' ? 'bg-vanta-green/20 border-vanta-green text-vanta-green' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
            }`}
            title="Trendline"
          >
            <div className="w-4 h-4 flex items-center justify-center font-bold text-xs">—</div>
          </button>

          <button
            onClick={() => setCurrentTool('rect')}
            className={`p-1.5 rounded border transition-colors ${
              currentTool === 'rect' ? 'bg-vanta-green/20 border-vanta-green text-vanta-green' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
            }`}
            title="Support / Resistance Box"
          >
            <Square className="w-4 h-4" />
          </button>

          <button
            onClick={() => setCurrentTool('arrow')}
            className={`p-1.5 rounded border transition-colors ${
              currentTool === 'arrow' ? 'bg-vanta-green/20 border-vanta-green text-vanta-green' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
            }`}
            title="Target Arrow"
          >
            <ArrowUpRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => setCurrentTool('text')}
            className={`p-1.5 rounded border transition-colors ${
              currentTool === 'text' ? 'bg-vanta-green/20 border-vanta-green text-vanta-green' : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
            }`}
            title="Text Callout"
          >
            <Type className="w-4 h-4" />
          </button>
        </div>

        {/* Color Palette */}
        <div className="flex items-center space-x-1.5 border-x border-neutral-800 px-3">
          {COLORS.map((c) => (
            <button
              key={c.hex}
              onClick={() => setCurrentColor(c.hex)}
              className={`w-5 h-5 rounded-full border-2 transition-transform ${
                currentColor === c.hex ? 'scale-125 border-white shadow-[0_0_8px_rgba(255,255,255,0.4)]' : 'border-transparent hover:scale-110'
              }`}
              style={{ backgroundColor: c.hex }}
              title={c.name}
            />
          ))}
        </div>

        {/* Undo & Save Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleUndo}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white"
            title="Undo Last Stroke"
          >
            <Undo className="w-3.5 h-3.5" />
            <span className="text-[10px]">UNDO</span>
          </button>

          <button
            onClick={onCancel}
            className="px-3 py-1 rounded bg-neutral-900 border border-neutral-700 text-neutral-400 hover:text-white font-bold"
          >
            CANCEL
          </button>

          <button
            onClick={handleExport}
            className="flex items-center space-x-1.5 px-3 py-1 rounded bg-vanta-green hover:bg-emerald-400 text-black font-extrabold shadow-[0_0_10px_#00ff66]"
          >
            <Check className="w-4 h-4" />
            <span>APPLY ANNOTATION</span>
          </button>
        </div>
      </div>

      {/* Canvas Drawing Area */}
      <div className="border border-vanta-border rounded overflow-hidden bg-black flex justify-center items-center max-h-[480px] overflow-auto">
        <canvas
          ref={canvasRef}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          className="cursor-crosshair max-w-full h-auto"
        />
      </div>
    </div>
  );
}
