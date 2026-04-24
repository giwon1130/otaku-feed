import { ActivityIndicator, FlatList, Text, View } from 'react-native'
import { Sparkles } from 'lucide-react-native'
import { AnimeMiniCard } from '../shared'
import { hapticLight } from '../../utils/haptics'
import { C_TOKENS as C } from '../../styles'
import type { Anime } from '../../types'

type Props = {
  similar: Anime[]
  loading: boolean
  onSelect?: (anime: Anime) => void
}

/** "이거 좋아하면 이것도" — AniList recommendations 결과를 가로 스크롤로. */
export function SimilarList({ similar, loading, onSelect }: Props) {
  if (!loading && similar.length === 0) return null
  return (
    <View style={{ gap: 10, marginTop: 24 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Sparkles size={14} color={C.accentGlow} strokeWidth={2.5} />
        <Text style={{ color: C.accentGlow, fontSize: 13, fontWeight: '800' }}>이거 좋아하면 이것도</Text>
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={C.accentGlow} style={{ alignSelf: 'flex-start' }} />
      ) : (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={similar}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ gap: 10 }}
          renderItem={({ item }) => (
            <AnimeMiniCard
              anime={item}
              onPress={(a) => {
                void hapticLight()
                onSelect?.(a)
              }}
            />
          )}
        />
      )}
    </View>
  )
}
