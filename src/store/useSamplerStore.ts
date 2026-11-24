import { create } from 'zustand';
import { LoopSamplerEngine } from '../audio/LoopSamplerEngine';
import type {
  AppView,
  CatalogData,
  LoopBarsOption,
  StarFamily,
  StarObject,
  StemLoadStatus,
} from '../types/catalog';

const engine = LoopSamplerEngine.getInstance();
let toastTimer: number | null = null;

export interface SamplerStoreState {
  catalog: StarObject[];
  catalogReady: boolean;
  catalogError: string | null;

  view: AppView;
  galleryPreviewStarId: string | null;
  galleryFilter: 'all' | StarFamily;
  galleryQuery: string;

  activeStarId: string | null;
  loadingStems: Record<string, StemLoadStatus>;

  isPlaying: boolean;
  activeStemIds: string[];
  loopBars: LoopBarsOption;
  bpm: number;
  pitchSemis: number;
  loopRange: [number, number]; // normalized 0..1 of timelineDuration

  infoOpen: boolean;
  isExporting: boolean;
  toastMessage: string | null;

  initCatalog: () => Promise<void>;
  unlockAudio: () => Promise<void>;

  // Gallery actions
  setGalleryFilter: (filter: 'all' | StarFamily) => void;
  setGalleryQuery: (q: string) => void;
  toggleGalleryPreview: (star: StarObject) => Promise<void>;
  stopGalleryPreview: () => void;

  // Navigation
  openStarInSampler: (starId: string) => Promise<void>;
  backToGallery: () => void;
  cycleStar: (dir: -1 | 1) => void;

  // Sampler controls
  togglePlay: () => Promise<void>;
  seekNormalized: (norm: number) => void;
  toggleStemLayer: (stemId: string) => void;
  setLoopBars: (bars: LoopBarsOption) => void;
  setBpm: (bpm: number) => void;
  setPitchSemis: (semis: number) => void;
  setLoopRange: (range: [number, number], switchToFreeIfResized?: boolean) => void;
  slideLoopWindow: (newStartNorm: number) => void;
  exportLoop: () => Promise<void>;
  setInfoOpen: (open: boolean) => void;
}

function computeTimelineDuration(star: StarObject, activeIds: string[]): number {
  const set = new Set(activeIds);
  const active = star.stems.filter((s) => set.has(s.id));
  if (active.length > 0) {
    return Math.max(...active.map((s) => s.duration));
  }
  return star.duration;
}

function computeBarsSpanNorm(
  bars: LoopBarsOption,
  bpm: number,
  pitchSemis: number,
  timelineDur: number
): number | null {
  if (bars === 'free') return null;
  const rate = Math.max(0.5, Math.min(2, Math.pow(2, pitchSemis / 12)));
  const outputSec = bars * 4 * (60 / bpm);
  const sourceSpanSec = outputSec * rate;
  return Math.max(0.03, Math.min(1, sourceSpanSec / Math.max(0.5, timelineDur)));
}

function clampLoopRangeForBars(
  currentStart: number,
  bars: LoopBarsOption,
  bpm: number,
  pitchSemis: number,
  timelineDur: number
): [number, number] {
  const spanNorm = computeBarsSpanNorm(bars, bpm, pitchSemis, timelineDur);
  if (spanNorm === null) return [0, 1];
  const maxStart = Math.max(0, 1 - spanNorm);
  const start = Math.max(0, Math.min(maxStart, currentStart));
  return [Number(start.toFixed(4)), Number(Math.min(1, start + spanNorm).toFixed(4))];
}

