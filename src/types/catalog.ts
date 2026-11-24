export type StarFamily =
  | 'nebulae'
  | 'supernovae'
  | 'blackholes'
  | 'galaxies'
  | 'clusters'
  | 'planets'
  | 'symphonies';

export type SpectralBand =
  | 'xray'
  | 'optical'
  | 'infrared'
  | 'radio'
  | 'uv'
  | 'darkmatter'
  | 'chemistry'
  | 'structure'
  | 'composite';

export type ScanMode = 'left-to-right' | 'clockwise' | 'radial' | 'vertical';

export interface StemTrack {
  id: string;
  stem: string;
  label: string;
  shortLabel: string;
  band: SpectralBand;
  color: string;
  isComposite: boolean;
  defaultMuted: boolean;
  url: string;
  imageUrl?: string;
  duration: number;
  sampleRate: number;
  channels: number;
  peaks: number[];
}

export interface StarObject {
  id: string;
  name: string;
  family: StarFamily;
  subtitle: string;
  sourcePageUrl: string;
  imageUrl: string;
  previewUrl: string;
  nasaDescription: string;
  shortSummary: string;
  telescopes: string[];
  scanMode: ScanMode;
  duration: number;
  maxDuration: number;
  stems: StemTrack[];
}

export interface CatalogData {
  version: number;
  generatedAt: string;
  starCount: number;
  trackCount: number;
  stars: StarObject[];
}

export type StemLoadStatus = 'idle' | 'loading' | 'ready' | 'error';
export type LoopBarsOption = 'free' | 1 | 2 | 4 | 8;
export type AppView = 'gallery' | 'sampler';
