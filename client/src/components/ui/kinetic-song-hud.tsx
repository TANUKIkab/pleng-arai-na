import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Activity, AudioLines, Radio, Sparkles } from 'lucide-react';

type KineticSongHudProps = {
  eyebrow: string;
  title: string;
  description: string;
  badge?: string;
  children?: ReactNode;
  compact?: boolean;
};

type Particle = { x: number; y: number; r: number; speed: number; drift: number; alpha: number };

/** Reusable, responsive HUD frame adapted from the supplied kinetic cyber-audio reference. */
export function KineticSongHud({ eyebrow, title, description, badge = 'SEARCH SYSTEM / ONLINE', children, compact = false }: KineticSongHudProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const frame = frameRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !frame || !context) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const particles: Particle[] = [];
    let width = 0;
    let height = 0;
    let raf = 0;
    let pointerX = 0;

    const resize = () => {
      const rect = frame.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles.length = 0;
      const count = Math.max(16, Math.min(38, Math.round(width / 28)));
      for (let i = 0; i < count; i++) particles.push({ x: Math.random() * width, y: Math.random() * height, r: Math.random() * 1.5 + .5, speed: Math.random() * .22 + .06, drift: Math.random() * .28 - .14, alpha: Math.random() * .42 + .12 });
    };
    const movePointer = (event: PointerEvent) => {
      const rect = frame.getBoundingClientRect();
      pointerX = ((event.clientX - rect.left) / rect.width - .5) * 2;
    };
    const draw = () => {
      context.clearRect(0, 0, width, height);
      for (const p of particles) {
        context.beginPath();
        context.fillStyle = `rgba(232, 178, 78, ${p.alpha})`;
        context.arc(p.x + pointerX * 3, p.y, p.r, 0, Math.PI * 2);
        context.fill();
        if (!reduceMotion) {
          p.y -= p.speed;
          p.x += p.drift;
          if (p.y < -3) { p.y = height + 3; p.x = Math.random() * width; }
          if (p.x < -3) p.x = width + 3;
          if (p.x > width + 3) p.x = -3;
        }
      }
      if (!reduceMotion) raf = window.requestAnimationFrame(draw);
    };

    resize();
    draw();
    const observer = new ResizeObserver(resize);
    observer.observe(frame);
    frame.addEventListener('pointermove', movePointer, { passive: true });
    return () => {
      window.cancelAnimationFrame(raf);
      observer.disconnect();
      frame.removeEventListener('pointermove', movePointer);
    };
  }, []);

  return (
    <section ref={frameRef} className={`kinetic-hud relative isolate overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0b111a] text-white shadow-[0_28px_90px_rgba(0,0,0,.35)] ${compact ? 'p-6 md:p-8' : 'p-6 md:p-10'}`}>
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_70%_10%,rgba(199,147,56,.17),transparent_38%),radial-gradient(ellipse_at_0%_100%,rgba(65,112,105,.14),transparent_38%)]" />
      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 -z-0 h-full w-full opacity-80" />
      <div className="pointer-events-none absolute inset-0 -z-0 opacity-[.06] [background-image:radial-gradient(rgba(255,255,255,.8)_0.65px,transparent_0.65px)] [background-size:6px_6px]" />
      <div className="pointer-events-none absolute left-4 top-4 h-5 w-5 border-l border-t border-[#e2ad54]/50" />
      <div className="pointer-events-none absolute bottom-4 right-4 h-5 w-5 border-b border-r border-[#e2ad54]/50" />
      <div className="relative z-10 grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(320px,.82fr)] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#dba846]/25 bg-[#dba846]/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[.19em] text-[#f0c878]"><span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-40" /><span className="relative inline-flex size-2 rounded-full bg-emerald-400" /></span>{eyebrow}</div>
          <h1 className="mt-5 max-w-2xl text-3xl font-semibold leading-[1.18] tracking-tight text-[#f6f3eb] sm:text-4xl lg:text-[3.2rem]" style={{ fontFamily: 'Taviraj, serif' }}>{title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">{description}</p>
          <div className="mt-6 flex flex-wrap gap-2.5 text-[11px] font-medium text-slate-300"><span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[.04] px-3 py-2"><AudioLines size={14} className="text-[#e7b75c]" /> THAI LYRIC INDEX</span><span className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[.04] px-3 py-2"><Activity size={14} className="text-emerald-300" /> SEMANTIC RETRIEVAL</span></div>
        </div>
        <div className="relative rounded-2xl border border-white/10 bg-[#111b27]/80 p-5 shadow-inner shadow-black/30 backdrop-blur-md md:p-6"><div className="mb-4 flex items-center justify-between gap-3 border-b border-white/10 pb-3"><div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-slate-200"><Radio size={15} className="text-[#e7b75c]" /> DISCOVERY CONSOLE</div><span className="rounded-md border border-emerald-300/20 bg-emerald-300/10 px-2 py-1 font-mono text-[9px] tracking-widest text-emerald-200">{badge}</span></div>{children ?? <div className="flex min-h-24 items-center gap-4"><div className="grid size-12 place-items-center rounded-xl border border-[#e7b75c]/25 bg-[#e7b75c]/10 text-[#e7b75c]"><Sparkles size={20} /></div><div><p className="text-sm font-semibold text-white">จำเพลงได้ไม่หมดก็หาเจอ</p><p className="mt-1 text-xs leading-5 text-slate-400">ค้นจากเนื้อร้อง ความรู้สึก หรือคำใบ้สั้น ๆ</p></div></div>}</div>
      </div>
    </section>
  );
}
