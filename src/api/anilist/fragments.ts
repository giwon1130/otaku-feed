/**
 * Anime 전체 필드 fragment.
 * mapAnime()와 1:1 매칭되니 변경 시 같이 수정.
 */
export const ANIME_FIELDS = `
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
