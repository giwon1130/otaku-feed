import { Text, View } from 'react-native'
import { RELATION_KO } from '../../constants'
import type { RelationType } from '../../types'

// 관계 타입별 시각 구분 (badgeBg / badgeFg)
const COLORS: Record<RelationType, { bg: string; fg: string }> = {
  PREQUEL:     { bg: '#1e3a5f', fg: '#7dd3fc' },  // 청록 — 먼저
  PARENT:      { bg: '#3a1e5f', fg: '#d8b4fe' },  // 보라 — 본편
  SIDE_STORY:  { bg: '#5f3a1e', fg: '#fdba74' },  // 갈색 — 외전
  SEQUEL:      { bg: '#1e5f3a', fg: '#86efac' },  // 초록 — 다음
  SPIN_OFF:    { bg: '#5f1e4a', fg: '#f9a8d4' },  // 자홍 — 스핀오프
  ALTERNATIVE: { bg: '#5f5f1e', fg: '#fde68a' },  // 머스타드 — 대체판
  SUMMARY:     { bg: '#3a3a3a', fg: '#c0c0c0' },  // 회색 — 총집편
  ADAPTATION:  { bg: '#2d1b69', fg: '#c4b5fd' },
  SOURCE:      { bg: '#2d1b69', fg: '#c4b5fd' },
  OTHER:       { bg: '#2d1b69', fg: '#c4b5fd' },
}

export function relationColors(rel: RelationType): { bg: string; fg: string } {
  return COLORS[rel] ?? COLORS.OTHER
}

/** 관계 라벨 칩 — 시리즈 카드, 모달 등에서 사용. */
export function RelationBadge({ relation }: { relation: RelationType }) {
  const c = relationColors(relation)
  return (
    <View style={{
      backgroundColor: c.bg,
      borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
    }}>
      <Text style={{ color: c.fg, fontSize: 10, fontWeight: '900' }}>
        {RELATION_KO[relation] ?? relation}
      </Text>
    </View>
  )
}
