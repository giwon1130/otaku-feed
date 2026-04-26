import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { BarChart2, Clock, Filter, Search, Star, TrendingUp, X, Zap } from 'lucide-react-native'
import { fetchByGenres, fetchRanking, searchAnime } from '../api/anilist'
import { GENRE_KO } from '../constants'
import { translateAnimeList } from '../api/translate'
import { getSwipeMap } from '../storage'
import { styles } from '../styles'
import { Skeleton } from '../components/Skeleton'
import { ImageWithLoader } from '../components/ImageWithLoader'
import { Toast } from '../components/Toast'
import { useToast } from '../hooks/useToast'
import { STRINGS } from '../i18n/strings'
import { logger } from '../utils/logger'

// 디버깅: import { logger } 후 console에서 [time] explore.loadRanking · NNNms 형태로 모니터링
import { hapticLight, hapticMedium } from '../utils/haptics'
import type { Anime, RankingSort, SwipeResult } from '../types'

type Props = {
  onAnimePress: (anime: Anime) => void
}

const SORT_OPTIONS: Array<{ key: RankingSort; label: string }> = [
  { key: 'TRENDING',   label: '🔥 트렌딩' },
  { key: 'SCORE',      label: '⭐ 점수순' },
  { key: 'POPULARITY', label: '👥 인기순' },
]
const PER_PAGE = 30
const HISTORY_KEY = 'otaku:searchHistory'

// 자주 보는 장르를 우선 노출
const GENRE_FILTER_OPTIONS: string[] = [
  'Action', 'Romance', 'Comedy', 'Fantasy', 'Drama', 'Sci-Fi',
  'Slice of Life', 'Mystery', 'Sports', 'Horror', 'Mecha', 'Supernatural',
  'Psychological', 'Thriller', 'Adventure',
]

function SkeletonRows() {
  return (
    <View style={{ paddingHorizontal: 14, gap: 8 }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <View key={i} style={[styles.rankingRow, { gap: 12 }]}>
          <Skeleton width={26} height={20} borderRadius={4} />
          <Skeleton width={48} height={68} borderRadius={8} />
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton height={14} width="75%" />
            <Skeleton height={10} width="50%" />
            <Skeleton height={10} width="40%" />
          </View>
          <Skeleton width={32} height={14} borderRadius={4} />
        </View>
      ))}
    </View>
  )
}

