import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const AUDIO_DIR = path.join(ROOT, 'Chandra_Universe_of_Sound');
const MANIFEST_PATH = path.join(AUDIO_DIR, 'manifest.json');
const IMAGES_DIR = path.join(ROOT, 'public', 'nasa-images');
const OUTPUT_PATH = path.join(ROOT, 'public', 'catalog.json');

const BASE_SOUND_URL = 'https://chandra.cfa.harvard.edu/sound/';
const BASE_HOST_URL = 'https://chandra.cfa.harvard.edu';
const PEAK_COUNT = 256;

const BAND_COLORS = {
  xray: '#56B4E9',
  xray_ixpe: '#9B87F5',
  xray_nustar: '#63C7E6',
  optical: '#E6C26B',
  infrared: '#E06D53',
  infrared_mid: '#D9534F',
  infrared_far: '#C85A32',
  radio: '#49B68E',
  uv: '#C084E8',
  darkmatter: '#7382F4',
  chem_iron: '#56B4E9',
  chem_silicon: '#E6C26B',
  chem_sulfur: '#49B68E',
  chem_calcium: '#C084E8',
  chem_blastwave: '#7C9EF5',
  chem_jet: '#E06D53',
  struct_stars: '#F0D98C',
  struct_nebula: '#62A9D9',
  struct_rings: '#E6C26B',
  struct_planet: '#D9885B',
  composite: '#AEB7C6',
};

const BAND_ORDER = {
  xray: 10,
  uv: 20,
  optical: 30,
  infrared: 40,
  radio: 50,
  darkmatter: 60,
  chemistry: 70,
  structure: 80,
  composite: 90,
};

const STAR_META = {
  '30 Doradus': { family: 'nebulae', subtitle: 'Tarantula Nebula · Starburst' },
  'Andromeda (M31)': { family: 'galaxies', subtitle: 'Spiral Galaxy · 5-Band' },
  'Bullet Cluster': { family: 'clusters', subtitle: 'Cluster Collision · Dark Matter' },
  'CDF': { family: 'clusters', subtitle: 'Chandra Deep Field · Survey' },
  'Carina Nebula': { family: 'nebulae', subtitle: 'Cosmic Cliffs · Star Nursery' },
  'Cas A': { family: 'supernovae', subtitle: 'Supernova Remnant · Elemental' },
  'Cas A (Multiwavelength)': { family: 'supernovae', subtitle: 'Supernova Remnant · Multi-Band' },
  'Centaurus A': { family: 'galaxies', subtitle: 'Radio Galaxy · Polarized X-Ray' },
  'Chandra Source Catalog': { family: 'clusters', subtitle: 'All-Sky X-Ray Source Catalog' },
  'Crab Nebula': { family: 'supernovae', subtitle: 'Pulsar Wind Nebula · Multi-Band' },
  'Crab Nebula (Chandra & NuSTAR)': { family: 'supernovae', subtitle: 'Pulsar Wind · Hard & Soft X-Ray' },
  'Eta Carinae': { family: 'nebulae', subtitle: 'Luminous Blue Variable · Shell' },
  'Galactic Center': { family: 'blackholes', subtitle: 'Milky Way Core · Multi-Band' },
  'IC 443': { family: 'supernovae', subtitle: 'Jellyfish Nebula · Remnant' },
  'Jupiter': { family: 'planets', subtitle: 'Gas Giant · Auroral X-Ray & IR' },
  'M104': { family: 'galaxies', subtitle: 'Sombrero Galaxy · Edge-On Spiral' },
  'M16': { family: 'nebulae', subtitle: 'Eagle Nebula · Pillars of Creation' },
  'M51': { family: 'galaxies', subtitle: 'Whirlpool Galaxy · 4-Band Spiral' },
  'M74': { family: 'galaxies', subtitle: 'Phantom Galaxy · HST / JWST / X-Ray' },
  'M87': { family: 'blackholes', subtitle: 'Supermassive Black Hole · Jet' },
  'M87 Jet': { family: 'blackholes', subtitle: 'M87 Jet · Synchrotron Outflow' },
  'MSH 15-52': { family: 'supernovae', subtitle: 'Cosmic Hand · Pulsar Field' },
  'NGC 3603': { family: 'nebulae', subtitle: 'Starburst Cluster · H II Region' },
  'NGC 4736': { family: 'galaxies', subtitle: "Cat's Eye Galaxy · Starburst Ring" },
  'NGC 6543': { family: 'nebulae', subtitle: "Cat's Eye Nebula · Planetary Shell" },
  'NGC 6872': { family: 'galaxies', subtitle: 'Condor Galaxy · Tidal Spiral' },
  'Perseus Cluster': { family: 'clusters', subtitle: 'Galaxy Cluster · Pressure Waves' },
  'R Aquarii': { family: 'supernovae', subtitle: 'Symbiotic Binary · Outflow Jet' },
  'SN87A': { family: 'supernovae', subtitle: 'SN 1987A · Expanding Shock Ring' },
  'SS 433': { family: 'blackholes', subtitle: 'Microquasar · Precessing Jets' },
  'Sagittarius A*': { family: 'blackholes', subtitle: 'Galactic Center Black Hole' },
  'Sagittarius A* (EHT)': { family: 'blackholes', subtitle: 'Event Horizon · Shadow' },
  'Sagittarius A* Light Echo': { family: 'blackholes', subtitle: 'Sgr A* Light Echo · Polarized' },
  'Saturn': { family: 'planets', subtitle: 'Ringed Giant · Rings & X-Ray' },
  'Sonification Symphony': { family: 'symphonies', subtitle: 'Concert Works · Long-Form' },
  'Southern Ring Nebula': { family: 'nebulae', subtitle: 'Planetary Nebula · JWST Dual-IR' },
  "Stephan's Quintet": { family: 'clusters', subtitle: 'Compact Galaxy Group · Shock Front' },
  'Tycho': { family: 'supernovae', subtitle: 'Tycho Remnant · X-Ray & Spectra' },
  'Uranus': { family: 'planets', subtitle: 'Ice Giant · Optical & X-Ray' },
  'V404 Cygni': { family: 'blackholes', subtitle: 'Black Hole Binary · Dust Echoes' },
  'Vela Pulsar': { family: 'supernovae', subtitle: 'Spinning Neutron Star · Wind' },
  'WASP-96 b': { family: 'planets', subtitle: 'Exoplanet · Transmission Spectrum' },
  'WR 124': { family: 'nebulae', subtitle: 'Wolf-Rayet Star · Dust Shell' },
  'Westerlund 2': { family: 'nebulae', subtitle: 'Young Cluster · Stellar Winds' },
  'ZwCl 0024+1652': { family: 'clusters', subtitle: 'Lensing Cluster · Dark Matter' },
};

