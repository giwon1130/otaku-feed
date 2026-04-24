import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native'
import { ListOrdered } from 'lucide-react-native'
import { FORMAT_KO } from '../../constants'
import { ImageWithLoader } from '../ImageWithLoader'
import { RelationBadge, ScoreBadge } from '../shared'
import { hapticLight } from '../../utils/haptics'
import { seriesGroupKey } from '../../utils/seriesGroup'
import { C_TOKENS as C } from '../../styles'
import type { Anime, SeriesEntry } from '../../types'

type Props = {
  series: SeriesEntry[]
  loading: boolean
  /** 시리즈 카드 탭 시 다른 작품으로 navigate. */
  onSelect?: (stub: Anime) => void
}

/**
 * 시리즈 보는 순서 섹션 — main story → SPIN_OFF/ALTERNATIVE/SUMMARY 순으로 그룹화.
 * 그룹 경계에 세로 디바이더, 각 카드에 순서 번호 + 관계 배지 표시.
 */
export function SeriesOrder({ series, loading, onSelect }: Props) {
  if (!loading && series.length === 0) return null
  return (
    <View style={{ gap: 10, marginTop: 24 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <ListOrdered size={14} color={C.accentGlow} strokeWidth={2.5} />
        <Text style={{ color: C.accentGlow, fontSize: 13, fontWeight: '800' }}>시리즈 보는 순서</Text>
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={C.accentGlow} style={{ alignSelf: 'flex-start' }} />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 10, alignItems: 'flex-start' }}
        >
          {series.map((item, index) => {
            const yearLabel = item.seasonYear ? String(item.seasonYear) : ''
            const formatLabel = item.format ? (FORMAT_KO[item.format] ?? item.format) : ''
            const epLabel = item.episodes ? `${item.episodes}화` : ''
            const sub = [yearLabel, formatLabel, epLabel].filter(Boolean).join(' · ')
            const prev = index > 0 ? series[index - 1] : null
            const isNewGroup = !prev || seriesGroupKey(prev.relationType) !== seriesGroupKey(item.relationType)
            return (
              <View
                key={String(item.id)}
                style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}
              >
                {isNewGroup && index > 0 ? (
                  <View style={{
                    width: 1, alignSelf: 'stretch',
                    backgroundColor: C.border, marginRight: 4,
                  }} />
                ) : null}
                <Pressable
                  onPress={() => {
                    void hapticLight()
                    onSelect?.({
                      id: item.id,
                      title: item.title,
                      titleNative: item.titleNative,
                      coverImage: item.coverImage,
                      bannerImage: null,
                      score: item.score,
                      episodes: item.episodes,
                      status: item.status,
                      season: item.season,
                      seasonYear: item.seasonYear,
                      genres: [],
                      description: '',
                      studios: [],
                      popularity: 0,
                      source: 'OTHER',
                    })
                  }}
                  style={{ width: 130 }}
                >
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6,
                  }}>
                    <View style={{
                      width: 18, height: 18, borderRadius: 9,
                      backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Text style={{ color: '#c4b5fd', fontSize: 10, fontWeight: '900' }}>
                        {index + 1}
                      </Text>
                    </View>
                    <RelationBadge relation={item.relationType} />
                  </View>
                  <ImageWithLoader
                    uri={item.coverImage}
                    style={{ width: 130, height: 184, borderRadius: 10 }}
                    resizeMode="cover"
                  />
                  <Text
                    style={{ color: C.ink, fontSize: 12, fontWeight: '700', marginTop: 6 }}
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>
                  {sub ? (
                    <Text
                      style={{ color: C.inkMuted, fontSize: 11, marginTop: 2 }}
                      numberOfLines={1}
                    >
                      {sub}
                    </Text>
                  ) : null}
                  <View style={{ marginTop: 2 }}>
                    <ScoreBadge score={item.score} size="sm" />
                  </View>
                </Pressable>
              </View>
            )
          })}
        </ScrollView>
      )}
    </View>
  )
}
