import { Pressable, ScrollView, Text, View } from 'react-native'
import { styles } from '../styles'
import { savePrefs } from '../storage'
import type { UserPrefs } from '../types'
import { useState } from 'react'

const ALL_GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy',
  'Horror', 'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life',
  'Sports', 'Supernatural', 'Thriller', 'Mecha', 'Psychological',
]

const GENRE_KO: Record<string, string> = {
  'Action': '액션', 'Adventure': '모험', 'Comedy': '코미디',
  'Drama': '드라마', 'Fantasy': '판타지', 'Horror': '호러',
  'Mystery': '미스터리', 'Romance': '로맨스', 'Sci-Fi': 'SF',
  'Slice of Life': '일상', 'Sports': '스포츠', 'Supernatural': '초자연',
  'Thriller': '스릴러', 'Mecha': '메카', 'Psychological': '심리',
}

type Props = {
  onDone: (prefs: UserPrefs) => void
}

export function OnboardingScreen({ onDone }: Props) {
  const [selected, setSelected] = useState<string[]>([])

  const toggle = (genre: string) => {
    setSelected((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre],
    )
  }

  const handleDone = async () => {
    const prefs: UserPrefs = { favoriteGenres: selected, onboardingDone: true }
    await savePrefs(prefs)
    onDone(prefs)
  }

  return (
    <View style={styles.onboardingWrap}>
      <View style={{ gap: 8 }}>
        <Text style={{ color: '#9f67ff', fontSize: 14, fontWeight: '900', letterSpacing: 3 }}>OTAKU FEED</Text>
        <Text style={styles.onboardingTitle}>좋아하는 장르를{'\n'}골라봐 👾</Text>
        <Text style={styles.onboardingSubtitle}>
          선택한 장르로 취향에 맞는 애니를 추천해줄게.{'\n'}나중에 바꿀 수도 있어.
        </Text>
      </View>

      <ScrollView contentContainerStyle={[styles.genreChipRow, { paddingBottom: 20 }]} showsVerticalScrollIndicator={false}>
        {ALL_GENRES.map((genre) => {
          const active = selected.includes(genre)
          return (
            <Pressable key={genre} onPress={() => toggle(genre)} style={[styles.genreChip, active && styles.genreChipActive]}>
              <Text style={[styles.genreChipText, active && styles.genreChipTextActive]}>
                {GENRE_KO[genre] ?? genre}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>

      <Pressable
        onPress={handleDone}
        style={[styles.onboardingCTA, { opacity: selected.length === 0 ? 0.5 : 1 }]}
        disabled={selected.length === 0}
      >
        <Text style={styles.onboardingCTAText}>
          {selected.length === 0 ? '장르를 1개 이상 선택해' : `${selected.length}개 선택 완료 → 시작!`}
        </Text>
      </Pressable>
    </View>
  )
}
