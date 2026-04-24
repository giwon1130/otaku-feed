import { Pressable, Text, View } from 'react-native'
import { Star } from 'lucide-react-native'
import { ImageWithLoader } from '../ImageWithLoader'
import { ScoreBadge } from './ScoreBadge'
import { styles, C_TOKENS as C } from '../../styles'
import type { Anime, SwipeResult } from '../../types'

type Props = {
  anime: Anime
  onPress: (anime: Anime) => void
  /** 좋아요/패스 표시. */
  swipeResult?: SwipeResult
  /** 점수 배지를 카드 본문에 표시할지 (기본 true). */
  showScore?: boolean
}

/**
 * 가로 스크롤용 애니 포스터 카드 (130×185).
 * HomeTab의 hCard 패턴 + like 배지 + 점수.
 */
export function AnimeCard({ anime, onPress, swipeResult, showScore = true }: Props) {
  return (
    <Pressable onPress={() => onPress(anime)} style={styles.hCard}>
      <ImageWithLoader uri={anime.coverImage} style={styles.hCardImage} resizeMode="cover" />
      {swipeResult === 'like' ? (
        <View style={styles.hCardLikeBadge}>
          <Star size={10} color="#fff" fill="#fff" />
        </View>
      ) : swipeResult === 'dislike' ? (
        <View style={[styles.hCardLikeBadge, { backgroundColor: 'rgba(239,68,68,0.85)' }]}>
          <Text style={{ color: '#fff', fontSize: 9, fontWeight: '900' }}>✕</Text>
        </View>
      ) : null}
      <View style={styles.hCardBody}>
        <Text style={styles.hCardTitle} numberOfLines={2}>{anime.title}</Text>
        {showScore ? <ScoreBadge score={anime.score} size="sm" /> : null}
      </View>
    </Pressable>
  )
}

/**
 * 세로 110px 작은 포스터 카드 — 디테일 모달 "비슷한 작품" 섹션용.
 */
export function AnimeMiniCard({ anime, onPress }: { anime: Anime; onPress: (a: Anime) => void }) {
  return (
    <Pressable onPress={() => onPress(anime)} style={{ width: 110 }}>
      <ImageWithLoader
        uri={anime.coverImage}
        style={{ width: 110, height: 156, borderRadius: 10 }}
        resizeMode="cover"
      />
      <Text
        style={{ color: C.ink, fontSize: 12, fontWeight: '700', marginTop: 6 }}
        numberOfLines={2}
      >
        {anime.title}
      </Text>
      <ScoreBadge score={anime.score} size="sm" />
    </Pressable>
  )
}
