import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Animated,
  Image,
  PanResponder,
  Pressable,
  Share,
  Text,
  View,
} from 'react-native'
import { Heart, RefreshCw, Share2, X } from 'lucide-react-native'
import { fetchTrending, fetchByGenres } from '../api/anilist'
import { translateAnimeList } from '../api/translate'
import { GENRE_KO } from '../constants'
import { addSwipe, getSwipeMap } from '../storage'
import { styles } from '../styles'
import { Skeleton } from '../components/Skeleton'
import { hapticSuccess, hapticError, hapticLight } from '../utils/haptics'
import type { Anime, SwipeResult } from '../types'

type Props = {
  favoriteGenres: string[]
  onAnimePress: (anime: Anime) => void
}

const SWIPE_THRESHOLD = 80

function SkeletonSwipe() {
  return (
    <View style={{ flex: 1, paddingHorizontal: 14 }}>
      <Skeleton height={14} width="40%" style={{ alignSelf: 'center', marginTop: 12, marginBottom: 8 }} />
      <View style={[styles.swipeCardWrap, { flex: 1 }]}>
        <Skeleton width="100%" height="100%" borderRadius={0} />
      </View>
      <View style={[styles.swipeActions, { paddingVertical: 16 }]}>
        <Skeleton width={64} height={64} borderRadius={32} />
        <Skeleton width={48} height={48} borderRadius={24} />
        <Skeleton width={64} height={64} borderRadius={32} />
      </View>
      <Skeleton height={44} borderRadius={12} style={{ marginBottom: 14 }} />
    </View>
  )
}

const PREFETCH_THRESHOLD = 5     // 남은 카드 5개 이하면 다음 페이지 미리 가져오기
const PER_PAGE = 30

