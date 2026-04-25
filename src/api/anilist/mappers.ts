import type { Anime, AnimeSeason, AnimeStatus, RelationType, SeriesEntry } from '../../types'

// ── AniList raw shape (ANIME_FIELDS와 매칭) ────────────────────────────────────

type RawTitle = { english: string | null; romaji: string; native: string }
type RawCover = { large: string; extraLarge: string }
type RawStudios = { nodes: { name: string }[] }

export type RawMedia = {
  id: number
  title: RawTitle
  synonyms: string[] | null
  coverImage: RawCover
  bannerImage: string | null
  averageScore: number | null
  episodes: number | null
  status: AnimeStatus
  season: AnimeSeason | null
  seasonYear: number | null
  genres: string[]
  description: string | null
  studios: RawStudios
  popularity: number | null
  source: string | null
}

const HANGUL_RE = /[\uac00-\ud7af]/

/**
 * AniList synonyms에서 한국 출시명 추출.
 * 한자/일본어가 섞여 있어도 한글이 들어있으면 한국명으로 간주.
 * 여러 개면 가장 한글 비율 높은 것 (영문 부제 섞인 경우 회피).
 */
export function pickKoreanTitle(synonyms: string[] | null | undefined): string | null {
  if (!synonyms?.length) return null
  const hangulOnes = synonyms.filter((s) => HANGUL_RE.test(s))
  if (hangulOnes.length === 0) return null
  // 한글 글자 수 / 전체 글자 수가 높은 순 (영문 + 한글 짧게 섞인 거보다 순한글 우선)
  return hangulOnes
    .map((s) => ({ s, ratio: hangulRatio(s) }))
    .sort((a, b) => b.ratio - a.ratio)[0]!.s
}

function hangulRatio(s: string): number {
  let h = 0
  for (const ch of s) if (HANGUL_RE.test(ch)) h++
  return s.length === 0 ? 0 : h / s.length
}

/** AniList Media → 앱 내부 Anime 타입 변환. */
export function mapAnime(raw: RawMedia): Anime {
  // 한국 공식 출시명이 synonyms에 있으면 우선 사용 (Google 번역 거치지 않음)
  const koTitle = pickKoreanTitle(raw.synonyms)
  return {
    id: raw.id,
    title: koTitle ?? raw.title.english ?? raw.title.romaji,
    titleNative: raw.title.native,
    coverImage: raw.coverImage.extraLarge ?? raw.coverImage.large,
    bannerImage: raw.bannerImage ?? null,
    score: raw.averageScore ?? 0,
    episodes: raw.episodes ?? null,
    status: raw.status,
    season: raw.season ?? null,
    seasonYear: raw.seasonYear ?? null,
    genres: raw.genres ?? [],
    description: (raw.description ?? '').replace(/<[^>]*>/g, ''),
    studios: raw.studios.nodes.map((s) => s.name),
    popularity: raw.popularity ?? 0,
    source: raw.source ?? 'OTHER',
  }
}

// ── Series (relations) ────────────────────────────────────────────────────────

export type RawSeriesNode = {
  id: number
  type: 'ANIME' | 'MANGA'
  format: string | null
  episodes: number | null
  status: AnimeStatus | null
  season: AnimeSeason | null
  seasonYear: number | null
  averageScore: number | null
  title: RawTitle
  coverImage: RawCover
}

export function mapSeriesEntry(node: RawSeriesNode, relationType: RelationType): SeriesEntry {
  return {
    id: node.id,
    title: node.title.english ?? node.title.romaji,
    titleNative: node.title.native,
    coverImage: node.coverImage.extraLarge ?? node.coverImage.large,
    format: node.format,
    episodes: node.episodes ?? null,
    seasonYear: node.seasonYear ?? null,
    season: node.season ?? null,
    score: node.averageScore ?? 0,
    status: node.status ?? 'FINISHED',
    relationType,
  }
}
