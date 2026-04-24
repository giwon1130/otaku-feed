import { Text, View } from 'react-native'
import { Building2, Calendar, Star, Tv } from 'lucide-react-native'
import { SEASON_KO, STATUS_KO } from '../../constants'
import { C_TOKENS as C } from '../../styles'
import type { Anime } from '../../types'

/**
 * 디테일 모달의 메타 정보 행 — 점수/에피소드/시즌·연도/스튜디오/방영상태.
 * 비어있는 항목은 자동으로 스킵.
 */
export function MetaRow({ anime }: { anime: Anime }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
      {anime.score ? (
        <View style={item}>
          <Star size={14} color={C.gold} fill={C.gold} strokeWidth={2} />
          <Text style={{ color: C.gold, fontSize: 13, fontWeight: '700' }}>
            {(anime.score / 10).toFixed(1)}
          </Text>
        </View>
      ) : null}
      {anime.episodes ? (
        <View style={item}>
          <Tv size={13} color={C.inkSub} strokeWidth={2} />
          <Text style={meta}>{anime.episodes}화</Text>
        </View>
      ) : null}
      {anime.seasonYear ? (
        <View style={item}>
          <Calendar size={13} color={C.inkSub} strokeWidth={2} />
          <Text style={meta}>
            {anime.seasonYear}{anime.season ? ` ${SEASON_KO[anime.season] ?? anime.season}` : ''}
          </Text>
        </View>
      ) : null}
      {anime.studios[0] ? (
        <View style={item}>
          <Building2 size={13} color={C.inkSub} strokeWidth={2} />
          <Text style={meta}>{anime.studios[0]}</Text>
        </View>
      ) : null}
      {anime.status ? (
        <View style={{
          backgroundColor: anime.status === 'RELEASING' ? 'rgba(16,185,129,0.15)' : 'rgba(107,107,153,0.2)',
          borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2,
        }}>
          <Text style={{
            color: anime.status === 'RELEASING' ? '#10b981' : C.inkSub,
            fontSize: 11, fontWeight: '700',
          }}>
            {STATUS_KO[anime.status] ?? anime.status}
          </Text>
        </View>
      ) : null}
    </View>
  )
}

const item = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 }
const meta = { color: C.inkSub, fontSize: 13 }
