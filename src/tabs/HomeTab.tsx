import { memo, useCallback, useEffect, useState } from 'react'
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  View,
} from 'react-native'
import { Flame, Heart, Sparkles, Star, TrendingUp } from 'lucide-react-native'
import { fetchAnimeById, fetchByGenres, fetchCurrentSeason, fetchRecommendations, fetchTrending } from '../api/anilist'
import { translateAnimeList } from '../api/translate'
import { GENRE_KO } from '../constants'
import { styles } from '../styles'
import { Skeleton } from '../components/Skeleton'
import { ImageWithLoader } from '../components/ImageWithLoader'
import { hapticLight } from '../utils/haptics'
import type { Anime, SwipeResult } from '../types'
import { getSwipeMap, loadSwipes } from '../storage'

type Props = {
  favoriteGenres: string[]
  onAnimePress: (anime: Anime) => void
}

function ScoreBadge({ score }: { score: number }) {
  if (!score) return null
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <Star size={10} color="#f59e0b" strokeWidth={2.5} fill="#f59e0b" />
      <Text style={styles.animeCardScoreText}>{(score / 10).toFixed(1)}</Text>
    </View>
  )
}

function SkeletonHome() {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} scrollEnabled={false}>
      {/* 오늘의 픽 */}
      <View style={[styles.primaryCard, { gap: 12 }]}>
        <Skeleton height={12} width="35%" borderRadius={6} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Skeleton width={80} height={110} borderRadius={10} />
          <View style={{ flex: 1, gap: 8 }}>
            <Skeleton height={18} width="80%" />
            <Skeleton height={12} width="60%" />
            <Skeleton height={12} width="35%" />
            <View style={{ flexDirection: 'row', gap: 5, marginTop: 4 }}>
              <Skeleton width={50} height={22} borderRadius={999} />
              <Skeleton width={50} height={22} borderRadius={999} />
              <Skeleton width={50} height={22} borderRadius={999} />
            </View>
          </View>
        </View>
        <Skeleton height={44} borderRadius={12} />
      </View>

      {/* KPI */}
      <View style={styles.kpiRow}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.kpiCard, { gap: 8 }]}>
            <Skeleton width={22} height={22} borderRadius={11} />
            <Skeleton height={10} width="70%" />
            <Skeleton height={22} width="50%" />
          </View>
        ))}
      </View>

      {/* 트렌딩 */}
      <View style={[styles.card, { gap: 12 }]}>
        <Skeleton height={14} width="40%" />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ gap: 6 }}>
              <Skeleton width={130} height={185} borderRadius={12} />
              <Skeleton height={12} width={100} />
              <Skeleton height={10} width={70} />
            </View>
          ))}
        </View>
      </View>

      {/* 시즌 신작 */}
      <View style={[styles.card, { gap: 12 }]}>
        <Skeleton height={14} width="50%" />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ gap: 6 }}>
              <Skeleton width={130} height={185} borderRadius={12} />
              <Skeleton height={12} width={100} />
              <Skeleton height={10} width={70} />
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  )
}

const HorizontalAnimeList = memo(function HorizontalAnimeList({ data, onPress, swipeMap }: {
  data: Anime[]
  onPress: (a: Anime) => void
  swipeMap: Record<number, SwipeResult>
}) {
  const renderItem = useCallback(({ item }: { item: Anime }) => {
    const result = swipeMap[item.id]
    return (
      <Pressable onPress={() => { void hapticLight(); onPress(item) }} style={styles.hCard}>
        <ImageWithLoader uri={item.coverImage} style={styles.hCardImage} resizeMode="cover" />
        {result === 'like' ? (
          <View style={styles.hCardLikeBadge}>
            <Star size={10} color="#fff" fill="#fff" />
          </View>
        ) : null}
        <View style={styles.hCardBody}>
          <Text style={styles.hCardTitle} numberOfLines={2}>{item.title}</Text>
          <ScoreBadge score={item.score} />
        </View>
      </Pressable>
    )
  }, [swipeMap, onPress])

  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={data}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.hScrollContent}
      renderItem={renderItem}
    />
  )
})

/**
 * 좋아요한 애니의 장르 빈도를 세서 top-N 장르를 뽑는다.
 * 좋아요 데이터가 없으면 온보딩 favoriteGenres 사용.
 */