const EXPLICIT_STEM_META = {
  carina: { label: 'Composite Mix', shortLabel: 'MIX', band: 'composite', color: BAND_COLORS.composite, isComposite: true },
  carina_top: { label: 'Upper Nebula', shortLabel: 'TOP', band: 'structure', color: BAND_COLORS.struct_nebula, isComposite: false },
  carina_bottom: { label: 'Lower Cliffs', shortLabel: 'BTM', band: 'structure', color: BAND_COLORS.infrared, isComposite: false },
  carina_stars: { label: 'Starfield', shortLabel: 'STAR', band: 'structure', color: BAND_COLORS.struct_stars, isComposite: false },

  casa_all: { label: 'Composite Mix', shortLabel: 'MIX', band: 'composite', color: BAND_COLORS.composite, isComposite: true },
  sonify_casa_life_all_160_vol: { label: 'Evolution Timelapse', shortLabel: 'EVOL', band: 'composite', color: '#9BA5B7', isComposite: true },
  casa_iron: { label: 'Iron (Fe)', shortLabel: 'Fe', band: 'chemistry', color: BAND_COLORS.chem_iron, isComposite: false },
  casa_silicon: { label: 'Silicon (Si)', shortLabel: 'Si', band: 'chemistry', color: BAND_COLORS.chem_silicon, isComposite: false },
  casa_sulfur: { label: 'Sulfur (S)', shortLabel: 'S', band: 'chemistry', color: BAND_COLORS.chem_sulfur, isComposite: false },
  casa_calcium: { label: 'Calcium (Ca)', shortLabel: 'Ca', band: 'chemistry', color: BAND_COLORS.chem_calcium, isComposite: false },
  casa_blastwave: { label: 'Blastwave', shortLabel: 'BLST', band: 'chemistry', color: BAND_COLORS.chem_blastwave, isComposite: false },
  casa_jet: { label: 'Relativistic Jet', shortLabel: 'JET', band: 'chemistry', color: BAND_COLORS.chem_jet, isComposite: false },

  sonify10_cena: { label: 'Composite Mix', shortLabel: 'MIX', band: 'composite', color: BAND_COLORS.composite, isComposite: true },
  sonify10_cena_optical: { label: 'Optical', shortLabel: 'OPT', band: 'optical', color: BAND_COLORS.optical, isComposite: false },
  sonify10_cena_xray_chandra: { label: 'X-Ray (Chandra)', shortLabel: 'X-CH', band: 'xray', color: BAND_COLORS.xray, isComposite: false },
  sonify10_cena_xray_ixpe: { label: 'X-Ray (IXPE)', shortLabel: 'IXPE', band: 'xray', color: BAND_COLORS.xray_ixpe, isComposite: false },

  crab_chandra_nustar: { label: 'Composite X-Ray', shortLabel: 'MIX', band: 'composite', color: BAND_COLORS.composite, isComposite: true },
  crab_chandra: { label: 'Soft X-Ray (Chandra)', shortLabel: 'X-CH', band: 'xray', color: BAND_COLORS.xray, isComposite: false },
  crab_nustar: { label: 'Hard X-Ray (NuSTAR)', shortLabel: 'X-NU', band: 'xray', color: BAND_COLORS.xray_nustar, isComposite: false },

  sonify8_jellyfish: { label: 'Composite Mix', shortLabel: 'MIX', band: 'composite', color: BAND_COLORS.composite, isComposite: true },
  sonify8_jellyfish_nebula: { label: 'Nebula Gas & X-Ray', shortLabel: 'NEB', band: 'structure', color: BAND_COLORS.struct_nebula, isComposite: false },
  sonify8_jellyfish_stars: { label: 'Starfield', shortLabel: 'STAR', band: 'structure', color: BAND_COLORS.struct_stars, isComposite: false },

  m51_all_feb5: { label: 'Composite Mix', shortLabel: 'MIX', band: 'composite', color: BAND_COLORS.composite, isComposite: true },
  m51_seq_feb20: { label: 'Sequential Tour', shortLabel: 'SEQ', band: 'composite', color: '#9BA5B7', isComposite: true },
  m51_xray_feb5: { label: 'X-Ray', shortLabel: 'XRAY', band: 'xray', color: BAND_COLORS.xray, isComposite: false },
  m51_uv_feb5: { label: 'Ultraviolet', shortLabel: 'UV', band: 'uv', color: BAND_COLORS.uv, isComposite: false },
  m51_opt_feb5: { label: 'Optical', shortLabel: 'OPT', band: 'optical', color: BAND_COLORS.optical, isComposite: false },
  m51_ir_feb5: { label: 'Infrared', shortLabel: 'IR', band: 'infrared', color: BAND_COLORS.infrared, isComposite: false },

  sonify8_m74: { label: 'Composite Mix', shortLabel: 'MIX', band: 'composite', color: BAND_COLORS.composite, isComposite: true },
  sonify8_m74_xray: { label: 'X-Ray (Chandra)', shortLabel: 'XRAY', band: 'xray', color: BAND_COLORS.xray, isComposite: false },
  sonify8_m74_hst: { label: 'Optical (Hubble)', shortLabel: 'OPT', band: 'optical', color: BAND_COLORS.optical, isComposite: false },
  sonify8_m74_jwst: { label: 'Infrared (JWST)', shortLabel: 'IR', band: 'infrared', color: BAND_COLORS.infrared, isComposite: false },

  sonify8_hand: { label: 'Composite Mix', shortLabel: 'MIX', band: 'composite', color: BAND_COLORS.composite, isComposite: true },
  sonify8_hand_chandra: { label: 'X-Ray (Chandra)', shortLabel: 'X-CH', band: 'xray', color: BAND_COLORS.xray, isComposite: false },
  sonify8_hand_ixpe: { label: 'X-Ray (IXPE)', shortLabel: 'IXPE', band: 'xray', color: BAND_COLORS.xray_ixpe, isComposite: false },
  sonify8_hand_sources: { label: 'Point Sources', shortLabel: 'SRCS', band: 'structure', color: BAND_COLORS.struct_stars, isComposite: false },

  m31: { label: 'Composite Mix', shortLabel: 'MIX', band: 'composite', color: BAND_COLORS.composite, isComposite: true },
  m31_montage: { label: 'Spectral Montage', shortLabel: 'MNTG', band: 'composite', color: '#9BA5B7', isComposite: true },

  sonify10_ss433: { label: 'Composite Mix', shortLabel: 'MIX', band: 'composite', color: BAND_COLORS.composite, isComposite: true },
  sonify10_ss433_ir_radio: { label: 'IR + Radio Mix', shortLabel: 'IR+R', band: 'composite', color: '#9BA5B7', isComposite: true },
  sonify10_ss433_ir_radio_no_stars: { label: 'Nebula (IR + Radio)', shortLabel: 'NEB', band: 'infrared', color: BAND_COLORS.infrared, isComposite: false },
  sonify10_ss433_ir_radio_stars: { label: 'Stars Layer', shortLabel: 'STAR', band: 'structure', color: BAND_COLORS.struct_stars, isComposite: false },
  sonify10_ss433_radio: { label: 'Radio Jets', shortLabel: 'RAD', band: 'radio', color: BAND_COLORS.radio, isComposite: false },
  sonify10_ss433_xray: { label: 'X-Ray Core', shortLabel: 'XRAY', band: 'xray', color: BAND_COLORS.xray, isComposite: false },

  sgra_sonify_comp: { label: 'Composite Mix', shortLabel: 'MIX', band: 'composite', color: BAND_COLORS.composite, isComposite: true },
  sgra_sonify_ir_mid: { label: 'Mid-Infrared', shortLabel: 'MIR', band: 'infrared', color: BAND_COLORS.infrared_mid, isComposite: false },
  sgra_sonify_ir_near: { label: 'Near-Infrared', shortLabel: 'NIR', band: 'infrared', color: BAND_COLORS.infrared, isComposite: false },
  sgra_sonify_xray: { label: 'X-Ray', shortLabel: 'XRAY', band: 'xray', color: BAND_COLORS.xray, isComposite: false },

  gcenter_xray_chandra_ixpe: { label: 'Composite X-Ray', shortLabel: 'MIX', band: 'composite', color: BAND_COLORS.composite, isComposite: true },
  gcenter_xray_chandra: { label: 'X-Ray (Chandra)', shortLabel: 'X-CH', band: 'xray', color: BAND_COLORS.xray, isComposite: false },
  gcenter_xray_ixpe: { label: 'X-Ray (IXPE)', shortLabel: 'IXPE', band: 'xray', color: BAND_COLORS.xray_ixpe, isComposite: false },

  sonify11_saturn: { label: 'Composite Mix', shortLabel: 'MIX', band: 'composite', color: BAND_COLORS.composite, isComposite: true },
  sonify11_saturn_optical: { label: 'Optical Composite', shortLabel: 'OPT', band: 'optical', color: BAND_COLORS.optical, isComposite: true },
  sonify11_saturn_planet: { label: 'Planet Disc', shortLabel: 'PLNT', band: 'structure', color: BAND_COLORS.struct_planet, isComposite: false },
  sonify11_saturn_rings: { label: 'Ring System', shortLabel: 'RING', band: 'structure', color: BAND_COLORS.struct_rings, isComposite: false },
  sonify11_saturn_xray: { label: 'X-Ray Poles', shortLabel: 'XRAY', band: 'xray', color: BAND_COLORS.xray, isComposite: false },

  southern_ring_nircam_miri: { label: 'Composite Dual-IR', shortLabel: 'MIX', band: 'composite', color: BAND_COLORS.composite, isComposite: true },
  southern_ring_nircam: { label: 'Near-IR (NIRCam)', shortLabel: 'NIR', band: 'infrared', color: BAND_COLORS.infrared, isComposite: false },
  southern_ring_miri: { label: 'Mid-IR (MIRI)', shortLabel: 'MIR', band: 'infrared', color: BAND_COLORS.infrared_mid, isComposite: false },

  crab_nebula_return_to_dust: { label: 'Return to Dust (Crab)', shortLabel: 'CRAB', band: 'composite', color: BAND_COLORS.xray, isComposite: false },
  pillars_of_creation_cathedrals: { label: 'Cathedrals (M16)', shortLabel: 'M16', band: 'composite', color: BAND_COLORS.optical, isComposite: false },
  whereparallellinesconverge_midi: { label: 'Where Parallel Lines Converge', shortLabel: 'CONV', band: 'composite', color: BAND_COLORS.infrared, isComposite: false },

  tycho_all: { label: 'Composite Mix', shortLabel: 'MIX', band: 'composite', color: BAND_COLORS.composite, isComposite: true },
  tycho_spectra: { label: 'Spectral Scan', shortLabel: 'SPEC', band: 'chemistry', color: BAND_COLORS.chem_calcium, isComposite: true },
  tycho_optical: { label: 'Optical', shortLabel: 'OPT', band: 'optical', color: BAND_COLORS.optical, isComposite: false },
  tycho_xray: { label: 'X-Ray', shortLabel: 'XRAY', band: 'xray', color: BAND_COLORS.xray, isComposite: false },

  sonify10_wr124: { label: 'Composite Mix', shortLabel: 'MIX', band: 'composite', color: BAND_COLORS.composite, isComposite: true },
  sonify10_wr124_chandra: { label: 'X-Ray (Chandra)', shortLabel: 'XRAY', band: 'xray', color: BAND_COLORS.xray, isComposite: false },
  sonify10_wr124_jwst: { label: 'Near/Mid-IR (JWST)', shortLabel: 'JWST', band: 'infrared', color: BAND_COLORS.infrared, isComposite: false },
  sonify10_wr124_herschel_wise_spitzer: { label: 'Far-IR Dust (Spitzer)', shortLabel: 'FIR', band: 'infrared', color: BAND_COLORS.infrared_far, isComposite: false },
};