export const useSamplerStore = create<SamplerStoreState>((set, get) => {
  const pushToast = (msg: string | null) => {
    if (toastTimer !== null) {
      window.clearTimeout(toastTimer);
      toastTimer = null;
    }
    set({ toastMessage: msg });
    if (msg) {
      toastTimer = window.setTimeout(() => {
        set({ toastMessage: null });
      }, 3000);
    }
  };

  const syncWindowToEngine = (
    star: StarObject,
    activeIds: string[],
    range: [number, number]
  ) => {
    const dur = computeTimelineDuration(star, activeIds);
    engine.setLoopWindow(range[0] * dur, range[1] * dur, dur);
  };

  return {
    catalog: [],
    catalogReady: false,
    catalogError: null,

    view: 'gallery',
    galleryPreviewStarId: null,
    galleryFilter: 'all',
    galleryQuery: '',

    activeStarId: null,
    loadingStems: {},

    isPlaying: false,
    activeStemIds: [],
    loopBars: 4,
    bpm: 120,
    pitchSemis: 0,
    loopRange: [0, 0.25],

    infoOpen: false,
    isExporting: false,
    toastMessage: null,

    initCatalog: async () => {
      try {
        const resp = await fetch('./catalog.json');
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = (await resp.json()) as CatalogData;

        engine.setOnPreviewEnded(() => {
          set({ galleryPreviewStarId: null });
        });

        set({
          catalog: data.stars,
          catalogReady: true,
          catalogError: null,
        });
      } catch (err) {
        set({
          catalogError: (err as Error).message || 'Erreur chargement catalogue',
          catalogReady: false,
        });
      }
    },

    unlockAudio: async () => {
      await engine.unlockFromGesture();
    },

    setGalleryFilter: (galleryFilter) => set({ galleryFilter }),
    setGalleryQuery: (galleryQuery) => set({ galleryQuery }),

    toggleGalleryPreview: async (star: StarObject) => {
      await engine.unlockFromGesture();
      const current = get().galleryPreviewStarId;
      if (current === star.id) {
        engine.stopGalleryPreview();
        set({ galleryPreviewStarId: null });
      } else {
        engine.playGalleryPreview(star.previewUrl);
        set({ galleryPreviewStarId: star.id });
      }
    },

    stopGalleryPreview: () => {
      engine.stopGalleryPreview();
      set({ galleryPreviewStarId: null });
    },

    openStarInSampler: async (starId: string) => {
      const st = get();
      const star = st.catalog.find((s) => s.id === starId);
      if (!star) return;

      engine.stopGalleryPreview();
      engine.stop(true);

      const defaultActive = star.stems
        .filter((s) => !s.defaultMuted)
        .map((s) => s.id);
      const initialActive =
        defaultActive.length > 0 ? defaultActive : [star.stems[0].id];

      const loadingMap: Record<string, StemLoadStatus> = {};
      for (const stem of star.stems) loadingMap[stem.id] = 'loading';

      const dur = computeTimelineDuration(star, initialActive);
      // Start around 15% into the star unless short, so the loop immediately lands in musical nebula content
      const defaultStart = dur > 12 ? 0.12 : 0;
      const initialRange = clampLoopRangeForBars(
        defaultStart,
        st.loopBars,
        st.bpm,
        st.pitchSemis,
        dur
      );

      set({
        view: 'sampler',
        galleryPreviewStarId: null,
        activeStarId: star.id,
        loadingStems: loadingMap,
        isPlaying: false,
        activeStemIds: initialActive,
        loopRange: initialRange,
        infoOpen: false,
      });
      window.scrollTo(0, 0);

      await engine.ensureContext();
      await engine.loadStar(star, (stemId, status) => {
        if (get().activeStarId !== star.id) return;
        set((prev) => ({
          loadingStems: { ...prev.loadingStems, [stemId]: status },
        }));
      });

      if (get().activeStarId !== star.id) return;

      const cur = get();
      const curDur = computeTimelineDuration(star, cur.activeStemIds);
      engine.configureStar(star, cur.activeStemIds, curDur);
      engine.setPitchSemis(cur.pitchSemis);
      engine.setLoopWindow(
        cur.loopRange[0] * curDur,
        cur.loopRange[1] * curDur,
        curDur
      );
    },

    backToGallery: () => {
      engine.stop(false);
      set({ view: 'gallery', isPlaying: false, infoOpen: false });
    },

    cycleStar: (dir: -1 | 1) => {
      const { catalog, activeStarId } = get();
      if (catalog.length === 0) return;
      const idx = catalog.findIndex((s) => s.id === activeStarId);
      const nextIdx = (idx + dir + catalog.length) % catalog.length;
      void get().openStarInSampler(catalog[nextIdx].id);
    },

    togglePlay: async () => {
      await engine.unlockFromGesture();
      const st = get();
      if (!st.activeStarId) return;

      if (st.isPlaying) {
        engine.stop(false);
        set({ isPlaying: false });
      } else {
        await engine.start();
        set({ isPlaying: engine.isPlaying() });
      }
    },

    seekNormalized: (norm: number) => {
      engine.seekNormalized(norm);
    },

    toggleStemLayer: (stemId: string) => {
      const st = get();
      const star = st.catalog.find((s) => s.id === st.activeStarId);
      if (!star) return;
      const clicked = star.stems.find((s) => s.id === stemId);
      if (!clicked) return;

      let nextActive: string[];

      if (clicked.isComposite) {
        // Clicking Composite selects Composite alone; clicking it again restores isolated stems
        const isCurrentlyOnlyComposite =
          st.activeStemIds.length === 1 && st.activeStemIds[0] === stemId;
        if (isCurrentlyOnlyComposite) {
          const isolated = star.stems.filter((s) => !s.defaultMuted).map((s) => s.id);
          nextActive = isolated.length > 0 ? isolated : [stemId];
        } else {
          nextActive = [stemId];
        }
      } else {
        // Turn off composite tracks if turning on an isolated stem
        const withoutComposites = st.activeStemIds.filter((id) => {
          const item = star.stems.find((x) => x.id === id);
          return item && !item.isComposite;
        });

        if (withoutComposites.includes(stemId)) {
          // Keep at least 1 layer active
          if (withoutComposites.length <= 1) return;
          nextActive = withoutComposites.filter((id) => id !== stemId);
        } else {
          nextActive = [...withoutComposites, stemId];
        }
      }

      set({ activeStemIds: nextActive });
      engine.setActiveStems(nextActive);

      const dur = computeTimelineDuration(star, nextActive);
      const nextRange =
        st.loopBars === 'free'
          ? st.loopRange
          : clampLoopRangeForBars(
              st.loopRange[0],
              st.loopBars,
              st.bpm,
              st.pitchSemis,
              dur
            );
      set({ loopRange: nextRange });
      syncWindowToEngine(star, nextActive, nextRange);
    },

    setLoopBars: (bars: LoopBarsOption) => {
      const st = get();
      const star = st.catalog.find((s) => s.id === st.activeStarId);
      if (!star) return;
      const dur = computeTimelineDuration(star, st.activeStemIds);
      const nextRange =
        bars === 'free'
          ? ([0, 1] as [number, number])
          : clampLoopRangeForBars(
              st.loopRange[0],
              bars,
              st.bpm,
              st.pitchSemis,
              dur
            );
      set({ loopBars: bars, loopRange: nextRange });
      syncWindowToEngine(star, st.activeStemIds, nextRange);
    },

    setBpm: (rawBpm: number) => {
      const bpm = Math.max(60, Math.min(180, Math.round(rawBpm)));
      const st = get();
      const star = st.catalog.find((s) => s.id === st.activeStarId);
      if (!star) {
        set({ bpm });
        return;
      }
      const dur = computeTimelineDuration(star, st.activeStemIds);
      const nextRange =
        st.loopBars === 'free'
          ? st.loopRange
          : clampLoopRangeForBars(
              st.loopRange[0],
              st.loopBars,
              bpm,
              st.pitchSemis,
              dur
            );
      set({ bpm, loopRange: nextRange });
      syncWindowToEngine(star, st.activeStemIds, nextRange);
    },

    setPitchSemis: (rawSemis: number) => {
      const pitchSemis = Math.max(-12, Math.min(12, Math.round(rawSemis)));
      const st = get();
      engine.setPitchSemis(pitchSemis);

      const star = st.catalog.find((s) => s.id === st.activeStarId);
      if (!star) {
        set({ pitchSemis });
        return;
      }
      const dur = computeTimelineDuration(star, st.activeStemIds);
      const nextRange =
        st.loopBars === 'free'
          ? st.loopRange
          : clampLoopRangeForBars(
              st.loopRange[0],
              st.loopBars,
              st.bpm,
              pitchSemis,
              dur
            );
      set({ pitchSemis, loopRange: nextRange });
      syncWindowToEngine(star, st.activeStemIds, nextRange);
    },

    setLoopRange: (range: [number, number], switchToFreeIfResized = true) => {
      const st = get();
      const star = st.catalog.find((s) => s.id === st.activeStarId);
      const a = Math.max(0, Math.min(0.96, range[0]));
      const b = Math.max(a + 0.03, Math.min(1, range[1]));
      const next: [number, number] = [Number(a.toFixed(4)), Number(b.toFixed(4))];

      set({
        loopRange: next,
        loopBars: switchToFreeIfResized ? 'free' : st.loopBars,
      });
      if (star) syncWindowToEngine(star, st.activeStemIds, next);
    },

    slideLoopWindow: (newStartNorm: number) => {
      const st = get();
      const star = st.catalog.find((s) => s.id === st.activeStarId);
      const span = Math.max(0.03, st.loopRange[1] - st.loopRange[0]);
      const start = Math.max(0, Math.min(1 - span, newStartNorm));
      const next: [number, number] = [
        Number(start.toFixed(4)),
        Number(Math.min(1, start + span).toFixed(4)),
      ];
      set({ loopRange: next });
      if (star) syncWindowToEngine(star, st.activeStemIds, next);
    },

    exportLoop: async () => {
      const st = get();
      const star = st.catalog.find((s) => s.id === st.activeStarId);
      if (!star || st.isExporting) return;

      set({ isExporting: true });
      try {
        const dur = computeTimelineDuration(star, st.activeStemIds);
        const res = await engine.exportLoopWav({
          star,
          activeStemIds: st.activeStemIds,
          loopStartSec: st.loopRange[0] * dur,
          loopEndSec: st.loopRange[1] * dur,
          pitchSemis: st.pitchSemis,
          loopBars: st.loopBars,
          bpm: st.bpm,
        });
        if (res) {
          pushToast(`Exporté · ${res.filename} (${res.duration}s)`);
        } else {
          pushToast('Audio en cours de chargement, réessayez');
        }
      } finally {
        set({ isExporting: false });
      }
    },

    setInfoOpen: (infoOpen) => set({ infoOpen }),
  };
});
