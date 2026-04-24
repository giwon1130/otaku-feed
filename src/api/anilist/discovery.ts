import type { Anime, AnimeSeason, RankingSort } from '../../types'
import { query } from './client'
import { ANIME_FIELDS } from './fragments'
import { mapAnime, type RawMedia } from './mappers'

type PageResponse = { Page: { media: RawMedia[] } }

// ── 트렌딩 / 랭킹 ──────────────────────────────────────────────────────────

export async function fetchTrending(page = 1, perPage = 20): Promise<Anime[]> {
  const data = await query<PageResponse>(`
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

  const data = await query<PageResponse>(`
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
  const data = await query<PageResponse>(`
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

// ── 취향 분석 (온보딩 카드) ────────────────────────────────────────────────

/**
 * 첫 온보딩의 "취향 분석" 단계용 후보.
 * - genres가 비면 글로벌 인기작
 * - 있으면 해당 장르 + 최근(2010+) 평점 높은 작품
 * - 너무 매니악하지 않게 minimumScore=70 + 인기도도 고려
 *
 * 사용자가 좋아요 표시한 항목은 일반 SwipeRecord(result='like')로 저장 → 추천에 직접 활용.
 */
export async function fetchTasteCandidates(genres: string[], perPage = 24): Promise<Anime[]> {
  if (genres.length > 0) {
    const data = await query<PageResponse>(`
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

  const data = await query<PageResponse>(`
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

  const data = await query<PageResponse>(`
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