function classifyStem(stem, totalForObject) {
  if (EXPLICIT_STEM_META[stem]) return EXPLICIT_STEM_META[stem];
  const lower = stem.toLowerCase();

  if (totalForObject === 1) {
    return { label: 'Full Sonification', shortLabel: 'FULL', band: 'composite', color: BAND_COLORS.xray, isComposite: false };
  }
  if (lower.includes('_xray')) return { label: 'X-Ray', shortLabel: 'XRAY', band: 'xray', color: BAND_COLORS.xray, isComposite: false };
  if (lower.includes('_uv')) return { label: 'Ultraviolet', shortLabel: 'UV', band: 'uv', color: BAND_COLORS.uv, isComposite: false };
  if (lower.includes('_optical') || lower.endsWith('_opt')) return { label: 'Optical', shortLabel: 'OPT', band: 'optical', color: BAND_COLORS.optical, isComposite: false };
  if (lower.includes('_infrared') || lower.endsWith('_ir')) return { label: 'Infrared', shortLabel: 'IR', band: 'infrared', color: BAND_COLORS.infrared, isComposite: false };
  if (lower.includes('_radio')) return { label: 'Radio', shortLabel: 'RAD', band: 'radio', color: BAND_COLORS.radio, isComposite: false };
  if (lower.endsWith('_dm')) return { label: 'Dark Matter', shortLabel: 'DM', band: 'darkmatter', color: BAND_COLORS.darkmatter, isComposite: false };
  if (lower.endsWith('_all') || lower.endsWith('_comp') || lower.endsWith('_composite')) {
    return { label: 'Composite Mix', shortLabel: 'MIX', band: 'composite', color: BAND_COLORS.composite, isComposite: true };
  }
  return { label: 'Composite Mix', shortLabel: 'MIX', band: 'composite', color: BAND_COLORS.composite, isComposite: true };
}

