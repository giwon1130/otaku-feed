import {
  Image, Modal, Pressable, ScrollView, Text, View,
  StatusBar, Dimensions,
} from 'react-native'
import { X, Star, Tv, Calendar, Building2, BookOpen } from 'lucide-react-native'
import { GENRE_KO, SEASON_KO, STATUS_KO } from '../constants'
import type { Anime } from '../types'

const { height: SCREEN_H } = Dimensions.get('window')

type Props = {
  anime: Anime | null
  onClose: () => void
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, (m) => {
    const map: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' }
    return map[m] ?? m
  }).trim()
}

export function AnimeDetailModal({ anime, onClose }: Props) {
  if (!anime) return null

  return (
    <Modal
      visible={!!anime}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0f0f1a" />
      <View style={{ flex: 1, backgroundColor: '#0f0f1a' }}>

        {/* 배너 이미지 */}
        <View style={{ height: SCREEN_H * 0.32, position: 'relative' }}>
          <Image
            source={{ uri: anime.bannerImage ?? anime.coverImage }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
          {/* 그라데이션 오버레이 */}
          <View style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%',
            backgroundColor: 'rgba(15,15,26,0.7)',
          }} />
          {/* 닫기 버튼 */}
          <Pressable
            onPress={onClose}
            style={{
              position: 'absolute', top: 16, right: 16,
              backgroundColor: 'rgba(0,0,0,0.6)',
              borderRadius: 999, padding: 8,
            }}
          >
            <X size={20} color="#fff" strokeWidth={2.5} />
          </Pressable>

          {/* 커버 이미지 */}
          <View style={{
            position: 'absolute', bottom: -40, left: 20,
            shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
          }}>
            <Image
              source={{ uri: anime.coverImage }}
              style={{ width: 90, height: 126, borderRadius: 12, borderWidth: 2, borderColor: '#1a1a2e' }}
              resizeMode="cover"
            />
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: 52, paddingHorizontal: 20, paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
        >
          {/* 제목 */}
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', lineHeight: 28, marginBottom: 4 }}>
            {anime.title}
          </Text>
          {anime.titleNative ? (
            <Text style={{ color: '#6b6b99', fontSize: 13, marginBottom: 12 }}>
              {anime.titleNative}
            </Text>
          ) : null}

          {/* 메타 정보 */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            {anime.score ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Star size={14} color="#f59e0b" fill="#f59e0b" strokeWidth={2} />
                <Text style={{ color: '#f59e0b', fontSize: 13, fontWeight: '700' }}>
                  {(anime.score / 10).toFixed(1)}
                </Text>
              </View>
            ) : null}
            {anime.episodes ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Tv size={13} color="#a8a8cc" strokeWidth={2} />
                <Text style={{ color: '#a8a8cc', fontSize: 13 }}>{anime.episodes}화</Text>
              </View>
            ) : null}
            {anime.seasonYear ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Calendar size={13} color="#a8a8cc" strokeWidth={2} />
                <Text style={{ color: '#a8a8cc', fontSize: 13 }}>
                  {anime.seasonYear}{anime.season ? ` ${SEASON_KO[anime.season] ?? anime.season}` : ''}
                </Text>
              </View>
            ) : null}
            {anime.studios[0] ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Building2 size={13} color="#a8a8cc" strokeWidth={2} />
                <Text style={{ color: '#a8a8cc', fontSize: 13 }}>{anime.studios[0]}</Text>
              </View>
            ) : null}
            {anime.status ? (
              <View style={{
                backgroundColor: anime.status === 'RELEASING' ? 'rgba(16,185,129,0.15)' : 'rgba(107,107,153,0.2)',
                borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2,
              }}>
                <Text style={{
                  color: anime.status === 'RELEASING' ? '#10b981' : '#a8a8cc',
                  fontSize: 11, fontWeight: '700',
                }}>
                  {STATUS_KO[anime.status] ?? anime.status}
                </Text>
              </View>
            ) : null}
          </View>

          {/* 장르 태그 */}
          {anime.genres.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
              {anime.genres.map((g) => (
                <View key={g} style={{
                  backgroundColor: '#2d1b69', borderRadius: 999,
                  paddingHorizontal: 10, paddingVertical: 4,
                }}>
                  <Text style={{ color: '#c4b5fd', fontSize: 12, fontWeight: '700' }}>
                    {GENRE_KO[g] ?? g}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* 줄거리 */}
          {anime.description ? (
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <BookOpen size={14} color="#9f67ff" strokeWidth={2.5} />
                <Text style={{ color: '#9f67ff', fontSize: 13, fontWeight: '800' }}>줄거리</Text>
              </View>
              <Text style={{ color: '#c8c8e8', fontSize: 14, lineHeight: 22 }}>
                {stripHtml(anime.description)}
              </Text>
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  )
}
