import { Text, View } from 'react-native'
import { GENRE_KO } from '../../constants'
import { C_TOKENS as C } from '../../styles'

type Variant = 'soft' | 'solid'
type Size    = 'sm' | 'md'

const SIZES: Record<Size, { px: number; py: number; font: number }> = {
  sm: { px: 8,  py: 3, font: 11 },
  md: { px: 10, py: 4, font: 12 },
}

/** 장르 칩 — i18n 자동 적용 (GENRE_KO). */
export function GenreTag({
  genre,
  variant = 'soft',
  size = 'md',
}: {
  genre: string
  variant?: Variant
  size?: Size
}) {
  const s = SIZES[size]
  const bg = variant === 'solid' ? C.accent      : C.accentSoft
  const fg = variant === 'solid' ? '#ffffff'     : '#c4b5fd'
  return (
    <View style={{
      backgroundColor: bg, borderRadius: 999,
      paddingHorizontal: s.px, paddingVertical: s.py,
    }}>
      <Text style={{ color: fg, fontSize: s.font, fontWeight: '700' }}>
        {GENRE_KO[genre] ?? genre}
      </Text>
    </View>
  )
}
