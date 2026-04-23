// ── Anime ────────────────────────────────────────────────────────────────────

export type AnimeGenre =
  | 'Action' | 'Adventure' | 'Comedy' | 'Drama' | 'Fantasy'
  | 'Horror' | 'Mystery' | 'Romance' | 'Sci-Fi' | 'Slice of Life'
  | 'Sports' | 'Supernatural' | 'Thriller' | 'Mecha' | 'Psychological'

export type AnimeStatus = 'FINISHED' | 'RELEASING' | 'NOT_YET_RELEASED' | 'CANCELLED'

export type AnimeSeason = 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL'

export type ExternalLink = {
  url: string
  site: string
  type: string
  color: string | null
  /** true: 한국 전용 카탈로그 (라프텔 등). false/undefined: 글로벌 카탈로그 (Netflix 등) — KR 카탈로그와 다를 수 있음. */
  regional?: boolean
}

export type Anime = {
  id: number
  title: string           // 영어 제목
  titleNative: string     // 원제 (일본어)
  coverImage: string
  bannerImage: string | null
  score: number           // 0–100
  episodes: number | null
  status: AnimeStatus
  season: AnimeSeason | null
  seasonYear: number | null
  genres: string[]
  description: string
  studios: string[]
  popularity: number
  source: 'MANGA' | 'LIGHT_NOVEL' | 'ORIGINAL' | 'OTHER' | string
}

// ── Series / Relations ───────────────────────────────────────────────────────

// AniList relationType(version: 2) — 시리즈 보는 순서에서 의미 있는 것들
export type RelationType =
  | 'PREQUEL' | 'SEQUEL' | 'PARENT' | 'SIDE_STORY' | 'SPIN_OFF'
  | 'ALTERNATIVE' | 'SUMMARY' | 'ADAPTATION' | 'SOURCE' | 'OTHER'

export type SeriesEntry = {
  id: number
  title: string                // 영어/로마자 우선
  titleNative: string
  coverImage: string
  format: string | null        // TV / MOVIE / OVA / SPECIAL / ONA …
  episodes: number | null
  seasonYear: number | null
  season: AnimeSeason | null
  score: number                // 0–100
  status: AnimeStatus
  relationType: RelationType
}

// ── User Prefs ───────────────────────────────────────────────────────────────

export type SwipeResult = 'like' | 'dislike' | 'skip'

export type SwipeRecord = {
  animeId: number
  result: SwipeResult
  swipedAt: string        // ISO date
}

export type UserPrefs = {
  favoriteGenres: string[]
  onboardingDone: boolean
  /**
   * 취향 분석(애니 카드 좋아요 단계) 완료 여부.
   * 좋아요한 애니는 일반 SwipeRecord(result='like')로 저장되므로
   * 별도 ID 리스트를 prefs에 두지 않음 → 추천 로직은 storage의 likedIds를 직접 사용.
   */
  tasteOnboardingDone?: boolean
}

// ── Share ────────────────────────────────────────────────────────────────────

export type SharedAnime = {
  shareId: string
  anime: Anime
  fromNickname: string
  sharedAt: string
  reactions: Record<string, SwipeResult>  // deviceId → result
}

// ── Tab ──────────────────────────────────────────────────────────────────────

export type TabKey = 'home' | 'explore' | 'swipe' | 'mylist'

// ── API ──────────────────────────────────────────────────────────────────────

export type RankingSort = 'SCORE' | 'POPULARITY' | 'TRENDING'
export type GenreFilter = string | null
export type YearFilter = number | null
