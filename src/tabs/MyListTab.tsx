import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FlatList,
  Pressable,
  RefreshControl,
  Share,
  Text,
  TextInput,
  View,
} from 'react-native'
import { ArrowDownUp, Heart, Search, Share2, Star, Trash2, X } from 'lucide-react-native'
import { fetchAnimeById } from '../api/anilist'
import { translateAnimeList } from '../api/translate'
import { loadSwipes, removeSwipe } from '../storage'
import { styles } from '../styles'
import { Skeleton } from '../components/Skeleton'
import { Toast } from '../components/Toast'
import { useToast } from '../hooks/useToast'
import { ImageWithLoader } from '../components/ImageWithLoader'
import { hapticError, hapticLight, hapticMedium } from '../utils/haptics'
import type { Anime, SwipeRecord } from '../types'

type ListFilter = 'like' | 'dislike'
type SortMode = 'recent' | 'oldest' | 'score'

type Props = {
  onAnimePress: (anime: Anime) => void
}

function SkeletonList() {
  return (
    <View style={[styles.scroll, { padding: 14, gap: 10 }]}>
      <View style={styles.kpiRow}>
        {[0, 1].map((i) => (
          <View key={i} style={[styles.kpiCard, { gap: 8 }]}>
            <Skeleton width={22} height={22} borderRadius={11} />
            <Skeleton height={10} width="60%" />
            <Skeleton height={22} width="40%" />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <Skeleton width={120} height={36} borderRadius={999} />
        <Skeleton width={100} height={36} borderRadius={999} />
      </View>
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i} style={[styles.rankingRow, { gap: 12 }]}>
          <Skeleton width={48} height={68} borderRadius={8} />
          <View style={{ flex: 1, gap: 6 }}>
            <Skeleton height={14} width="70%" />
            <Skeleton height={10} width="50%" />
            <Skeleton height={10} width="35%" />
          </View>
          <View style={{ gap: 8 }}>
            <Skeleton width={34} height={34} borderRadius={8} />
            <Skeleton width={34} height={34} borderRadius={8} />
          </View>
        </View>
      ))}
    </View>
  )
}

