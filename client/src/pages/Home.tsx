import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'wouter';
import { toast } from 'sonner';
import {
  ArrowRight,
  BarChart3,
  ExternalLink,
  Music2,
  Play,
  Search,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';

const examples = {
  lyrics: ['ทิ้งไว้กลางทาง', 'แสงนำทางไม่ยอมแพ้', 'ฉันยังคงหายใจ'],
  mood: ['เพลงเศร้าตอนฝนตกคิดถึงแฟนเก่า', 'อยากได้เพลงรักอบอุ่นโรแมนติก', 'เพลงฮึกเหิมสำหรับเริ่มต้นใหม่'],
};

const scraps = [
  { text: '"ทิ้งไว้กลางทาง"', hint: 'จำได้แค่นี้' },
  { text: '"เพลงเศร้าตอนฝนตก"', hint: 'หรือเล่าความรู้สึก' },
];

function matchTier(score: number) {
  if (score >= 0.7) return { label: 'ตรงมาก', color: 'text-[#b97c1e]' };
  if (score >= 0.4) return { label: 'ใกล้เคียง', color: 'text-[#6f7f52]' };
  return { label: 'พอเข้าเค้า', color: 'text-[#8a8a7a]' };
}

function highlightSnippet(text: string, query: string) {
  const words = query.trim().split(/\s+/).filter(word => word.length > 2).slice(0, 4);
  if (!words.length) return text;
  const pattern = new RegExp(`(${words.map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'giu');
  return text.split(pattern).map((part, index) => pattern.test(part)
    ? <mark key={`${part}-${index}`}>{part}</mark>
    : <span key={`${part}-${index}`}>{part}</span>);
}

export default function Home() {
  const [mode, setMode] = useState<'lyrics' | 'mood'>('lyrics');
  const [input, setInput] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [feedback, setFeedback] = useState<Record<number, boolean>>({});
  const [selectedSong, setSelectedSong] = useState<number | null>(null);
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

  const submitSearch = (event?: React.FormEvent) => {
    event?.preventDefault();
    const clean = input.trim();
    if (!clean) {
      toast('ลองพิมพ์ท่อนเนื้อเพลงหรืออารมณ์ที่อยากฟังสักนิด');
      return;
    }
    setSubmittedQuery(clean);
    setSelectedSong(null);
  };

  const useExample = (value: string) => {
    setInput(value);
    setSubmittedQuery(value);
  };

  const handleFeedback = (songId: number, relevant: boolean, title: string) => {
    setFeedback(current => ({ ...current, [songId]: relevant }));
    sendFeedback.mutate({ songId, query: submittedQuery, relevant });
    toast(relevant ? `บันทึกว่า "${title}" ใช่เพลงนี้` : 'รับทราบ เดี๋ยวจะลดน้ำหนักผลลัพธ์นี้ในการค้นครั้งถัดไป');
  };

  const results = search.data ?? [];
  const hasSearched = Boolean(submittedQuery);
  const currentSong = results.find(result => result.songId === selectedSong) ?? results[0];

  useEffect(() => {
    if (!submittedQuery) return;
    const frame = window.requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [submittedQuery]);

  return (
    <div className="min-h-screen bg-[#eff0e6] text-[#1e2a32]">
      <header className="sticky top-0 z-20 border-b border-[#dad9c8] bg-[#eff0e6]/95 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 font-semibold tracking-tight">
            <span className="grid size-9 place-items-center rounded-full bg-[#1e2a32] text-[#e2a33b]"><Music2 size={18} /></span>
            <span className="text-lg" style={{ fontFamily: 'Taviraj, serif' }}>เพลงอะไรนะ</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-[#5c5a4e] md:flex">
            <a href="#how-it-works" className="hover:text-[#1e2a32]">วิธีทำงาน</a>
            <Link href="/stats" className="flex items-center gap-1.5 hover:text-[#1e2a32]"><BarChart3 size={15} /> สถิติระบบ</Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="border-b border-[#dad9c8]">
          <div className="container grid gap-10 py-14 md:grid-cols-[1.1fr_.9fr] md:items-start md:py-20">
            <div>
              <h1 className="max-w-md text-4xl leading-[1.2] text-[#1e2a32] md:text-5xl" style={{ fontFamily: 'Taviraj, serif' }}>
                จำได้แค่ประโยคเดียว ก็ลองหาดูได้เลย
              </h1>
              <p className="mt-4 max-w-md text-base leading-7 text-[#5c5a4e]">
                พิมพ์ท่อนเนื้อเพลงที่นึกออก หรือเล่าอารมณ์ที่อยากฟัง ระบบจะช่วยไล่หาเพลงที่ใกล้เคียงที่สุดให้
              </p>

              <div className="mt-8 rounded-2xl bg-[#fbf9f2] p-5 shadow-[0_1px_0_#dad9c8]">
                <div className="flex gap-1 text-sm font-medium">
                  <button onClick={() => setMode('lyrics')} className={`rounded-full px-3.5 py-1.5 transition ${mode === 'lyrics' ? 'bg-[#1e2a32] text-[#f3efe3]' : 'text-[#8a8a7a] hover:text-[#1e2a32]'}`}>จำเนื้อเพลงได้</button>
                  <button onClick={() => setMode('mood')} className={`rounded-full px-3.5 py-1.5 transition ${mode === 'mood' ? 'bg-[#1e2a32] text-[#f3efe3]' : 'text-[#8a8a7a] hover:text-[#1e2a32]'}`}>จำได้แต่ความรู้สึก</button>
                </div>

                <form onSubmit={submitSearch} className="mt-3 flex flex-col gap-2.5 sm:flex-row">
                  <div className="relative flex min-w-0 flex-1 items-center gap-2.5 border-b-2 border-[#dad9c8] px-1 py-2 transition focus-within:border-[#e2a33b]">
                    <Search size={18} className="shrink-0 text-[#8a8a7a]" />
                    <input
                      aria-label="คำค้นหาเพลง"
                      value={input}
                      onChange={event => setInput(event.target.value)}
                      placeholder={mode === 'lyrics' ? 'เช่น ทิ้งฝันไว้กลางทาง' : 'เช่น เพลงเศร้าตอนฝนตกคิดถึงแฟนเก่า'}
                      className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-[#a8a696]"
                    />
                    {suggestions.data?.length ? (
                      <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-30 rounded-xl border border-[#dad9c8] bg-[#fbf9f2] p-1.5 shadow-lg">
                        {suggestions.data.map(suggestion => (
                          <button type="button" key={suggestion} onClick={() => { setInput(suggestion); setSubmittedQuery(suggestion); }} className="block w-full rounded-lg px-3 py-1.5 text-left text-sm text-[#5c5a4e] hover:bg-[#eff0e6]">{suggestion}</button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <Button type="submit" className="h-11 shrink-0 rounded-full bg-[#e2a33b] px-6 font-semibold text-[#1e2a32] hover:bg-[#eab655]">
                    หาเพลง <ArrowRight size={16} />
                  </Button>
                </form>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-[#a8a696]">ลองดู:</span>
                  {examples[mode].map(example => (
                    <button key={example} onClick={() => useExample(example)} className="rounded-full border border-[#dad9c8] px-2.5 py-1 text-[#5c5a4e] transition hover:border-[#e2a33b] hover:text-[#1e2a32]">{example}</button>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#eceada] pt-3 text-xs">
                  <select aria-label="กรองตามแนวเพลง" value={genre} onChange={event => setGenre(event.target.value)} className="rounded-full border border-[#dad9c8] bg-transparent px-2.5 py-1 text-[#5c5a4e] outline-none">
                    <option value="">ทุกแนวเพลง</option>
                    {(facets.data?.genres ?? []).map(item => <option key={item} value={item}>{item}</option>)}
                  </select>
                  {(facets.data?.moods ?? []).slice(0, 6).map(item => (
                    <button type="button" key={item} onClick={() => setMoods(current => current.includes(item) ? current.filter(m => m !== item) : [...current, item])} className={`rounded-full border px-2.5 py-1 transition ${moods.includes(item) ? 'border-[#e2a33b] bg-[#f7e6c2] text-[#1e2a32]' : 'border-[#dad9c8] text-[#5c5a4e] hover:border-[#e2a33b]'}`}>{item}</button>
                  ))}
                  <select aria-label="เรียงผลลัพธ์" value={sort} onChange={event => setSort(event.target.value as typeof sort)} className="ml-auto rounded-full border border-[#dad9c8] bg-transparent px-2.5 py-1 text-[#5c5a4e] outline-none">
                    <option value="relevance">เรียงตามความตรง</option>
                    <option value="title">เรียงตามชื่อเพลง</option>
                    <option value="artist">เรียงตามศิลปิน</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="hidden pt-6 md:block">
              <div className="space-y-4">
                {scraps.map((scrap, index) => (
                  <div key={scrap.text} className={`w-64 rounded-xl border border-dashed border-[#c9c7b3] bg-[#fbf9f2] p-4 ${index === 0 ? 'ml-8 -rotate-2' : 'rotate-1'}`}>
                    <p className="text-lg leading-snug text-[#1e2a32]" style={{ fontFamily: 'Taviraj, serif' }}>{scrap.text}</p>
                    <p className="mt-2 text-xs text-[#a8a696]">{scrap.hint}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section ref={resultsRef} className="container scroll-mt-24 py-14">
          {!hasSearched ? (
            <div className="grid gap-4 md:grid-cols-[1fr_1.3fr]">
              <div className="rounded-2xl bg-[#1e2a32] p-7 text-[#f3efe3]">
                <h2 className="max-w-xs text-2xl leading-snug" style={{ fontFamily: 'Taviraj, serif' }}>สองวิธีหาเพลง ในที่เดียว</h2>
                <p className="mt-4 max-w-xs text-sm leading-6 text-[#b9b6a3]">โหมดเนื้อเพลงจะจับคำที่ตรงกันเป๊ะ ส่วนโหมดความรู้สึกจะเข้าใจอารมณ์แม้ไม่ได้ใช้คำเดียวกัน</p>
                <Link href="/stats" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[#e2a33b] hover:gap-2.5">ดูวิธีวัดผล <ArrowRight size={15} /></Link>
              </div>
              <div className="rounded-2xl border border-[#dad9c8] bg-[#fbf9f2] p-7">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl" style={{ fontFamily: 'Taviraj, serif' }}>เพลงในระบบ</h2>
                  <span className="text-xs text-[#a8a696]">30 เพลง</span>
                </div>
                <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                  {(featured.data ?? []).slice(0, 6).map(song => (
                    <button key={song.songId} onClick={() => useExample(song.title)} className="group flex items-center gap-3 rounded-xl border border-[#eceada] p-2.5 text-left transition hover:border-[#e2a33b]">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#eff0e6] text-[#6f7f52]"><Music2 size={15} /></span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{song.title}</span>
                        <span className="block truncate text-xs text-[#a8a696]">{song.artist}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
              <div>
                <div className="mb-4 flex items-end justify-between">
                  <h2 className="text-xl" style={{ fontFamily: 'Taviraj, serif' }}>ผลลัพธ์สำหรับ "{submittedQuery}"</h2>
                  <span className="text-sm text-[#a8a696]">{search.isFetching ? 'กำลังค้น…' : `${results.length} เพลง`}</span>
                </div>
                <div className="space-y-3">
                  {results.map((result, index) => {
                    const tier = matchTier(result.score);
                    return (
                      <article key={result.songId} className={`rounded-lg border-t-2 border-dashed bg-[#fbf9f2] p-5 ${selectedSong === result.songId ? 'border-[#e2a33b]' : 'border-[#dad9c8]'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-medium tracking-tight">{result.title}</h3>
                            <p className="text-sm text-[#a8a696]">{result.artist}</p>
                          </div>
                          <span className={`shrink-0 text-sm font-semibold ${tier.color}`}>{tier.label}</span>
                        </div>
                        <p className="mt-4 text-lg leading-snug text-[#3a3830]" style={{ fontFamily: 'Taviraj, serif' }}>
                          <span className="text-[#e2a33b]">"</span>{highlightSnippet(result.snippet, submittedQuery)}<span className="text-[#e2a33b]">"</span>
                        </p>
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          {result.moodTag.slice(0, 2).map(tag => <span key={tag} className="text-xs font-medium text-[#6f7f52]">{tag}</span>)}
                          <div className="ml-auto flex items-center gap-1">
                            <button onClick={() => handleFeedback(result.songId, true, result.title)} className={`rounded-full p-2 transition ${feedback[result.songId] === true ? 'text-[#6f7f52]' : 'text-[#a8a696] hover:text-[#6f7f52]'}`} aria-label="ใช่เพลงนี้"><ThumbsUp size={16} /></button>
                            <button onClick={() => handleFeedback(result.songId, false, result.title)} className={`rounded-full p-2 transition ${feedback[result.songId] === false ? 'text-[#b97c1e]' : 'text-[#a8a696] hover:text-[#b97c1e]'}`} aria-label="ไม่ตรง"><ThumbsDown size={16} /></button>
                            <a href={result.youtubeUrl} target="_blank" rel="noreferrer" aria-label={`ฟังเพลง ${result.title}`} className="ml-2 inline-flex items-center gap-1.5 rounded-full bg-[#1e2a32] px-3.5 py-1.5 text-xs font-semibold text-[#f3efe3] hover:bg-[#2c3e49]">
                              <Play size={12} /> ฟัง
                            </a>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                  {!results.length && (
                    <div className="rounded-lg border border-dashed border-[#c9c7b3] bg-[#fbf9f2] p-10 text-center">
                      <Search className="mx-auto text-[#a8a696]" size={24} />
                      <h3 className="mt-3 font-medium">ยังไม่เจอเพลงที่ตรงพอ</h3>
                      <p className="mt-1.5 text-sm text-[#a8a696]">ลองเปลี่ยนคำค้น หรือสลับไปค้นตามอารมณ์ดูนะ</p>
                    </div>
                  )}
                </div>
              </div>

              <aside className="h-fit rounded-2xl bg-[#1e2a32] p-6 text-[#f3efe3] lg:sticky lg:top-24">
                <div className="text-sm font-medium text-[#b9b6a3]">ฟังต่อ</div>
                {currentSong ? (
                  <>
                    <h3 className="mt-5 text-xl leading-snug" style={{ fontFamily: 'Taviraj, serif' }}>{currentSong.title}</h3>
                    <p className="mt-1 text-sm text-[#b9b6a3]">{currentSong.artist}</p>
                    <div className="mt-5 grid gap-2">
                      <a href={currentSong.youtubeUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl bg-[#e2a33b] px-4 py-2.5 text-sm font-semibold text-[#1e2a32] hover:bg-[#eab655]">
                        เปิด YouTube <ExternalLink size={15} />
                      </a>
                      <a href={currentSong.spotifyUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold hover:bg-white/5">
                        เปิด Spotify <ExternalLink size={15} />
                      </a>
                    </div>
                  </>
                ) : (
                  <p className="mt-5 text-sm text-[#b9b6a3]">เลือก "ฟัง" จากผลลัพธ์เพื่อดูช่องทางฟังเพลง</p>
                )}
                <p className="mt-6 border-t border-white/10 pt-4 text-xs leading-6 text-[#8f9187]">ระบบจะจดจำว่าเพลงไหนใช่หรือไม่ใช่ แล้วจัดอันดับผลลัพธ์ให้ตรงขึ้นในการค้นครั้งถัดไป</p>
              </aside>
            </div>
          )}
        </section>

        <section id="how-it-works" className="border-t border-[#dad9c8] py-16">
          <div className="container">
            <h2 className="max-w-md text-3xl leading-snug" style={{ fontFamily: 'Taviraj, serif' }}>ค้นด้วยคำ หรือค้นด้วยความหมาย</h2>
            <p className="mt-3 max-w-xl text-base leading-7 text-[#5c5a4e]">แอปนี้ทำให้เห็นภาพเทคนิค IR แบบจับต้องได้ ตั้งแต่การตัดคำ สร้าง index ไปจนถึงการวัดผลค้นหา</p>
            <div className="mt-10 grid gap-8 border-t border-[#dad9c8] pt-8 md:grid-cols-3">
              <div>
                <h3 className="text-lg font-medium">จับคำที่ตรงกัน</h3>
                <p className="mt-2 text-sm leading-6 text-[#5c5a4e]">เหมาะกับ query ที่มีคำจากเนื้อเพลงตรง ๆ พร้อมให้น้ำหนักท่อนที่ติดกันเป๊ะ</p>
              </div>
              <div>
                <h3 className="text-lg font-medium">เข้าใจความหมาย</h3>
                <p className="mt-2 text-sm leading-6 text-[#5c5a4e]">ขยายคำอารมณ์เป็นกลุ่มความหมาย เพื่อหาเพลงที่ไม่ได้ใช้คำเดียวกับที่ค้น</p>
              </div>
              <div>
                <h3 className="text-lg font-medium">จำสิ่งที่คุณเลือก</h3>
                <p className="mt-2 text-sm leading-6 text-[#5c5a4e]">กดใช่หรือไม่ตรง เพื่อปรับอันดับผลลัพธ์ให้ดีขึ้นในครั้งถัดไป</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#dad9c8] py-6">
        <div className="container text-sm text-[#a8a696]">เพลงอะไรนะ — ค้นเพลงจากความทรงจำ ไม่ใช่จากชื่อ</div>
      </footer>
    </div>
  );
}
