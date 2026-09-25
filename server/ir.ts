import { pipeline } from '@huggingface/transformers';
import { songs } from './songs';

type Song = (typeof songs)[number];
export type SearchMode = 'lyrics' | 'mood';
export type SearchSort = 'relevance' | 'title' | 'artist';
export type SearchResult = {
  songId: number;
  title: string;
  artist: string;
  genre: string;
  moodTag: string[];
  score: number;
  matchType: 'phrase' | 'keyword' | 'semantic';
  snippet: string;
  sourceUrl: string;
  youtubeUrl: string;
  spotifyUrl: string;
};

type SearchParams = {
  query: string;
  mode: SearchMode;
  feedback?: { songId: number; relevant: boolean }[];
  genre?: string;
  moods?: string[];
  sort?: SearchSort;
};

type EmbeddingExtractor = (text: string, options: { pooling: 'mean'; normalize: true }) => Promise<{ data: ArrayLike<number> }>;

const segmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter('th', { granularity: 'word' }) : null;
const stopWords = new Set(['เพลง', 'อยาก', 'ฟัง', 'ตอน', 'ที่', 'ของ', 'จาก', 'ช่วย', 'หา', 'หน่อย', 'อะไร', 'นะ', 'กับ', 'และ', 'ให้', 'ได้']);
const normalize = (value: string) => value.toLowerCase().replace(/[“”‘’]/g, '').replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, '').trim();

function tokenize(value: string) {
  const cleaned = value.toLowerCase().replace(/[^a-z0-9ก-๙]+/gi, ' ');
  const pieces = segmenter ? Array.from(segmenter.segment(cleaned), item => item.segment) : cleaned.split(/\s+/);
  return pieces.map(token => token.trim()).filter(token => token.length > 0 && /[a-z0-9ก-๙]/i.test(token));
}

const moodExpansion: Record<string, string[]> = {
  'เศร้า': ['เศร้า', 'อกหัก', 'เสียใจ', 'เหงา', 'คิดถึง', 'ร้องไห้', 'ฝน', 'ลืม'],
  'อกหัก': ['อกหัก', 'เศร้า', 'เสียใจ', 'เลิก', 'ทิ้ง', 'เจ็บ', 'ลืม'],
  'เหงา': ['เหงา', 'คิดถึง', 'เดียวดาย', 'คืน', 'ฝน', 'ไกล'],
  'คิดถึง': ['คิดถึง', 'เหงา', 'ความทรงจำ', 'วันเก่า', 'ไกล'],
  'รัก': ['รัก', 'โรแมนติก', 'อบอุ่น', 'หัวใจ', 'เธอ', 'คู่ชีวิต'],
  'โรแมนติก': ['รัก', 'โรแมนติก', 'อบอุ่น', 'หัวใจ', 'ฝัน'],
  'ให้กำลังใจ': ['ให้กำลังใจ', 'ความฝัน', 'สู้', 'เดินต่อ', 'หวัง', 'ไม่ยอมแพ้'],
  'มุ่งมั่น': ['มุ่งมั่น', 'ความฝัน', 'เดินต่อ', 'ฝ่าฟัน', 'สู้', 'พลัง'],
  'สนุก': ['สนุก', 'มีความสุข', 'มั่นใจ', 'แซ่บ', 'เต้น'],
  'ฝน': ['ฝน', 'คืน', 'เหงา', 'คิดถึง', 'เศร้า'],
};

const docTokens = new Map<number, string[]>();
const docFreq = new Map<string, number>();
const postings = new Map<string, Map<number, number[]>>();
const songById = new Map(songs.map(song => [song.song_id, song]));
const documentText = (song: Song) => `${song.title} ${song.artist} ${song.genre} ${song.mood_tag.join(' ')} ${song.lyrics}`;

function addPosting(token: string, songId: number, position: number) {
  if (!postings.has(token)) postings.set(token, new Map());
  const bySong = postings.get(token)!;
  if (!bySong.has(songId)) bySong.set(songId, []);
  bySong.get(songId)!.push(position);
}

for (const song of songs) {
  const tokens = tokenize(documentText(song));
  docTokens.set(song.song_id, tokens);
  const seen = new Set<string>();
  tokens.forEach((token, position) => { addPosting(token, song.song_id, position); seen.add(token); });
  seen.forEach(token => docFreq.set(token, (docFreq.get(token) ?? 0) + 1));
}

