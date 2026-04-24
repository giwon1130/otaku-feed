import { useEffect, useState } from 'react'
import { Modal, ScrollView, StatusBar, Text, View } from 'react-native'
import { fetchAnimeById, fetchAnimeLinks, fetchAnimeRelations, fetchRecommendations } from '../api/anilist'
import { translateAnimeInfo, translateAnimeList } from '../api/translate'
import { GenreTag, MetaRow } from './shared'
import { DetailHeader } from './detail/DetailHeader'
import { WhereToWatch } from './detail/WhereToWatch'
import { Synopsis } from './detail/Synopsis'
import { SeriesOrder } from './detail/SeriesOrder'
import { SimilarList } from './detail/SimilarList'
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
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <DetailHeader anime={view} onClose={onClose} />

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
            <Text style={{ color: C.inkMuted, fontSize: 13, marginBottom: 12 }}>
              {view.titleNative}
            </Text>
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
