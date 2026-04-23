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
