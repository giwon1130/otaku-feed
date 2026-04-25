import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { mapAnime, mapSeriesEntry, pickKoreanTitle, type RawMedia, type RawSeriesNode } from './mappers.ts'

const baseRaw: RawMedia = {
  id: 1,
  title: { english: 'Frieren', romaji: 'Sousou no Frieren', native: '葬送のフリーレン' },
  synonyms: null,
  coverImage: { large: 'https://x/large.jpg', extraLarge: 'https://x/xl.jpg' },
  bannerImage: 'https://x/banner.jpg',
  averageScore: 91,
  episodes: 28,
  status: 'FINISHED',
  season: 'FALL',
  seasonYear: 2023,
  genres: ['Adventure', 'Drama', 'Fantasy'],
  description: '<p>A long journey <i>begins</i>.</p>',
  studios: { nodes: [{ name: 'Madhouse' }] },
  popularity: 5000,
  source: 'MANGA',
}

test('mapAnime: 기본 필드 매핑', () => {
  const a = mapAnime(baseRaw)
  assert.equal(a.id, 1)
  assert.equal(a.title, 'Frieren')
  assert.equal(a.titleNative, '葬送のフリーレン')
  assert.equal(a.score, 91)
  assert.equal(a.episodes, 28)
  assert.equal(a.season, 'FALL')
  assert.equal(a.seasonYear, 2023)
  assert.deepEqual(a.studios, ['Madhouse'])
})

test('mapAnime: 영어 제목 없으면 romaji로 폴백', () => {
  const a = mapAnime({ ...baseRaw, title: { ...baseRaw.title, english: null } })
  assert.equal(a.title, 'Sousou no Frieren')
})

test('mapAnime: extraLarge 우선 사용, 없으면 large', () => {
  const a = mapAnime(baseRaw)
  assert.equal(a.coverImage, 'https://x/xl.jpg')
})

test('mapAnime: description의 HTML 태그 제거', () => {
  const a = mapAnime(baseRaw)
  assert.equal(a.description, 'A long journey begins.')
})

test('mapAnime: averageScore null이면 0', () => {
  const a = mapAnime({ ...baseRaw, averageScore: null })
  assert.equal(a.score, 0)
})

test('mapAnime: source null이면 OTHER', () => {
  const a = mapAnime({ ...baseRaw, source: null })
  assert.equal(a.source, 'OTHER')
})

test('mapAnime: synonyms에 한국 출시명 있으면 title로 사용 (영어 무시)', () => {
  const a = mapAnime({ ...baseRaw, synonyms: ['장송의 프리렌', 'Frieren: Beyond Journey\'s End'] })
  assert.equal(a.title, '장송의 프리렌')
})

test('mapAnime: synonyms에 한국명 없으면 영어 fallback', () => {
  const a = mapAnime({ ...baseRaw, synonyms: ['Frieren: Beyond Journey\'s End', '葬送のフリーレン'] })
  assert.equal(a.title, 'Frieren')
})

test('pickKoreanTitle: 여러 한글 후보 중 한글 비율 높은 것', () => {
  // 둘 다 한글 들어있지만 두 번째가 더 순한글
  const result = pickKoreanTitle(['Frieren 프리렌', '장송의 프리렌'])
  assert.equal(result, '장송의 프리렌')
})

test('pickKoreanTitle: synonyms 비어있으면 null', () => {
  assert.equal(pickKoreanTitle(null), null)
  assert.equal(pickKoreanTitle([]), null)
  assert.equal(pickKoreanTitle(['Frieren', '葬送のフリーレン']), null)
})

test('mapSeriesEntry: relationType 보존', () => {
  const node: RawSeriesNode = {
    id: 99,
    type: 'ANIME',
    format: 'TV',
    episodes: 12,
    status: 'RELEASING',
    season: 'SPRING',
    seasonYear: 2025,
    averageScore: 80,
    title: { english: 'Sequel', romaji: 'Sequel', native: '続編' },
    coverImage: { large: 'l', extraLarge: 'xl' },
  }
  const e = mapSeriesEntry(node, 'SEQUEL')
  assert.equal(e.relationType, 'SEQUEL')
  assert.equal(e.id, 99)
  assert.equal(e.title, 'Sequel')
  assert.equal(e.coverImage, 'xl')
})

test('mapSeriesEntry: status null이면 FINISHED 폴백', () => {
  const node: RawSeriesNode = {
    id: 1, type: 'ANIME', format: null, episodes: null,
    status: null, season: null, seasonYear: null, averageScore: null,
    title: { english: 'X', romaji: 'X', native: 'X' },
    coverImage: { large: '', extraLarge: '' },
  }
  const e = mapSeriesEntry(node, 'OTHER')
  assert.equal(e.status, 'FINISHED')
})
