import { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  Share,
  Text,
  View,
} from 'react-native'
import { Heart, Share2, Star, Trash2, X } from 'lucide-react-native'
import { fetchAnimeById } from '../api/anilist'
import { addSwipe, loadSwipes } from '../storage'
import { styles } from '../styles'
import type { Anime, SwipeRecord } from '../types'

type ListFilter = 'like' | 'dislike'

type Props = {
  onAnimePress: (anime: Anime) => void
}

export function MyListTab({ onAnimePress }: Props) {
  const [filter, setFilter] = useState<ListFilter>('like')
  const [swipes, setSwipes] = useState<SwipeRecord[]>([])
  const [animeMap, setAnimeMap] = useState<Record<number, Anime>>({})
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const records = await loadSwipes()
    setSwipes(records)

    const ids = records.map((r) => r.animeId)
    const missing = ids.filter((id) => !animeMap[id])
    if (missing.length) {
      const fetched = await Promise.all(missing.map((id) => fetchAnimeById(id)))
      const entries = fetched.flatMap((a) => (a ? [[a.id, a] as [number, Anime]] : []))
      setAnimeMap((prev) => ({ ...prev, ...Object.fromEntries(entries) }))
    }
  }, [animeMap])

  useEffect(() => {
    setLoading(true)
    void load().finally(() => setLoading(false))
  }, [])

  const handleRemove = async (animeId: number) => {
    await addSwipe({ animeId, result: 'skip', swipedAt: new Date().toISOString() })
    await load()
  }

  const handleShareAll = async () => {
    const liked = swipes.filter((s) => s.result === 'like')
    const titles = liked
      .slice(0, 10)
      .map((s) => animeMap[s.animeId]?.title ?? `#${s.animeId}`)
      .join('\n· ')
    await Share.share({ message: `🎌 내가 좋아하는 애니 목록\n· ${titles}` })
  }

  const displayed = swipes.filter((s) => s.result === filter)
  const likeCount = swipes.filter((s) => s.result === 'like').length
  const dislikeCount = swipes.filter((s) => s.result === 'dislike').length

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color="#9f67ff" />
        <Text style={styles.loadingText}>목록 불러오는 중...</Text>
      </View>
    )
  }

  return (
    <FlatList
      style={styles.scroll}
      contentContainerStyle={styles.content}
      data={displayed}
      keyExtractor={(item) => String(item.animeId)}
      ListHeaderComponent={(
        <View style={{ gap: 10 }}>
          {/* KPI */}
          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <Heart size={16} color="#9f67ff" fill="#9f67ff" />
              <Text style={styles.kpiLabel}>좋아요</Text>
              <Text style={[styles.kpiValue, { color: '#9f67ff' }]}>{likeCount}</Text>
            </View>
            <View style={styles.kpiCard}>
              <X size={16} color="#ef4444" strokeWidth={2.5} />
              <Text style={styles.kpiLabel}>패스</Text>
              <Text style={[styles.kpiValue, { color: '#ef4444' }]}>{dislikeCount}</Text>
            </View>
          </View>

          {/* 필터 */}
          <View style={styles.listTabRow}>
            <Pressable
              onPress={() => setFilter('like')}
              style={[styles.listTab, filter === 'like' && styles.listTabActive]}
            >
              <Text style={[styles.listTabText, filter === 'like' && styles.listTabTextActive]}>
                💜 좋아요 {likeCount}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setFilter('dislike')}
              style={[styles.listTab, filter === 'dislike' && styles.listTabActive]}
            >
              <Text style={[styles.listTabText, filter === 'dislike' && styles.listTabTextActive]}>
                ✕ 패스 {dislikeCount}
              </Text>
            </Pressable>
          </View>

          {/* 전체 공유 버튼 */}
          {filter === 'like' && likeCount > 0 ? (
            <Pressable onPress={handleShareAll} style={styles.shareBtn}>
              <Share2 size={15} color="#9f67ff" />
              <Text style={styles.shareBtnText}>좋아요 목록 친구에게 공유</Text>
            </Pressable>
          ) : null}
        </View>
      )}
      renderItem={({ item }) => {
        const anime = animeMap[item.animeId]
        if (!anime) return (
          <View style={[styles.rankingRow, { opacity: 0.5 }]}>
            <Text style={styles.metaText}>#{item.animeId} 로딩 중...</Text>
          </View>
        )
        return (
          <Pressable
            onPress={() => onAnimePress(anime)}
            style={[styles.rankingRow, { marginTop: 8 }]}
          >
            <Image source={{ uri: anime.coverImage }} style={styles.rankingThumb} resizeMode="cover" />
            <View style={styles.rankingInfo}>
              <Text style={styles.rankingTitle} numberOfLines={1}>{anime.title}</Text>
              <Text style={styles.rankingMeta}>{anime.genres.slice(0, 2).join(' · ')}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <Star size={10} color="#f59e0b" fill="#f59e0b" />
                <Text style={styles.rankingScore}>{anime.score ? (anime.score / 10).toFixed(1) : '-'}</Text>
              </View>
            </View>
            <View style={{ gap: 8, alignItems: 'flex-end' }}>
              <Pressable
                onPress={async () => {
                  await Share.share({ message: `🎌 ${anime.title} 추천해! → https://anilist.co/anime/${anime.id}` })
                }}
                style={{ backgroundColor: '#2d1b69', borderRadius: 8, padding: 8 }}
              >
                <Share2 size={14} color="#9f67ff" />
              </Pressable>
              <Pressable
                onPress={() => void handleRemove(anime.id)}
                style={{ backgroundColor: '#3a0e0e', borderRadius: 8, padding: 8 }}
              >
                <Trash2 size={14} color="#ef4444" />
              </Pressable>
            </View>
          </Pressable>
        )
      }}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Text style={{ fontSize: 40 }}>{filter === 'like' ? '💜' : '👻'}</Text>
          <Text style={styles.emptyStateText}>
            {filter === 'like'
              ? '아직 좋아요한 애니가 없어.\n스와이프 탭에서 하트를 눌러봐!'
              : '패스한 애니가 없어.'}
          </Text>
        </View>
      }
    />
  )
}
