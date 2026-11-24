import type { LoopBarsOption, StarObject, StemLoadStatus } from '../types/catalog';
import { downloadWavBlob, encodeStereoWav } from './WavEncoder';

interface CachedStarBuffers {
  starId: string;
  buffers: Map<string, AudioBuffer>;
  lastUsedAt: number;
}

interface ActiveSourceNode {
  stemId: string;
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  shortStem: boolean;
}

const MAX_CACHED_STARS = 3;

export class LoopSamplerEngine {
  private static instance: LoopSamplerEngine | null = null;

  static getInstance(): LoopSamplerEngine {
    if (!LoopSamplerEngine.instance) {
      LoopSamplerEngine.instance = new LoopSamplerEngine();
    }
    return LoopSamplerEngine.instance;
  }

  private ctx: AudioContext | null = null;
  private mixBus: GainNode | null = null;
  private safetyLimiter: DynamicsCompressorNode | null = null;
  private masterAnalyser: AnalyserNode | null = null;
  private timeData = new Float32Array(512);

  private starCache = new Map<string, CachedStarBuffers>();
  private activeAbortController: AbortController | null = null;

  // Gallery lightweight preview player
  private previewAudio: HTMLAudioElement | null = null;
  private onPreviewEndedCb: (() => void) | null = null;

  // Active sampler state
  private currentStar: StarObject | null = null;
  private activeStemIds = new Set<string>();
  private stemGainNodes = new Map<string, GainNode>();
  private activeSources: ActiveSourceNode[] = [];

  private isPlayingState = false;
  private timelineDuration = 32;
  private loopStartSec = 0;
  private loopEndSec = 8;
  private playheadSec = 0;
  private lastAnchorTime = 0;
  private playbackRate = 1;
  private reanchorTimer: number | null = null;

  async ensureContext(): Promise<AudioContext> {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.ctx = new AudioCtx({ latencyHint: 'interactive' });

      this.mixBus = this.ctx.createGain();
      this.mixBus.gain.value = 1;

      this.safetyLimiter = this.ctx.createDynamicsCompressor();
      this.safetyLimiter.threshold.value = -2;
      this.safetyLimiter.knee.value = 4;
      this.safetyLimiter.ratio.value = 10;
      this.safetyLimiter.attack.value = 0.002;
      this.safetyLimiter.release.value = 0.08;

      this.masterAnalyser = this.ctx.createAnalyser();
      this.masterAnalyser.fftSize = 512;
      this.masterAnalyser.smoothingTimeConstant = 0.78;
      this.timeData = new Float32Array(this.masterAnalyser.fftSize);

      this.mixBus.connect(this.safetyLimiter);
      this.safetyLimiter.connect(this.masterAnalyser);
      this.masterAnalyser.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      try {
        await this.ctx.resume();
      } catch {
        // Ignore until gesture
      }
    }

