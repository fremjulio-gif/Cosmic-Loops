import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const AUDIO_SRC_DIR = path.join(ROOT, 'Chandra_Universe_of_Sound');
const MANIFEST_PATH = path.join(AUDIO_SRC_DIR, 'manifest.json');
const AUDIO_OUT_DIR = path.join(ROOT, 'public', 'audio');

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/\*/g, '-star')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function runFfmpeg(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      'ffmpeg',
      [
        '-y',
        '-v',
        'error',
        '-i',
        inputPath,
        '-codec:a',
        'libmp3lame',
        '-b:a',
        '128k',
        '-ac',
        '2',
        '-map_metadata',
        '-1',
        outputPath,
      ],
      { stdio: ['ignore', 'ignore', 'pipe'] }
    );
    let stderr = '';
    proc.stderr.on('data', (d) => {
      stderr += d.toString();
    });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code} for ${inputPath}: ${stderr}`));
    });
    proc.on('error', reject);
  });
}

async function main() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(`Missing manifest: ${MANIFEST_PATH}`);
  }
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const jobs = manifest.tracks.map((t) => {
    const starId = slugify(t.object_name);
    const src = path.join(AUDIO_SRC_DIR, t.folder, `${t.stem}.wav`);
    const dstDir = path.join(AUDIO_OUT_DIR, starId);
    const dst = path.join(dstDir, `${t.stem}.mp3`);
    return { src, dstDir, dst, name: `${starId}/${t.stem}.mp3` };
  });

  let cursor = 0;
  let transcoded = 0;
  let skipped = 0;
  const concurrency = 6;

  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (cursor < jobs.length) {
        const job = jobs[cursor++];
        fs.mkdirSync(job.dstDir, { recursive: true });
        if (fs.existsSync(job.dst) && fs.statSync(job.dst).size > 1000) {
          skipped += 1;
          continue;
        }
        await runFfmpeg(job.src, job.dst);
        transcoded += 1;
      }
    })
  );

  let totalBytes = 0;
  let maxBytes = 0;
  let maxFile = '';
  for (const job of jobs) {
    const sz = fs.statSync(job.dst).size;
    totalBytes += sz;
    if (sz > maxBytes) {
      maxBytes = sz;
      maxFile = job.name;
    }
  }

  console.log(
    `Audio transcode complete: ${jobs.length} files (${transcoded} transcoded, ${skipped} cached), ` +
      `total ${(totalBytes / 1024 / 1024).toFixed(1)} MB, ` +
      `max ${(maxBytes / 1024 / 1024).toFixed(2)} MB (${maxFile})`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
