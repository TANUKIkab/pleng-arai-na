import { describe, expect, it } from 'vitest';
import { evaluateSearch, getSuggestions, searchSongs } from './ir';

describe('song IR search', () => {
  it('returns a phrase match for an exact lyric fragment', async () => {
    const results = await searchSongs({ query: 'ทิ้งไว้กลางทาง', mode: 'lyrics' });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.songId).toBe(13);
    expect(results[0]?.matchType).toBe('phrase');
  });

  it('returns mood-oriented songs with semantic retrieval or fallback', async () => {
    const results = await searchSongs({ query: 'เพลงเศร้าตอนฝนตกคิดถึงแฟนเก่า', mode: 'mood' });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.matchType).toBe('semantic');
    expect(results.some(result => result.moodTag.includes('เศร้า') || result.moodTag.includes('เหงา'))).toBe(true);
  }, 20000);

  it('uses Rocchio feedback to change the next ranking', async () => {
    const before = await searchSongs({ query: 'เพลงรักอบอุ่นโรแมนติก', mode: 'mood' });
    const boosted = await searchSongs({ query: 'เพลงรักอบอุ่นโรแมนติก', mode: 'mood', feedback: [{ songId: 5, relevant: true }] });
    expect(boosted.map(result => result.songId)).not.toEqual(before.map(result => result.songId));
  });

  it('provides autocomplete suggestions from the inverted index', () => {
    expect(getSuggestions('ความ').length).toBeGreaterThan(0);
  });

  it('produces MAP, P@k curve and 20 evaluation rows', async () => {
    const report = await evaluateSearch();
    expect(report.rows).toHaveLength(20);
    expect(report.summary.keyword.map).toBeGreaterThanOrEqual(0);
    expect(report.summary.semantic.recall).toBeGreaterThanOrEqual(0);
    expect(report.curve.keyword).toHaveLength(3);
    expect(report.indexStats.documents).toBe(30);
  });
});
