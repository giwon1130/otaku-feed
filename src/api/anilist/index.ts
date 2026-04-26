/**
 * AniList API 모듈 — 분야별 파일로 분리되어 있음.
 *
 * - client.ts:    공통 fetch 래퍼 (query<T>)
 * - fragments.ts: GraphQL fragment (ANIME_FIELDS)
 * - mappers.ts:   raw → Anime/SeriesEntry 변환
 * - discovery.ts: 트렌딩/랭킹/장르/시즌/취향 후보
 * - detail.ts:    단일 조회 / 시리즈 / 추천 / 외부 링크
 * - search.ts:    검색 (한↔영 변환 포함)
 */
export { fetchTrending, fetchRanking, fetchByGenres, fetchTasteCandidates, fetchCurrentSeason, fetchHomePrimary } from './discovery'
export { fetchAnimeById, fetchAnimeLinks, fetchAnimeRelations, fetchRecommendations, fetchLaftelKoreanName, clearAnimeCache } from './detail'
export { searchAnime } from './search'
