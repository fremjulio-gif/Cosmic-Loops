import { useEffect, useMemo, useRef } from 'react';
import { LoopSamplerEngine } from '../audio/LoopSamplerEngine';
import { useSamplerStore } from '../store/useSamplerStore';
import type { StarFamily } from '../types/catalog';
import { IconPause, IconPlay, IconSearch } from './Icons';

const FAMILY_FILTERS: Array<{ value: 'all' | StarFamily; label: string }> = [
  { value: 'all', label: 'Tous' },
  { value: 'nebulae', label: 'Nébuleuses' },
  { value: 'supernovae', label: 'Supernovas' },
  { value: 'blackholes', label: 'Trous noirs' },
  { value: 'galaxies', label: 'Galaxies' },
  { value: 'clusters', label: 'Amas' },
  { value: 'planets', label: 'Planètes' },
  { value: 'symphonies', label: 'Symphonies' },
];

export function GalleryView() {
  const catalog = useSamplerStore((s) => s.catalog);
  const galleryFilter = useSamplerStore((s) => s.galleryFilter);
  const galleryQuery = useSamplerStore((s) => s.galleryQuery);
  const galleryPreviewStarId = useSamplerStore((s) => s.galleryPreviewStarId);

  const setGalleryFilter = useSamplerStore((s) => s.setGalleryFilter);
  const setGalleryQuery = useSamplerStore((s) => s.setGalleryQuery);
  const toggleGalleryPreview = useSamplerStore((s) => s.toggleGalleryPreview);
  const openStarInSampler = useSamplerStore((s) => s.openStarInSampler);

  const progressBarRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!galleryPreviewStarId) return;
    let rafId = 0;
    const engine = LoopSamplerEngine.getInstance();

    const tick = () => {
      rafId = window.requestAnimationFrame(tick);
      if (progressBarRef.current) {
        const p = engine.getPreviewProgress();
        progressBarRef.current.style.width = `${Math.round(p * 1000) / 10}%`;
      }
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [galleryPreviewStarId]);

  const filtered = useMemo(() => {
    const q = galleryQuery.trim().toLowerCase();
    return catalog.filter((star) => {
      if (galleryFilter !== 'all' && star.family !== galleryFilter) return false;
      if (!q) return true;
      return (
        star.name.toLowerCase().includes(q) ||
        star.subtitle.toLowerCase().includes(q) ||
        star.telescopes.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [catalog, galleryFilter, galleryQuery]);

  return (
    <div className="safe-gallery-frame relative z-10 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 sm:pt-14">
        {/* Airy Cosmic Header */}
        <header className="max-w-2xl mb-7 sm:mb-9">
          <div className="inline-flex items-center gap-2 liquid-pill px-3 py-1 rounded-full font-mono-tabular text-[10px] tracking-[0.14em] uppercase text-[#A2ACC0] mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-white/80" />
            <span>NASA CHANDRA · A UNIVERSE OF SOUND</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-[#F2F5FA]">
            Cosmic Loops
          </h1>
          <p className="mt-3 text-sm sm:text-base leading-relaxed text-[#A2ACC0]">
            45 objets célestes réels observés par Chandra, Hubble et James Webb,
            traduits en véritables mélodies de l’espace. Écoutez un astre ou
            isolez une boucle prête pour votre DAW.
          </p>
        </header>

        {/* Sticky Apple Liquid Glass Filter & Search Bar */}
        <div className="sticky top-3 z-20 mb-8">
          <div className="liquid-glass rounded-3xl p-2 sm:p-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
            <div className="flex items-center gap-1 overflow-x-auto scroll-contain pb-0.5 lg:pb-0">
              {FAMILY_FILTERS.map((f) => {
                const active = galleryFilter === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setGalleryFilter(f.value)}
                    className={`touch-btn shrink-0 px-3 min-h-[38px] rounded-full text-xs font-medium transition-colors ${
                      active
                        ? 'liquid-pill-active'
                        : 'text-[#A2ACC0] hover:text-[#F2F5FA]'
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            <div className="relative w-full lg:w-56 shrink-0">
              <IconSearch className="w-4 h-4 text-[#667085] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={galleryQuery}
                onChange={(e) => setGalleryQuery(e.target.value)}
                placeholder="Rechercher un astre…"
                className="liquid-well w-full rounded-full pl-9 pr-4 min-h-[38px] text-xs text-[#F2F5FA] placeholder-[#667085] focus:outline-none focus:border-white/25"
              />
            </div>
          </div>
        </div>

        {/* Liquid Glass Visual Gallery Grid */}
        {filtered.length === 0 ? (
          <div className="py-20 text-center text-sm text-[#667085]">
            Aucun astre ne correspond à cette recherche.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
            {filtered.map((star) => {
              const isPreviewing = galleryPreviewStarId === star.id;
              const isolated = star.stems.filter((s) => !s.isComposite);
              const dots = (isolated.length > 0 ? isolated : star.stems).slice(0, 5);

              return (
                <article
                  key={star.id}
                  onClick={() => void openStarInSampler(star.id)}
                  className="space-card liquid-card group cursor-pointer rounded-[24px] overflow-hidden flex flex-col transition-colors"
                >
                  {/* Real NASA Photograph */}
                  <div className="relative aspect-[4/3] w-full bg-[#050609] overflow-hidden">
                    <img
                      src={star.imageUrl}
                      alt={star.name}
                      loading="lazy"
                      decoding="async"
                      className="space-card-img w-full h-full object-cover transition-transform duration-500 ease-out"
                    />
                    <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#050609]/85 via-[#050609]/25 to-transparent pointer-events-none" />

                    {/* Quick Preview Liquid Glass Orb */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void toggleGalleryPreview(star);
                      }}
                      aria-label={
                        isPreviewing
                          ? `Mettre en pause ${star.name}`
                          : `Écouter ${star.name}`
                      }
                      className={`touch-btn absolute right-3 bottom-3 w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
                        isPreviewing
                          ? 'liquid-pill-active'
                          : 'liquid-pill liquid-hover text-[#F2F5FA]'
                      }`}
                    >
                      {isPreviewing ? (
                        <IconPause className="w-4 h-4" />
                      ) : (
                        <IconPlay className="w-4 h-4 ml-0.5" />
                      )}
                    </button>

                    {/* Live Preview Progress */}
                    {isPreviewing && (
                      <div className="absolute left-0 right-0 bottom-0 h-[2px] bg-white/15">
                        <div
                          ref={progressBarRef}
                          className="h-full bg-white"
                          style={{ width: '0%' }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Clean Factual Card Info */}
                  <div className="p-4 flex-1 flex flex-col justify-between gap-2.5">
                    <div>
                      <div className="flex items-baseline justify-between gap-2">
                        <h2 className="text-[15px] font-medium text-[#F2F5FA] truncate">
                          {star.name}
                        </h2>
                        <span className="font-mono-tabular text-[11px] text-[#667085] shrink-0">
                          {star.duration.toFixed(0)}s
                        </span>
                      </div>
                      <p className="text-xs text-[#A2ACC0] mt-1 line-clamp-2 leading-relaxed">
                        {star.shortSummary}
                      </p>
                    </div>

                    <div className="pt-2.5 border-t border-white/[0.06] flex items-center justify-between gap-2">
                      <span className="text-[11px] text-[#667085] truncate">
                        {star.telescopes.slice(0, 3).join(' · ')}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {dots.map((d) => (
                          <span
                            key={d.id}
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: d.color }}
                            title={d.label}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