export function ExploreTab({ onAnimePress }: Props) {
  const [sort,        setSort]        = useState<RankingSort>('TRENDING')
  const [searchQuery, setSearchQuery] = useState('')
  const [results,     setResults]     = useState<Anime[]>([])
  const [loading,     setLoading]     = useState(false)
  const [refreshing,  setRefreshing]  = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore,     setHasMore]     = useState(true)
  const [page,        setPage]        = useState(1)
  const [swipeMap,    setSwipeMap]    = useState<Record<number, SwipeResult>>({})
  const [history,     setHistory]     = useState<string[]>([])
  const [genreFilter, setGenreFilter] = useState<string | null>(null)
  const toast = useToast(2800)

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 검색 히스토리 로드
  useEffect(() => {
    AsyncStorage.getItem(HISTORY_KEY).then((raw) => {
      if (raw) setHistory(JSON.parse(raw) as string[])
    })
  }, [])

  const saveHistory = async (query: string) => {
    const trimmed = query.trim()
    if (!trimmed) return
    const next = [trimmed, ...history.filter((h) => h !== trimmed)].slice(0, 6)
    setHistory(next)
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next))
  }

  const clearHistory = async () => {
    setHistory([])
    await AsyncStorage.removeItem(HISTORY_KEY)
  }

  const loadRanking = async (s: RankingSort, genre: string | null, p = 1, append = false) => {
    if (p === 1) setLoading(true)
    else setLoadingMore(true)

    try {
      const fetchPromise = genre
        ? fetchByGenres([genre], p, PER_PAGE)
        : fetchRanking(s, p, PER_PAGE)

      const [data, sm] = await logger.time(
        `explore.loadRanking[${genre ?? s}]`,
        () => Promise.all([
          fetchPromise,
          p === 1 ? getSwipeMap() : Promise.resolve(swipeMap),
        ]),
        { page: p },
      )

      // 영어 제목 그대로 즉시 렌더 → 사용자가 콘텐츠 빨리 봄
      // (synonyms에서 한국명 받은 항목은 mapAnime에서 이미 한국어로 들어옴)
      if (append) {
        setResults((prev) => [...prev, ...data])
      } else {
        setResults(data)
        setSwipeMap(sm)
      }
      setHasMore(data.length === PER_PAGE)
      setPage(p)

      // 번역은 백그라운드 → 도착하면 swap. 메모리 캐시 hit이면 거의 즉시.
      void translateAnimeList(data).then((translated) => {
        setResults((prev) => {
          if (append) {
            // append는 prev 끝에 영어로 들어가있음 → 같은 길이만큼 뒤에서 교체
            const head = prev.slice(0, prev.length - translated.length)
            return [...head, ...translated]
          }
          // 첫 페이지: id 매칭으로 안전 교체 (이 사이 setResults가 또 호출됐을 수도)
          const byId = new Map(translated.map((a) => [a.id, a]))
          return prev.map((a) => byId.get(a.id) ?? a)
        })
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : STRINGS.errors.rankingFailed
      toast.show(msg, 'error')
      logger.captureException(e, { tab: 'explore', sort: s, genre, page: p })
      if (p === 1) setResults([])
      setHasMore(false)
    } finally {
      if (p === 1) setLoading(false)
      else setLoadingMore(false)
    }
  }

  useEffect(() => { void loadRanking(sort, genreFilter) }, [sort, genreFilter])

  const handleSearch = (text: string) => {
    setSearchQuery(text)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    if (!text.trim()) { void loadRanking(sort, genreFilter); return }
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const raw = await searchAnime(text.trim())
        setResults(raw)                  // 영어로 즉시 렌더
        setHasMore(false)
        void saveHistory(text.trim())
        void translateAnimeList(raw).then((translated) => {
          const byId = new Map(translated.map((a) => [a.id, a]))
          setResults((prev) => prev.map((a) => byId.get(a.id) ?? a))
        })
      } catch (e) {
        const msg = e instanceof Error ? e.message : STRINGS.errors.searchFailed
        toast.show(msg, 'error')
        logger.captureException(e, { tab: 'explore', op: 'search', q: text.trim() })
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 350)
    searchTimeoutRef.current = t
  }

  const onRefresh = async () => {
    setRefreshing(true)
    void hapticLight()
    await loadRanking(sort, genreFilter, 1)
    setRefreshing(false)
  }

  const onEndReached = () => {
    if (searchQuery || loadingMore || !hasMore) return
    void loadRanking(sort, genreFilter, page + 1, true)
  }

  function sortIcon(s: RankingSort) {
    if (s === 'TRENDING') return <Zap size={13} color="#f59e0b" strokeWidth={2.5} />
    if (s === 'SCORE')    return <Star size={13} color="#f59e0b" strokeWidth={2.5} />
    return <TrendingUp size={13} color="#06b6d4" strokeWidth={2.5} />
  }

  // 헤더 영역 (검색 + 정렬/장르 필터)을 FlatList의 ListHeaderComponent로 빼서
  // 전체 스크롤이 한 덩어리로 움직이게 함. 이전엔 헤더 fix + 리스트만 스크롤.
  const header = (
    <View style={{ padding: 14, gap: 10 }}>
        {/* 검색 */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Search size={14} color="#9f67ff" strokeWidth={2.5} />
            <Text style={styles.cardTitle}>애니 검색</Text>
          </View>
          <TextInput
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder="제목으로 검색..."
            placeholderTextColor="#45456b"
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {/* 검색 히스토리 */}
          {!searchQuery && history.length > 0 ? (
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Clock size={12} color="#6b6b99" strokeWidth={2} />
                  <Text style={{ color: '#6b6b99', fontSize: 12, fontWeight: '600' }}>최근 검색</Text>
                </View>
                <Pressable onPress={() => { void hapticLight(); void clearHistory() }}>
                  <Text style={{ color: '#45456b', fontSize: 11, fontWeight: '600' }}>전체 삭제</Text>
                </Pressable>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {history.map((h) => (
                  <Pressable
                    key={h}
                    onPress={() => { void hapticLight(); handleSearch(h) }}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 4,
                      backgroundColor: '#1a1a2e', borderRadius: 999,
                      paddingHorizontal: 10, paddingVertical: 5,
                      borderWidth: 1, borderColor: '#2a2a4a',
                    }}
                  >
                    <Text style={{ color: '#a8a8cc', fontSize: 12, fontWeight: '600' }}>{h}</Text>
                    <Pressable onPress={(e) => {
                      e.stopPropagation()
                      void hapticLight()
                      const next = history.filter((x) => x !== h)
                      setHistory(next)
                      void AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next))
                    }}>
                      <X size={10} color="#45456b" strokeWidth={2.5} />
                    </Pressable>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}
        </View>

        {/* 정렬 */}
        {!searchQuery ? (
          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.cardTitleRow}>
                <BarChart2 size={14} color="#9f67ff" strokeWidth={2.5} />
                <Text style={styles.cardTitle}>{genreFilter ? `${GENRE_KO[genreFilter] ?? genreFilter} 인기작` : '랭킹'}</Text>
              </View>
              <Text style={styles.metaText}>{results.length}개</Text>
            </View>
            {!genreFilter ? (
              <View style={styles.filterRow}>
                {SORT_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.key}
                    onPress={() => { void hapticMedium(); setSort(opt.key) }}
                    style={[styles.filterChip, sort === opt.key && styles.filterChipActive]}
                  >
                    <Text style={[styles.filterText, sort === opt.key && styles.filterTextActive]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {/* 장르 필터 칩 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
              <Filter size={12} color="#6b6b99" strokeWidth={2.5} />
              <Text style={{ color: '#6b6b99', fontSize: 11, fontWeight: '700' }}>장르</Text>
              {genreFilter ? (
                <Pressable
                  onPress={() => { void hapticLight(); setGenreFilter(null) }}
                  style={{ marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 3 }}
                >
                  <X size={11} color="#9f67ff" strokeWidth={2.5} />
                  <Text style={{ color: '#9f67ff', fontSize: 11, fontWeight: '700' }}>초기화</Text>
                </Pressable>
              ) : null}
            </View>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={GENRE_FILTER_OPTIONS}
              keyExtractor={(g) => g}
              contentContainerStyle={{ gap: 6, paddingVertical: 6 }}
              renderItem={({ item: g }) => {
                const active = genreFilter === g
                return (
                  <Pressable
                    onPress={() => {
                      void hapticMedium()
                      setGenreFilter(active ? null : g)
                    }}
                    style={{
                      paddingHorizontal: 12, paddingVertical: 6,
                      borderRadius: 999,
                      backgroundColor: active ? '#7c3aed' : '#1a1a2e',
                      borderWidth: 1,
                      borderColor: active ? '#9f67ff' : '#2a2a4a',
                    }}
                  >
                    <Text style={{
                      color: active ? '#fff' : '#a8a8cc',
                      fontSize: 12,
                      fontWeight: '700',
                    }}>
                      {GENRE_KO[g] ?? g}
                    </Text>
                  </Pressable>
                )
              }}
            />
          </View>
        ) : null}
    </View>
  )

  return (
    <>
    <View style={{ flex: 1 }}>
        <FlatList
          data={loading ? [] : results}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 40, gap: 8 }}
          initialNumToRender={12}
          maxToRenderPerBatch={12}
          windowSize={7}
          removeClippedSubviews
          // 검색 input이 ListHeaderComponent에 있어서 키보드 뜬 상태로 결과 탭하면
          // 첫 탭이 키보드만 닫혔음 → 'handled'로 첫 탭에 결과 진입까지 같이 처리.
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={header}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#9f67ff" />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? (
            <View style={{ paddingVertical: 16, alignItems: 'center' }}>
              <ActivityIndicator color="#9f67ff" />
            </View>
          ) : null}
          renderItem={({ item, index }) => {
            const result = swipeMap[item.id]
            const isTop3 = index < 3 && !searchQuery
            return (
              <Pressable
                onPress={() => { void hapticLight(); onAnimePress(item) }}
                style={styles.rankingRow}
              >
                {!searchQuery ? (
                  <Text style={[styles.rankingNum, isTop3 && styles.rankingNumTop]}>
                    {index + 1}
                  </Text>
                ) : sortIcon(sort)}
                <ImageWithLoader uri={item.coverImage} style={styles.rankingThumb} resizeMode="cover" />
                <View style={styles.rankingInfo}>
                  <Text style={styles.rankingTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.rankingMeta}>{item.genres.slice(0, 2).join(' · ')}</Text>
                  <Text style={styles.rankingMeta}>
                    {item.seasonYear ?? '-'} · {item.episodes ? `${item.episodes}화` : '방영 중'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <Text style={styles.rankingScore}>
                    {item.score ? `★ ${(item.score / 10).toFixed(1)}` : '-'}
                  </Text>
                  {result === 'like' ? (
                    <View style={{ backgroundColor: '#2d1b69', borderRadius: 999, padding: 4 }}>
                      <Star size={12} color="#9f67ff" fill="#9f67ff" />
                    </View>
                  ) : result === 'dislike' ? (
                    <View style={{ backgroundColor: '#3a0e0e', borderRadius: 999, padding: 4 }}>
                      <Text style={{ color: '#ef4444', fontSize: 10, fontWeight: '800' }}>✕</Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            )
          }}
          ListEmptyComponent={
            loading ? (
              <SkeletonRows />
            ) : (
              <View style={styles.emptyState}>
                <Text style={{ fontSize: 40 }}>🔍</Text>
                <Text style={styles.emptyStateText}>
                  {searchQuery ? `"${searchQuery}"에 해당하는 애니가 없어.` : '결과가 없어.'}
                </Text>
              </View>
            )
          }
        />
    </View>
    <Toast visible={toast.visible} message={toast.message} type={toast.type} />
    </>
  )
}
