import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native'
import { BarChart2, Search, Star, TrendingUp, Zap } from 'lucide-react-native'
import { fetchRanking, searchAnime } from '../api/anilist'
import { translateAnimeList } from '../api/translate'
import { getSwipeMap } from '../storage'
import { styles } from '../styles'
import type { Anime, RankingSort, SwipeResult } from '../types'

type Props = {
  onAnimePress: (anime: Anime) => void
}

const SORT_OPTIONS: Array<{ key: RankingSort; label: string }> = [
  { key: 'TRENDING', label: '🔥 트렌딩' },
  { key: 'SCORE', label: '⭐ 점수순' },
  { key: 'POPULARITY', label: '👥 인기순' },
]

export function ExploreTab({ onAnimePress }: Props) {
  const [sort, setSort] = useState<RankingSort>('TRENDING')
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<Anime[]>([])
  const [loading, setLoading] = useState(false)
  const [swipeMap, setSwipeMap] = useState<Record<number, SwipeResult>>({})
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadRanking = async (s: RankingSort) => {
    setLoading(true)
    const [data, sm] = await Promise.all([fetchRanking(s, 1, 30), getSwipeMap()])
    setResults(await translateAnimeList(data))
    setSwipeMap(sm)
    setLoading(false)
  }

  useEffect(() => { void loadRanking(sort) }, [sort])

  const handleSearch = (text: string) => {
    setSearchQuery(text)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    if (!text.trim()) { void loadRanking(sort); return }
    const t = setTimeout(async () => {
      setLoading(true)
      setResults(await translateAnimeList(await searchAnime(text.trim())))
      setLoading(false)
    }, 350)
    searchTimeoutRef.current = t
  }

  function sortIcon(s: RankingSort) {
    if (s === 'TRENDING') return <Zap size={13} color="#f59e0b" strokeWidth={2.5} />
    if (s === 'SCORE') return <Star size={13} color="#f59e0b" strokeWidth={2.5} />
    return <TrendingUp size={13} color="#06b6d4" strokeWidth={2.5} />
  }

  return (
    <View style={{ flex: 1 }}>
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
        </View>

        {/* 정렬 */}
        {!searchQuery ? (
          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.cardTitleRow}>
                <BarChart2 size={14} color="#9f67ff" strokeWidth={2.5} />
                <Text style={styles.cardTitle}>랭킹</Text>
              </View>
              <Text style={styles.metaText}>{results.length}개</Text>
            </View>
            <View style={styles.filterRow}>
              {SORT_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.key}
                  onPress={() => setSort(opt.key)}
                  style={[styles.filterChip, sort === opt.key && styles.filterChipActive]}
                >
                  <Text style={[styles.filterText, sort === opt.key && styles.filterTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#9f67ff" />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 40, gap: 8 }}
          renderItem={({ item, index }) => {
            const result = swipeMap[item.id]
            const isTop3 = index < 3 && !searchQuery
            return (
              <Pressable onPress={() => onAnimePress(item)} style={styles.rankingRow}>
                {!searchQuery ? (
                  <Text style={[styles.rankingNum, isTop3 && styles.rankingNumTop]}>
                    {index + 1}
                  </Text>
                ) : sortIcon(sort)}
                <Image source={{ uri: item.coverImage }} style={styles.rankingThumb} resizeMode="cover" />
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
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>검색 결과가 없어.</Text>
            </View>
          }
        />
      )}
    </View>
  )
}