const idf = (token: string) => Math.log((songs.length + 1) / ((docFreq.get(token) ?? 0) + 1));
const vectorNorm = (vector: Map<string, number>) => Math.sqrt(Array.from(vector.values()).reduce((sum, value) => sum + value ** 2, 0));
const cosineVectors = (a: Map<string, number>, b: Map<string, number>) => {
  const denominator = vectorNorm(a) * vectorNorm(b);
  if (!denominator) return 0;
  let dot = 0;
  Array.from(a.entries()).forEach(([token, value]) => { dot += value * (b.get(token) ?? 0); });
  return dot / denominator;
};

function tfidfVector(tokens: string[]) {
  const vector = new Map<string, number>();
  tokens.forEach(token => vector.set(token, (vector.get(token) ?? 0) + 1));
  Array.from(vector.entries()).forEach(([token, count]) => vector.set(token, count * idf(token)));
  return vector;
}

function phraseHit(query: string, song: Song) {
  const phrase = normalize(query);
  return phrase.length >= 3 && normalize(documentText(song)).includes(phrase);
}

function snippet(song: Song, query: string, semantic: boolean) {
  const lyrics = song.lyrics.replace(/\s+/g, ' ').trim();
  const queryTokens = tokenize(query);
  const lowered = lyrics.toLowerCase();
  const firstToken = queryTokens.find(token => lowered.includes(token));
  const index = firstToken ? lowered.indexOf(firstToken) : 0;
  const start = Math.max(0, index - 54);
  const excerpt = lyrics.slice(start, start + 190);
  return `${start > 0 ? '…' : ''}${excerpt}${start + 190 < lyrics.length ? '…' : ''}` || (semantic ? 'พบเพลงจากอารมณ์และบริบทใกล้เคียง' : 'พบคำค้นในเพลง');
}

function semanticTokens(query: string) {
  const direct = tokenize(query).filter(token => !stopWords.has(token));
  const expanded = new Set(direct);
  for (const token of direct) (moodExpansion[token] ?? []).forEach(item => expanded.add(item));
  for (const [mood, words] of Object.entries(moodExpansion)) if (query.includes(mood)) words.forEach(item => expanded.add(item));
  return Array.from(expanded);
}

function moodScore(query: string, song: Song) {
  const queryTerms = semanticTokens(query);
  const tags = song.mood_tag.map(tag => tag.toLowerCase());
  const text = documentText(song).toLowerCase();
  let tagHits = 0;
  let textHits = 0;
  queryTerms.forEach(term => { if (tags.some(tag => tag.includes(term) || term.includes(tag))) tagHits += 1; if (text.includes(term)) textHits += 1; });
  const moodMention = Object.keys(moodExpansion).some(mood => query.includes(mood) && tags.includes(mood));
  return Math.min(1, tagHits * 0.16 + textHits * 0.035 + (moodMention ? 0.28 : 0));
}

let extractorPromise: Promise<EmbeddingExtractor | null> | null = null;
let embeddingStatus: 'not_loaded' | 'loading' | 'ready' | 'fallback' = 'not_loaded';
let documentEmbeddingsPromise: Promise<Map<number, number[]> | null> | null = null;

async function getExtractor() {
  if (!extractorPromise) {
    embeddingStatus = 'loading';
    extractorPromise = pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2', { dtype: 'q8' })
      .then(result => { embeddingStatus = 'ready'; return result as unknown as EmbeddingExtractor; })
      .catch(error => { console.warn('[IR] Embedding model unavailable; using deterministic fallback:', error); embeddingStatus = 'fallback'; return null; });
  }
  return extractorPromise;
}

function toVector(output: { data: ArrayLike<number> }) { return Array.from(output.data, Number); }
function cosineArrays(a: number[], b: number[]) { const dot = a.reduce((sum, value, index) => sum + value * (b[index] ?? 0), 0); const na = Math.sqrt(a.reduce((sum, value) => sum + value ** 2, 0)); const nb = Math.sqrt(b.reduce((sum, value) => sum + value ** 2, 0)); return na && nb ? dot / (na * nb) : 0; }

async function getDocumentEmbeddings() {
  if (!documentEmbeddingsPromise) {
    documentEmbeddingsPromise = (async () => {
      const extractor = await getExtractor();
      if (!extractor) return null;
      const vectors = new Map<number, number[]>();
      for (const song of songs) vectors.set(song.song_id, toVector(await extractor(documentText(song).slice(0, 2500), { pooling: 'mean', normalize: true })));
      return vectors;
    })();
  }
  return documentEmbeddingsPromise;
}

async function embeddingScores(query: string) {
  const extractor = await getExtractor();
  const documents = await getDocumentEmbeddings();
  if (!extractor || !documents) return null;
  const queryVector = toVector(await extractor(query, { pooling: 'mean', normalize: true }));
  return new Map(Array.from(documents.entries()).map(([songId, vector]) => [songId, cosineArrays(queryVector, vector)]));
}