async function pickRecommendedGenres(fallback: string[], topN = 3): Promise<string[]> {
  const swipes = await loadSwipes()
  const liked = swipes.filter((s) => s.result === 'like').slice(-30)   // 최근 30개 좋아요
  if (liked.length === 0) return fallback.slice(0, topN)

  // 각 좋아요 애니의 장르 가져와서 카운트
  const animes = (await Promise.all(liked.map((s) => fetchAnimeById(s.animeId).catch(() => null))))
    .filter(Boolean) as Anime[]
  const counts = new Map<string, number>()
  for (const a of animes) for (const g of a.genres) counts.set(g, (counts.get(g) ?? 0) + 1)
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g)
  if (ranked.length === 0) return fallback.slice(0, topN)
  return ranked.slice(0, topN)
}

export function HomeTab({ favoriteGenres, onAnimePress }: Props) {
  const [trending,   setTrending]   = useState<Anime[]>([])
  const [seasonal,   setSeasonal]   = useState<Anime[]>([])
  const [forYou,     setForYou]     = useState<Anime[]>([])
  const [forYouGenres, setForYouGenres] = useState<string[]>([])
  const [becauseLiked,        setBecauseLiked]        = useState<Anime[]>([])
  const [becauseLikedAnchor,  setBecauseLikedAnchor]  = useState<Anime | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [swipeMap,   setSwipeMap]   = useState<Record<number, SwipeResult>>({})

  const load = async () => {
    const [t, s, sm, recGenres] = await Promise.all([
      fetchTrending(1, 20),
      fetchCurrentSeason(1, 20),
      getSwipeMap(),
      pickRecommendedGenres(favoriteGenres, 3),
    ])
    const [tKo, sKo] = await Promise.all([
      translateAnimeList(t),
      translateAnimeList(s),
    ])
    setTrending(tKo)
    setSeasonal(sKo)
    setSwipeMap(sm)
    setForYouGenres(recGenres)

    // 맞춤 피드: 추천 장르 기반, 이미 swipe한 건 제외
    const seenIds = new Set(Object.keys(sm).map(Number))
    if (recGenres.length > 0) {
      const fy = await fetchByGenres(recGenres, 1, 30)
      const filtered = fy.filter((a) => !seenIds.has(a.id)).slice(0, 12)
      setForYou(await translateAnimeList(filtered))
    } else {
      setForYou([])
    }

    // "이거 좋아하는 너에게" — 좋아요한 작품 중 인기/평점 높은 1개 anchor 기반 recommendations
    const likedSwipes = await loadSwipes().then((sw) => sw.filter((x) => x.result === 'like'))
    if (likedSwipes.length > 0) {
      // 최근 좋아요 5개 중 무작위로 1개 anchor (다양성 위해)
      const recent = likedSwipes.slice(-5)
      const pick = recent[Math.floor(Math.random() * recent.length)]
      const anchor = await fetchAnimeById(pick.animeId).catch(() => null)
      if (anchor) {
        const [translatedAnchor] = await translateAnimeList([anchor])
        setBecauseLikedAnchor(translatedAnchor)
        const recs = await fetchRecommendations(anchor.id, 12).catch(() => [])
        const filteredRecs = recs.filter((a) => !seenIds.has(a.id)).slice(0, 12)
        setBecauseLiked(await translateAnimeList(filteredRecs))
      } else {
        setBecauseLikedAnchor(null)
        setBecauseLiked([])
      }
    } else {
      setBecauseLikedAnchor(null)
      setBecauseLiked([])
    }
  }

  useEffect(() => { void load().finally(() => setLoading(false)) }, [])

  const onRefresh = async () => {
    setRefreshing(true)
    void hapticLight()
    await load()
    setRefreshing(false)
  }

  const topPick = trending[0] ?? null

  if (loading) return <SkeletonHome />

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#9f67ff" />}
    >
      {/* ── 오늘의 픽 ── */}
      {topPick ? (
        <Pressable onPress={() => { void hapticLight(); onAnimePress(topPick) }} style={styles.primaryCard}>
          <View style={styles.cardTitleRow}>
            <Sparkles size={12} color="#9f67ff" strokeWidth={2.5} />
            <Text style={styles.cardEyebrow}>오늘의 픽</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <ImageWithLoader
              uri={topPick.coverImage}
              style={{ width: 80, height: 110, borderRadius: 10 }}
              resizeMode="cover"
            />
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={[styles.cardTitle, { fontSize: 18 }]}>{topPick.title}</Text>
              <Text style={styles.metaText}>{topPick.titleNative}</Text>
              <ScoreBadge score={topPick.score} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 4 }}>
                {topPick.genres.slice(0, 3).map((g) => (
                  <Text key={g} style={[styles.swipeGenreTagText, {
                    backgroundColor: '#2d1b69', borderRadius: 999,
                    paddingHorizontal: 8, paddingVertical: 3, fontSize: 11, fontWeight: '700',
                    color: '#c4b5fd',
                  }]}>{GENRE_KO[g] ?? g}</Text>
                ))}
              </View>
              <Text style={styles.cardNote} numberOfLines={3}>{topPick.description}</Text>
            </View>
          </View>
          <Pressable
            onPress={async () => {
              void hapticLight()
              await Share.share({ message: `🎌 ${topPick.title} 추천해! AniList에서 확인해봐 → https://anilist.co/anime/${topPick.id}` })
            }}
            style={styles.shareBtn}
          >
            <Text style={styles.shareBtnText}>친구에게 공유</Text>
          </Pressable>
        </Pressable>
      ) : null}

      {/* ── 통계 ── */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Star size={16} color="#f59e0b" strokeWidth={2.5} />
          <Text style={styles.kpiLabel}>좋아요한 애니</Text>
          <Text style={[styles.kpiValue, { color: '#9f67ff' }]}>
            {Object.values(swipeMap).filter((v) => v === 'like').length}
          </Text>
        </View>
        <View style={styles.kpiCard}>
          <Flame size={16} color="#ef4444" strokeWidth={2.5} />
          <Text style={styles.kpiLabel}>트렌딩</Text>
          <Text style={styles.kpiValue}>{trending.length}</Text>
        </View>
        <View style={styles.kpiCard}>
          <TrendingUp size={16} color="#06b6d4" strokeWidth={2.5} />
          <Text style={styles.kpiLabel}>이번 시즌</Text>
          <Text style={[styles.kpiValue, { color: '#06b6d4' }]}>{seasonal.length}</Text>
        </View>
      </View>

      {/* ── 이거 좋아하니까 (anchor 기반 recommendations) ── */}
      {becauseLikedAnchor && becauseLiked.length > 0 ? (
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.cardTitleRow}>
              <Heart size={14} color="#ec4899" strokeWidth={2.5} fill="#ec4899" />
              <Text style={styles.cardTitle}>{becauseLikedAnchor.title} 좋아하니까</Text>
            </View>
            <Text style={styles.metaText}>비슷한 취향</Text>
          </View>
          <HorizontalAnimeList data={becauseLiked} onPress={onAnimePress} swipeMap={swipeMap} />
        </View>
      ) : null}

      {/* ── 너를 위한 피드 (개인화) ── */}
      {forYou.length > 0 ? (
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.cardTitleRow}>
              <Heart size={14} color="#9f67ff" strokeWidth={2.5} fill="#9f67ff" />
              <Text style={styles.cardTitle}>너 좋아할 만한 거</Text>
            </View>
            {forYouGenres.length > 0 ? (
              <Text style={styles.metaText}>
                {forYouGenres.map((g) => GENRE_KO[g] ?? g).join(' · ')}
              </Text>
            ) : null}
          </View>
          <HorizontalAnimeList data={forYou} onPress={onAnimePress} swipeMap={swipeMap} />
        </View>
      ) : null}

      {/* ── 트렌딩 ── */}
      <View style={styles.card}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.cardTitleRow}>
            <Flame size={14} color="#ef4444" strokeWidth={2.5} />
            <Text style={styles.cardTitle}>지금 뜨는 애니</Text>
          </View>
        </View>
        <HorizontalAnimeList data={trending} onPress={onAnimePress} swipeMap={swipeMap} />
      </View>

      {/* ── 이번 시즌 신작 ── */}
      <View style={styles.card}>
        <View style={styles.sectionHeaderRow}>
          <View style={styles.cardTitleRow}>
            <Sparkles size={14} color="#06b6d4" strokeWidth={2.5} />
            <Text style={styles.cardTitle}>이번 시즌 신작</Text>
          </View>
        </View>
        <HorizontalAnimeList data={seasonal} onPress={onAnimePress} swipeMap={swipeMap} />
      </View>
    </ScrollView>
  )
}
