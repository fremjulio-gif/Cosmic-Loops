export function encodeStereoWav(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number
): Blob {
  const numChannels = 2;
  const bitsPerSample = 16;
  const blockAlign = numChannels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;
  const frameCount = Math.min(left.length, right.length);
  const dataSize = frameCount * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < frameCount; i++) {
    const l = Math.max(-1, Math.min(1, left[i]));
    const r = Math.max(-1, Math.min(1, right[i]));
    view.setInt16(offset, l < 0 ? l * 0x8000 : l * 0x7fff, true);
    view.setInt16(offset + 2, r < 0 ? r * 0x8000 : r * 0x7fff, true);
    offset += 4;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeAscii(view: DataView, offset: number, text: string) {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

export function computePeaksFromBuffer(buffer: AudioBuffer, count = 256): number[] {
  const left = buffer.getChannelData(0);
  const right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : left;
  return computePeaksFromChannels(left, right, count);
}

export function computePeaksFromChannels(
  left: Float32Array,
  right: Float32Array,
  count = 256
): number[] {
  const totalFrames = Math.min(left.length, right.length);
  const peaks = new Array<number>(count).fill(0);
  if (totalFrames === 0) return peaks;

  for (let i = 0; i < count; i++) {
    const start = Math.floor((i * totalFrames) / count);
    const end = Math.max(start + 1, Math.floor(((i + 1) * totalFrames) / count));
    const span = end - start;
    const step = span > 1200 ? Math.floor(span / 600) : 1;
    let maxVal = 0;

    for (let f = start; f < end; f += step) {
      const a = Math.abs(left[f]);
      const b = Math.abs(right[f]);
      const m = a > b ? a : b;
      if (m > maxVal) maxVal = m;
    }
    peaks[i] = Number(Math.min(1, maxVal).toFixed(3));
  }

  return peaks;
}

export function downloadWavBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 5000);
}