function assignDefaultMutes(objectName, classifiedStems) {
  if (classifiedStems.length <= 1) return classifiedStems.map((s) => ({ ...s, defaultMuted: false }));
  if (objectName === 'Cas A') {
    const activeSet = new Set(['casa_blastwave', 'casa_calcium', 'casa_iron', 'casa_silicon', 'casa_sulfur']);
    return classifiedStems.map((s) => ({ ...s, defaultMuted: !activeSet.has(s.stem) }));
  }
  if (objectName === 'Sonification Symphony') {
    return classifiedStems.map((s, idx) => ({ ...s, defaultMuted: idx !== 0 }));
  }
  const hasNonComposite = classifiedStems.some((s) => !s.isComposite);
  if (hasNonComposite) return classifiedStems.map((s) => ({ ...s, defaultMuted: s.isComposite }));
  return classifiedStems.map((s, idx) => ({ ...s, defaultMuted: idx !== 0 }));
}

function slugify(name) {
  return name.toLowerCase().replace(/\*/g, '-star').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function parseWavAndPeaks(filePath, peakCount = PEAK_COUNT) {
  const buf = fs.readFileSync(filePath);
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error(`Invalid WAV header: ${filePath}`);
  }
  let offset = 12;
  let audioFormat = 1;
  let channels = 2;
  let sampleRate = 44100;
  let bitsPerSample = 16;
  let dataOffset = -1;
  let dataSize = 0;

  while (offset + 8 <= buf.length) {
    const chunkId = buf.toString('ascii', offset, offset + 4);
    const chunkSize = buf.readUInt32LE(offset + 4);
    const bodyStart = offset + 8;
    if (chunkId === 'fmt ') {
      audioFormat = buf.readUInt16LE(bodyStart);
      channels = buf.readUInt16LE(bodyStart + 2);
      sampleRate = buf.readUInt32LE(bodyStart + 4);
      bitsPerSample = buf.readUInt16LE(bodyStart + 14);
    } else if (chunkId === 'data') {
      dataOffset = bodyStart;
      dataSize = Math.min(chunkSize, buf.length - bodyStart);
    }
    offset = bodyStart + chunkSize + (chunkSize & 1);
  }

  if (dataOffset < 0 || audioFormat !== 1 || bitsPerSample !== 16) {
    throw new Error(`Unsupported WAV format in ${filePath}`);
  }

  const bytesPerFrame = channels * 2;
  const totalFrames = Math.floor(dataSize / bytesPerFrame);
  const duration = Number((totalFrames / sampleRate).toFixed(2));
  const peaks = new Array(peakCount).fill(0);

  if (totalFrames > 0) {
    for (let i = 0; i < peakCount; i++) {
      const startFrame = Math.floor((i * totalFrames) / peakCount);
      const endFrame = Math.max(startFrame + 1, Math.floor(((i + 1) * totalFrames) / peakCount));
      const frameSpan = endFrame - startFrame;
      const step = frameSpan > 1200 ? Math.floor(frameSpan / 600) : 1;
      let maxVal = 0;
      for (let f = startFrame; f < endFrame; f += step) {
        const byteIdx = dataOffset + f * bytesPerFrame;
        let monoPeak = 0;
        for (let c = 0; c < channels; c++) {
          const sample = Math.abs(buf.readInt16LE(byteIdx + c * 2)) / 32768;
          if (sample > monoPeak) monoPeak = sample;
        }
        if (monoPeak > maxVal) maxVal = monoPeak;
      }
      peaks[i] = Number(Math.min(1, maxVal).toFixed(3));
    }
  }
  return { sampleRate, channels, duration, peaks };
}

