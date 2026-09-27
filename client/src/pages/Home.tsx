import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'wouter';
import { toast } from 'sonner';
import { ArrowDown, ArrowUpRight, BarChart3, Check, ExternalLink, Filter, LoaderCircle, Music2, Search, Sparkles, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KineticSongHud } from '@/components/ui/kinetic-song-hud';
import { GlassmorphismListenAppBlock } from '@/components/ui/glassmorphism-listen-app-block-shadcnui';
import { AppFooter, AppHeader } from '@/components/AppChrome';
import { trpc } from '@/lib/trpc';

const examples = {
  lyrics: ['ทิ้งไว้กลางทาง', 'แสงนำทางไม่ยอมแพ้', 'ฉันยังคงหายใจ'],
  mood: ['เพลงเศร้าตอนฝนตกคิดถึงแฟนเก่า', 'อยากได้เพลงรักอบอุ่นโรแมนติก', 'เพลงฮึกเหิมสำหรับเริ่มต้นใหม่'],
};

function confidence(score: number) {
  if (score >= 0.7) return { label: 'ตรงมาก', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
  if (score >= 0.4) return { label: 'ใกล้เคียง', color: 'text-amber-800 bg-amber-50 border-amber-200' };
  return { label: 'พอเข้าเค้า', color: 'text-slate-600 bg-slate-100 border-slate-200' };
}

function highlightSnippet(text: string, query: string) {
  const words = query.trim().split(/\s+/).filter(word => word.length > 2).slice(0, 4);
  if (!words.length) return text;
  const pattern = new RegExp(`(${words.map(word => word.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')).join('|')})`, 'giu');
  return text.split(pattern).map((part, index) => pattern.test(part) ? <mark key={`${part}-${index}`}>{part}</mark> : <span key={`${part}-${index}`}>{part}</span>);
}

export default function Home() {
  const [mode, setMode] = useState<'lyrics' | 'mood'>('lyrics');
  const [input, setInput] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [feedback, setFeedback] = useState<Record<number, boolean>>({});
  const [genre, setGenre] = useState('');
  const [moods, setMoods] = useState<string[]>([]);
  const [sort, setSort] = useState<'relevance' | 'title' | 'artist'>('relevance');
  const resultsRef = useRef<HTMLElement>(null);
  const feedbackItems = useMemo(() => Object.entries(feedback).map(([songId, relevant]) => ({ songId: Number(songId), relevant })), [feedback]);
  const queryInput = useMemo(() => ({ query: submittedQuery, mode, feedback: feedbackItems, genre: genre || undefined, moods, sort }), [submittedQuery, mode, feedbackItems, genre, moods, sort]);
  const search = trpc.songs.search.useQuery(queryInput, { enabled: Boolean(submittedQuery), placeholderData: previous => previous });
  const featured = trpc.songs.featured.useQuery();
  const facets = trpc.songs.facets.useQuery();
  const suggestions = trpc.songs.suggestions.useQuery({ prefix: input, limit: 7 }, { enabled: input.trim().length >= 2 });
  const sendFeedback = trpc.songs.feedback.useMutation();
  const results = search.data ?? [];
  const hasSearched = Boolean(submittedQuery);
  const currentSong = results[0];

  const submitSearch = (event?: React.FormEvent) => {
    event?.preventDefault();
    const clean = input.trim();
    if (!clean) { toast('ลองพิมพ์ท่อนเนื้อเพลงหรืออารมณ์ที่อยากฟังสักนิด'); return; }
    setSubmittedQuery(clean);
  };
  const useExample = (value: string) => { setInput(value); setSubmittedQuery(value); };
  const handleFeedback = (songId: number, relevant: boolean, title: string) => {
    setFeedback(current => ({ ...current, [songId]: relevant }));
    sendFeedback.mutate({ songId, query: submittedQuery, relevant });
    toast(relevant ? `บันทึกว่า “${title}” ใช่เพลงนี้` : 'รับทราบ จะลดน้ำหนักเพลงนี้ในการจัดอันดับ');
  };
  const clearFilters = () => { setGenre(''); setMoods([]); setSort('relevance'); };

  useEffect(() => {
    if (!submittedQuery) return;
    const frame = window.requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    return () => window.cancelAnimationFrame(frame);
  }, [submittedQuery]);

  return (
    <div className="min-h-screen bg-[#080d14] text-[#17212d]">
      <AppHeader />
      <main>
        <div className="container pb-12 pt-7 md:pb-16 md:pt-10">
          <KineticSongHud eyebrow="ค้นเพลงจากสิ่งที่ยังจำได้" title="เพลงที่นึกไม่ออก…ให้เราช่วยหา" description="จำได้แค่ท่อนเดียว ชื่อบางคำ หรือความรู้สึกตอนฟัง? พิมพ์สิ่งที่จำได้ แล้วระบบจะค้นจากคลังเพลงภาษาไทยให้" badge="30 TRACKS · READY">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div><p className="text-sm font-semibold text-white">เริ่มค้นหา</p><p className="mt-1 text-xs text-slate-400">เลือกวิธีค้นที่ตรงกับสิ่งที่คุณจำได้</p></div>
              <span className="hidden items-center gap-1.5 font-mono text-[9px] tracking-widest text-slate-500 sm:flex"><span className="size-1.5 rounded-full bg-emerald-400" /> ENGINE READY</span>
            </div>
            <div className="mb-3 grid grid-cols-2 gap-2 rounded-xl bg-black/20 p-1">
              <button type="button" onClick={() => setMode('lyrics')} className={`rounded-lg px-3 py-2.5 text-xs font-semibold transition ${mode === 'lyrics' ? 'border border-[#e3b65e]/30 bg-[#e3b65e]/15 text-[#f2ce83]' : 'text-slate-400 hover:text-white'}`}><Music2 size={14} className="mr-1.5 inline" />จำเนื้อเพลง</button>
              <button type="button" onClick={() => setMode('mood')} className={`rounded-lg px-3 py-2.5 text-xs font-semibold transition ${mode === 'mood' ? 'border border-[#e3b65e]/30 bg-[#e3b65e]/15 text-[#f2ce83]' : 'text-slate-400 hover:text-white'}`}><Sparkles size={14} className="mr-1.5 inline" />จำความรู้สึก</button>
            </div>
            <form onSubmit={submitSearch} className="flex flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 flex-1">
                <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input aria-label="คำค้นหาเพลง" value={input} onChange={event => setInput(event.target.value)} placeholder={mode === 'lyrics' ? 'พิมพ์ท่อนเนื้อเพลงที่จำได้…' : 'เล่าอารมณ์หรือสถานการณ์ที่อยากฟัง…'} className="h-12 w-full rounded-xl border border-white/10 bg-[#080e16]/80 pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[#dcae58]/70 focus:ring-2 focus:ring-[#dcae58]/15" />
                {suggestions.data?.length ? <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 rounded-xl border border-white/10 bg-[#101a26] p-1.5 shadow-xl">{suggestions.data.map(suggestion => <button type="button" key={suggestion} onClick={() => useExample(suggestion)} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/5 hover:text-white">{suggestion}</button>)}</div> : null}
              </div>
              <Button type="submit" className="h-12 rounded-xl bg-[#e0ae55] px-6 font-semibold text-[#17130c] hover:bg-[#f0c979]"><Search size={16} />ค้นหาเพลง</Button>
            </form>
            <div className="mt-4 flex flex-wrap items-center gap-2"><span className="mr-1 text-[10px] uppercase tracking-widest text-slate-500">ลองค้น</span>{examples[mode].map(example => <button key={example} type="button" onClick={() => useExample(example)} className="rounded-full border border-white/10 bg-white/[.035] px-3 py-1.5 text-[11px] text-slate-300 transition hover:border-[#e0ae55]/40 hover:bg-[#e0ae55]/10 hover:text-[#f2ce83]">{example}</button>)}</div>
          </KineticSongHud>

          {hasSearched && <section ref={resultsRef} className="scroll-mt-24 pt-12 md:pt-14">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.2em] text-[#d7aa57]"><span className="size-1.5 rounded-full bg-[#d7aa57]" /> SEARCH RESULTS</div><h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl" style={{ fontFamily: 'Taviraj, serif' }}>ผลลัพธ์สำหรับ “{submittedQuery}”</h2><p className="mt-1 text-xs text-slate-500">{search.isFetching ? 'กำลังจัดอันดับเพลงที่ใกล้เคียง…' : `พบ ${results.length} เพลงที่น่าจะใช่`}</p></div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor="genre-filter">แนวเพลง</label><select id="genre-filter" aria-label="กรองตามแนวเพลง" value={genre} onChange={event => setGenre(event.target.value)} className="rounded-lg border border-white/10 bg-[#111b27] px-3 py-2 text-xs text-slate-300 outline-none focus:border-[#d7aa57]"><option value="">ทุกแนวเพลง</option>{(facets.data?.genres ?? []).map(item => <option key={item} value={item}>{item}</option>)}</select>
                <label className="sr-only" htmlFor="sort-results">เรียงผลลัพธ์</label><select id="sort-results" aria-label="เรียงผลลัพธ์" value={sort} onChange={event => setSort(event.target.value as typeof sort)} className="rounded-lg border border-white/10 bg-[#111b27] px-3 py-2 text-xs text-slate-300 outline-none focus:border-[#d7aa57]"><option value="relevance">ตรงที่สุด</option><option value="title">ชื่อเพลง</option><option value="artist">ศิลปิน</option></select>
                {(genre || moods.length || sort !== 'relevance') ? <button onClick={clearFilters} className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white"><X size={13} /> ล้างตัวกรอง</button> : null}
              </div>
            </div>
            <div className="mb-4 flex flex-wrap gap-2">{(facets.data?.moods ?? []).slice(0, 8).map(item => <button type="button" key={item} onClick={() => setMoods(current => current.includes(item) ? current.filter(mood => mood !== item) : [...current, item])} className={`rounded-full border px-3 py-1.5 text-[11px] transition ${moods.includes(item) ? 'border-[#d7aa57]/60 bg-[#d7aa57]/15 text-[#f1c873]' : 'border-white/10 bg-white/[.03] text-slate-400 hover:border-white/20 hover:text-white'}`}>{moods.includes(item) && <Check size={11} className="mr-1 inline" />}{item}</button>)}</div>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="space-y-3">
                {search.isFetching && !search.data ? <div className="flex items-center justify-center gap-3 rounded-2xl border border-white/10 bg-[#101823] p-12 text-sm text-slate-300"><LoaderCircle className="animate-spin text-[#e0ae55]" size={19} /> กำลังค้นหาเพลง…</div> : null}
                {results.map((result, index) => { const tier = confidence(result.score); return <article key={result.songId} className="group rounded-2xl border border-white/[.08] bg-[#101823] p-5 transition hover:border-[#dfad55]/35 hover:bg-[#131e2b] sm:p-6">
                  <div className="flex items-start gap-4"><span className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-black/20 font-mono text-xs text-slate-500">{String(index + 1).padStart(2, '0')}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="text-lg font-semibold text-white">{result.title}</h3><p className="mt-0.5 text-sm text-slate-400">{result.artist}<span className="mx-2 text-slate-700">/</span>{result.genre}</p></div><span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${tier.color}`}>{tier.label}</span></div>
                    <p className="mt-4 border-l-2 border-[#d7aa57]/50 pl-4 text-base leading-7 text-slate-200" style={{ fontFamily: 'Taviraj, serif' }}>“{highlightSnippet(result.snippet, submittedQuery)}”</p>
                    <div className="mt-4 flex flex-wrap items-center gap-2">{result.moodTag.slice(0, 3).map(tag => <span key={tag} className="rounded-md bg-white/[.05] px-2 py-1 text-[10px] text-slate-400">{tag}</span>)}<div className="ml-auto flex items-center gap-1"><button onClick={() => handleFeedback(result.songId, true, result.title)} aria-label="ใช่เพลงนี้" title="ใช่เพลงนี้" className={`rounded-lg p-2 transition ${feedback[result.songId] === true ? 'bg-emerald-400/10 text-emerald-300' : 'text-slate-500 hover:bg-emerald-400/10 hover:text-emerald-300'}`}><ThumbsUp size={15} /></button><button onClick={() => handleFeedback(result.songId, false, result.title)} aria-label="ไม่ตรง" title="ไม่ตรง" className={`rounded-lg p-2 transition ${feedback[result.songId] === false ? 'bg-amber-400/10 text-amber-300' : 'text-slate-500 hover:bg-amber-400/10 hover:text-amber-300'}`}><ThumbsDown size={15} /></button><a href={result.youtubeUrl} target="_blank" rel="noreferrer" className="ml-1 inline-flex items-center gap-1.5 rounded-lg bg-[#e0ae55] px-3 py-2 text-[11px] font-semibold text-[#17130c] transition hover:bg-[#f0c979]"><ExternalLink size={13} /> ฟังเพลง</a></div></div>
                  </div></div>
                </article>; })}
                {!search.isFetching && !results.length && <div className="rounded-2xl border border-dashed border-white/15 bg-[#101823] p-10 text-center"><Search size={24} className="mx-auto text-slate-500" /><h3 className="mt-3 font-semibold text-white">ยังไม่พบเพลงที่ใกล้พอ</h3><p className="mt-2 text-sm text-slate-400">ลองสลับโหมดค้นหา หรือล้างตัวกรองแล้วลองอีกครั้ง</p></div>}
              </div>
              <aside className="h-fit rounded-2xl border border-[#d7aa57]/20 bg-gradient-to-b from-[#172231] to-[#101823] p-5 lg:sticky lg:top-24"><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.2em] text-[#e7b75c]"><ArrowDown size={13} /> KEEP LISTENING</div>{currentSong ? <><h3 className="mt-5 text-xl font-semibold text-white" style={{ fontFamily: 'Taviraj, serif' }}>{currentSong.title}</h3><p className="mt-1 text-sm text-slate-400">{currentSong.artist}</p><div className="mt-5 grid gap-2"><a href={currentSong.youtubeUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl bg-[#e0ae55] px-4 py-3 text-sm font-semibold text-[#17130c] hover:bg-[#f0c979]">เปิด YouTube <ArrowUpRight size={15} /></a><a href={currentSong.spotifyUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/5">เปิด Spotify <ArrowUpRight size={15} /></a></div></> : <p className="mt-4 text-sm text-slate-400">เมื่อพบเพลง รายการที่น่าจะใช่ที่สุดจะแสดงที่นี่</p>}<p className="mt-5 border-t border-white/10 pt-4 text-xs leading-6 text-slate-500">ปุ่ม feedback ช่วยปรับการจัดอันดับเพลงสำหรับคำค้นนี้</p></aside>
            </div>
          </section>}

          {!hasSearched && <section className="pt-8 md:pt-10">
            <div className="mb-5 flex items-end justify-between gap-3"><div><div className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#d7aa57]">FROM THE COLLECTION</div><h2 className="mt-2 text-2xl font-semibold text-white" style={{ fontFamily: 'Taviraj, serif' }}>ลองเริ่มจากเพลงในคลัง</h2></div><Link href="/stats" className="inline-flex items-center gap-1.5 text-xs text-slate-400 transition hover:text-[#f0c878]">ดูสถิติระบบ <BarChart3 size={14} /></Link></div>
            <GlassmorphismListenAppBlock tracks={featured.data ?? []} onSearch={useExample} />
          </section>}
          <section className="mt-10 grid gap-3 sm:grid-cols-3">
            {[{ n: '01', title: 'จำได้เป็นคำ', text: 'ค้นตรงจากคำหรือท่อนเนื้อเพลง', icon: Music2 }, { n: '02', title: 'จำได้เป็นอารมณ์', text: 'บอกบรรยากาศ เพลงเศร้า หรือเพลงปลุกใจ', icon: Sparkles }, { n: '03', title: 'ค่อย ๆ เจอเพลง', text: 'ให้ feedback เพื่อปรับผลลัพธ์ให้ใกล้ขึ้น', icon: ThumbsUp }].map(item => <div key={item.n} className="rounded-2xl border border-white/[.08] bg-[#0e151f] p-4"><div className="flex items-center justify-between"><span className="font-mono text-[10px] tracking-widest text-slate-600">STEP {item.n}</span><item.icon size={16} className="text-[#d7aa57]" /></div><h3 className="mt-4 text-sm font-semibold text-slate-200">{item.title}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{item.text}</p></div>)}
          </section>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
