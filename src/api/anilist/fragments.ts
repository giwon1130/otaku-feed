/**
 * 디테일 모달용 — 모든 필드 (description/studios/banner/source 포함).
 * mapAnime()와 1:1 매칭되니 변경 시 같이 수정.
 */
export const ANIME_FIELDS = `
  id
  title { english romaji native }
  synonyms
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

/**
 * 리스트/카드용 슬림 fragment.
 * 카드는 description/studios/banner/source 안 씀 → 응답 크기 ~50% 절감
 *   (35KB → 18KB 측정).
 * 대신 클릭해서 디테일 모달 열면 fetchAnimeById가 풀 fields로 보강.
 *
 * 필드가 빠진 채 mapAnime을 통과해도 안전:
 * - description: '' (mapAnime의 (raw.description ?? ''))
 * - studios.nodes: 없으면 빈 배열
 * - bannerImage: null
 * - source: 'OTHER'
 *
 * 이 의미로 GraphQL 쿼리에서 빠진 필드는 raw에 undefined로 들어옴 →
 * mapAnime의 ?? 폴백으로 처리됨.
 */
export const ANIME_FIELDS_LIST = `
  id
  title { english romaji native }
  synonyms
  coverImage { large extraLarge }
  averageScore
  episodes
  status
  season
  seasonYear
  genres
  popularity
`