function decodeHtmlEntities(str) {
  const named = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&apos;': "'",
    '&#39;': "'",
    '&rsquo;': '’',
    '&lsquo;': '‘',
    '&ldquo;': '“',
    '&rdquo;': '”',
    '&mdash;': '—',
    '&ndash;': '–',
    '&nbsp;': ' ',
    '&hellip;': '…',
  };
  return str
    .replace(/&(?:amp|lt|gt|quot|apos|#39|rsquo|lsquo|ldquo|rdquo|mdash|ndash|nbsp|hellip);/g, (m) => named[m] ?? m)
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(Number.parseInt(h, 16)));
}

function isCelestialImage(src) {
  const lower = src.toLowerCase();
  return !['header', 'nasa_logo', 'chandra_button', 'facebook', 'x_social', 'social', 'youtube', 'twitter', 'instagram', 'icon', 'quote_left', 'hover', 'sophie', 'orchestra'].some((b) => lower.includes(b));
}

function resolveChandraUrl(src) {
  if (!src) return null;
  if (src.startsWith('http://') || src.startsWith('https://')) return src;
  if (src.startsWith('/')) return `${BASE_HOST_URL}${src}`;
  return `${BASE_SOUND_URL}${src.replace(/^\.\//, '')}`;
}

function extractShortSummary(text) {
  if (!text) return '';
  // Split at sentence endings while ignoring common abbreviations
  const clean = text.replace(/\s+/g, ' ').trim();
  const sentences = clean.split(/(?<=[.!?])\s+(?=[A-Z0-9])/);
  let out = sentences[0] ?? clean;
  if (out.length < 130 && sentences.length > 1) {
    const combined = `${out} ${sentences[1]}`;
    if (combined.length <= 245) out = combined;
  }
  return out;
}

