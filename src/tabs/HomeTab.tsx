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
import { swr } from '../api/anilist/swr'
import { logger } from '../utils/logger'
import { translateAnimeList } from '../api/translate'
import { GENRE_KO } from '../constants'
import { styles } from '../styles'
import { Skeleton } from '../components/Skeleton'
import { ImageWithLoader } from '../components/ImageWithLoader'
import { AnimeCard, GenreTag, ScoreBadge } from '../components/shared'
import { Toast } from '../components/Toast'
import { useToast } from '../hooks/useToast'
import { STRINGS } from '../i18n/strings'
import { hapticLight } from '../utils/haptics'
import type { Anime, SwipeResult } from '../types'
import { getSwipeMap, loadSwipes } from '../storage'

type Props = {
  favoriteGenres: string[]
  onAnimePress: (anime: Anime) => void
  /** 값이 바뀌면 피드를 강제로 다시 로드 (취향 재분석/장르 재선택 직후 호출용) */
  reloadToken?: number
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
  const renderItem = useCallback(({ item }: { item: Anime }) => (
    <AnimeCard
      anime={item}
      swipeResult={swipeMap[item.id]}
      onPress={(a) => { void hapticLight(); onPress(a) }}
    />
  ), [swipeMap, onPress])

  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={data}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.hScrollContent}
      renderItem={renderItem}
      initialNumToRender={6}
      maxToRenderPerBatch={6}
      windowSize={5}
      removeClippedSubviews
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

export function HomeTab({ favoriteGenres, onAnimePress, reloadToken = 0 }: Props) {
  const [trending,   setTrending]   = useState<Anime[]>([])
  const [seasonal,   setSeasonal]   = useState<Anime[]>([])
  const [forYou,     setForYou]     = useState<Anime[]>([])
  const [forYouGenres, setForYouGenres] = useState<string[]>([])
  // 여러 좋아요 anchor를 동시에 노출 (다양성). 최대 3개.
  const [becauseLikedSets, setBecauseLikedSets] = useState<{ anchor: Anime; recs: Anime[] }[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [swipeMap,   setSwipeMap]   = useState<Record<number, SwipeResult>>({})
  const toast = useToast(2800)

  const load = async () => {
    try {
    // SWR: trending/seasonal은 사용자가 가장 먼저 보는 부분 → 캐시 즉시 표시 + 백그라운드 갱신
    const [trendingSwr, seasonalSwr, sm, recGenres] = await Promise.all([
      swr('home:trending', () => fetchTrending(1, 20).then(translateAnimeList)),
      swr('home:seasonal', () => fetchCurrentSeason(1, 20).then(translateAnimeList)),
      getSwipeMap(),
      pickRecommendedGenres(favoriteGenres, 3),
    ])
    if (trendingSwr.cached) setTrending(trendingSwr.cached)
    if (seasonalSwr.cached) setSeasonal(seasonalSwr.cached)
    setSwipeMap(sm)
    setForYouGenres(recGenres)
    // 백그라운드 갱신 결과를 받으면 교체
    void trendingSwr.fresh.then((v) => { if (v) setTrending(v) })
    void seasonalSwr.fresh.then((v) => { if (v) setSeasonal(v) })

    // 맞춤 피드: 추천 장르 기반, 이미 swipe한 건 제외
    const seenIds = new Set(Object.keys(sm).map(Number))
    if (recGenres.length > 0) {
      const fy = await fetchByGenres(recGenres, 1, 30)
      const filtered = fy.filter((a) => !seenIds.has(a.id)).slice(0, 12)
      setForYou(await translateAnimeList(filtered))
    } else {
      setForYou([])
    }

    // "이거 좋아하니까" — 최근 좋아요 10개 중 장르 다양성 기준으로 최대 3개 anchor 선정.
    const likedSwipes = await loadSwipes().then((sw) => sw.filter((x) => x.result === 'like'))
    if (likedSwipes.length > 0) {
      const recent = likedSwipes.slice(-10).reverse()  // 최신 우선
      // 셔플로 같은 풀에서도 매번 다른 anchor 조합 — 사용자 새로고침 시 다양화
      const shuffled = [...recent].sort(() => Math.random() - 0.5)

      const pickedAnchors: Anime[] = []
      const usedPrimaryGenres = new Set<string>()
      const usedIds = new Set<number>()
      const MAX_ANCHORS = 3

      for (const sw of shuffled) {
        if (pickedAnchors.length >= MAX_ANCHORS) break
        if (usedIds.has(sw.animeId)) continue
        const a = await fetchAnimeById(sw.animeId).catch(() => null)
        if (!a) continue
        const primary = a.genres[0]
        // 같은 1차 장르 anchor는 스킵 (다양성). 단 모든 anchor가 같은 장르면 강제 채움.
        if (primary && usedPrimaryGenres.has(primary) && pickedAnchors.length > 0) continue
        pickedAnchors.push(a)
        usedIds.add(a.id)
        if (primary) usedPrimaryGenres.add(primary)
      }

      // anchor 부족하면(장르 필터로 다 걸러지면) 후보 그대로 채움
      if (pickedAnchors.length === 0) {
        const fallback = await fetchAnimeById(shuffled[0].animeId).catch(() => null)
        if (fallback) pickedAnchors.push(fallback)
      }

      // anchor마다 직렬로 fetch+translate하면 N×라운드트립 → 전부 병렬화
      const setsRaw = await Promise.all(
        pickedAnchors.map(async (anchor) => {
          const [tAnchorList, recs] = await Promise.all([
            translateAnimeList([anchor]),
            fetchRecommendations(anchor.id, 12).catch(() => []),
          ])
          const filteredRecs = recs
            .filter((a) => !seenIds.has(a.id) && !usedIds.has(a.id))
            .slice(0, 12)
          const tRecs = await translateAnimeList(filteredRecs)
          return { anchor: tAnchorList[0]!, recs: tRecs }
        }),
      )
      setBecauseLikedSets(setsRaw.filter((s) => s.recs.length > 0))
    } else {
      setBecauseLikedSets([])
    }
    } catch (e) {
      const msg = e instanceof Error ? e.message : STRINGS.errors.feedFailed
      toast.show(msg, 'error')
      logger.captureException(e, { tab: 'home', favoriteGenres })
    }
  }

  useEffect(() => {
    setLoading(true)
    void load().finally(() => setLoading(false))
    // reloadToken이 바뀌면 피드 갱신. favoriteGenres 변경(장르 재선택)도 트리거.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadToken, favoriteGenres.join(',')])

  const onRefresh = async () => {
    setRefreshing(true)
    void hapticLight()
    await load()
    setRefreshing(false)
  }

  const topPick = trending[0] ?? null

  if (loading) return <SkeletonHome />

  return (
    <>
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
                  <GenreTag key={g} genre={g} size="sm" />
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

      {/* ── 이거 좋아하니까 (anchor 기반 recommendations, 최대 3개) ── */}
      {becauseLikedSets.map(({ anchor, recs }) => (
        <View key={anchor.id} style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.cardTitleRow}>
              <Heart size={14} color="#ec4899" strokeWidth={2.5} fill="#ec4899" />
              <Text style={styles.cardTitle} numberOfLines={1}>
                {anchor.title} 좋아하니까
              </Text>
            </View>
            <Text style={styles.metaText}>비슷한 취향</Text>
          </View>
          <HorizontalAnimeList data={recs} onPress={onAnimePress} swipeMap={swipeMap} />
        </View>
      ))}

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
    <Toast visible={toast.visible} message={toast.message} type={toast.type} />
    </>
  )
}
