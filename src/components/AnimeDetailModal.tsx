import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Image, Linking, Modal, Pressable, ScrollView, Text, View,
  StatusBar, Dimensions,
} from 'react-native'
import { X, Star, Tv, Calendar, Building2, BookOpen, MonitorPlay, Sparkles, ListOrdered } from 'lucide-react-native'
import { FORMAT_KO, GENRE_KO, RELATION_KO, SEASON_KO, STATUS_KO } from '../constants'
import { fetchAnimeById, fetchAnimeLinks, fetchAnimeRelations, fetchRecommendations } from '../api/anilist'
import { translateAnimeInfo, translateAnimeList } from '../api/translate'
import { ImageWithLoader } from './ImageWithLoader'
import { hapticLight } from '../utils/haptics'
import type { Anime, ExternalLink, RelationType, SeriesEntry } from '../types'

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

// 시리즈 관계 라벨 색상 (한 눈에 전작/속편 구분)
function relationBadgeBg(rel: RelationType): string {
  switch (rel) {
    case 'PREQUEL':     return '#1e3a5f'  // 청록 — 먼저
    case 'PARENT':      return '#3a1e5f'  // 보라 — 본편
    case 'SIDE_STORY':  return '#5f3a1e'  // 갈색 — 외전
    case 'SEQUEL':      return '#1e5f3a'  // 초록 — 다음
    case 'SPIN_OFF':    return '#5f1e4a'  // 자홍 — 스핀오프
    case 'ALTERNATIVE': return '#5f5f1e'  // 머스타드 — 대체판
    case 'SUMMARY':     return '#3a3a3a'  // 회색 — 총집편
    default:            return '#2d1b69'
  }
}
// 시리즈 그룹 키 — main story 4종은 한 묶음으로 보고, 나머지는 자기 타입이 곧 그룹.
function seriesGroupKey(rel: RelationType): string {
  return (rel === 'PARENT' || rel === 'PREQUEL' || rel === 'SIDE_STORY' || rel === 'SEQUEL')
    ? 'main' : rel
}

function relationBadgeFg(rel: RelationType): string {
  switch (rel) {
    case 'PREQUEL':     return '#7dd3fc'
    case 'PARENT':      return '#d8b4fe'
    case 'SIDE_STORY':  return '#fdba74'
    case 'SEQUEL':      return '#86efac'
    case 'SPIN_OFF':    return '#f9a8d4'
    case 'ALTERNATIVE': return '#fde68a'
    case 'SUMMARY':     return '#c0c0c0'
    default:            return '#c4b5fd'
  }
}

