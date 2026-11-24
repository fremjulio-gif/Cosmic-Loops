import { useCallback, useEffect, useRef, useState } from 'react';
import { LoopSamplerEngine } from '../audio/LoopSamplerEngine';
import type { ScanMode, StarObject } from '../types/catalog';
import {
  IconClose,
  IconExpand,
  IconPause,
  IconPlay,
  IconZoomIn,
  IconZoomOut,
} from './Icons';

interface StarStageProps {
  star: StarObject;
  activeStemIds: string[];
  loopRange: [number, number];
  isPlaying: boolean;
  onTogglePlay: () => void;
}

const SCAN_LABELS: Record<ScanMode, string> = {
  'left-to-right': 'Balayage gauche → droite',
  clockwise: 'Balayage radar horaire',
  radial: 'Onde du centre vers l’extérieur',
  vertical: 'Balayage vertical',
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 4.5;

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function clampPan(
  pan: { x: number; y: number },
  zoom: number,
  width: number,
  height: number
): { x: number; y: number } {
  if (zoom <= 1.001) return { x: 0, y: 0 };
  const maxX = ((zoom - 1) * width) / 2;
  const maxY = ((zoom - 1) * height) / 2;
  return {
    x: clamp(pan.x, -maxX, maxX),
    y: clamp(pan.y, -maxY, maxY),
  };
}

interface ZoomableStarFrameProps {
  star: StarObject;
  displayedImage: string;
  activeLayerTag: string | null;
  loopRange: [number, number];
  isPlaying: boolean;
  className: string;
  isExpanded: boolean;
  keyboardActive: boolean;
  onToggleExpand: () => void;
}

function ZoomableStarFrame({
  star,
  displayedImage,
  activeLayerTag,
  loopRange,
  isPlaying,
  className,
  isExpanded,
  keyboardActive,
  onToggleExpand,
}: ZoomableStarFrameProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });

  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{ dist: number; midX: number; midY: number } | null>(null);
  const lastTapRef = useRef<{ time: number; x: number; y: number }>({
    time: 0,
    x: 0,
    y: 0,
  });

  const stateRef = useRef({ star, loopRange, isPlaying });
  stateRef.current = { star, loopRange, isPlaying };

  const drawScanOverlay = useCallback(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const engine = LoopSamplerEngine.getInstance();
    const { star: curStar, loopRange: range, isPlaying: playing } = stateRef.current;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    const invZ = 1 / Math.max(1, zoomRef.current);

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const [a, b] = range;
    const playNorm = engine.getPlayheadNormalized();
    const rms = playing ? engine.getMasterRMS() : 0;

    if (curStar.scanMode === 'left-to-right') {
      ctx.fillStyle = 'rgba(5, 6, 9, 0.54)';
      if (a > 0.002) ctx.fillRect(0, 0, a * w, h);
      if (b < 0.998) ctx.fillRect(b * w, 0, (1 - b) * w, h);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.lineWidth = 1 * invZ;
      if (a > 0.002) {
        ctx.beginPath();
        ctx.moveTo(a * w, 0);
        ctx.lineTo(a * w, h);
        ctx.stroke();
      }
      if (b < 0.998) {
        ctx.beginPath();
        ctx.moveTo(b * w, 0);
        ctx.lineTo(b * w, h);
        ctx.stroke();
      }

      if (playing) {
        const x = playNorm * w;
        const trailW = 28 * invZ;
        const grad = ctx.createLinearGradient(x - trailW, 0, x + 4 * invZ, 0);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        grad.addColorStop(0.85, `rgba(255, 255, 255, ${0.18 + rms * 0.2})`);
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(x - trailW, 0, trailW + 4 * invZ, h);

        ctx.strokeStyle = `rgba(255, 255, 255, ${0.78 + rms * 0.22})`;
        ctx.lineWidth = 1.6 * invZ;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
    } else if (curStar.scanMode === 'vertical') {
      ctx.fillStyle = 'rgba(5, 6, 9, 0.54)';
      if (a > 0.002) ctx.fillRect(0, 0, w, a * h);
      if (b < 0.998) ctx.fillRect(0, b * h, w, (1 - b) * h);

      if (playing) {
        const y = playNorm * h;
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.78 + rms * 0.22})`;
        ctx.lineWidth = 1.6 * invZ;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    } else if (curStar.scanMode === 'clockwise') {
      const cx = w * 0.5;
      const cy = h * 0.5;
      const r = Math.hypot(cx, cy);
      const startAng = -Math.PI * 0.5 + a * Math.PI * 2;
      const endAng = -Math.PI * 0.5 + b * Math.PI * 2;

      if (b - a < 0.99) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
        ctx.lineWidth = 1 * invZ;
        for (const ang of [startAng, endAng]) {
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r);
          ctx.stroke();
        }
      }

      if (playing) {
        const curAng = -Math.PI * 0.5 + playNorm * Math.PI * 2;
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.82 + rms * 0.18})`;
        ctx.lineWidth = 1.6 * invZ;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(curAng) * r, cy + Math.sin(curAng) * r);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(cx, cy, (3 + rms * 3) * invZ, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (curStar.scanMode === 'radial') {
      const cx = w * 0.5;
      const cy = h * 0.5;
      const maxR = Math.min(w, h) * 0.52;

      if (b - a < 0.99) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.26)';
        ctx.lineWidth = 1 * invZ;
        for (const radNorm of [a, b]) {
          ctx.beginPath();
          ctx.arc(cx, cy, radNorm * maxR, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      if (playing) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.8 + rms * 0.2})`;
        ctx.lineWidth = 1.6 * invZ;
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(2, playNorm * maxR), 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.restore();
  }, []);

  const applyTransform = useCallback(
    (nextZoom: number, nextPan: { x: number; y: number }) => {
      const z = Number(clamp(nextZoom, MIN_ZOOM, MAX_ZOOM).toFixed(3));
      const el = frameRef.current;
      const rect = el?.getBoundingClientRect();
      const clampedPan = rect
        ? clampPan(nextPan, z, rect.width, rect.height)
        : { x: 0, y: 0 };
      zoomRef.current = z;
      panRef.current = clampedPan;
      setZoom(z);
      setPan(clampedPan);
      drawScanOverlay();
    },
    [drawScanOverlay]
  );

  const zoomAtPoint = useCallback(
    (targetZoom: number, clientX: number, clientY: number) => {
      const el = frameRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const prevZ = zoomRef.current;
      const prevP = panRef.current;
      const nextZ = clamp(targetZoom, MIN_ZOOM, MAX_ZOOM);

      if (nextZ <= 1.005) {
        applyTransform(1, { x: 0, y: 0 });
        return;
      }

      const fx = clientX - (rect.left + rect.width / 2);
      const fy = clientY - (rect.top + rect.height / 2);
      const nextX = fx - ((fx - prevP.x) / prevZ) * nextZ;
      const nextY = fy - ((fy - prevP.y) / prevZ) * nextZ;
      applyTransform(nextZ, { x: nextX, y: nextY });
    },
    [applyTransform]
  );

  const zoomByStep = useCallback(
    (factor: number) => {
      const el = frameRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      zoomAtPoint(
        zoomRef.current * factor,
        rect.left + rect.width / 2,
        rect.top + rect.height / 2
      );
    },
    [zoomAtPoint]
  );

  // Reset zoom/pan when changing star
  useEffect(() => {
    applyTransform(1, { x: 0, y: 0 });
  }, [star.id, applyTransform]);

  // Keyboard zoom shortcuts (+/-/0)
  useEffect(() => {
    if (!keyboardActive) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomByStep(1.4);
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        zoomByStep(1 / 1.4);
      } else if (e.key === '0') {
        e.preventDefault();
        applyTransform(1, { x: 0, y: 0 });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [keyboardActive, zoomByStep, applyTransform]);

  // Native non-passive wheel listener for smooth cursor-centered zoom
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = clamp(Math.exp(-e.deltaY * 0.0024), 0.82, 1.22);
      zoomAtPoint(zoomRef.current * factor, e.clientX, e.clientY);
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAtPoint]);

  // Keep canvas sized cleanly to frame
  useEffect(() => {
    const frame = frameRef.current;
    const canvas = overlayCanvasRef.current;
    if (!frame || !canvas) return;

    const syncSize = () => {
      const rect = frame.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(80, Math.floor(rect.width));
      const h = Math.max(80, Math.floor(rect.height));
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);

      const clamped = clampPan(panRef.current, zoomRef.current, w, h);
      if (clamped.x !== panRef.current.x || clamped.y !== panRef.current.y) {
        panRef.current = clamped;
        setPan(clamped);
      }
      drawScanOverlay();
    };

    syncSize();
    const ro = new ResizeObserver(syncSize);
    ro.observe(frame);
    return () => ro.disconnect();
  }, [star.id, isExpanded, drawScanOverlay]);

  // Redraw static loop overlay immediately when paused or range changes
  useEffect(() => {
    drawScanOverlay();
  }, [star.id, star.scanMode, loopRange, isPlaying, drawScanOverlay]);

  // Run rAF scan beam ONLY while playing (0% idle CPU/GPU)
  useEffect(() => {
    if (!isPlaying) return;
    let rafId = 0;
    const tick = () => {
      rafId = window.requestAnimationFrame(tick);
      if (document.hidden) return;
      drawScanOverlay();
    };
    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [isPlaying, drawScanOverlay]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);

    const cx = e.clientX;
    const cy = e.clientY;
    pointersRef.current.set(e.pointerId, { x: cx, y: cy });

    if (pointersRef.current.size === 1) {
      const now = performance.now();
      const dx = cx - lastTapRef.current.x;
      const dy = cy - lastTapRef.current.y;
      if (now - lastTapRef.current.time < 280 && Math.hypot(dx, dy) < 28) {
        lastTapRef.current = { time: 0, x: 0, y: 0 };
        if (zoomRef.current > 1.15) {
          applyTransform(1, { x: 0, y: 0 });
        } else {
          zoomAtPoint(2.4, cx, cy);
        }
        return;
      }
      lastTapRef.current = { time: now, x: cx, y: cy };
    } else if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      pinchRef.current = {
        dist: Math.max(10, Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y)),
        midX: (pts[0].x + pts[1].x) / 2,
        midY: (pts[0].y + pts[1].y) / 2,
      };
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const prev = pointersRef.current.get(e.pointerId);
    if (!prev) return;
    const cx = e.clientX;
    const cy = e.clientY;

    if (pointersRef.current.size === 1) {
      const dx = cx - prev.x;
      const dy = cy - prev.y;
      pointersRef.current.set(e.pointerId, { x: cx, y: cy });
      if (zoomRef.current > 1.01) {
        applyTransform(zoomRef.current, {
          x: panRef.current.x + dx,
          y: panRef.current.y + dy,
        });
      }
    } else if (pointersRef.current.size === 2 && pinchRef.current) {
      pointersRef.current.set(e.pointerId, { x: cx, y: cy });
      const pts = Array.from(pointersRef.current.values());
      const newDist = Math.max(10, Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y));
      const newMidX = (pts[0].x + pts[1].x) / 2;
      const newMidY = (pts[0].y + pts[1].y) / 2;
      const scaleFactor = newDist / pinchRef.current.dist;
      const panDx = newMidX - pinchRef.current.midX;
      const panDy = newMidY - pinchRef.current.midY;

      panRef.current = {
        x: panRef.current.x + panDx,
        y: panRef.current.y + panDy,
      };
      zoomAtPoint(zoomRef.current * scaleFactor, newMidX, newMidY);
      pinchRef.current = { dist: newDist, midX: newMidX, midY: newMidY };
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size < 2) {
      pinchRef.current = null;
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  };

  return (
    <div
      ref={frameRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`touch-surface relative overflow-hidden border border-white/15 bg-[#06070B] shadow-[0_24px_64px_rgba(0,0,0,0.65)] ${
        zoom > 1.01 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'
      } ${className}`}
    >
      {/* Transformed Image + Scan Canvas Layer */}
      <div
        className="relative w-full h-full will-change-transform"
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
          transformOrigin: 'center center',
        }}
      >
        <img
          key={displayedImage}
          src={displayedImage}
          alt={star.name}
          decoding="async"
          className="w-full h-full object-cover select-none pointer-events-none"
          draggable={false}
        />
        <canvas
          ref={overlayCanvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />
      </div>

      {/* Top-Left Specular Glass Wavelength Badge */}
      {activeLayerTag && (
        <div className="liquid-pill absolute top-3 left-3 px-3 py-1 rounded-full font-mono-tabular text-[10px] text-[#F2F5FA] pointer-events-none">
          {activeLayerTag}
        </div>
      )}

      {/* Bottom-Right Liquid Glass Zoom & Inspect HUD */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className="liquid-pill absolute bottom-3 right-3 rounded-full p-0.5 flex items-center gap-0.5 z-10"
      >
        <button
          type="button"
          onClick={() => zoomByStep(1 / 1.4)}
          disabled={zoom <= 1.02}
          aria-label="Dézoomer l'image"
          className="touch-btn w-8 h-8 rounded-full flex items-center justify-center text-[#F2F5FA] disabled:opacity-30 liquid-hover"
        >
          <IconZoomOut className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => applyTransform(1, { x: 0, y: 0 })}
          aria-label={zoom > 1.02 ? 'Réinitialiser le zoom' : 'Niveau de zoom'}
          title={zoom > 1.02 ? 'Cliquer pour réinitialiser (1.0×)' : 'Niveau de zoom'}
          className="touch-btn px-1.5 h-8 font-mono-tabular text-[10px] text-[#F2F5FA] min-w-[38px] text-center"
        >
          {zoom.toFixed(1)}×
        </button>

        <button
          type="button"
          onClick={() => zoomByStep(1.4)}
          disabled={zoom >= MAX_ZOOM - 0.05}
          aria-label="Zoomer l'image"
          className="touch-btn w-8 h-8 rounded-full flex items-center justify-center text-[#F2F5FA] disabled:opacity-30 liquid-hover"
        >
          <IconZoomIn className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-4 bg-white/15 mx-0.5" />

        <button
          type="button"
          onClick={onToggleExpand}
          aria-label={isExpanded ? 'Fermer le plein écran' : 'Inspecter en plein écran'}
          className="touch-btn w-8 h-8 rounded-full flex items-center justify-center text-[#F2F5FA] liquid-hover"
        >
          {isExpanded ? (
            <IconClose className="w-3.5 h-3.5" />
          ) : (
            <IconExpand className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

export function StarStage({
  star,
  activeStemIds,
  loopRange,
  isPlaying,
  onTogglePlay,
}: StarStageProps) {
  const [expanded, setExpanded] = useState(false);

  let displayedImage = star.imageUrl;
  let activeLayerTag: string | null = null;
  if (activeStemIds.length === 1) {
    const soloStem = star.stems.find((s) => s.id === activeStemIds[0]);
    if (soloStem) {
      activeLayerTag = soloStem.label;
      if (soloStem.imageUrl) {
        displayedImage = soloStem.imageUrl;
      }
    }
  }

  useEffect(() => {
    if (!expanded) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation();
        setExpanded(false);
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [expanded]);

  return (
    <>
      <div className="flex-1 min-h-0 w-full flex flex-col items-center justify-center gap-2.5 px-4">
        <div className="flex-1 min-h-0 w-full flex items-center justify-center">
          <ZoomableStarFrame
            star={star}
            displayedImage={displayedImage}
            activeLayerTag={activeLayerTag}
            loopRange={loopRange}
            isPlaying={isPlaying}
            isExpanded={false}
            keyboardActive={!expanded}
            onToggleExpand={() => setExpanded(true)}
            className="h-full max-h-[340px] sm:max-h-[400px] lg:max-h-[440px] max-w-full aspect-square rounded-[24px]"
          />
        </div>

        <div className="shrink-0 max-w-xl text-center px-2">
          <div className="font-mono-tabular text-[10px] tracking-[0.12em] uppercase text-[#7E889B]">
            {star.telescopes.join(' · ')} — {SCAN_LABELS[star.scanMode]}
            <span className="hidden md:inline text-[#586073]">
              {' '}
              · Molette / Double-clic pour zoomer
            </span>
          </div>
          <p className="hidden sm:block mt-1 text-xs text-[#A2ACC0] line-clamp-2 leading-relaxed">
            {star.shortSummary}
          </p>
        </div>
      </div>

      {expanded && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Inspection haute résolution de ${star.name}`}
          className="fixed inset-0 z-50 bg-[#050609]/92 backdrop-blur-2xl flex flex-col items-center justify-between p-4 sm:p-6"
          style={{
            paddingTop: 'max(1rem, env(safe-area-inset-top))',
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
          }}
        >
          <div className="w-full max-w-5xl flex items-center justify-between gap-3">
            <div className="liquid-pill px-4 py-2 rounded-full flex items-center gap-3 min-w-0">
              <span className="text-xs sm:text-sm font-medium text-[#F2F5FA] truncate">
                {star.name}
              </span>
              <span className="hidden sm:inline font-mono-tabular text-[10px] text-[#A2ACC0]">
                {star.telescopes.join(' · ')}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onTogglePlay}
                className={`touch-btn flex items-center gap-2 px-4 min-h-[40px] rounded-full text-xs font-medium ${
                  isPlaying ? 'liquid-pill-active' : 'liquid-pill liquid-hover text-[#F2F5FA]'
                }`}
              >
                {isPlaying ? (
                  <IconPause className="w-3.5 h-3.5" />
                ) : (
                  <IconPlay className="w-3.5 h-3.5" />
                )}
                <span>{isPlaying ? 'Pause' : 'Écouter'}</span>
              </button>

              <button
                type="button"
                onClick={() => setExpanded(false)}
                aria-label="Fermer l'inspection"
                className="touch-btn liquid-pill liquid-hover w-10 h-10 rounded-full flex items-center justify-center text-[#F2F5FA]"
              >
                <IconClose className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 w-full flex items-center justify-center py-4">
            <ZoomableStarFrame
              star={star}
              displayedImage={displayedImage}
              activeLayerTag={activeLayerTag}
              loopRange={loopRange}
              isPlaying={isPlaying}
              isExpanded={true}
              keyboardActive={true}
              onToggleExpand={() => setExpanded(false)}
              className="h-full max-h-[74dvh] max-w-[92vw] aspect-square rounded-[28px]"
            />
          </div>

          <div className="max-w-2xl text-center text-xs text-[#A2ACC0] line-clamp-2">
            {star.shortSummary}
          </div>
        </div>
      )}
    </>
  );
}
