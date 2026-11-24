import { useEffect, useRef } from 'react';

interface StarPoint {
  x: number;
  y: number;
  r: number;
  alpha: number;
  driftX: number;
  driftY: number;
}

export function StarfieldBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const stars: StarPoint[] = Array.from({ length: 85 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() < 0.8 ? 0.85 : 1.35,
      alpha: 0.1 + Math.random() * 0.35,
      driftX: (Math.random() - 0.5) * 0.002,
      driftY: (Math.random() - 0.5) * 0.002,
    }));

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const drawStars = (dt: number) => {
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        if (dt > 0) {
          s.x = (s.x + s.driftX * dt + 1) % 1;
          s.y = (s.y + s.driftY * dt + 1) % 1;
        }
        ctx.fillStyle = '#E8EDF5';
        ctx.globalAlpha = s.alpha;
        ctx.beginPath();
        ctx.arc(s.x * width, s.y * height, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      drawStars(0);
    };

    resize();
    window.addEventListener('resize', resize);

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      return () => window.removeEventListener('resize', resize);
    }

    let rafId = 0;
    let lastDraw = performance.now();

    const frame = (now: number) => {
      rafId = window.requestAnimationFrame(frame);
      if (document.hidden || now - lastDraw < 33) return;
      const dt = Math.min(0.08, (now - lastDraw) / 1000);
      lastDraw = now;
      drawStars(dt);
    };

    rafId = window.requestAnimationFrame(frame);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0"
    />
  );
}
