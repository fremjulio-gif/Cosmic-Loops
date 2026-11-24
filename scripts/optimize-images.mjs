import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const IMAGES_DIR = path.join(ROOT, 'public', 'nasa-images');

function getImageWidth(filePath) {
  const buf = fs.readFileSync(filePath);
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length - 9) {
      if (buf[i] !== 0xff) break;
      const m = buf[i + 1];
      if (m === 0xc0 || m === 0xc1 || m === 0xc2) {
        return (buf[i + 7] << 8) | buf[i + 8];
      }
      const ln = (buf[i + 2] << 8) | buf[i + 3];
      i += 2 + ln;
    }
  } else if (buf.toString('ascii', 1, 4) === 'PNG') {
    return buf.readUInt32BE(16);
  }
  return 0;
}

function runCwebp(inputPath, outputPath, width) {
  return new Promise((resolve, reject) => {
    const args = ['-q', '84', '-m', '6', '-quiet'];
    if (width > 1200) {
      args.push('-resize', '1200', '0');
    }
    args.push(inputPath, '-o', outputPath);

    const proc = spawn('cwebp', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', (d) => {
      stderr += d.toString();
    });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`cwebp failed (${code}) for ${inputPath}: ${stderr}`));
    });
    proc.on('error', reject);
  });
}

async function main() {
  const files = fs.readdirSync(IMAGES_DIR).filter((f) => /\.(jpe?g|png)$/i.test(f));
  let beforeBytes = 0;
  let afterBytes = 0;
  let converted = 0;

  const jobs = files.map((f) => {
    const src = path.join(IMAGES_DIR, f);
    const stem = f.replace(/\.(jpe?g|png)$/i, '');
    const dst = path.join(IMAGES_DIR, `${stem}.webp`);
    return { src, dst, name: f };
  });

  let cursor = 0;
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      while (cursor < jobs.length) {
        const job = jobs[cursor++];
        const origSize = fs.statSync(job.src).size;
        beforeBytes += origSize;
        const w = getImageWidth(job.src);
        await runCwebp(job.src, job.dst, w);

        if (!fs.existsSync(job.dst) || fs.statSync(job.dst).size < 100) {
          throw new Error(`Invalid WebP output: ${job.dst}`);
        }
        const hdr = fs.readFileSync(job.dst).subarray(0, 12);
        if (hdr.toString('ascii', 0, 4) !== 'RIFF' || hdr.toString('ascii', 8, 12) !== 'WEBP') {
          throw new Error(`Invalid WebP RIFF header: ${job.dst}`);
        }
        afterBytes += fs.statSync(job.dst).size;
        fs.unlinkSync(job.src);
        converted += 1;
      }
    })
  );

  const webps = fs.readdirSync(IMAGES_DIR).filter((f) => f.endsWith('.webp'));
  const totalWebpBytes = webps.reduce(
    (acc, f) => acc + fs.statSync(path.join(IMAGES_DIR, f)).size,
    0
  );

  console.log(
    `WebP optimization complete: ${converted} converted (${(beforeBytes / 1024 / 1024).toFixed(2)} MB -> ${(afterBytes / 1024 / 1024).toFixed(2)} MB). Total public/nasa-images: ${webps.length} .webp files (${(totalWebpBytes / 1024 / 1024).toFixed(2)} MB)`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
