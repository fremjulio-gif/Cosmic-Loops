import { useRef } from 'react';
import { useSamplerStore } from '../store/useSamplerStore';
import type { LoopBarsOption } from '../types/catalog';
import {
  IconArrowLeft,
  IconChevronLeft,
  IconChevronRight,
  IconClose,
  IconDownload,
  IconInfo,
  IconMinus,
  IconPause,
  IconPlay,
  IconPlus,
} from './Icons';
import { LoopWaveform } from './LoopWaveform';
import { StarStage } from './StarStage';

const LOOP_OPTIONS: Array<{ value: LoopBarsOption; label: string }> = [
  { value: 'free', label: 'Libre' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 4, label: '4' },
  { value: 8, label: '8' },
];

export function SamplerView() {
  const catalog = useSamplerStore((s) => s.catalog);
  const activeStarId = useSamplerStore((s) => s.activeStarId);
  const loadingStems = useSamplerStore((s) => s.loadingStems);
  const isPlaying = useSamplerStore((s) => s.isPlaying);
  const activeStemIds = useSamplerStore((s) => s.activeStemIds);
  const loopBars = useSamplerStore((s) => s.loopBars);
  const bpm = useSamplerStore((s) => s.bpm);
  const pitchSemis = useSamplerStore((s) => s.pitchSemis);
  const loopRange = useSamplerStore((s) => s.loopRange);
  const infoOpen = useSamplerStore((s) => s.infoOpen);
  const isExporting = useSamplerStore((s) => s.isExporting);
  const toastMessage = useSamplerStore((s) => s.toastMessage);

  const backToGallery = useSamplerStore((s) => s.backToGallery);
  const cycleStar = useSamplerStore((s) => s.cycleStar);
  const togglePlay = useSamplerStore((s) => s.togglePlay);
  const seekNormalized = useSamplerStore((s) => s.seekNormalized);
  const toggleStemLayer = useSamplerStore((s) => s.toggleStemLayer);
  const setLoopBars = useSamplerStore((s) => s.setLoopBars);
  const setBpm = useSamplerStore((s) => s.setBpm);
  const setPitchSemis = useSamplerStore((s) => s.setPitchSemis);
  const setLoopRange = useSamplerStore((s) => s.setLoopRange);
  const slideLoopWindow = useSamplerStore((s) => s.slideLoopWindow);
  const exportLoop = useSamplerStore((s) => s.exportLoop);
  const setInfoOpen = useSamplerStore((s) => s.setInfoOpen);

  const star = catalog.find((s) => s.id === activeStarId);
  if (!star) return null;

  const activeSet = new Set(activeStemIds);
  const anyReady = star.stems.some((s) => loadingStems[s.id] === 'ready');
  const primaryActiveStem =
    star.stems.find((s) => activeSet.has(s.id)) ?? star.stems[0];

  const ambientImage =
    (activeStemIds.length === 1 && primaryActiveStem?.imageUrl) || star.imageUrl;

  const activeTimelineDur = Math.max(
    0.5,
    ...star.stems.filter((s) => activeSet.has(s.id)).map((s) => s.duration)
  );
  const rate = Math.pow(2, pitchSemis / 12);
  const exportSeconds =
    loopBars === 'free'
      ? ((loopRange[1] - loopRange[0]) * activeTimelineDur) / rate
      : loopBars * 4 * (60 / bpm);

  return (
    <div className="safe-sampler-frame relative z-10 flex flex-col">
      {/* Ambient Real-Starlight Bleed Behind Liquid Glass */}
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
      >
        <img
          src={ambientImage}
          alt=""
          className="w-full h-full object-cover opacity-[0.22] blur-[90px] scale-125 saturate-150"
        />
        <div className="absolute inset-0 bg-[#050609]/45" />
      </div>

      {/* Floating Liquid Glass Top Header */}
      <header className="shrink-0 px-3 sm:px-7 py-2.5 sm:py-3.5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={backToGallery}
          aria-label="Retour à la galerie"
          className="touch-btn liquid-pill liquid-hover flex items-center gap-2 px-3.5 min-h-[42px] rounded-full text-xs font-medium text-[#F2F5FA]"
        >
          <IconArrowLeft className="w-3.5 h-3.5 text-[#A2ACC0]" />
          <span className="hidden sm:inline">Galerie</span>
        </button>

        <div className="liquid-pill flex items-center gap-0.5 min-w-0 rounded-full p-0.5">
          <button
            type="button"
            onClick={() => cycleStar(-1)}
            aria-label="Astre précédent"
            className="touch-btn liquid-hover w-9 h-9 rounded-full flex items-center justify-center text-[#A2ACC0]"
          >
            <IconChevronLeft className="w-4 h-4" />
          </button>
          <h1 className="px-2 sm:px-3.5 text-xs sm:text-sm font-medium text-[#F2F5FA] truncate max-w-[160px] sm:max-w-[260px]">
            {star.name}
          </h1>
          <button
            type="button"
            onClick={() => cycleStar(1)}
            aria-label="Astre suivant"
            className="touch-btn liquid-hover w-9 h-9 rounded-full flex items-center justify-center text-[#A2ACC0]"
          >
            <IconChevronRight className="w-4 h-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setInfoOpen(true)}
          aria-label="Source NASA Chandra"
          className="touch-btn liquid-pill liquid-hover flex items-center gap-1.5 px-3.5 min-h-[42px] rounded-full text-xs font-medium text-[#A2ACC0]"
        >
          <IconInfo className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">NASA</span>
        </button>
      </header>

      {/* Center Airy Interactive Space Stage */}
      <main className="flex-1 min-h-0 flex flex-col justify-center overflow-hidden py-1 sm:py-2">
        <StarStage
          star={star}
          activeStemIds={activeStemIds}
          loopRange={loopRange}
          isPlaying={isPlaying}
          onTogglePlay={() => void togglePlay()}
        />
      </main>

      {/* Floating Apple Liquid Glass Loop Sampler Dock */}
      <footer className="shrink-0 w-full max-w-4xl mx-auto px-3 sm:px-6 pb-3 sm:pb-6">
        <div className="liquid-glass w-full min-w-0 rounded-[28px] p-3 sm:p-4 flex flex-col gap-3">
          {/* Row 1: Spectral Layer Pills (only when multi-layer) */}
          {star.stems.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto scroll-contain pb-0.5">
              {star.stems.map((stem) => {
                const active = activeSet.has(stem.id);
                const status = loadingStems[stem.id] ?? 'idle';
                return (
                  <button
                    key={stem.id}
                    type="button"
                    onClick={() => toggleStemLayer(stem.id)}
                    className={`touch-btn shrink-0 flex items-center gap-2 px-3 min-h-[34px] rounded-full text-[11px] font-medium transition-colors ${
                      active
                        ? 'liquid-pill text-[#F2F5FA]'
                        : 'bg-white/[0.03] border border-white/[0.06] text-[#667085] hover:text-[#A2ACC0]'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        status === 'loading' ? 'animate-pulse' : ''
                      }`}
                      style={{
                        backgroundColor: active ? stem.color : '#383F50',
                      }}
                    />
                    <span>{stem.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Row 2: Interactive Loop Waveform + Readout */}
          <div className="flex flex-col gap-1.5">
            <LoopWaveform
              peaks={primaryActiveStem?.peaks ?? []}
              color={primaryActiveStem?.color ?? '#56B4E9'}
              loopRange={loopRange}
              loopBars={loopBars}
              onLoopRangeChange={(r) => setLoopRange(r, true)}
              onSlideWindow={slideLoopWindow}
              onSeek={seekNormalized}
            />
            <div className="flex items-center justify-between px-1 font-mono-tabular text-[10px] text-[#7E889B]">
              <span>
                {loopBars === 'free'
                  ? `BOUCLE LIBRE · ${exportSeconds.toFixed(2)}s`
                  : `${loopBars} MESURE${loopBars > 1 ? 'S' : ''} · ${bpm} BPM (${exportSeconds.toFixed(2)}s)`}
              </span>
              <span className="hidden sm:inline">
                Glissez la zone ou les bords pour cadrer la boucle
              </span>
            </div>
          </div>

          {/* Row 3: Essential Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 pt-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                disabled={!anyReady}
                onClick={() => void togglePlay()}
                aria-label={isPlaying ? 'Pause' : 'Lecture'}
                className={`touch-btn flex items-center justify-center gap-2 px-4 min-h-[44px] rounded-full text-xs font-medium transition-colors disabled:opacity-40 ${
                  isPlaying
                    ? 'liquid-pill-active'
                    : 'liquid-pill liquid-hover text-[#F2F5FA]'
                }`}
              >
                {isPlaying ? (
                  <IconPause className="w-4 h-4" />
                ) : (
                  <IconPlay className="w-4 h-4" />
                )}
                <span>{isPlaying ? 'Pause' : 'Écouter'}</span>
              </button>

              <div
                className="liquid-well inline-flex items-center rounded-full p-0.5"
                role="group"
                aria-label="Longueur de boucle"
              >
                {LOOP_OPTIONS.map((opt) => {
                  const active = loopBars === opt.value;
                  return (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => setLoopBars(opt.value)}
                      className={`touch-btn px-2.5 min-h-[38px] rounded-full font-mono-tabular text-[11px] transition-colors ${
                        active
                          ? 'bg-white/15 text-[#F2F5FA] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]'
                          : 'text-[#667085] hover:text-[#A2ACC0]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
                <span className="hidden md:inline pr-2.5 pl-1 text-[10px] text-[#667085]">
                  mes.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto sm:ml-auto">
              <ScrubStepper
                label="BPM"
                value={bpm}
                min={60}
                max={180}
                defaultValue={120}
                format={(v) => `${v}`}
                onChange={setBpm}
              />

              <ScrubStepper
                label="PITCH"
                value={pitchSemis}
                min={-12}
                max={12}
                defaultValue={0}
                format={(v) => `${v > 0 ? '+' : ''}${v}st`}
                onChange={setPitchSemis}
              />

              <button
                type="button"
                disabled={!anyReady || isExporting}
                onClick={() => void exportLoop()}
                className="touch-btn liquid-pill-active flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 min-h-[44px] rounded-full text-xs font-semibold hover:brightness-105 transition-all disabled:opacity-40 whitespace-nowrap"
              >
                <IconDownload className="w-4 h-4 shrink-0" />
                <span>{isExporting ? 'Export…' : 'Exporter (.wav)'}</span>
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Liquid Glass Confirmation Toast */}
      {toastMessage && (
        <div className="liquid-pill fixed top-16 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-full font-mono-tabular text-xs text-[#F2F5FA]">
          {toastMessage}
        </div>
      )}

      {/* Official NASA Source Liquid Glass Modal */}
      {infoOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Informations NASA pour ${star.name}`}
        >
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setInfoOpen(false)}
          />
          <div className="liquid-glass relative z-10 w-full max-w-lg rounded-[28px] p-5 sm:p-6 flex flex-col gap-4 max-h-[82dvh] overflow-y-auto scroll-contain">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-mono-tabular text-[10px] tracking-[0.14em] uppercase text-[#667085]">
                  DONNÉES OFFICIELLES NASA CHANDRA
                </div>
                <h2 className="text-lg font-semibold text-[#F2F5FA] mt-1">
                  {star.name}
                </h2>
                <div className="text-xs text-[#A2ACC0] mt-0.5">
                  Télescopes : {star.telescopes.join(', ')}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInfoOpen(false)}
                aria-label="Fermer"
                className="touch-btn liquid-pill liquid-hover w-10 h-10 rounded-full flex items-center justify-center text-[#A2ACC0]"
              >
                <IconClose className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm leading-relaxed text-[#D0D6E2]">
              {star.nasaDescription}
            </p>

            <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-[11px] text-[#667085]">
              <span>Crédits : NASA / CXC / SAO / SYSTEM Sounds</span>
              <a
                href={star.sourcePageUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[#F2F5FA] underline underline-offset-4"
              >
                chandra.cfa.harvard.edu ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ScrubStepper({
  label,
  value,
  min,
  max,
  defaultValue,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  defaultValue: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const dragStartRef = useRef<{ x: number; startVal: number } | null>(null);
  const lastTapRef = useRef(0);

  return (
    <div className="liquid-well inline-flex items-center rounded-full h-[44px]">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        aria-label={`Diminuer ${label}`}
        className="touch-btn w-8 h-full rounded-l-full flex items-center justify-center text-[#A2ACC0] hover:text-[#F2F5FA]"
      >
        <IconMinus className="w-3 h-3" />
      </button>

      <div
        onPointerDown={(e) => {
          e.preventDefault();
          const now = performance.now();
          if (now - lastTapRef.current < 260) {
            onChange(defaultValue);
            lastTapRef.current = 0;
            return;
          }
          lastTapRef.current = now;
          e.currentTarget.setPointerCapture(e.pointerId);
          dragStartRef.current = { x: e.clientX, startVal: value };
        }}
        onPointerMove={(e) => {
          if (!dragStartRef.current) return;
          const dx = e.clientX - dragStartRef.current.x;
          const stepPx = max - min > 40 ? 3 : 10;
          const delta = Math.round(dx / stepPx);
          onChange(Math.max(min, Math.min(max, dragStartRef.current.startVal + delta)));
        }}
        onPointerUp={(e) => {
          dragStartRef.current = null;
          try {
            e.currentTarget.releasePointerCapture(e.pointerId);
          } catch {
            // Ignore
          }
        }}
        className="touch-surface px-1.5 min-w-[54px] h-full flex flex-col items-center justify-center cursor-ew-resize"
        title="Glisser horizontalement pour ajuster, double-clic pour réinitialiser"
      >
        <span className="font-mono-tabular text-[8px] tracking-[0.1em] text-[#667085] leading-none">
          {label}
        </span>
        <span className="font-mono-tabular text-xs font-medium text-[#F2F5FA] leading-tight mt-0.5">
          {format(value)}
        </span>
      </div>

      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        aria-label={`Augmenter ${label}`}
        className="touch-btn w-8 h-full rounded-r-full flex items-center justify-center text-[#A2ACC0] hover:text-[#F2F5FA]"
      >
        <IconPlus className="w-3 h-3" />
      </button>
    </div>
  );
}
