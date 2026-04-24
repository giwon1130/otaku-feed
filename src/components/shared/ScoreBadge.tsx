import { Text, View } from 'react-native'
import { Star } from 'lucide-react-native'
import { C_TOKENS as C } from '../../styles'

type Size = 'sm' | 'md' | 'lg'

const SIZES: Record<Size, { icon: number; font: number; gap: number }> = {
  sm: { icon: 10, font: 11, gap: 2 },
  md: { icon: 12, font: 12, gap: 3 },
  lg: { icon: 14, font: 13, gap: 4 },
}

/** 점수 배지 — 0~100 score를 10점 만점 표기. score=0이면 아무것도 안 그림. */
export function ScoreBadge({ score, size = 'sm' }: { score: number; size?: Size }) {
  if (!score) return null
  const s = SIZES[size]
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: s.gap }}>
      <Star size={s.icon} color={C.gold} fill={C.gold} strokeWidth={2.5} />
      <Text style={{ color: C.gold, fontSize: s.font, fontWeight: '800' }}>
        {(score / 10).toFixed(1)}
      </Text>
    </View>
  )
}