export function MyListTab({ onAnimePress }: Props) {
  const [filter,     setFilter]     = useState<ListFilter>('like')
  const [sort,       setSort]       = useState<SortMode>('recent')
  const [searchQ,    setSearchQ]    = useState('')
  const [swipes,     setSwipes]     = useState<SwipeRecord[]>([])
  const [animeMap,   setAnimeMap]   = useState<Record<number, Anime>>({})
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const toast = useToast()

  const load = useCallback(async () => {
    const records = await loadSwipes()
    setSwipes(records)

    setAnimeMap((prevMap) => {
      const ids = records.map((r) => r.animeId)
      const missing = ids.filter((id) => !prevMap[id])
      if (!missing.length) return prevMap

      void (async () => {
        const fetched = (await Promise.all(missing.map((id) => fetchAnimeById(id)))).filter(Boolean) as Anime[]
        const translated = await translateAnimeList(fetched)
        const entries = translated.map((a) => [a.id, a] as [number, Anime])
        if (entries.length) {
          setAnimeMap((prev) => ({ ...prev, ...Object.fromEntries(entries) }))
        }
      })()

      return prevMap
    })
  }, [])

  useEffect(() => {
    setLoading(true)
    void load().finally(() => setLoading(false))
  }, [])

  const onRefresh = async () => {
    setRefreshing(true)
    void hapticLight()
    await load()
    setRefreshing(false)
  }

  const handleRemove = async (animeId: number) => {
    void hapticError()
    await removeSwipe(animeId)
    await load()
    toast.show('목록에서 삭제했어.', 'error')
  }

  const handleShareAll = async () => {
    void hapticLight()
    const liked = swipes.filter((s) => s.result === 'like')
    const titles = liked
      .slice(0, 10)
      .map((s) => animeMap[s.animeId]?.title ?? `#${s.animeId}`)
      .join('\n· ')
    await Share.share({ message: `🎌 내가 좋아하는 애니 목록\n· ${titles}` })
  }

  const likeCount    = swipes.filter((s) => s.result === 'like').length
  const dislikeCount = swipes.filter((s) => s.result === 'dislike').length

  const displayed = useMemo(() => {
    const q = searchQ.trim().toLowerCase()
    const filtered = swipes.filter((s) => {
      if (s.result !== filter) return false
      if (!q) return true
      const a = animeMap[s.animeId]
      if (!a) return false
      return a.title.toLowerCase().includes(q)
        || (a.titleNative ?? '').toLowerCase().includes(q)
        || a.genres.some((g) => g.toLowerCase().includes(q))
    })

    if (sort === 'recent') {
      return [...filtered].sort((a, b) => b.swipedAt.localeCompare(a.swipedAt))
    }
    if (sort === 'oldest') {
      return [...filtered].sort((a, b) => a.swipedAt.localeCompare(b.swipedAt))
    }
    // score: 점수 높은 순 (animeMap 없으면 0 취급, 뒤로 밀림)
    return [...filtered].sort((a, b) => {
      const sa = animeMap[a.animeId]?.score ?? 0
      const sb = animeMap[b.animeId]?.score ?? 0
      return sb - sa
    })
  }, [swipes, filter, sort, searchQ, animeMap])

  if (loading) return <SkeletonList />

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        style={styles.scroll}
        contentContainerStyle={styles.content}
        data={displayed}
        keyExtractor={(item) => String(item.animeId)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#9f67ff" />
        }
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
                onPress={() => { void hapticLight(); setFilter('like') }}
                style={[styles.listTab, filter === 'like' && styles.listTabActive]}
              >
                <Text style={[styles.listTabText, filter === 'like' && styles.listTabTextActive]}>
                  💜 좋아요 {likeCount}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => { void hapticLight(); setFilter('dislike') }}
                style={[styles.listTab, filter === 'dislike' && styles.listTabActive]}
              >
                <Text style={[styles.listTabText, filter === 'dislike' && styles.listTabTextActive]}>
                  ✕ 패스 {dislikeCount}
                </Text>
              </Pressable>
            </View>

            {/* 인라인 검색 + 정렬 */}
            {swipes.filter((s) => s.result === filter).length > 3 ? (
              <View style={{ gap: 6 }}>
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 8,
                  backgroundColor: '#1a1a2e', borderRadius: 12,
                  paddingHorizontal: 12, paddingVertical: 8,
                  borderWidth: 1, borderColor: '#2a2a4a',
                }}>
                  <Search size={14} color="#6b6b99" strokeWidth={2.5} />
                  <TextInput
                    value={searchQ}
                    onChangeText={setSearchQ}
                    placeholder="제목·장르로 찾기..."
                    placeholderTextColor="#45456b"
                    style={{ flex: 1, color: '#f0f0ff', fontSize: 13, fontWeight: '600', padding: 0 }}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {searchQ ? (
                    <Pressable onPress={() => { void hapticLight(); setSearchQ('') }}>
                      <X size={14} color="#6b6b99" strokeWidth={2.5} />
                    </Pressable>
                  ) : null}
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {([
                    { key: 'recent', label: '최근' },
                    { key: 'oldest', label: '오래된' },
                    { key: 'score',  label: '점수' },
                  ] as const).map((opt) => (
                    <Pressable
                      key={opt.key}
                      onPress={() => { void hapticLight(); setSort(opt.key) }}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 4,
                        backgroundColor: sort === opt.key ? 'rgba(159,103,255,0.18)' : '#1a1a2e',
                        borderRadius: 999,
                        paddingHorizontal: 10, paddingVertical: 5,
                        borderWidth: 1,
                        borderColor: sort === opt.key ? 'rgba(159,103,255,0.4)' : '#2a2a4a',
                      }}
                    >
                      <ArrowDownUp size={11} color={sort === opt.key ? '#9f67ff' : '#6b6b99'} strokeWidth={2.5} />
                      <Text style={{
                        color: sort === opt.key ? '#9f67ff' : '#a8a8cc',
                        fontSize: 11, fontWeight: '700',
                      }}>{opt.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {/* 전체 공유 */}
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
            <View style={[styles.rankingRow, { opacity: 0.5, marginTop: 8 }]}>
              <Skeleton width={48} height={68} borderRadius={8} />
              <View style={{ flex: 1, gap: 6 }}>
                <Skeleton height={14} width="60%" />
                <Skeleton height={10} width="40%" />
              </View>
            </View>
          )
          return (
            <Pressable
              onPress={() => { void hapticLight(); onAnimePress(anime) }}
              style={[styles.rankingRow, { marginTop: 8 }]}
            >
              <ImageWithLoader uri={anime.coverImage} style={styles.rankingThumb} resizeMode="cover" />
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
                    void hapticLight()
                    await Share.share({ message: `🎌 ${anime.title} 추천해! → https://anilist.co/anime/${anime.id}` })
                  }}
                  style={[styles.iconBtn, styles.iconBtnLike]}
                >
                  <Share2 size={14} color="#9f67ff" />
                </Pressable>
                <Pressable
                  onPress={() => { void hapticMedium(); void handleRemove(anime.id) }}
                  style={[styles.iconBtn, styles.iconBtnDislike]}
                >
                  <Trash2 size={14} color="#ef4444" />
                </Pressable>
              </View>
            </Pressable>
          )
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 40 }}>{searchQ ? '🔍' : (filter === 'like' ? '💜' : '👻')}</Text>
            <Text style={styles.emptyStateText}>
              {searchQ
                ? `"${searchQ}"에 해당하는 ${filter === 'like' ? '좋아요' : '패스'}가 없어.`
                : filter === 'like'
                  ? '아직 좋아요한 애니가 없어.\n스와이프 탭에서 하트를 눌러봐!'
                  : '패스한 애니가 없어.'}
            </Text>
          </View>
        }
      />
      <Toast visible={toast.visible} message={toast.message} type={toast.type} />
    </View>
  )
}
