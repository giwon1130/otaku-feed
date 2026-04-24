import type { Anime, AnimeSeason, AnimeStatus, RelationType, SeriesEntry } from '../../types'

// ── AniList raw shape (ANIME_FIELDS와 매칭) ────────────────────────────────────

type RawTitle = { english: string | null; romaji: string; native: string }
type RawCover = { large: string; extraLarge: string }
type RawStudios = { nodes: { name: string }[] }

export type RawMedia = {
  id: number
  title: RawTitle
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

/** AniList Media → 앱 내부 Anime 타입 변환. */
export function mapAnime(raw: RawMedia): Anime {
  return {
    id: raw.id,
    title: raw.title.english ?? raw.title.romaji,
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