    return this.ctx;
  }

  async unlockFromGesture(): Promise<void> {
    const ctx = await this.ensureContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    try {
      const silent = ctx.createBuffer(1, 1, ctx.sampleRate);
      const src = ctx.createBufferSource();
      src.buffer = silent;
      src.connect(ctx.destination);
      src.start(0);
    } catch {
      // Ignore
    }
  }

  // --- Gallery Quick Stream Preview ---

  setOnPreviewEnded(cb: (() => void) | null) {
    this.onPreviewEndedCb = cb;
  }

  playGalleryPreview(url: string) {
    this.stopGalleryPreview();
    const audio = new Audio(url);
    audio.preload = 'auto';
    audio.onended = () => {
      if (this.previewAudio === audio) {
        this.previewAudio = null;
        this.onPreviewEndedCb?.();
      }
    };
    this.previewAudio = audio;
    void audio.play().catch(() => {
      // Ignore autoplay blocks
    });
  }

  stopGalleryPreview() {
    if (this.previewAudio) {
      try {
        this.previewAudio.pause();
        this.previewAudio.src = '';
      } catch {
        // Ignore
      }
      this.previewAudio = null;
    }
  }

  getPreviewProgress(): number {
    if (!this.previewAudio || !this.previewAudio.duration || !Number.isFinite(this.previewAudio.duration)) {
      return 0;
    }
    return Math.max(0, Math.min(1, this.previewAudio.currentTime / this.previewAudio.duration));
  }

  // --- Star Loading & LRU Cache (Priority Active Stems First) ---

  getStarBuffers(starId: string): Map<string, AudioBuffer> | null {
    const entry = this.starCache.get(starId);
    if (!entry) return null;
    entry.lastUsedAt = Date.now();
    return entry.buffers;
  }

  async loadStar(
    star: StarObject,
    onStemStatus: (stemId: string, status: StemLoadStatus) => void,
    priorityStemIds: string[] = [],
    onPriorityReady?: () => void
  ): Promise<Map<string, AudioBuffer>> {
    this.activeAbortController?.abort();
    const controller = new AbortController();
    this.activeAbortController = controller;

    const ctx = await this.ensureContext();

    let cached = this.starCache.get(star.id);
    if (!cached) {
      cached = {
        starId: star.id,
        buffers: new Map<string, AudioBuffer>(),
        lastUsedAt: Date.now(),
      };
      this.starCache.set(star.id, cached);
      this.evictLRU(star.id);
    } else {
      cached.lastUsedAt = Date.now();
    }

    const prioritySet = new Set(priorityStemIds);
    const priorityBatch =
      prioritySet.size > 0
        ? star.stems.filter((s) => prioritySet.has(s.id))
        : star.stems.filter((s) => !s.isComposite);
    const backgroundBatch = star.stems.filter(
      (s) => !priorityBatch.some((p) => p.id === s.id)
    );

    const runBatch = async (batch: typeof star.stems, concurrency: number) => {
      if (batch.length === 0) return;
      let cursor = 0;
      const worker = async () => {
        while (cursor < batch.length) {
          if (controller.signal.aborted) return;
          const stem = batch[cursor++];
          if (cached!.buffers.has(stem.id)) {
            onStemStatus(stem.id, 'ready');
            continue;
          }
          onStemStatus(stem.id, 'loading');
          try {
            const resp = await fetch(stem.url, { signal: controller.signal });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const ab = await resp.arrayBuffer();
            if (controller.signal.aborted) return;
            const decoded = await ctx.decodeAudioData(ab);
            if (controller.signal.aborted) return;
            cached!.buffers.set(stem.id, decoded);
            this.attachBackgroundStem(star.id, stem.id, decoded);
            onStemStatus(stem.id, 'ready');
          } catch (err) {
            if ((err as Error)?.name === 'AbortError') return;
            onStemStatus(stem.id, 'error');
          }
        }
      };

      await Promise.all(
        Array.from({ length: Math.min(concurrency, batch.length) }, () => worker())
      );
    };

    await runBatch(priorityBatch, 3);
    if (controller.signal.aborted) return cached.buffers;
    onPriorityReady?.();

    await runBatch(backgroundBatch, 2);
    return cached.buffers;
  }

  private attachBackgroundStem(starId: string, stemId: string, buf: AudioBuffer) {
    if (!this.ctx || !this.mixBus || this.currentStar?.id !== starId) return;

    let gainNode = this.stemGainNodes.get(stemId);
    if (!gainNode) {
      gainNode = this.ctx.createGain();
      gainNode.gain.value = this.activeStemIds.has(stemId) ? 0.78 : 0;
      gainNode.connect(this.mixBus);
      this.stemGainNodes.set(stemId, gainNode);
    }

    if (
      this.isPlayingState &&
      !this.activeSources.some((s) => s.stemId === stemId)
    ) {
      this.syncPlayhead();
      const now = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = this.playbackRate;
      src.loop = true;

      const isShort = buf.duration < this.loopEndSec - 0.15;
      if (isShort) {
        src.loopStart = 0;
        src.loopEnd = buf.duration;
        src.start(now, this.playheadSec % buf.duration);
      } else {
        src.loopStart = this.loopStartSec;
        src.loopEnd = Math.min(this.loopEndSec, buf.duration);
        src.start(
          now,
          Math.min(this.playheadSec, Math.max(0, buf.duration - 0.02))
        );
      }
      src.connect(gainNode);
      this.activeSources.push({ stemId, source: src, gainNode, shortStem: isShort });
    }
  }

  private evictLRU(keepStarId: string) {
    if (this.starCache.size <= MAX_CACHED_STARS) return;
    const candidates = Array.from(this.starCache.values())
      .filter((c) => c.starId !== keepStarId)
      .sort((a, b) => a.lastUsedAt - b.lastUsedAt);
    while (this.starCache.size > MAX_CACHED_STARS && candidates.length > 0) {
      const oldest = candidates.shift()!;
      this.starCache.delete(oldest.starId);
    }
  }

  // --- Loop Playback Engine ---

  configureStar(star: StarObject, activeIds: string[], timelineDuration: number) {
    this.stop(true);
    this.disposeGainNodes();

    this.currentStar = star;
    this.activeStemIds = new Set(activeIds);
    this.timelineDuration = Math.max(0.5, timelineDuration);
    this.playheadSec = this.loopStartSec;

    if (!this.ctx || !this.mixBus) return;
    for (const stem of star.stems) {
      const g = this.ctx.createGain();
      g.gain.value = this.activeStemIds.has(stem.id) ? 0.78 : 0;
      g.connect(this.mixBus);
      this.stemGainNodes.set(stem.id, g);
    }
  }

  setActiveStems(activeIds: string[]) {
    this.activeStemIds = new Set(activeIds);
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    for (const [stemId, gainNode] of this.stemGainNodes.entries()) {
      const target = this.activeStemIds.has(stemId) ? 0.78 : 0;
      gainNode.gain.setTargetAtTime(target, now, 0.015);
    }
  }

  setPitchSemis(pitchSemis: number) {
    this.syncPlayhead();
    this.playbackRate = Math.max(0.5, Math.min(2, Math.pow(2, pitchSemis / 12)));
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    for (const item of this.activeSources) {
      item.source.playbackRate.setTargetAtTime(this.playbackRate, now, 0.015);
    }
  }

  setLoopWindow(startSec: number, endSec: number, timelineDuration?: number) {
    if (typeof timelineDuration === 'number') {
      this.timelineDuration = Math.max(0.5, timelineDuration);
    }
    const clampedStart = Math.max(0, Math.min(this.timelineDuration - 0.15, startSec));
    const clampedEnd = Math.max(clampedStart + 0.15, Math.min(this.timelineDuration, endSec));

    this.loopStartSec = clampedStart;
    this.loopEndSec = clampedEnd;

    if (!this.isPlayingState) {
      if (this.playheadSec < clampedStart || this.playheadSec >= clampedEnd) {
        this.playheadSec = clampedStart;
      }
      return;
    }

    for (const item of this.activeSources) {
      if (!item.shortStem && item.source.buffer) {
        item.source.loopStart = clampedStart;
        item.source.loopEnd = Math.min(clampedEnd, item.source.buffer.duration);
      }
    }

    this.syncPlayhead();
    if (this.playheadSec < clampedStart || this.playheadSec >= clampedEnd) {
      if (this.reanchorTimer !== null) window.clearTimeout(this.reanchorTimer);
      this.reanchorTimer = window.setTimeout(() => {
        this.reanchorTimer = null;
        if (this.isPlayingState) {
          this.start(this.loopStartSec);
        }
      }, 65);
    }
  }

  async start(startOffsetSec?: number) {
    const ctx = await this.ensureContext();
    if (!this.currentStar || !this.mixBus) return;

    const buffers = this.getStarBuffers(this.currentStar.id);
    if (!buffers || buffers.size === 0) return;

    this.stopSourcesOnly();

    let offset =
      typeof startOffsetSec === 'number' ? startOffsetSec : this.playheadSec;
    if (offset < this.loopStartSec || offset >= this.loopEndSec) {
      offset = this.loopStartSec;
    }

    const now = ctx.currentTime;
    this.mixBus.gain.cancelScheduledValues(now);
    this.mixBus.gain.setValueAtTime(0.0001, now);
    this.mixBus.gain.linearRampToValueAtTime(1, now + 0.015);

    const newSources: ActiveSourceNode[] = [];
    for (const stem of this.currentStar.stems) {
      const buf = buffers.get(stem.id);
      let gainNode = this.stemGainNodes.get(stem.id);
      if (!buf) continue;
      if (!gainNode) {
        gainNode = ctx.createGain();
        gainNode.gain.value = this.activeStemIds.has(stem.id) ? 0.78 : 0;
        gainNode.connect(this.mixBus);
        this.stemGainNodes.set(stem.id, gainNode);
      }

      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = this.playbackRate;
      src.loop = true;

      const isShort = buf.duration < this.loopEndSec - 0.15;
      if (isShort) {
        src.loopStart = 0;
        src.loopEnd = buf.duration;
        src.start(now, offset % buf.duration);
      } else {
        src.loopStart = this.loopStartSec;
        src.loopEnd = Math.min(this.loopEndSec, buf.duration);
        src.start(now, Math.min(offset, Math.max(0, buf.duration - 0.02)));
      }

      src.connect(gainNode);
      newSources.push({ stemId: stem.id, source: src, gainNode, shortStem: isShort });
    }

    this.activeSources = newSources;
    this.playheadSec = offset;
    this.lastAnchorTime = now;
    this.isPlayingState = newSources.length > 0;
  }

  stop(immediate = false) {
    if (this.reanchorTimer !== null) {
      window.clearTimeout(this.reanchorTimer);
      this.reanchorTimer = null;
    }
    this.syncPlayhead();
    if (!this.isPlayingState || !this.ctx || !this.mixBus) {
      this.stopSourcesOnly();
      return;
    }

    const now = this.ctx.currentTime;
    const relSec = immediate ? 0.012 : 0.04;
    this.mixBus.gain.cancelScheduledValues(now);
    this.mixBus.gain.setValueAtTime(this.mixBus.gain.value, now);
    this.mixBus.gain.linearRampToValueAtTime(0, now + relSec);

    const old = this.activeSources.slice();
    this.activeSources = [];
    this.isPlayingState = false;

    window.setTimeout(() => {
      for (const item of old) {
        try {
          item.source.stop();
          item.source.disconnect();
        } catch {
          // Ignore
        }
      }
    }, Math.ceil(relSec * 1000) + 20);
  }

  seekNormalized(norm: number) {
    const clamped = Math.max(0, Math.min(0.999, norm));
    this.playheadSec = clamped * this.timelineDuration;
    if (this.ctx) this.lastAnchorTime = this.ctx.currentTime;
    if (this.isPlayingState) {
      void this.start(this.playheadSec);
    }
  }

  isPlaying(): boolean {
    return this.isPlayingState;
  }

  getTimelineDuration(): number {
    return this.timelineDuration;
  }

  getPlayheadNormalized(): number {
    if (this.timelineDuration <= 0) return 0;
    this.syncPlayhead();
    return Math.max(0, Math.min(1, this.playheadSec / this.timelineDuration));
  }

  getMasterRMS(): number {
    if (!this.masterAnalyser || !this.isPlayingState) return 0;
    this.masterAnalyser.getFloatTimeDomainData(this.timeData);
    let sum = 0;
    for (let i = 0; i < this.timeData.length; i += 2) {
      const v = this.timeData[i];
      sum += v * v;
    }
    return Math.min(1, Math.sqrt(sum / (this.timeData.length / 2)) * 2.5);
  }

  // --- Sample-Accurate FL Studio Loop WAV Export ---

  async exportLoopWav(options: {
    star: StarObject;
    activeStemIds: string[];
    loopStartSec: number;
    loopEndSec: number;
    pitchSemis: number;
    loopBars: LoopBarsOption;
    bpm: number;
  }): Promise<{ filename: string; duration: number } | null> {
    const ctx = await this.ensureContext();
    const buffers = this.getStarBuffers(options.star.id);
    if (!buffers || buffers.size === 0) return null;

    const activeSet = new Set(options.activeStemIds);
    const activeStems = options.star.stems.filter(
      (s) => activeSet.has(s.id) && buffers.has(s.id)
    );
    if (activeStems.length === 0) return null;

    const rate = Math.max(0.5, Math.min(2, Math.pow(2, options.pitchSemis / 12)));
    const outputDurSec =
      options.loopBars === 'free'
        ? Math.max(0.25, (options.loopEndSec - options.loopStartSec) / rate)
        : options.loopBars * 4 * (60 / options.bpm);

    const sr = ctx.sampleRate;
    const totalFrames = Math.max(128, Math.round(outputDurSec * sr));
    const offline = new OfflineAudioContext(2, totalFrames, sr);

    for (const stem of activeStems) {
      const buf = buffers.get(stem.id)!;
      const src = offline.createBufferSource();
      src.buffer = buf;
      src.playbackRate.value = rate;
      src.loop = true;
      src.loopStart = 0;
      src.loopEnd = buf.duration;

      const gain = offline.createGain();
      gain.gain.value = 0.78;

      src.connect(gain);
      gain.connect(offline.destination);

      const offset = options.loopStartSec % buf.duration;
      src.start(0, offset);
    }

    const rendered = await offline.startRendering();

    const left = rendered.getChannelData(0);
    const right = rendered.numberOfChannels > 1 ? rendered.getChannelData(1) : left;
    let maxPeak = 0;
    for (let i = 0; i < totalFrames; i++) {
      const a = Math.abs(left[i]);
      const b = Math.abs(right[i]);
      if (a > maxPeak) maxPeak = a;
      if (b > maxPeak) maxPeak = b;
    }
    if (maxPeak > 0.95 && maxPeak > 0) {
      const scale = 0.95 / maxPeak;
      for (let i = 0; i < totalFrames; i++) {
        left[i] *= scale;
        if (right !== left) right[i] *= scale;
      }
    }

    const fadeFrames = Math.min(Math.floor(totalFrames / 8), Math.round(sr * 0.005));
    for (let i = 0; i < fadeFrames; i++) {
      const w = i / fadeFrames;
      left[i] *= w;
      if (right !== left) right[i] *= w;
      const tail = totalFrames - 1 - i;
      left[tail] *= w;
      if (right !== left) right[tail] *= w;
    }

    const wavBlob = encodeStereoWav(left, right, sr);
    const starSlug = options.star.id.replace(/-/g, '_');
    const pitchTag =
      options.pitchSemis !== 0
        ? `_${options.pitchSemis > 0 ? 'p' : 'm'}${Math.abs(options.pitchSemis)}st`
        : '';
    const filename =
      options.loopBars === 'free'
        ? `${starSlug}_loop${pitchTag}.wav`
        : `${starSlug}_${options.bpm}bpm_${options.loopBars}bars${pitchTag}.wav`;

    downloadWavBlob(wavBlob, filename);
    return {
      filename,
      duration: Number(outputDurSec.toFixed(2)),
    };
  }

  private syncPlayhead() {
    if (!this.isPlayingState || !this.ctx) return;
    const now = this.ctx.currentTime;
    const elapsed = (now - this.lastAnchorTime) * this.playbackRate;
    this.lastAnchorTime = now;
    if (elapsed <= 0) return;

    let pos = this.playheadSec + elapsed;
    const span = this.loopEndSec - this.loopStartSec;
    if (pos >= this.loopEndSec && span > 0) {
      pos = this.loopStartSec + ((pos - this.loopStartSec) % span);
    }
    this.playheadSec = pos;
  }

  private stopSourcesOnly() {
    for (const item of this.activeSources) {
      try {
        item.source.stop();
        item.source.disconnect();
      } catch {
        // Ignore
      }
    }
    this.activeSources = [];
    this.isPlayingState = false;
  }

  private disposeGainNodes() {
    for (const g of this.stemGainNodes.values()) {
      g.disconnect();
    }
    this.stemGainNodes.clear();
  }
}