export function SwipeTab({ favoriteGenres, onAnimePress }: Props) {
  const [queue,    setQueue]    = useState<Anime[]>([])
  const [loading,  setLoading]  = useState(true)
  const [swipeMap, setSwipeMap] = useState<Record<number, SwipeResult>>({})
  const pageRef       = useRef(1)
  const prefetchingRef = useRef(false)
  const exhaustedRef   = useRef(false)

  const position = useRef(new Animated.ValueXY()).current
  const rotate       = position.x.interpolate({ inputRange: [-200, 0, 200], outputRange: ['-15deg', '0deg', '15deg'] })
  const likeOpacity  = position.x.interpolate({ inputRange: [0, 60, 120],   outputRange: [0, 0.8, 1], extrapolate: 'clamp' })
  const dislikeOpacity = position.x.interpolate({ inputRange: [-120, -60, 0], outputRange: [1, 0.8, 0], extrapolate: 'clamp' })
  // 배경색: 오른쪽 = 보라, 왼쪽 = 빨강
  const bgColor = position.x.interpolate({
    inputRange: [-160, 0, 160],
    outputRange: ['rgba(239,68,68,0.10)', 'rgba(0,0,0,0)', 'rgba(124,58,237,0.10)'],
    extrapolate: 'clamp',
  })

  const fetchPage = useCallback(async (page: number, seenIds: Set<number>): Promise<Anime[]> => {
    const data = favoriteGenres.length > 0
      ? await fetchByGenres(favoriteGenres, page, PER_PAGE)
      : await fetchTrending(page, PER_PAGE)
    const filtered = data.filter((a) => !seenIds.has(a.id))
    return translateAnimeList(filtered)
  }, [favoriteGenres])

  const load = useCallback(async () => {
    const sm = await getSwipeMap()
    setSwipeMap(sm)
    const seenIds = new Set(Object.keys(sm).map(Number))
    pageRef.current = 1
    exhaustedRef.current = false
    const fresh = await fetchPage(1, seenIds)
    setQueue(fresh)
  }, [fetchPage])

  // 큐 잔여가 적으면 자동으로 다음 페이지 prefetch
  const maybePrefetch = useCallback(async () => {
    if (prefetchingRef.current || exhaustedRef.current) return
    prefetchingRef.current = true
    try {
      const sm = await getSwipeMap()
      const seenIds = new Set(Object.keys(sm).map(Number))
      // 현재 큐도 seen 처리 → 중복 방지
      setQueue((current) => {
        for (const a of current) seenIds.add(a.id)
        return current
      })
      const nextPage = pageRef.current + 1
      const more = await fetchPage(nextPage, seenIds)
      if (more.length === 0) {
        exhaustedRef.current = true
      } else {
        pageRef.current = nextPage
        setQueue((current) => [...current, ...more])
      }
    } finally {
      prefetchingRef.current = false
    }
  }, [fetchPage])

  useEffect(() => {
    setLoading(true)
    void load().finally(() => setLoading(false))
  }, [load])

  // queue 변할 때마다 prefetch 필요한지 체크
  useEffect(() => {
    if (!loading && queue.length > 0 && queue.length <= PREFETCH_THRESHOLD) {
      void maybePrefetch()
    }
  }, [queue.length, loading, maybePrefetch])

  const current = queue[0] ?? null

  const handleSwipe = useCallback(async (dir: 'like' | 'dislike') => {
    if (!current) return
    void (dir === 'like' ? hapticSuccess() : hapticError())

    await addSwipe({ animeId: current.id, result: dir, swipedAt: new Date().toISOString() })
    setSwipeMap((prev) => ({ ...prev, [current.id]: dir }))

    Animated.timing(position, {
      toValue: { x: dir === 'like' ? 500 : -500, y: 0 },
      duration: 280,
      useNativeDriver: false,
    }).start(() => {
      setQueue((prev) => prev.slice(1))
      position.setValue({ x: 0, y: 0 })
    })
  }, [current, position])

  const handleSkip = useCallback(() => {
    if (!current) return
    void hapticLight()
    setQueue((prev) => [...prev.slice(1), prev[0]])
    position.setValue({ x: 0, y: 0 })
  }, [current, position])

  const handleSwipeRef = useRef(handleSwipe)
  useEffect(() => { handleSwipeRef.current = handleSwipe }, [handleSwipe])

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dx: position.x, dy: position.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          void handleSwipeRef.current('like')
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          void handleSwipeRef.current('dislike')
        } else {
          Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start()
        }
      },
    }),
  ).current

  if (loading) return <SkeletonSwipe />

  if (!current) {
    return (
      <View style={styles.loadingWrap}>
        <Text style={{ fontSize: 48 }}>🎉</Text>
        <Text style={[styles.cardTitle, { textAlign: 'center' }]}>다 봤어!</Text>
        <Text style={[styles.metaText, { textAlign: 'center' }]}>더 이상 스와이프할 애니가 없어.</Text>
        <Pressable
          onPress={() => { void hapticLight(); setLoading(true); void load().finally(() => setLoading(false)) }}
          style={[styles.shareBtn, { marginTop: 8 }]}
        >
          <RefreshCw size={16} color="#9f67ff" />
          <Text style={styles.shareBtnText}>다시 불러오기</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <Animated.View style={{ flex: 1, paddingHorizontal: 14, backgroundColor: bgColor }}>
      {/* 남은 카드 수 */}
      <Text style={[styles.metaText, { textAlign: 'center', paddingTop: 12, marginBottom: 8 }]}>
        남은 애니 {queue.length}개
      </Text>

      {/* 카드 */}
      <Animated.View
        style={[
          styles.swipeCardWrap,
          { flex: 1, transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }] },
        ]}
        {...panResponder.panHandlers}
      >
        <Pressable onPress={() => onAnimePress(current)} style={{ flex: 1 }}>
          <Image
            source={{ uri: current.coverImage }}
            style={{ width: '100%', flex: 1 }}
            resizeMode="cover"
          />
          {current.score ? (
            <View style={styles.swipeScoreBadge}>
              <Text style={{ color: '#f59e0b', fontSize: 10 }}>★</Text>
              <Text style={styles.swipeScoreText}>{(current.score / 10).toFixed(1)}</Text>
            </View>
          ) : null}
          <Animated.View style={[styles.stampLike, { opacity: likeOpacity }]}>
            <Text style={[styles.stampText, { color: '#9f67ff' }]}>좋아요</Text>
          </Animated.View>
          <Animated.View style={[styles.stampDislike, { opacity: dislikeOpacity }]}>
            <Text style={[styles.stampText, { color: '#ef4444' }]}>패스</Text>
          </Animated.View>
          <View style={styles.swipeCardOverlay}>
            <View style={{ backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 16, padding: 12, gap: 6 }}>
              <Text style={styles.swipeCardTitle} numberOfLines={2}>{current.title}</Text>
              <Text style={styles.swipeCardNative} numberOfLines={1}>{current.titleNative}</Text>
              <Text style={styles.swipeCardMeta}>
                {current.seasonYear ?? '-'} · {current.episodes ? `${current.episodes}화` : '방영 중'} · {current.studios[0] ?? '-'}
              </Text>
              <View style={styles.swipeCardGenres}>
                {current.genres.slice(0, 4).map((g) => (
                  <View key={g} style={styles.swipeGenreTag}>
                    <Text style={styles.swipeGenreTagText}>{GENRE_KO[g] ?? g}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </Pressable>
      </Animated.View>

      {/* 액션 버튼 */}
      <View style={styles.swipeActions}>
        <Pressable
          style={[styles.swipeBtn, styles.swipeBtnDislike]}
          onPress={() => { void hapticError(); void handleSwipe('dislike') }}
        >
          <X size={28} color="#ef4444" strokeWidth={2.5} />
        </Pressable>
        <Pressable style={styles.swipeBtnSkip} onPress={handleSkip}>
          <RefreshCw size={18} color="#6b6b99" strokeWidth={2} />
        </Pressable>
        <Pressable
          style={[styles.swipeBtn, styles.swipeBtnLike]}
          onPress={() => { void hapticSuccess(); void handleSwipe('like') }}
        >
          <Heart size={28} color="#9f67ff" strokeWidth={2.5} fill="#9f67ff" />
        </Pressable>
      </View>

      {/* 공유 버튼 */}
      <Pressable
        style={[styles.shareBtn, { marginBottom: 14 }]}
        onPress={async () => {
          void hapticLight()
          await Share.share({ message: `🎌 ${current.title} 어때? → https://anilist.co/anime/${current.id}` })
        }}
      >
        <Share2 size={15} color="#9f67ff" />
        <Text style={styles.shareBtnText}>친구에게 공유</Text>
      </Pressable>
    </Animated.View>
  )
}
