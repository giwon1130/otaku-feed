import type { Anime, AnimeSeason, AnimeStatus, ExternalLink, RankingSort, RelationType, SeriesEntry } from '../types'
import { findBestLaftelMatch, laftelItemUrl, searchLaftel } from './laftel'

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
    description: ((raw.description as string) ?? '').replace(/<[^>]*>/g, ''),
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

// ── 취향 분석 (온보딩 카드) ────────────────────────────────────────────────────

/**
 * 첫 온보딩의 "취향 분석" 단계용 후보.
 * - genres가 비면 글로벌 인기작
 * - 있으면 해당 장르 + 최근(2010+) 평점 높은 작품
 * - 너무 매니악하지 않게 minimumScore=70 + 인기도도 고려
 *
 * 사용자가 좋아요 표시한 항목은 일반 SwipeRecord(result='like')로 저장 → 추천에 직접 활용.
 */
export async function fetchTasteCandidates(
  genres: string[],
  perPage = 24,
): Promise<Anime[]> {
  // 장르 in이 있을 땐 sort=POPULARITY_DESC + minimumScore=70
  // 없을 땐 SCORE_DESC 풀에서 추리되, 너무 옛날 거 빼려고 startDate_greater
  if (genres.length > 0) {
    const data = await query<{ Page: { media: Record<string, unknown>[] } }>(`
      query($perPage: Int, $genres: [String]) {
        Page(page: 1, perPage: $perPage) {
          media(
            type: ANIME,
            genre_in: $genres,
            sort: POPULARITY_DESC,
            averageScore_greater: 70,
            startDate_greater: 20100000
          ) {
            ${ANIME_FIELDS}
          }
        }
      }
    `, { perPage, genres })
    return data.Page.media.map(mapAnime)
  }

  const data = await query<{ Page: { media: Record<string, unknown>[] } }>(`
    query($perPage: Int) {
      Page(page: 1, perPage: $perPage) {
        media(
          type: ANIME,
          sort: SCORE_DESC,
          averageScore_greater: 75,
          startDate_greater: 20100000
        ) {
          ${ANIME_FIELDS}
        }
      }
    }
  `, { perPage })
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

// AniList externalLinks에서 한국 카탈로그가 있을 가능성이 있는 글로벌 플랫폼.
// (Netflix/Disney+ 등은 글로벌 라이선스라 한국에 있을 수도, 없을 수도 있음 → "글로벌 카탈로그" 경고 표시)
const KOREA_GLOBAL_PLATFORMS = new Set([
  'Netflix', 'Disney+', 'YouTube', 'Laftel', 'Wavve', 'Watcha',
  'Naver Series On', 'KakaoTV', 'Seezn', 'Tving',
])

// 라프텔 매칭에서 정말 한국 전용으로 봐도 되는 사이트들 (regional=true 우선 표시)
const REGIONAL_KR_SITES = new Set([
  'Laftel', 'Wavve', 'Watcha', 'Naver Series On', 'KakaoTV', 'Seezn', 'Tving',
])

async function translateEnToKo(text: string): Promise<string | null> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&q=${encodeURIComponent(text)}`
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

/**
 * 한국에서 실제로 시청 가능한 외부 링크.
 * - 라프텔(라이선스 정확) 결과를 우선 검색해서 prepend
 * - AniList의 글로벌 STREAMING 링크 중 KR 후보만 합치기
 *
 * @param anime 정확한 매칭을 위해 제목들이 필요해서 Anime 객체 전체를 받음
 */
export async function fetchAnimeLinks(anime: {
  id: number
  title: string
  titleNative: string
}): Promise<ExternalLink[]> {
  // 1) 라프텔 검색용 한국어 키워드 후보 만들기
  const candidates: string[] = []
  if (anime.title) candidates.push(anime.title)
  if (anime.titleNative) candidates.push(anime.titleNative)
  const koTitle = await translateEnToKo(anime.title)
  if (koTitle) candidates.push(koTitle)

  // 2) 라프텔 검색은 한국어 키워드로만 의미 있음
  const laftelKeyword = koTitle ?? anime.title
  const [laftelItems, anilistData] = await Promise.all([
    searchLaftel(laftelKeyword),
    query<{ Media: { externalLinks: (ExternalLink & { language: string | null })[] } | null }>(`
      query($id: Int) {
        Media(id: $id, type: ANIME) {
          externalLinks { url site type color language }
        }
      }
    `, { id: anime.id }),
  ])

  const result: ExternalLink[] = []

  // 3) 라프텔 결과 prepend (가장 정확한 KR 카탈로그)
  const laftelMatch = findBestLaftelMatch(candidates, laftelItems)
  if (laftelMatch) {
    result.push({
      url: laftelItemUrl(laftelMatch.id),
      site: 'Laftel',
      type: 'STREAMING',
      color: '#7C3AED',
      regional: true,
    })
  }

  // 4) AniList 외부 링크에서 KR 후보 선별
  const seenSites = new Set<string>(result.map((r) => r.site))
  const anilistLinks = (anilistData.Media?.externalLinks ?? [])
    .filter((l) =>
      l.type === 'STREAMING' &&
      (l.language === 'Korean' || KOREA_GLOBAL_PLATFORMS.has(l.site))
    )
    .filter((l) => !seenSites.has(l.site)) // 라프텔 중복 방지
    .map<ExternalLink>((l) => ({
      url: l.url,
      site: l.site,
      type: l.type,
      color: l.color,
      regional: l.language === 'Korean' || REGIONAL_KR_SITES.has(l.site),
    }))

  result.push(...anilistLinks)

  return result
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

// ── 시리즈 (보는 순서) ─────────────────────────────────────────────────────────

// 시리즈 보는 순서에서 의미 있는 관계 — 사용자 요청으로 ADAPTATION/SOURCE/OTHER 외 전부 표시.
const SERIES_RELATION_TYPES: ReadonlySet<RelationType> = new Set([
  'PREQUEL', 'SEQUEL', 'PARENT', 'SIDE_STORY',
  'SPIN_OFF', 'ALTERNATIVE', 'SUMMARY',
])

// 포맷 블랙리스트 비움 — 전체를 다 보고 싶다는 요청에 따라 MUSIC 등도 노출.
const SERIES_FORMAT_BLACKLIST: ReadonlySet<string> = new Set()

/**
 * AniList relations: 같은 시리즈의 전작/속편/외전 등.
 * 디테일 모달 "시리즈 보는 순서" 섹션에 표시.
 *
 * 정렬: 시즌 연도 ASC → 같은 해면 전작이 먼저 (PREQUEL > PARENT > SIDE_STORY > SEQUEL)
 */
export async function fetchAnimeRelations(id: number): Promise<SeriesEntry[]> {
  const data = await query<{
    Media: {
      relations: {
        edges: {
          relationType: RelationType
          node: Record<string, unknown> | null
        }[]
      }
    } | null
  }>(`
    query($id: Int) {
      Media(id: $id, type: ANIME) {
        relations {
          edges {
            relationType(version: 2)
            node {
              id
              type
              format
              episodes
              status
              season
              seasonYear
              averageScore
              title { english romaji native }
              coverImage { large extraLarge }
            }
          }
        }
      }
    }
  `, { id })

  const edges = data.Media?.relations?.edges ?? []

  const entries: SeriesEntry[] = []
  for (const edge of edges) {
    if (!edge.node) continue
    if (edge.node.type !== 'ANIME') continue
    if (!SERIES_RELATION_TYPES.has(edge.relationType)) continue
    const format = edge.node.format as string | null
    if (format && SERIES_FORMAT_BLACKLIST.has(format)) continue

    const title = edge.node.title as { english: string | null; romaji: string; native: string }
    const cover = edge.node.coverImage as { large: string; extraLarge: string }
    entries.push({
      id: edge.node.id as number,
      title: title.english ?? title.romaji,
      titleNative: title.native,
      coverImage: cover.extraLarge ?? cover.large,
      format,
      episodes: (edge.node.episodes as number | null) ?? null,
      seasonYear: (edge.node.seasonYear as number | null) ?? null,
      season: (edge.node.season as AnimeSeason | null) ?? null,
      score: (edge.node.averageScore as number) ?? 0,
      status: (edge.node.status as AnimeStatus) ?? 'FINISHED',
      relationType: edge.relationType,
    })
  }

  // 같은 시리즈 안에서 같은 ID가 두 번 나오는 경우 방지 (예: PARENT+PREQUEL)
  const seen = new Set<number>()
  const deduped = entries.filter((e) => {
    if (seen.has(e.id)) return false
    seen.add(e.id)
    return true
  })

  // 정렬: 연도 ASC, 그 다음 관계 우선순위
  const RELATION_ORDER: Record<RelationType, number> = {
    PARENT: 0, PREQUEL: 1, SIDE_STORY: 2, SEQUEL: 3,
    SPIN_OFF: 4, ALTERNATIVE: 5, SUMMARY: 6, ADAPTATION: 7, SOURCE: 8, OTHER: 9,
  }
  return deduped.sort((a, b) => {
    const ya = a.seasonYear ?? 9999
    const yb = b.seasonYear ?? 9999
    if (ya !== yb) return ya - yb
    return RELATION_ORDER[a.relationType] - RELATION_ORDER[b.relationType]
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
