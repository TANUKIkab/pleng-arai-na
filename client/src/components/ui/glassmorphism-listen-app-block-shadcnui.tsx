import { useMemo, useState } from 'react';
import { ArrowUpRight, Headphones, Music2, Search, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

type FeaturedSong = { songId: number; title: string; artist: string; genre: string; moodTag: string[] };
type Props = { tracks: FeaturedSong[]; onSearch: (query: string) => void };

/** Interactive, dark-glass song discovery panel adapted from the supplied 21st.dev component. */
export function GlassmorphismListenAppBlock({ tracks, onSearch }: Props) {
  const playlist = useMemo(() => tracks.slice(0, 6), [tracks]);
  const [activeSongId, setActiveSongId] = useState<number | null>(null);
  const activeTrack = playlist.find(song => song.songId === activeSongId) ?? playlist[0];
  if (!activeTrack) return <Card className="border-white/10 bg-[#101823] p-6 text-sm text-slate-400">กำลังโหลดเพลงในคลัง…</Card>;

  const query = `${activeTrack.title} ${activeTrack.artist}`;
  const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  const spotifyUrl = `https://open.spotify.com/search/${encodeURIComponent(query)}`;
  return (
    <section aria-labelledby="featured-listen-title" className="relative isolate">
      <div className="pointer-events-none absolute -right-6 -top-8 -z-10 size-44 rounded-full bg-[#dcae58]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-7 left-8 -z-10 size-40 rounded-full bg-emerald-300/[.07] blur-3xl" />
      <Card className="relative overflow-hidden border border-white/10 bg-gradient-to-br from-[#141f2c]/95 via-[#101823]/95 to-[#0d151f]/95 p-5 shadow-[0_24px_70px_rgba(0,0,0,.28)] backdrop-blur-2xl sm:p-7">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_0%,rgba(226,173,82,.10),transparent_38%)]" />
        <div className="relative z-10 grid gap-7 lg:grid-cols-[.9fr_1.1fr] lg:gap-9">
          <div className="flex flex-col justify-between gap-7">
            <div>
              <Badge className="border border-[#dcae58]/25 bg-[#dcae58]/10 text-[#edc675] hover:bg-[#dcae58]/10"><Sparkles size={12} className="mr-1.5" /> SONG COLLECTION</Badge>
              <h2 id="featured-listen-title" className="mt-5 text-3xl font-semibold leading-tight text-white sm:text-4xl" style={{ fontFamily: 'Taviraj, serif' }}>เพลงไทยที่น่าลองค้น</h2>
              <p className="mt-3 max-w-lg text-sm leading-6 text-slate-400">เลือกเพลงเพื่อค้นต่อจากชื่อ หรือเปิดไปฟังใน YouTube และ Spotify</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 backdrop-blur-xl sm:p-5">
              <div className="flex items-start gap-4">
                <div className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-[#dcae58]/25 bg-gradient-to-br from-[#dcae58]/20 to-emerald-300/[.08] text-[#edc675]"><div className="absolute -right-4 -top-4 size-16 rounded-full border border-white/10" /><Music2 className="relative z-10" size={23} /></div>
                <div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-slate-500">NOW EXPLORING</p><h3 className="mt-1 truncate text-xl font-semibold text-white" style={{ fontFamily: 'Taviraj, serif' }}>{activeTrack.title}</h3><p className="truncate text-sm text-slate-400">{activeTrack.artist}</p><div className="mt-3 flex flex-wrap gap-1.5"><Badge variant="outline" className="border-white/10 bg-white/[.04] text-slate-300">{activeTrack.genre}</Badge>{activeTrack.moodTag.slice(0, 2).map(tag => <Badge key={tag} variant="outline" className="border-emerald-300/15 bg-emerald-300/[.06] text-emerald-200">{tag}</Badge>)}</div></div>
              </div>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row"><Button onClick={() => onSearch(query)} className="h-10 flex-1 rounded-xl bg-[#e0ae55] font-semibold text-[#17130c] hover:bg-[#f0c979]"><Search size={15} /> ค้นหาเพลงนี้</Button><Button asChild variant="outline" className="h-10 rounded-xl border-white/10 bg-white/[.03] text-slate-200 hover:bg-white/[.08]"><a href={youtubeUrl} target="_blank" rel="noreferrer">YouTube <ArrowUpRight size={14} /></a></Button><Button asChild variant="outline" className="h-10 rounded-xl border-white/10 bg-white/[.03] text-slate-200 hover:bg-white/[.08]"><a href={spotifyUrl} target="_blank" rel="noreferrer">Spotify <ArrowUpRight size={14} /></a></Button></div>
            </div>
          </div>
          <div className="flex flex-col">
            <div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-slate-100">เลือกเพลงจากคลัง</p><p className="mt-0.5 text-xs text-slate-500">คลิกเพื่อดูตัวเลือกเพลง</p></div><span className="shrink-0 font-mono text-[10px] text-slate-500">{playlist.length} / 30 TRACKS</span></div>
            <div className="grid flex-1 content-start gap-2 sm:grid-cols-2 lg:grid-cols-1">{playlist.map((track, index) => { const selected = activeTrack.songId === track.songId; return <button key={track.songId} type="button" onClick={() => setActiveSongId(track.songId)} aria-pressed={selected} className={`group flex min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e0ae55] ${selected ? 'border-[#dcae58]/40 bg-[#dcae58]/[.08]' : 'border-white/[.07] bg-black/10 hover:border-white/15 hover:bg-white/[.04]'}`}><span className={`grid size-9 shrink-0 place-items-center rounded-lg border text-xs font-semibold ${selected ? 'border-[#dcae58]/40 bg-[#dcae58]/15 text-[#edc675]' : 'border-white/10 bg-white/[.03] font-mono text-slate-500'}`}>{selected ? <Headphones size={15} /> : String(index + 1).padStart(2, '0')}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-100">{track.title}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{track.artist}</span></span><ArrowUpRight size={14} className="shrink-0 text-slate-600 transition group-hover:text-[#edc675]" /></button>; })}</div>
            <div className="mt-4 flex items-center gap-2 border-t border-white/[.08] pt-4 text-[10px] text-slate-500"><Headphones size={14} className="text-[#dcae58]" /><span>ชุดข้อมูลตัวอย่างจากคลังเพลงของระบบ</span></div>
          </div>
        </div>
      </Card>
    </section>
  );
}
