import { ActivityIndicator, Text, View } from 'react-native'
import { BookOpen } from 'lucide-react-native'
import { C_TOKENS as C } from '../../styles'

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, (m) => {
    const map: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' }
    return map[m] ?? m
  }).trim()
}

type Props = {
  /** Anime.description (잘릴 수 있는 캐시 영향 — fullDescription 있으면 그쪽이 우선). */
  rawDescription: string | null | undefined
  /** fetchAnimeById로 받아 번역까지 끝낸 풀 버전. */
  fullDescription: string | null
  loading: boolean
}

/** 줄거리 섹션 — fullDescription 있으면 그걸 보여주고, 없으면 raw 표시 + 보강 진행 표시. */
export function Synopsis({ rawDescription, fullDescription, loading }: Props) {
  if (!rawDescription && !fullDescription && !loading) return null
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <BookOpen size={14} color={C.accentGlow} strokeWidth={2.5} />
        <Text style={{ color: C.accentGlow, fontSize: 13, fontWeight: '800' }}>줄거리</Text>
      </View>
      {fullDescription ? (
        <Text style={{ color: '#c8c8e8', fontSize: 14, lineHeight: 22 }}>
          {stripHtml(fullDescription)}
        </Text>
      ) : rawDescription ? (
        <Text style={{ color: '#c8c8e8', fontSize: 14, lineHeight: 22 }}>
          {stripHtml(rawDescription)}
          {loading ? '…' : ''}
        </Text>
      ) : loading ? (
        <ActivityIndicator size="small" color={C.accentGlow} style={{ alignSelf: 'flex-start' }} />
      ) : null}
    </View>
  )
}
