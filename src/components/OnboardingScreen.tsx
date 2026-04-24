import { Pressable, ScrollView, Text, View } from 'react-native'
import { X } from 'lucide-react-native'
import { styles } from '../styles'
import { loadPrefs, savePrefs } from '../storage'
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
  /** 'edit' 모드는 이미 온보딩한 유저가 장르만 다시 고를 때 */
  mode?: 'first' | 'edit'
  initialGenres?: string[]
  onCancel?: () => void
}

export function OnboardingScreen({ onDone, mode = 'first', initialGenres, onCancel }: Props) {
  const [selected, setSelected] = useState<string[]>(initialGenres ?? [])

  const toggle = (genre: string) => {
    setSelected((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre],
    )
  }

  const handleDone = async () => {
    // 기존 prefs(특히 tasteOnboardingDone) 보존 — 장르만 갱신
    const existing = await loadPrefs().catch(() => null)
    const prefs: UserPrefs = {
      ...(existing ?? {}),
      favoriteGenres: selected,
      onboardingDone: true,
    }
    await savePrefs(prefs)
    onDone(prefs)
  }

  const isEdit = mode === 'edit'

  return (
    <View style={styles.onboardingWrap}>
      {isEdit && onCancel ? (
        <Pressable
          onPress={onCancel}
          style={{
            position: 'absolute', top: 12, right: 12, zIndex: 1,
            backgroundColor: 'rgba(255,255,255,0.06)',
            borderRadius: 999, padding: 8,
          }}
        >
          <X size={18} color="#a8a8cc" strokeWidth={2.5} />
        </Pressable>
      ) : null}

      <View style={{ gap: 8 }}>
        <Text style={{ color: '#9f67ff', fontSize: 14, fontWeight: '900', letterSpacing: 3 }}>OTAKU FEED</Text>
        <Text style={styles.onboardingTitle}>
          {isEdit ? '좋아하는 장르\n다시 골라보자 ✨' : '좋아하는 장르를\n골라봐 👾'}
        </Text>
        <Text style={styles.onboardingSubtitle}>
          {isEdit
            ? '이전에 고른 장르가 표시되어 있어.\n자유롭게 빼거나 추가해.'
            : '선택한 장르로 취향에 맞는 애니를 추천해줄게.\n나중에 바꿀 수도 있어.'}
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
          {selected.length === 0
            ? '장르를 1개 이상 선택해'
            : isEdit
              ? `${selected.length}개로 저장`
              : `${selected.length}개 선택 완료 → 시작!`}
        </Text>
      </Pressable>
    </View>
  )
}