export function AnimeDetailModal({ anime, onClose, onSelectSimilar }: Props) {
  const [links,        setLinks]        = useState<ExternalLink[]>([])
  const [linksLoading, setLinksLoading] = useState(false)
  const [similar,        setSimilar]        = useState<Anime[]>([])
  const [similarLoading, setSimilarLoading] = useState(false)
  const [series,        setSeries]        = useState<SeriesEntry[]>([])
  const [seriesLoading, setSeriesLoading] = useState(false)
  // 시리즈에서 navigate된 stub Anime은 genres/studios/score 등이 비어 있어서
  // fetchAnimeById로 풀 메타를 받아서 표시용으로 보강.
  const [enriched, setEnriched] = useState<Anime | null>(null)
  // 잘려있던 description을 받았을 때(이전 캐시) 단건 재조회 + 번역으로 풀버전 보강
  const [fullDescription,        setFullDescription]        = useState<string | null>(null)
  const [fullDescriptionLoading, setFullDescriptionLoading] = useState(false)

  useEffect(() => {
    if (!anime) return
    setLinks([])
    setLinksLoading(true)
    fetchAnimeLinks({ id: anime.id, title: anime.title, titleNative: anime.titleNative })
      .then(setLinks)
      .finally(() => setLinksLoading(false))

    setSimilar([])
    setSimilarLoading(true)
    fetchRecommendations(anime.id, 10)
      .then(translateAnimeList)
      .then(setSimilar)
      .finally(() => setSimilarLoading(false))

    setSeries([])
    setSeriesLoading(true)
    fetchAnimeRelations(anime.id)
      .then(setSeries)
      .finally(() => setSeriesLoading(false))

    // props로 받은 description이 옛 캐시 영향으로 잘려 있을 수 있어서
    // 모달 열릴 때 항상 풀 데이터를 다시 받아서 보강.
    // 동시에 enriched에도 풀 메타 저장 → 시리즈 navigate stub의 빈 genres/studios 채움.
    setEnriched(null)
    setFullDescription(null)
    setFullDescriptionLoading(true)
    fetchAnimeById(anime.id)
      .then(async (full) => {
        if (!full) return
        setEnriched(full)
        const raw = full.description?.trim()
        if (!raw) return
        // 한국어 같으면 그대로, 아니면 번역
        const looksKorean = /[\uac00-\ud7af]/.test(raw.slice(0, 80))
        if (looksKorean) {
          setFullDescription(raw)
        } else {
          const { description } = await translateAnimeInfo(anime.title, raw)
          setFullDescription(description)
        }
      })
      .finally(() => setFullDescriptionLoading(false))
  }, [anime?.id])

  if (!anime) return null

  // stub(시리즈 navigate)이면 enriched 우선, 일반 진입이면 props anime 우선.
  // genres가 비어 있으면 stub으로 간주.
  const isStub = anime.genres.length === 0 && !anime.description
  const view: Anime = isStub && enriched ? enriched : anime

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
            source={{ uri: view.bannerImage ?? view.coverImage }}
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
              source={{ uri: view.coverImage }}
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
            {view.title}
          </Text>
          {view.titleNative ? (
            <Text style={{ color: '#6b6b99', fontSize: 13, marginBottom: 12 }}>
              {view.titleNative}
            </Text>
          ) : null}

          {/* 메타 정보 */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
            {view.score ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Star size={14} color="#f59e0b" fill="#f59e0b" strokeWidth={2} />
                <Text style={{ color: '#f59e0b', fontSize: 13, fontWeight: '700' }}>
                  {(view.score / 10).toFixed(1)}
                </Text>
              </View>
            ) : null}
            {view.episodes ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Tv size={13} color="#a8a8cc" strokeWidth={2} />
                <Text style={{ color: '#a8a8cc', fontSize: 13 }}>{view.episodes}화</Text>
              </View>
            ) : null}
            {view.seasonYear ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Calendar size={13} color="#a8a8cc" strokeWidth={2} />
                <Text style={{ color: '#a8a8cc', fontSize: 13 }}>
                  {view.seasonYear}{view.season ? ` ${SEASON_KO[view.season] ?? view.season}` : ''}
                </Text>
              </View>
            ) : null}
            {view.studios[0] ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Building2 size={13} color="#a8a8cc" strokeWidth={2} />
                <Text style={{ color: '#a8a8cc', fontSize: 13 }}>{view.studios[0]}</Text>
              </View>
            ) : null}
            {view.status ? (
              <View style={{
                backgroundColor: view.status === 'RELEASING' ? 'rgba(16,185,129,0.15)' : 'rgba(107,107,153,0.2)',
                borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2,
              }}>
                <Text style={{
                  color: view.status === 'RELEASING' ? '#10b981' : '#a8a8cc',
                  fontSize: 11, fontWeight: '700',
                }}>
                  {STATUS_KO[view.status] ?? view.status}
                </Text>
              </View>
            ) : null}
          </View>

          {/* 장르 태그 */}
          {view.genres.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
              {view.genres.map((g) => (
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
              <>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {links.map((link) => {
                    const color = (link.color ?? PLATFORM_COLOR[link.site]) ?? '#7c3aed'
                    const isRegional = link.regional === true
                    return (
                      <Pressable
                        key={link.url}
                        onPress={() => void Linking.openURL(link.url)}
                        style={{
                          paddingHorizontal: 14, paddingVertical: 9,
                          borderRadius: 12, borderWidth: 1.5,
                          borderColor: color + (isRegional ? 'aa' : '55'),
                          backgroundColor: color + (isRegional ? '33' : '15'),
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
                        {isRegional ? (
                          <View style={{
                            backgroundColor: '#10b98133', borderRadius: 999,
                            paddingHorizontal: 6, paddingVertical: 1, marginLeft: 2,
                          }}>
                            <Text style={{ color: '#10b981', fontSize: 9, fontWeight: '900' }}>KR</Text>
                          </View>
                        ) : (
                          <View style={{
                            backgroundColor: '#6b6b9933', borderRadius: 999,
                            paddingHorizontal: 6, paddingVertical: 1, marginLeft: 2,
                          }}>
                            <Text style={{ color: '#a8a8cc', fontSize: 9, fontWeight: '900' }}>글로벌</Text>
                          </View>
                        )}
                      </Pressable>
                    )
                  })}
                </View>
                {links.some((l) => l.regional !== true) ? (
                  <Text style={{ color: '#6b6b99', fontSize: 11, marginTop: 2 }}>
                    ⚠️ "글로벌" 표시는 해외 카탈로그 기준이라 한국 계정에선 안 보일 수도 있어.
                  </Text>
                ) : null}
              </>
            ) : (
              <Text style={{ color: '#45456b', fontSize: 13, fontWeight: '600' }}>
                한국에서 볼 수 있는 플랫폼 정보가 없어. 😢
              </Text>
            )}
          </View>

          {/* 줄거리 */}
          {(view.description || fullDescription || fullDescriptionLoading) ? (
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <BookOpen size={14} color="#9f67ff" strokeWidth={2.5} />
                <Text style={{ color: '#9f67ff', fontSize: 13, fontWeight: '800' }}>줄거리</Text>
              </View>
              {fullDescription ? (
                <Text style={{ color: '#c8c8e8', fontSize: 14, lineHeight: 22 }}>
                  {stripHtml(fullDescription)}
                </Text>
              ) : view.description ? (
                <Text style={{ color: '#c8c8e8', fontSize: 14, lineHeight: 22 }}>
                  {stripHtml(view.description)}
                  {fullDescriptionLoading ? '…' : ''}
                </Text>
              ) : fullDescriptionLoading ? (
                <ActivityIndicator size="small" color="#9f67ff" style={{ alignSelf: 'flex-start' }} />
              ) : null}
            </View>
          ) : null}

          {/* ── 시리즈 보는 순서 ── */}
          {(seriesLoading || series.length > 0) ? (
            <View style={{ gap: 10, marginTop: 24 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <ListOrdered size={14} color="#9f67ff" strokeWidth={2.5} />
                <Text style={{ color: '#9f67ff', fontSize: 13, fontWeight: '800' }}>시리즈 보는 순서</Text>
              </View>
              {seriesLoading ? (
                <ActivityIndicator size="small" color="#9f67ff" style={{ alignSelf: 'flex-start' }} />
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10, alignItems: 'flex-start' }}
                >
                  {series.map((item, index) => {
                    const yearLabel = item.seasonYear ? String(item.seasonYear) : ''
                    const formatLabel = item.format ? (FORMAT_KO[item.format] ?? item.format) : ''
                    const epLabel = item.episodes ? `${item.episodes}화` : ''
                    const sub = [yearLabel, formatLabel, epLabel].filter(Boolean).join(' · ')
                    const prev = index > 0 ? series[index - 1] : null
                    const isNewGroup = !prev || seriesGroupKey(prev.relationType) !== seriesGroupKey(item.relationType)
                    return (
                      <View
                        key={String(item.id)}
                        style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}
                      >
                        {/* 그룹이 바뀔 때 세로 디바이더 + 그룹 라벨 (첫 그룹 제외) */}
                        {isNewGroup && index > 0 ? (
                          <View style={{
                            width: 1, alignSelf: 'stretch',
                            backgroundColor: '#2a2a4a', marginRight: 4,
                          }} />
                        ) : null}
                        <Pressable
                          onPress={() => {
                            void hapticLight()
                            if (onSelectSimilar) {
                              // SeriesEntry → Anime로 변환해서 모달 재오픈
                              // (모달 useEffect에서 fetchAnimeById로 풀 메타 보강함)
                              onSelectSimilar({
                                id: item.id,
                                title: item.title,
                                titleNative: item.titleNative,
                                coverImage: item.coverImage,
                                bannerImage: null,
                                score: item.score,
                                episodes: item.episodes,
                                status: item.status,
                                season: item.season,
                                seasonYear: item.seasonYear,
                                genres: [],
                                description: '',
                                studios: [],
                                popularity: 0,
                                source: 'OTHER',
                              })
                            }
                          }}
                          style={{ width: 130 }}
                        >
                          {/* 순서 번호 + 관계 라벨 */}
                          <View style={{
                            flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6,
                          }}>
                            <View style={{
                              width: 18, height: 18, borderRadius: 9,
                              backgroundColor: '#2d1b69', alignItems: 'center', justifyContent: 'center',
                            }}>
                              <Text style={{ color: '#c4b5fd', fontSize: 10, fontWeight: '900' }}>
                                {index + 1}
                              </Text>
                            </View>
                            <View style={{
                              backgroundColor: relationBadgeBg(item.relationType),
                              borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
                            }}>
                              <Text style={{
                                color: relationBadgeFg(item.relationType),
                                fontSize: 10, fontWeight: '900',
                              }}>
                                {RELATION_KO[item.relationType] ?? item.relationType}
                              </Text>
                            </View>
                          </View>
                          <ImageWithLoader
                            uri={item.coverImage}
                            style={{
                              width: 130, height: 184, borderRadius: 10,
                            }}
                            resizeMode="cover"
                          />
                          <Text
                            style={{ color: '#f0f0ff', fontSize: 12, fontWeight: '700', marginTop: 6 }}
                            numberOfLines={2}
                          >
                            {item.title}
                          </Text>
                          {sub ? (
                            <Text
                              style={{ color: '#6b6b99', fontSize: 11, marginTop: 2 }}
                              numberOfLines={1}
                            >
                              {sub}
                            </Text>
                          ) : null}
                          {item.score ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 }}>
                              <Star size={10} color="#f59e0b" fill="#f59e0b" />
                              <Text style={{ color: '#f59e0b', fontSize: 11, fontWeight: '700' }}>
                                {(item.score / 10).toFixed(1)}
                              </Text>
                            </View>
                          ) : null}
                        </Pressable>
                      </View>
                    )
                  })}
                </ScrollView>
              )}
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
