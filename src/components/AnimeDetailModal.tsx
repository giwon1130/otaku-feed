import { useEffect, useState } from 'react'
import { ActivityIndicator, Modal, ScrollView, StatusBar, Text, View } from 'react-native'
import { fetchAnimeById, fetchAnimeLinks, fetchAnimeRelations, fetchLaftelKoreanName, fetchRecommendations } from '../api/anilist'
import { translateAnimeInfo, translateAnimeList } from '../api/translate'
import { GenreTag, MetaRow } from './shared'
import { DetailHeader } from './detail/DetailHeader'
import { WhereToWatch } from './detail/WhereToWatch'
import { Synopsis } from './detail/Synopsis'
import { SeriesOrder } from './detail/SeriesOrder'
import { SimilarList } from './detail/SimilarList'
import { LoadingBar } from './LoadingBar'
import { C_TOKENS as C } from '../styles'
import type { Anime, ExternalLink, SeriesEntry } from '../types'

type Props = {
  anime: Anime | null
  onClose: () => void
  onSelectSimilar?: (anime: Anime) => void
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
  // synonyms에 한국명 없는 작품은 라프텔 매칭 결과의 name으로 보강
  const [laftelKoTitle, setLaftelKoTitle] = useState<string | null>(null)

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

    // 라프텔에서 한국 출시명 시도 (영어 제목일 때만 의미 있음)
    setLaftelKoTitle(null)
    void fetchLaftelKoreanName({ title: anime.title, titleNative: anime.titleNative })
      .then((name) => name && setLaftelKoTitle(name))
      .catch(() => {})

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
  // stub인데 아직 enriched 못 받았으면 본문이 다 비어 있음 → 상단 로더 표시
  const isEnriching = isStub && !enriched
  // 어떤 fetch라도 진행 중이면 상단에 indeterminate progress bar
  const anyLoading = linksLoading || similarLoading || seriesLoading || fullDescriptionLoading || isEnriching

  return (
    <Modal
      visible={!!anime}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <DetailHeader anime={view} onClose={onClose} />
        {/* 상단 진행 표시 — header 위에 떠 있어 어떤 섹션이 로딩 중이든 한 곳에서 알 수 있음 */}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
          <LoadingBar visible={anyLoading} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingTop: 52, paddingHorizontal: 20, paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
        >
          {/* 제목 — 라프텔 한국 출시명이 있으면 우선 표시 */}
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900', lineHeight: 28, marginBottom: 4 }}>
            {laftelKoTitle ?? view.title}
          </Text>
          {view.titleNative ? (
            <Text style={{ color: C.inkMuted, fontSize: 13, marginBottom: 12 }}>
              {view.titleNative}
            </Text>
          ) : null}

          {isEnriching ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <ActivityIndicator size="small" color={C.accent} />
              <Text style={{ color: C.inkMuted, fontSize: 12, fontWeight: '600' }}>
                상세 정보 불러오는 중…
              </Text>
            </View>
          ) : null}

          <MetaRow anime={view} />

          {/* 장르 */}
          {view.genres.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
              {view.genres.map((g) => (
                <GenreTag key={g} genre={g} />
              ))}
            </View>
          ) : null}

          <WhereToWatch links={links} loading={linksLoading} />

          <Synopsis
            rawDescription={view.description}
            fullDescription={fullDescription}
            loading={fullDescriptionLoading}
          />

          <SeriesOrder series={series} loading={seriesLoading} onSelect={onSelectSimilar} />

          <SimilarList similar={similar} loading={similarLoading} onSelect={onSelectSimilar} />
        </ScrollView>
      </View>
    </Modal>
  )
}
