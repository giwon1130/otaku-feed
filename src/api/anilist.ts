import type { Anime, AnimeSeason, ExternalLink, RankingSort } from '../types'

const ENDPOINT = 'https://graphql.anilist.co'

const ANIME_FIELDS = `
  id
  title { english romaji native }
  coverImage { large extraLarge }
  bannerImage
  averageScore
  episodes
  status
  season
  seasonYear
  genres
  description(asHtml: false)
  studios(isMain: true) { nodes { name } }
  popularity
  source
`

async function query<T>(q: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: q, variables }),
  })
  const json = await res.json() as { data: T; errors?: unknown[] }
  if (json.errors) console.warn('[AniList]', json.errors)
  return json.data
}

function mapAnime(raw: Record<string, unknown>): Anime {
  const title = raw.title as { english: string | null; romaji: string; native: string }
  const cover = raw.coverImage as { large: string; extraLarge: string }
  const studios = raw.studios as { nodes: { name: string }[] }
  return {
    id: raw.id as number,
    title: title.english ?? title.romaji,
    titleNative: title.native,
    coverImage: cover.extraLarge ?? cover.large,
    bannerImage: (raw.bannerImage as string | null) ?? null,
    score: (raw.averageScore as number) ?? 0,
    episodes: (raw.episodes as number | null) ?? null,
    status: raw.status as Anime['status'],
    season: (raw.season as AnimeSeason | null) ?? null,
    seasonYear: (raw.seasonYear as number | null) ?? null,
    genres: (raw.genres as string[]) ?? [],
    description: ((raw.description as string) ?? '').replace(/<[^>]*>/g, '').slice(0, 400),
    studios: studios.nodes.map((s) => s.name),
    popularity: (raw.popularity as number) ?? 0,
    source: (raw.source as string) ?? 'OTHER',
  }
}

// ── 트렌딩 / 랭킹 ──────────────────────────────────────────────────────────

export async function fetchTrending(page = 1, perPage = 20): Promise<Anime[]> {
  const data = await query<{ Page: { media: Record<string, unknown>[] } }>(`
    query($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, sort: TRENDING_DESC, status_not: NOT_YET_RELEASED) {
          ${ANIME_FIELDS}
        }
      }
    }
  `, { page, perPage })
  return data.Page.media.map(mapAnime)
}

export async function fetchRanking(sort: RankingSort, page = 1, perPage = 20): Promise<Anime[]> {
  const sortField =
    sort === 'SCORE' ? 'SCORE_DESC' :
    sort === 'POPULARITY' ? 'POPULARITY_DESC' : 'TRENDING_DESC'

  const data = await query<{ Page: { media: Record<string, unknown>[] } }>(`
    query($page: Int, $perPage: Int, $sort: [MediaSort]) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, sort: $sort) {
          ${ANIME_FIELDS}
        }
      }
    }
  `, { page, perPage, sort: [sortField] })
  return data.Page.media.map(mapAnime)
}

// ── 장르 기반 ─────────────────────────────────────────────────────────────

export async function fetchByGenres(genres: string[], page = 1, perPage = 20): Promise<Anime[]> {
  const data = await query<{ Page: { media: Record<string, unknown>[] } }>(`
    query($page: Int, $perPage: Int, $genres: [String]) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, sort: POPULARITY_DESC, genre_in: $genres) {
          ${ANIME_FIELDS}
        }
      }
    }
  `, { page, perPage, genres })
  return data.Page.media.map(mapAnime)
}

// ── 시즌 신작 ─────────────────────────────────────────────────────────────

export async function fetchCurrentSeason(page = 1, perPage = 20): Promise<Anime[]> {
  const now = new Date()
  const month = now.getMonth() + 1
  const season: AnimeSeason =
    month <= 3 ? 'WINTER' : month <= 6 ? 'SPRING' : month <= 9 ? 'SUMMER' : 'FALL'
  const year = now.getFullYear()

  const data = await query<{ Page: { media: Record<string, unknown>[] } }>(`
    query($page: Int, $perPage: Int, $season: MediaSeason, $year: Int) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, season: $season, seasonYear: $year, sort: POPULARITY_DESC) {
          ${ANIME_FIELDS}
        }
      }
    }
  `, { page, perPage, season, year })
  return data.Page.media.map(mapAnime)
}

// ── 단일 조회 ─────────────────────────────────────────────────────────────