function extractTelescopes(text, stems) {
  const found = [];
  const add = (name) => {
    if (!found.includes(name)) found.push(name);
  };
  const source = `${text} ${stems.map((s) => `${s.label} ${s.stem}`).join(' ')}`;

  if (/\bChandra\b/i.test(source)) add('Chandra');
  if (/\b(?:James\s+Webb|Webb|JWST|MIRI|NIRCam)\b/i.test(source)) add('James Webb');
  if (/\b(?:Hubble|HST)\b/i.test(source)) add('Hubble');
  if (/\bSpitzer\b/i.test(source)) add('Spitzer');
  if (/\bIXPE\b/i.test(source)) add('IXPE');
  if (/\bNuSTAR\b/i.test(source)) add('NuSTAR');
  if (/\b(?:VLA|Very Large Array)\b/i.test(source)) add('VLA');
  if (/\b(?:Event Horizon Telescope|EHT)\b/i.test(source)) add('EHT');
  if (/\bHerschel\b/i.test(source)) add('Herschel');
  if (/\bWISE\b/i.test(source)) add('WISE');
  if (/\bGALEX\b/i.test(source)) add('GALEX');
  if (/\bMeerKAT\b/i.test(source)) add('MeerKAT');
  if (/\bSOFIA\b/i.test(source)) add('SOFIA');
  if (/\bXMM-Newton\b/i.test(source)) add('XMM-Newton');
  if (/\bALMA\b/i.test(source)) add('ALMA');

  if (found.length === 0) add('Chandra');
  return found;
}