function rocchioQuery(queryTokens: string[], feedback: SearchParams['feedback']) {
  const queryVector = tfidfVector(queryTokens);
  const relevant = (feedback ?? []).filter(item => item.relevant).map(item => tfidfVector(docTokens.get(item.songId) ?? []));
  const nonRelevant = (feedback ?? []).filter(item => !item.relevant).map(item => tfidfVector(docTokens.get(item.songId) ?? []));
  const result = new Map<string, number>();
  queryVector.forEach((value, token) => result.set(token, 1 * value));
  const addCentroid = (vectors: Map<string, number>[], coefficient: number) => vectors.forEach(vector => vector.forEach((value, token) => result.set(token, (result.get(token) ?? 0) + coefficient * value / Math.max(1, vectors.length))));
  addCentroid(relevant, 0.75);
  addCentroid(nonRelevant, -0.15);
  return result;
}

function songUrl(base: string, song: Song) { return `${base}${encodeURIComponent(`${song.title} ${song.artist}`)}`; }
function passesFilter(song: Song, genre?: string, moods: string[] = []) { return (!genre || song.genre === genre) && (!moods.length || moods.every(mood => (song.mood_tag as unknown as readonly string[]).includes(mood))); }

export async function searchSongs({ query, mode, feedback = [], genre, moods = [], sort = 'relevance' }: SearchParams): Promise<SearchResult[]> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return [];
  const queryTokens = tokenize(cleanQuery).filter(token => !stopWords.has(token));
  const rocchioVector = rocchioQuery(queryTokens, feedback);
  const semanticScores = mode === 'mood' ? await embeddingScores(cleanQuery) : null;
  const results = songs.filter(song => passesFilter(song, genre, moods)).map(song => {
    const phrase = phraseHit(cleanQuery, song);
    const keywordScore = cosineVectors(rocchioVector, tfidfVector(docTokens.get(song.song_id) ?? []));
    const fallbackSemantic = moodScore(cleanQuery, song);
    const semantic = semanticScores?.get(song.song_id) ?? fallbackSemantic;
    const score = mode === 'lyrics' ? keywordScore * 0.72 + (phrase ? 0.34 : 0) : semantic * 0.9 + keywordScore * 0.1;
    return { song, score: Math.max(0, Math.min(1, score)), phrase };
  }).filter(result => result.score > 0.015);
  results.sort((a, b) => sort === 'title' ? a.song.title.localeCompare(b.song.title, 'th') : sort === 'artist' ? a.song.artist.localeCompare(b.song.artist, 'th') : b.score - a.score);
  return results.slice(0, 8).map(({ song, score, phrase }) => ({
    songId: song.song_id, title: song.title, artist: song.artist, genre: song.genre, moodTag: [...song.mood_tag], score: Number(score.toFixed(3)), matchType: mode === 'lyrics' ? (phrase ? 'phrase' : 'keyword') : 'semantic', snippet: snippet(song, cleanQuery, mode === 'mood'), sourceUrl: song.source_url, youtubeUrl: songUrl('https://www.youtube.com/results?search_query=', song), spotifyUrl: songUrl('https://open.spotify.com/search/', song),
  }));
}

const evalQueries = [
  { query: 'ทิ้งไว้กลางทาง', mode: 'lyrics' as const, relevant: [13] }, { query: 'แสงนำทางไม่ยอมแพ้', mode: 'lyrics' as const, relevant: [3] }, { query: 'เพลงเศร้าตอนฝนตกคิดถึงแฟนเก่า', mode: 'mood' as const, relevant: [7, 8, 9, 10, 11, 14, 26] }, { query: 'อยากได้เพลงรักอบอุ่นโรแมนติก', mode: 'mood' as const, relevant: [5, 6, 16, 17, 18, 19, 20, 21] }, { query: 'เพลงฮึกเหิมสำหรับเริ่มต้นใหม่', mode: 'mood' as const, relevant: [2, 3, 4, 22] },
  { query: 'ความฝันและการเดินต่อ', mode: 'lyrics' as const, relevant: [2, 3, 4] }, { query: 'เพลงให้กำลังใจเวลาท้อ', mode: 'mood' as const, relevant: [2, 3, 4, 22] }, { query: 'รักที่จบแต่ยังจำ', mode: 'lyrics' as const, relevant: [1, 7, 9, 13] }, { query: 'เพลงสนุกเต้นได้', mode: 'mood' as const, relevant: [23, 24, 25] }, { query: 'คิดถึงคนไกล', mode: 'mood' as const, relevant: [8, 9, 14] },
  { query: 'เธอไม่รักกัน', mode: 'lyrics' as const, relevant: [19, 21] }, { query: 'เพลงรักคู่ชีวิต', mode: 'lyrics' as const, relevant: [18, 20, 21] }, { query: 'คืนฝนตกเหงา', mode: 'mood' as const, relevant: [7, 8, 10] }, { query: 'เริ่มต้นใหม่ไม่ยอมแพ้', mode: 'mood' as const, relevant: [2, 3, 4] }, { query: 'หัวใจและความทรงจำ', mode: 'lyrics' as const, relevant: [1, 8, 13] },
  { query: 'ไม่อยากลืมเธอ', mode: 'lyrics' as const, relevant: [7, 8, 14] }, { query: 'เพลงอบอุ่นฟังสบาย', mode: 'mood' as const, relevant: [5, 16, 18, 20] }, { query: 'ความรักทำให้เจ็บ', mode: 'lyrics' as const, relevant: [1, 7, 19] }, { query: 'เพลงพลังใจตอนทำงาน', mode: 'mood' as const, relevant: [2, 3, 4] }, { query: 'ฝันไกลและความหวัง', mode: 'lyrics' as const, relevant: [2, 3, 4, 22] },
];