export async function fetchAnimeById(id: number): Promise<Anime | null> {
  const data = await query<{ Media: Record<string, unknown> | null }>(`
    query($id: Int) {
      Media(id: $id, type: ANIME) {
        ${ANIME_FIELDS}
      }
    }
  `, { id })
  return data.Media ? mapAnime(data.Media) : null
}

// ── 스트리밍 링크 ──────────────────────────────────────────────────────────

// 한국에서 시청 가능한 글로벌 플랫폼
const KOREA_GLOBAL_PLATFORMS = new Set([
  'Netflix', 'Disney+', 'YouTube', 'Laftel', 'Wavve', 'Watcha',
  'Naver Series On', 'KakaoTV', 'Seezn', 'Tving',
])

export async function fetchAnimeLinks(id: number): Promise<ExternalLink[]> {
  const data = await query<{ Media: { externalLinks: (ExternalLink & { language: string | null })[] } | null }>(`
    query($id: Int) {
      Media(id: $id, type: ANIME) {
        externalLinks { url site type color language }
      }
    }
  `, { id })
  return (data.Media?.externalLinks ?? []).filter((l) =>
    l.type === 'STREAMING' &&
    (l.language === 'Korean' || KOREA_GLOBAL_PLATFORMS.has(l.site))
  )
}

// ── 검색 ─────────────────────────────────────────────────────────────────

// 한글 검색어 감지 → AniList는 영어/일본어/로마자만 잘 작동.
const HANGUL_RE = /[\uac00-\ud7af]/

async function translateKoToEn(text: string): Promise<string | null> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl=en&dt=t&q=${encodeURIComponent(text)}`
    const res = await fetch(url)
    const json = await res.json() as unknown[][]
    const translated = (json[0] as unknown[][])
      .map((chunk) => (chunk[0] as string) ?? '')
      .join('')
      .trim()
    return translated || null
  } catch {
    return null
  }
}

export async function searchAnime(keyword: string, page = 1, perPage = 20): Promise<Anime[]> {
  const trimmed = keyword.trim()

  // 한글이면 영어로 변환해서 한 번 더 검색 (한글 결과 + 영어 결과 머지)
  let englishKeyword: string | null = null
  if (HANGUL_RE.test(trimmed)) {
    englishKeyword = await translateKoToEn(trimmed)
  }

  const runQuery = async (search: string) => {
    const data = await query<{ Page: { media: Record<string, unknown>[] } }>(`
      query($page: Int, $perPage: Int, $search: String) {
        Page(page: $page, perPage: $perPage) {
          media(type: ANIME, search: $search, sort: POPULARITY_DESC) {
            ${ANIME_FIELDS}
          }
        }
      }
    `, { page, perPage, search })
    return data.Page.media.map(mapAnime)
  }

  const primary = await runQuery(trimmed)
  if (!englishKeyword || englishKeyword.toLowerCase() === trimmed.toLowerCase()) {
    return primary
  }

  // 한글 검색은 보통 0건 → 영어 변환 결과를 메인으로 사용
  const fallback = await runQuery(englishKeyword)
  // 둘 머지 + 중복 제거
  const seen = new Set<number>()
  return [...primary, ...fallback].filter((a) => {
    if (seen.has(a.id)) return false
    seen.add(a.id)
    return true
  })
}

// ── 추천 / 관련 ──────────────────────────────────────────────────────────────

/**
 * AniList의 recommendations: 사용자 평가가 높은 비슷한 작품들.
 * 디테일 모달 "비슷한 작품" 섹션에 표시.
 */
export async function fetchRecommendations(id: number, perPage = 8): Promise<Anime[]> {
  const data = await query<{ Media: { recommendations: { nodes: { mediaRecommendation: Record<string, unknown> | null }[] } } | null }>(`
    query($id: Int, $perPage: Int) {
      Media(id: $id, type: ANIME) {
        recommendations(sort: RATING_DESC, perPage: $perPage) {
          nodes {
            mediaRecommendation {
              ${ANIME_FIELDS}
            }
          }
        }
      }
    }
  `, { id, perPage })
  const nodes = data.Media?.recommendations?.nodes ?? []
  return nodes
    .map((n) => n.mediaRecommendation)
    .filter((m): m is Record<string, unknown> => !!m)
    .map(mapAnime)
}