function detectScanMode(text) {
  if (/clockwise|counter-clockwise|radar|like a clock|clock hand|sweep(?:s|ing)? around/i.test(text)) {
    return 'clockwise';
  }
  if (/center outward|outward from the center|from the middle|radiat(?:e|es|ing) outward|concentric/i.test(text)) {
    return 'radial';
  }
  if (/top to bottom|bottom to top|vertical scan/i.test(text)) {
    return 'vertical';
  }
  return 'left-to-right';
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return await res.text();
}

async function downloadImageLocal(remoteUrl, localBaseName) {
  const extMatch = remoteUrl.match(/\.(jpg|jpeg|png|webp)(?:$|\?)/i);
  const ext = extMatch ? `.${extMatch[1].toLowerCase()}` : '.jpg';
  const fileName = `${localBaseName}${ext}`;
  const outPath = path.join(IMAGES_DIR, fileName);

  if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1000) {
    return `nasa-images/${fileName}`;
  }

  const res = await fetch(remoteUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`Image HTTP ${res.status}: ${remoteUrl}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(outPath, buf);
  return `nasa-images/${fileName}`;
}

function parseDetailPage(html, indexCoverUrl) {
  const clean = html.replace(/<!--[\s\S]*?-->/g, '');

  // Description: prefer <p class="slider" ...> substantive paragraph
  const sliderParagraphs = [...clean.matchAll(/<p[^>]*class="slider"[^>]*>([\s\S]*?)<\/p>/gi)];
  const allParagraphs = [...clean.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)];

  let nasaDescription = '';
  for (const m of [...sliderParagraphs, ...allParagraphs]) {
    let txt = decodeHtmlEntities(m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    txt = txt.replace(/^Video Description:\s*/i, '').trim();
    if (
      txt.length > 80 &&
      !txt.includes('Dr. Kimberly Arcand') &&
      !txt.includes('Access more information')
    ) {
      nasaDescription = txt;
      break;
    }
  }

  // Extract slider images & stem links
  const paginateMatch = clean.match(/<div[^>]+id="paginate-slider\d+"[^>]*>([\s\S]*?)<\/div>/i);
  const captionMatch = clean.match(/<div[^>]+id="caption-slider\d+"[^>]*>([\s\S]*?)<\/div>/i);

  const sliderImgs = paginateMatch
    ? [...paginateMatch[1].matchAll(/<img[^>]+src="([^"]+)"/gi)]
        .map((m) => resolveChandraUrl(m[1]))
        .filter((u) => u && isCelestialImage(u))
    : [];

  const captionLinks = captionMatch
    ? [...captionMatch[1].matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => {
        const hrefMatch = m[1].match(/href="([^"]+\.(?:mp4|wav|mp3))"/i);
        if (!hrefMatch) return null;
        const base = path.basename(hrefMatch[1]).replace(/\.(mp4|wav|mp3)$/i, '');
        return base;
      })
    : [];

  const stemImageRemoteMap = new Map();
  for (let i = 0; i < Math.min(sliderImgs.length, captionLinks.length); i++) {
    const stemKey = captionLinks[i];
    const imgUrl = sliderImgs[i];
    if (stemKey && imgUrl) {
      stemImageRemoteMap.set(stemKey, imgUrl);
    }
  }

  // All celestial imgs on page
  const pageImgs = [...clean.matchAll(/<img[^>]+src="([^"]+)"/gi)]
    .map((m) => resolveChandraUrl(m[1]))
    .filter((u) => u && isCelestialImage(u));

  const mainImageRemote = sliderImgs[0] ?? pageImgs[0] ?? indexCoverUrl ?? null;

  return {
    nasaDescription,
    mainImageRemote,
    stemImageRemoteMap,
  };
}

async function buildCatalog() {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

  // 1. Parse index.html for fallback cover thumbnails
  const indexHtml = await fetchText(`${BASE_SOUND_URL}index.html`);
  const cleanIndex = indexHtml.replace(/<!--[\s\S]*?-->/g, '');
  const indexCoverBySlug = new Map();
  for (const m of cleanIndex.matchAll(/<a[^>]+href="([^"]+\.html)"[^>]*>[\s\S]*?<img[^>]+src="([^"]+)"[^>]*>[\s\S]*?<\/a>/gi)) {
    const slug = m[1].split('/').pop();
    const imgUrl = resolveChandraUrl(m[2]);
    if (slug && imgUrl && isCelestialImage(imgUrl) && !indexCoverBySlug.has(slug)) {
      indexCoverBySlug.set(slug, imgUrl);
    }
  }

  const grouped = new Map();
  for (const track of manifest.tracks) {
    if (!grouped.has(track.object_name)) grouped.set(track.object_name, []);
    grouped.get(track.object_name).push(track);
  }

  const entries = Array.from(grouped.entries());
  const stars = [];
  let totalTracks = 0;

  // Fetch detail pages with concurrency 6
  const detailBySlug = new Map();
  const uniqueSlugs = Array.from(new Set(manifest.tracks.map((t) => t.slug)));
  let slugCursor = 0;

  await Promise.all(
    Array.from({ length: 6 }, async () => {
      while (slugCursor < uniqueSlugs.length) {
        const slug = uniqueSlugs[slugCursor++];
        const html = await fetchText(`${BASE_SOUND_URL}${slug}`);
        detailBySlug.set(slug, parseDetailPage(html, indexCoverBySlug.get(slug)));
      }
    })
  );

  for (const [objectName, tracks] of entries) {
    const meta = STAR_META[objectName];
    if (!meta) throw new Error(`Missing STAR_META for ${objectName}`);
    const starId = slugify(objectName);
    const slug = tracks[0].slug;
    const detail = detailBySlug.get(slug);

    if (!detail || !detail.mainImageRemote) {
      throw new Error(`Missing official NASA image for ${objectName} (${slug})`);
    }

    const mainImageLocal = await downloadImageLocal(detail.mainImageRemote, starId);

    const rawStems = [];
    for (const t of tracks) {
      const wavPath = path.join(AUDIO_DIR, t.folder, `${t.stem}.wav`);
      const wavInfo = parseWavAndPeaks(wavPath);
      const stemClass = classifyStem(t.stem, tracks.length);
      const url = `audio/${starId}/${encodeURIComponent(t.stem)}.mp3`;

      let stemImageLocal = undefined;
      const stemRemote = detail.stemImageRemoteMap.get(t.stem);
      if (stemRemote && stemRemote !== detail.mainImageRemote) {
        stemImageLocal = await downloadImageLocal(stemRemote, `${starId}__${t.stem}`);
      }

      totalTracks += 1;
      rawStems.push({
        id: `${starId}__${t.stem}`,
        stem: t.stem,
        label: stemClass.label,
        shortLabel: stemClass.shortLabel,
        band: stemClass.band,
        color: stemClass.color,
        isComposite: stemClass.isComposite,
        defaultMuted: false,
        url,
        imageUrl: stemImageLocal,
        duration: wavInfo.duration,
        sampleRate: wavInfo.sampleRate,
        channels: wavInfo.channels,
        peaks: wavInfo.peaks,
      });
    }

    const withMutes = assignDefaultMutes(objectName, rawStems);
    withMutes.sort((a, b) => {
      const oa = (BAND_ORDER[a.band] ?? 85) + (a.isComposite ? 100 : 0);
      const ob = (BAND_ORDER[b.band] ?? 85) + (b.isComposite ? 100 : 0);
      if (oa !== ob) return oa - ob;
      return a.label.localeCompare(b.label);
    });

    const activeDurations = withMutes.filter((s) => !s.defaultMuted).map((s) => s.duration);
    const maxDuration = Math.max(...withMutes.map((s) => s.duration));
    const timelineDuration = activeDurations.length > 0 ? Math.max(...activeDurations) : maxDuration;

    const compositeTrack = withMutes.find((s) => s.isComposite) ?? withMutes.find((s) => !s.defaultMuted) ?? withMutes[0];
    const telescopes = extractTelescopes(detail.nasaDescription, withMutes);
    const scanMode = detectScanMode(detail.nasaDescription);
    const shortSummary = extractShortSummary(detail.nasaDescription);

    stars.push({
      id: starId,
      name: objectName,
      family: meta.family,
      subtitle: meta.subtitle,
      sourcePageUrl: `${BASE_SOUND_URL}${slug}`,
      imageUrl: mainImageLocal,
      previewUrl: compositeTrack.url,
      nasaDescription: detail.nasaDescription,
      shortSummary,
      telescopes,
      scanMode,
      duration: Number(timelineDuration.toFixed(2)),
      maxDuration: Number(maxDuration.toFixed(2)),
      stems: withMutes,
    });
  }

  stars.sort((a, b) => a.name.localeCompare(b.name));

  const catalog = {
    version: 2,
    generatedAt: new Date().toISOString(),
    starCount: stars.length,
    trackCount: totalTracks,
    stars,
  };

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(catalog));
  const outKb = (fs.statSync(OUTPUT_PATH).size / 1024).toFixed(1);
  const imgCount = fs.readdirSync(IMAGES_DIR).length;
  console.log(`Built catalog.json v2: ${stars.length} stars, ${totalTracks} tracks, ${imgCount} NASA images, ${outKb} KB`);
}

buildCatalog().catch((err) => {
  console.error(err);
  process.exit(1);
});