function metricAtK(found: number[], relevant: number[], k: number) { const top = found.slice(0, k); const hits = top.filter(id => relevant.includes(id)).length; return { precision: hits / k, recall: hits / Math.max(1, relevant.length) }; }
function averagePrecision(found: number[], relevant: number[]) { let hits = 0; let sum = 0; found.forEach((id, index) => { if (relevant.includes(id)) { hits += 1; sum += hits / (index + 1); } }); return relevant.length ? sum / relevant.length : 0; }

export async function evaluateSearch() {
  const rows = [] as Array<{ query: string; mode: SearchMode; precision: number; recall: number; f1: number; averagePrecision: number; pAt1: number; pAt3: number; pAt5: number; topSong: string }>;
  for (const item of evalQueries) {
    const top = await searchSongs({ query: item.query, mode: item.mode });
    const found = top.map(result => result.songId);
    const { precision, recall } = metricAtK(found, item.relevant, 5);
    rows.push({ query: item.query, mode: item.mode, precision: Number(precision.toFixed(2)), recall: Number(recall.toFixed(2)), f1: Number((precision + recall ? 2 * precision * recall / (precision + recall) : 0).toFixed(2)), averagePrecision: Number(averagePrecision(found, item.relevant).toFixed(2)), pAt1: Number(metricAtK(found, item.relevant, 1).precision.toFixed(2)), pAt3: Number(metricAtK(found, item.relevant, 3).precision.toFixed(2)), pAt5: Number(metricAtK(found, item.relevant, 5).precision.toFixed(2)), topSong: top[0]?.title ?? 'ไม่พบผลลัพธ์' });
  }
  const average = (key: keyof typeof rows[number], mode?: SearchMode) => { const values = rows.filter(row => !mode || row.mode === mode).map(row => Number(row[key])); return Number((values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length)).toFixed(2)); };
  return { rows, summary: { keyword: { precision: average('precision', 'lyrics'), recall: average('recall', 'lyrics'), f1: average('f1', 'lyrics'), map: average('averagePrecision', 'lyrics') }, semantic: { precision: average('precision', 'mood'), recall: average('recall', 'mood'), f1: average('f1', 'mood'), map: average('averagePrecision', 'mood') } }, curve: { keyword: [1, 3, 5].map(k => ({ k, precision: average(`pAt${k}` as 'pAt1', 'lyrics') })), semantic: [1, 3, 5].map(k => ({ k, precision: average(`pAt${k}` as 'pAt1', 'mood') })) }, indexStats: { documents: songs.length, vocabulary: docFreq.size, postings: Array.from(postings.values()).reduce((sum, map) => sum + map.size, 0), phraseQueries: 1, embeddingModel: embeddingStatus === 'ready' ? 'multilingual MiniLM' : embeddingStatus === 'fallback' ? 'fallback mood scorer' : 'lazy-loaded multilingual MiniLM' } };
}

export function getSuggestions(prefix: string, limit = 8) { const clean = prefix.trim().toLowerCase(); if (!clean) return []; return Array.from(docFreq.keys()).filter(token => token.startsWith(clean)).sort((a, b) => (docFreq.get(b) ?? 0) - (docFreq.get(a) ?? 0)).slice(0, limit); }
export function getFacets() { return { genres: Array.from(new Set(songs.map(song => song.genre))).sort(), moods: Array.from(new Set(songs.flatMap(song => song.mood_tag))).sort() }; }
export function getFeaturedSongs() { return songs.slice(0, 6).map(song => ({ songId: song.song_id, title: song.title, artist: song.artist, genre: song.genre, moodTag: [...song.mood_tag] })); }
