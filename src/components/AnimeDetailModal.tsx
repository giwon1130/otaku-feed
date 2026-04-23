import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Image, Linking, Modal, Pressable, ScrollView, Text, View,
  StatusBar, Dimensions,
} from 'react-native'
import { X, Star, Tv, Calendar, Building2, BookOpen, MonitorPlay, Sparkles } from 'lucide-react-native'
import { GENRE_KO, SEASON_KO, STATUS_KO } from '../constants'
import { fetchAnimeLinks, fetchRecommendations } from '../api/anilist'
import { translateAnimeList } from '../api/translate'
import { ImageWithLoader } from './ImageWithLoader'
import { hapticLight } from '../utils/haptics'
import type { Anime, ExternalLink } from '../types'

const { height: SCREEN_H } = Dimensions.get('window')

// 플랫폼별 색상
const PLATFORM_COLOR: Record<string, string> = {
  'Crunchyroll':           '#F47521',
  'Netflix':               '#E50914',
  'Amazon Prime Video':    '#00A8E0',
  'Amazon':                '#00A8E0',
  'Disney+':               '#113CCF',
  'Funimation':            '#5B0BB5',
  'HIDIVE':                '#00AEEF',
  'YouTube':               '#FF0000',
  'Hulu':                  '#3DBB3D',
  'Apple TV+':             '#555555',
  'Bilibili':              '#00A1D6',
  'VRV':                   '#FFDB1E',
  'Wakanim':               '#E4001E',
  'AnimeLabPlus':          '#1B55A0',
}

type Props = {
  anime: Anime | null
  onClose: () => void
  onSelectSimilar?: (anime: Anime) => void
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, (m) => {
    const map: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' }
    return map[m] ?? m
  }).trim()
}

export function AnimeDetailModal({ anime, onClose, onSelectSimilar }: Props) {
  const [links,        setLinks]        = useState<ExternalLink[]>([])
  const [linksLoading, setLinksLoading] = useState(false)
  const [similar,        setSimilar]        = useState<Anime[]>([])
  const [similarLoading, setSimilarLoading] = useState(false)

  useEffect(() => {
    if (!anime) return
    setLinks([])
    setLinksLoading(true)
    fetchAnimeLinks(anime.id)
      .then(setLinks)
      .finally(() => setLinksLoading(false))

    setSimilar([])
    setSimilarLoading(true)
    fetchRecommendations(anime.id, 10)
      .then(translateAnimeList)
      .then(setSimilar)
      .finally(() => setSimilarLoading(false))
  }, [anime?.id])

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
          <View style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%',
            backgroundColor: 'rgba(15,15,26,0.7)',
          }} />
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

          {/* ── 어디서 볼 수 있어? ── */}
          <View style={{ gap: 10, marginBottom: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MonitorPlay size={14} color="#9f67ff" strokeWidth={2.5} />
              <Text style={{ color: '#9f67ff', fontSize: 13, fontWeight: '800' }}>어디서 볼 수 있어?</Text>
            </View>

            {linksLoading ? (
              <ActivityIndicator size="small" color="#9f67ff" style={{ alignSelf: 'flex-start' }} />
            ) : links.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {links.map((link) => {
                  const color = (link.color ?? PLATFORM_COLOR[link.site]) ?? '#7c3aed'
                  return (
                    <Pressable
                      key={link.url}
                      onPress={() => void Linking.openURL(link.url)}
                      style={{
                        paddingHorizontal: 14, paddingVertical: 9,
                        borderRadius: 12, borderWidth: 1.5,
                        borderColor: color + '66',
                        backgroundColor: color + '22',
                        flexDirection: 'row', alignItems: 'center', gap: 6,
                      }}
                    >
                      <View style={{
                        width: 8, height: 8, borderRadius: 4,
                        backgroundColor: color,
                      }} />
                      <Text style={{ color: '#f0f0ff', fontSize: 13, fontWeight: '700' }}>
                        {link.site}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            ) : (
              <Text style={{ color: '#45456b', fontSize: 13, fontWeight: '600' }}>
                한국에서 볼 수 있는 플랫폼 정보가 없어. 😢
              </Text>
            )}
          </View>

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

          {/* ── 비슷한 작품 ── */}
          {(similarLoading || similar.length > 0) ? (
            <View style={{ gap: 10, marginTop: 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Sparkles size={14} color="#9f67ff" strokeWidth={2.5} />
                <Text style={{ color: '#9f67ff', fontSize: 13, fontWeight: '800' }}>이거 좋아하면 이것도</Text>
              </View>
              {similarLoading ? (
                <ActivityIndicator size="small" color="#9f67ff" style={{ alignSelf: 'flex-start' }} />
              ) : (
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={similar}
                  keyExtractor={(item) => String(item.id)}
                  contentContainerStyle={{ gap: 10 }}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => {
                        void hapticLight()
                        if (onSelectSimilar) onSelectSimilar(item)
                      }}
                      style={{ width: 110 }}
                    >
                      <ImageWithLoader
                        uri={item.coverImage}
                        style={{ width: 110, height: 156, borderRadius: 10 }}
                        resizeMode="cover"
                      />
                      <Text
                        style={{ color: '#f0f0ff', fontSize: 12, fontWeight: '700', marginTop: 6 }}
                        numberOfLines={2}
                      >
                        {item.title}
                      </Text>
                      {item.score ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
                          <Star size={10} color="#f59e0b" fill="#f59e0b" />
                          <Text style={{ color: '#f59e0b', fontSize: 11, fontWeight: '700' }}>
                            {(item.score / 10).toFixed(1)}
                          </Text>
                        </View>
                      ) : null}
                    </Pressable>
                  )}
                />
              )}
            </View>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  )
}
