import { lazy, Suspense, useEffect } from 'react';
import { GalleryView } from './components/GalleryView';
import { StarfieldBackground } from './components/StarfieldBackground';
import { useSamplerStore } from './store/useSamplerStore';

const LazySamplerView = lazy(() =>
  import('./components/SamplerView').then((m) => ({ default: m.SamplerView }))
);

export function App() {
  const catalogReady = useSamplerStore((s) => s.catalogReady);
  const catalogError = useSamplerStore((s) => s.catalogError);
  const view = useSamplerStore((s) => s.view);

  const initCatalog = useSamplerStore((s) => s.initCatalog);
  const unlockAudio = useSamplerStore((s) => s.unlockAudio);

  useEffect(() => {
    void initCatalog();
  }, [initCatalog]);

  // Idle prefetch of SamplerView chunk once Gallery mounts
  useEffect(() => {
    if (!catalogReady) return;
    const win = window as Window & {
      requestIdleCallback?: (cb: () => void) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (win.requestIdleCallback) {
      const id = win.requestIdleCallback(() => {
        void import('./components/SamplerView');
      });
      return () => win.cancelIdleCallback?.(id);
    }
    const tid = window.setTimeout(() => {
      void import('./components/SamplerView');
    }, 800);
    return () => window.clearTimeout(tid);
  }, [catalogReady]);

  useEffect(() => {
    const onFirstGesture = () => {
      void unlockAudio();
    };
    window.addEventListener('pointerdown', onFirstGesture, { once: true, passive: true });
    window.addEventListener('keydown', onFirstGesture, { once: true, passive: true });
    return () => {
      window.removeEventListener('pointerdown', onFirstGesture);
      window.removeEventListener('keydown', onFirstGesture);
    };
  }, [unlockAudio]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const st = useSamplerStore.getState();
      if (e.code === 'Space' && st.view === 'sampler') {
        e.preventDefault();
        void st.togglePlay();
      } else if (e.key === 'Escape') {
        if (st.infoOpen) st.setInfoOpen(false);
        else if (st.view === 'sampler') st.backToGallery();
      } else if (st.view === 'sampler' && !st.infoOpen) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          st.cycleStar(-1);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          st.cycleStar(1);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  if (catalogError) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-6 bg-[#050609]">
        <div className="max-w-md border border-red-500/40 bg-[#0B0D12] rounded-2xl p-6 text-xs text-[#EEF1F6]">
          <div className="font-mono-tabular text-red-400 mb-2">
            ERREUR DE CHARGEMENT
          </div>
          <div className="text-[#929BAD]">{catalogError}</div>
        </div>
      </div>
    );
  }

  if (!catalogReady) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#050609]">
        <div className="font-mono-tabular text-xs tracking-[0.16em] uppercase text-[#586073]">
          CHARGEMENT DES OBSERVATIONS CHANDRA…
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] bg-[#050609]">
      <StarfieldBackground />
      {view === 'gallery' ? (
        <GalleryView />
      ) : (
        <Suspense
          fallback={
            <div className="safe-sampler-frame relative z-10 flex items-center justify-center font-mono-tabular text-xs uppercase tracking-[0.14em] text-[#667085]">
              CHARGEMENT…
            </div>
          }
        >
          <LazySamplerView />
        </Suspense>
      )}
    </div>
  );
}

export default App;
