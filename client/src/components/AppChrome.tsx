import { BarChart3, Music2, Radio } from 'lucide-react';
import { Link, useLocation } from 'wouter';

export function AppHeader() {
  const [location] = useLocation();
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b111a]/90 text-white shadow-lg shadow-black/10 backdrop-blur-xl">
      <div className="container flex h-[4.25rem] items-center justify-between gap-4">
        <Link href="/" className="group flex items-center gap-3" aria-label="เพลงอะไรนะ หน้าแรก">
          <span className="grid size-10 place-items-center rounded-xl border border-[#dfad55]/35 bg-[#dfad55]/10 text-[#f0c878] shadow-[0_0_24px_rgba(223,173,85,.12)]"><Music2 size={19} /></span>
          <span><span className="block text-base font-semibold tracking-tight" style={{ fontFamily: 'Taviraj, serif' }}>เพลงอะไรนะ</span><span className="hidden text-[9px] font-medium tracking-[.22em] text-slate-500 sm:block">SONG MEMORY ENGINE</span></span>
        </Link>
        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/[.035] p-1 text-xs font-medium">
          <Link href="/" className={`flex items-center gap-2 rounded-lg px-3 py-2 transition ${location === '/' ? 'bg-white/10 text-[#f0c878]' : 'text-slate-400 hover:text-white'}`}><Radio size={14} /> <span className="hidden sm:inline">ค้นหาเพลง</span></Link>
          <Link href="/stats" className={`flex items-center gap-2 rounded-lg px-3 py-2 transition ${location === '/stats' ? 'bg-white/10 text-[#f0c878]' : 'text-slate-400 hover:text-white'}`}><BarChart3 size={14} /> <span>สถิติระบบ</span></Link>
        </div>
      </div>
    </header>
  );
}

export function AppFooter() {
  return <footer className="border-t border-white/10 bg-[#090e15] py-6 text-slate-500"><div className="container flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between"><span>เพลงอะไรนะ <span className="mx-1 text-[#dfad55]">/</span> ค้นเพลงจากความทรงจำ</span><span className="font-mono tracking-wider">THAI MUSIC DISCOVERY · IR LAB</span></div></footer>;
}
