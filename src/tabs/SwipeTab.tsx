import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
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
import type { Anime, SwipeResult } from '../types'

type Props = {
  favoriteGenres: string[]
  onAnimePress: (anime: Anime) => void
}

const SWIPE_THRESHOLD = 80

export function SwipeTab({ favoriteGenres, onAnimePress }: Props) {
  const [queue, setQueue] = useState<Anime[]>([])
  const [loading, setLoading] = useState(true)
  const [swipeMap, setSwipeMap] = useState<Record<number, SwipeResult>>({})
  const [stampDir, setStampDir] = useState<'like' | 'dislike' | null>(null)

  const position = useRef(new Animated.ValueXY()).current
  const rotate = position.x.interpolate({ inputRange: [-200, 0, 200], outputRange: ['-15deg', '0deg', '15deg'] })
  const likeOpacity = position.x.interpolate({ inputRange: [0, 60, 120], outputRange: [0, 0.8, 1], extrapolate: 'clamp' })
  const dislikeOpacity = position.x.interpolate({ inputRange: [-120, -60, 0], outputRange: [1, 0.8, 0], extrapolate: 'clamp' })

  const load = useCallback(async () => {
    const sm = await getSwipeMap()
    setSwipeMap(sm)
    const seenIds = new Set(Object.keys(sm).map(Number))

    let data: Anime[] = []
    if (favoriteGenres.length > 0) {
      data = await fetchByGenres(favoriteGenres, 1, 40)
    } else {
      data = await fetchTrending(1, 40)
    }
    const filtered = data.filter((a) => !seenIds.has(a.id))
    setQueue(await translateAnimeList(filtered))
  }, [favoriteGenres])

  useEffect(() => {
    setLoading(true)
    void load().finally(() => setLoading(false))
  }, [load])

  const current = queue[0] ?? null

  const handleSwipe = useCallback(async (dir: 'like' | 'dislike') => {
    if (!current) return
    setStampDir(dir)

    await addSwipe({ animeId: current.id, result: dir, swipedAt: new Date().toISOString() })
    setSwipeMap((prev) => ({ ...prev, [current.id]: dir }))

    Animated.timing(position, {
      toValue: { x: dir === 'like' ? 500 : -500, y: 0 },
      duration: 280,
      useNativeDriver: false,
    }).start(() => {
      setQueue((prev) => prev.slice(1))
      position.setValue({ x: 0, y: 0 })
      setStampDir(null)
    })
  }, [current, position])

  const handleSkip = useCallback(() => {
    if (!current) return
    setQueue((prev) => [...prev.slice(1), prev[0]])
    position.setValue({ x: 0, y: 0 })
  }, [current, position])

  // panResponder는 한 번만 생성되므로 ref로 최신 handleSwipe를 전달
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

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#9f67ff" />
        <Text style={styles.loadingText}>스와이프 큐 불러오는 중...</Text>
      </View>
    )
  }

  if (!current) {
    return (
      <View style={styles.loadingWrap}>
        <Text style={{ fontSize: 48 }}>🎉</Text>
        <Text style={[styles.cardTitle, { textAlign: 'center' }]}>다 봤어!</Text>
        <Text style={[styles.metaText, { textAlign: 'center' }]}>더 이상 스와이프할 애니가 없어.</Text>
        <Pressable
          onPress={() => { setLoading(true); void load().finally(() => setLoading(false)) }}
          style={[styles.shareBtn, { marginTop: 8 }]}
        >
          <RefreshCw size={16} color="#9f67ff" />
          <Text style={styles.shareBtnText}>다시 불러오기</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, paddingHorizontal: 14 }}>
      {/* 남은 카드 수 */}
      <Text style={[styles.metaText, { textAlign: 'center', paddingTop: 12, marginBottom: 8 }]}>
        남은 애니 {queue.length}개
      </Text>

      {/* 카드 - flex: 1 로 남은 공간 전부 차지 */}
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

          {/* 점수 뱃지 */}
          {current.score ? (
            <View style={styles.swipeScoreBadge}>
              <Text style={{ color: '#f59e0b', fontSize: 10 }}>★</Text>
              <Text style={styles.swipeScoreText}>{(current.score / 10).toFixed(1)}</Text>
            </View>
          ) : null}

          {/* 좋아요 스탬프 */}
          <Animated.View style={[styles.stampLike, { opacity: likeOpacity }]}>
            <Text style={[styles.stampText, { color: '#9f67ff' }]}>좋아요</Text>
          </Animated.View>

          {/* 싫어요 스탬프 */}
          <Animated.View style={[styles.stampDislike, { opacity: dislikeOpacity }]}>
            <Text style={[styles.stampText, { color: '#ef4444' }]}>패스</Text>
          </Animated.View>

          {/* 오버레이 정보 */}
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
        <Pressable style={[styles.swipeBtn, styles.swipeBtnDislike]} onPress={() => void handleSwipe('dislike')}>
          <X size={28} color="#ef4444" strokeWidth={2.5} />
        </Pressable>
        <Pressable style={styles.swipeBtnSkip} onPress={handleSkip}>
          <RefreshCw size={18} color="#6b6b99" strokeWidth={2} />
        </Pressable>
        <Pressable style={[styles.swipeBtn, styles.swipeBtnLike]} onPress={() => void handleSwipe('like')}>
          <Heart size={28} color="#9f67ff" strokeWidth={2.5} fill="#9f67ff" />
        </Pressable>
      </View>

      {/* 공유 버튼 */}
      <Pressable
        style={[styles.shareBtn, { marginBottom: 14 }]}
        onPress={async () => {
          await Share.share({
            message: `🎌 ${current.title} 어때? → https://anilist.co/anime/${current.id}`,
          })
        }}
      >
        <Share2 size={15} color="#9f67ff" />
        <Text style={styles.shareBtnText}>친구에게 공유</Text>
      </Pressable>
    </View>
  )
}
