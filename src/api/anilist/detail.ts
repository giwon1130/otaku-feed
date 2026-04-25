import type { Anime, ExternalLink, RelationType, SeriesEntry } from '../../types'
import { findBestLaftelMatch, laftelItemUrl, searchLaftel } from '../laftel'
import { GROUP_ORDER, seriesGroupKey } from '../../utils/seriesGroup'
import { query } from './client'
import { ANIME_FIELDS } from './fragments'
import { mapAnime, mapSeriesEntry, type RawMedia, type RawSeriesNode } from './mappers'

// ── 단일 조회 ─────────────────────────────────────────────────────────────

// 경량 LRU(시간 기반 만료) — MyListTab/HomeTab/Detail 모달이 같은 ID를 반복 조회.
// AniList 레이트리밋 회피 + 모달 재진입 시 즉시 enriched 표시.
type CacheEntry = { value: Anime | null; expiresAt: number }
const ANIME_CACHE = new Map<number, CacheEntry>()
const CACHE_TTL_MS = 5 * 60 * 1000        // 5분 — fresh 데이터와 절충
const CACHE_MAX = 200                     // 메모리 보호 캡

function setCache(id: number, value: Anime | null) {
  if (ANIME_CACHE.size >= CACHE_MAX) {
    // 가장 먼저 들어간 것부터 제거 (Map은 insertion order 유지)
    const first = ANIME_CACHE.keys().next().value
    if (first !== undefined) ANIME_CACHE.delete(first)
  }
  ANIME_CACHE.set(id, { value, expiresAt: Date.now() + CACHE_TTL_MS })
}

export async function fetchAnimeById(id: number): Promise<Anime | null> {
  const cached = ANIME_CACHE.get(id)
  if (cached && cached.expiresAt > Date.now()) return cached.value

  const data = await query<{ Media: RawMedia | null }>(`
    query($id: Int) {
      Media(id: $id, type: ANIME) {
        ${ANIME_FIELDS}
      }
    }
  `, { id })
  const result = data.Media ? mapAnime(data.Media) : null
  setCache(id, result)
  return result
}

/** 테스트/로그아웃/수동 새로고침에서 사용. */
export function clearAnimeCache(): void {
  ANIME_CACHE.clear()
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
 * 라프텔에서 매칭되는 한국 출시명을 가져옴.
 * AniList synonyms에도 한국어가 없는 작품용 보강.
 * 입력 title이 이미 한국어면 그대로 사용 (라프텔 호출 스킵).
 */
const HANGUL_RE = /[가-힯]/
export async function fetchLaftelKoreanName(anime: {
  title: string
  titleNative: string
}): Promise<string | null> {
  // 이미 한국어면 라프텔 호출 안 함
  if (HANGUL_RE.test(anime.title)) return null

  const koTitle = await translateEnToKo(anime.title)
  const keyword = koTitle ?? anime.title
  const items = await searchLaftel(keyword)
  const candidates = [anime.title, anime.titleNative, koTitle].filter((s): s is string => !!s)
  const match = findBestLaftelMatch(candidates, items)
  if (!match) return null

  // 라프텔 name은 "(자막) 장송의 프리렌" 같은 prefix가 붙어 있을 수 있음 → 정리
  return match.name.replace(/^\([^)]*\)\s*/, '').trim() || null
}

/**
 * 한국에서 실제로 시청 가능한 외부 링크.
 * - 라프텔(라이선스 정확) 결과를 우선 검색해서 prepend
 * - AniList의 글로벌 STREAMING 링크 중 KR 후보만 합치기
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
    .filter((l) => !seenSites.has(l.site))
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

// ── 시리즈 (보는 순서) ─────────────────────────────────────────────────────────

// 시리즈 보는 순서에서 의미 있는 관계 — 사용자 요청으로 ADAPTATION/SOURCE/OTHER 외 전부 표시.
const SERIES_RELATION_TYPES: ReadonlySet<RelationType> = new Set([
  'PREQUEL', 'SEQUEL', 'PARENT', 'SIDE_STORY',
  'SPIN_OFF', 'ALTERNATIVE', 'SUMMARY',
])

// 포맷 블랙리스트 비움 — 전체를 다 보고 싶다는 요청에 따라 MUSIC 등도 노출.
const SERIES_FORMAT_BLACKLIST: ReadonlySet<string> = new Set()

const RELATION_ORDER: Record<RelationType, number> = {
  PARENT: 0, PREQUEL: 1, SIDE_STORY: 2, SEQUEL: 3,
  SPIN_OFF: 4, ALTERNATIVE: 5, SUMMARY: 6, ADAPTATION: 7, SOURCE: 8, OTHER: 9,
}

type RelationsResponse = {
  Media: {
    relations: {
      edges: { relationType: RelationType; node: RawSeriesNode | null }[]
    }
  } | null
}

/**
 * AniList relations: 같은 시리즈의 전작/속편/외전 등.
 * 정렬: 그룹별(main story 먼저) → 같은 그룹 안에선 연도 ASC → 같은 해면 PARENT > PREQUEL > SIDE_STORY > SEQUEL.
 */
export async function fetchAnimeRelations(id: number): Promise<SeriesEntry[]> {
  const data = await query<RelationsResponse>(`
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
    if (edge.node.format && SERIES_FORMAT_BLACKLIST.has(edge.node.format)) continue
    entries.push(mapSeriesEntry(edge.node, edge.relationType))
  }

  // 같은 시리즈에서 같은 ID가 두 번 나오는 경우 방지 (예: PARENT+PREQUEL)
  const seen = new Set<number>()
  const deduped = entries.filter((e) => {
    if (seen.has(e.id)) return false
    seen.add(e.id)
    return true
  })

  return deduped.sort((a, b) => {
    const ga = GROUP_ORDER[seriesGroupKey(a.relationType)] ?? 99
    const gb = GROUP_ORDER[seriesGroupKey(b.relationType)] ?? 99
    if (ga !== gb) return ga - gb
    const ya = a.seasonYear ?? 9999
    const yb = b.seasonYear ?? 9999
    if (ya !== yb) return ya - yb
    return RELATION_ORDER[a.relationType] - RELATION_ORDER[b.relationType]
  })
}

// ── 추천 ───────────────────────────────────────────────────────────────────

type RecommendationsResponse = {
  Media: { recommendations: { nodes: { mediaRecommendation: RawMedia | null }[] } } | null
}

/**
 * AniList의 recommendations: 사용자 평가가 높은 비슷한 작품들.
 * 디테일 모달 "비슷한 작품" 섹션 + HomeTab "이거 좋아하니까" 캐러셀에서 사용.
 */
export async function fetchRecommendations(id: number, perPage = 8): Promise<Anime[]> {
  const data = await query<RecommendationsResponse>(`
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
    .filter((m): m is RawMedia => !!m)
    .map(mapAnime)
}
