import { useEffect, useRef } from 'react';
import { LoopSamplerEngine } from '../audio/LoopSamplerEngine';
import type { LoopBarsOption } from '../types/catalog';

interface LoopWaveformProps {
  peaks: number[];
  color: string;
  loopRange: [number, number];
  loopBars: LoopBarsOption;
  onLoopRangeChange: (range: [number, number]) => void;
  onSlideWindow: (newStart: number) => void;
  onSeek: (norm: number) => void;
}

type DragMode =
  | { kind: 'left' }
  | { kind: 'right' }
  | { kind: 'slide'; offsetFromStart: number }
  | { kind: 'seek' }
  | null;

export function LoopWaveform({
  peaks,
  color,
  loopRange,
  loopBars,
  onLoopRangeChange,
  onSlideWindow,
  onSeek,
}: LoopWaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<DragMode>(null);
  const sizeRef = useRef({ width: 320, height: 64, dpr: 1 });

  const latestProps = useRef({
    peaks,
    color,
    loopRange,
    loopBars,
    onLoopRangeChange,
    onSlideWindow,
    onSeek,
  });
  latestProps.current = {
    peaks,
    color,
    loopRange,
    loopBars,
    onLoopRangeChange,
    onSlideWindow,
    onSeek,
  };

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(120, Math.floor(rect.width));
      const h = Math.max(48, Math.floor(rect.height));
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      sizeRef.current = { width: w, height: h, dpr };
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const engine = LoopSamplerEngine.getInstance();
    let rafId = 0;

    const draw = () => {
      rafId = window.requestAnimationFrame(draw);
      if (document.hidden) return;

      const p = latestProps.current;
      const { width, height, dpr } = sizeRef.current;
      const midY = height * 0.5;
      const [a, b] = p.loopRange;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Selected Loop Frosted Highlight
      const xA = a * width;
      const xB = b * width;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(xA, 0, Math.max(2, xB - xA), height);

      // Center reference line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(width, midY);
      ctx.stroke();

      // Waveform Bars
      const list = p.peaks.length > 0 ? p.peaks : [0.06];
      const stepX = width / list.length;
      const maxH = height * 0.4;

      for (let i = 0; i < list.length; i++) {
        const normX = (i + 0.5) / list.length;
        const inLoop = normX >= a && normX <= b;
        const amp = Math.max(0.03, list[i]);
        const h = amp * maxH;
        const x = i * stepX;
        const barW = Math.max(1.2, stepX - 0.8);

        ctx.fillStyle = inLoop ? p.color || '#F2F5FA' : '#586073';
        ctx.globalAlpha = inLoop ? 0.94 : 0.4;
        ctx.fillRect(x, midY - h, barW, h * 2);
      }
      ctx.globalAlpha = 1;

      // Specular Loop Bracket Rails
      ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.fillRect(xA, 0, Math.max(2, xB - xA), 2);
      ctx.fillRect(xA, height - 2, Math.max(2, xB - xA), 2);

      // Left & Right Handle Bars
      ctx.fillRect(Math.max(0, xA - 1), 0, 2.5, height);
      ctx.fillRect(Math.min(width - 2.5, xB - 1.5), 0, 2.5, height);

      // Live Playhead
      const playNorm = engine.getPlayheadNormalized();
      if (engine.isPlaying() || playNorm > 0) {
        const px = playNorm * width;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(px - 0.75, 0, 1.5, height);
      }

      ctx.restore();
    };

    rafId = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(rafId);
  }, []);

  const normFromX = (clientX: number) => {
    const el = containerRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    const w = sizeRef.current.width;
    const norm = normFromX(e.clientX);
    const px = norm * w;
    const [a, b] = loopRange;

    if (Math.abs(px - a * w) < 16) {
      dragRef.current = { kind: 'left' };
      return;
    }
    if (Math.abs(px - b * w) < 16) {
      dragRef.current = { kind: 'right' };
      return;
    }
    if (norm >= a && norm <= b) {
      dragRef.current = { kind: 'slide', offsetFromStart: norm - a };
      return;
    }

    if (loopBars !== 'free') {
      const span = b - a;
      onSlideWindow(norm - span * 0.5);
      dragRef.current = { kind: 'slide', offsetFromStart: span * 0.5 };
    } else {
      dragRef.current = { kind: 'seek' };
      onSeek(norm);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const norm = normFromX(e.clientX);
    const [a, b] = loopRange;

    if (drag.kind === 'left') {
      onLoopRangeChange([Math.min(norm, b - 0.03), b]);
    } else if (drag.kind === 'right') {
      onLoopRangeChange([a, Math.max(norm, a + 0.03)]);
    } else if (drag.kind === 'slide') {
      onSlideWindow(norm - drag.offsetFromStart);
    } else if (drag.kind === 'seek') {
      onSeek(norm);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="touch-surface liquid-well relative w-full h-14 sm:h-16 rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing"
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
}
