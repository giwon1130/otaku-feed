import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  View,
} from 'react-native'
import { Flame, Sparkles, Star, TrendingUp } from 'lucide-react-native'
import { fetchCurrentSeason, fetchTrending } from '../api/anilist'
import { styles } from '../styles'
import type { Anime } from '../types'
import { getSwipeMap } from '../storage'

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

function HorizontalAnimeList({ data, onPress, swipeMap }: {
  data: Anime[]
  onPress: (a: Anime) => void
  swipeMap: Record<number, string>
}) {
  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={data}
      keyExtractor={(item) => String(item.id)}
      contentContainerStyle={styles.hScrollContent}
      renderItem={({ item }) => {
        const result = swipeMap[item.id]
        return (
          <Pressable onPress={() => onPress(item)} style={styles.hCard}>
            <Image source={{ uri: item.coverImage }} style={styles.hCardImage} resizeMode="cover" />
            {result === 'like' ? (
              <View style={{ position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(124,58,237,0.85)', borderRadius: 999, padding: 4 }}>
                <Star size={10} color="#fff" fill="#fff" />
              </View>
            ) : null}
            <View style={styles.hCardBody}>
              <Text style={styles.hCardTitle} numberOfLines={2}>{item.title}</Text>
              <ScoreBadge score={item.score} />
            </View>
          </Pressable>
        )
      }}
    />
  )
}

export function HomeTab({ favoriteGenres, onAnimePress }: Props) {
  const [trending, setTrending] = useState<Anime[]>([])
  const [seasonal, setSeasonal] = useState<Anime[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [swipeMap, setSwipeMap] = useState<Record<number, string>>({})

  const load = async () => {
    const [t, s, sm] = await Promise.all([
      fetchTrending(1, 20),
      fetchCurrentSeason(1, 20),
      getSwipeMap(),
    ])
    setTrending(t)
    setSeasonal(s)
    setSwipeMap(sm)
  }

  useEffect(() => {
    void load().finally(() => setLoading(false))
  }, [])

  const onRefresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const topPick = trending[0] ?? null

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#9f67ff" />
        <Text style={styles.loadingText}>애니 불러오는 중...</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#9f67ff" />}
    >
      {/* ── 오늘의 픽 ── */}
      {topPick ? (
        <Pressable onPress={() => onAnimePress(topPick)} style={styles.primaryCard}>
          <View style={styles.cardTitleRow}>
            <Sparkles size={12} color="#9f67ff" strokeWidth={2.5} />
            <Text style={styles.cardEyebrow}>오늘의 픽</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
            <Image
              source={{ uri: topPick.coverImage }}
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
                  }]}>{g}</Text>
                ))}
              </View>
              <Text style={styles.cardNote} numberOfLines={3}>{topPick.description}</Text>
            </View>
          </View>
          <Pressable
            onPress={async () => {
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
