import { useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native'
import { Heart, RefreshCw, Sparkles, X } from 'lucide-react-native'
import { fetchTasteCandidates } from '../api/anilist'
import { translateAnimeList } from '../api/translate'
import { ImageWithLoader } from './ImageWithLoader'
import { addSwipe, getSwipeMap, removeSwipe } from '../storage'
import { hapticLight, hapticSuccess } from '../utils/haptics'
import { styles, C_TOKENS as C } from '../styles'
import type { Anime, SwipeResult } from '../types'

type Props = {
  /** 첫 온보딩 직후 호출되며 prefs.favoriteGenres가 들어옴 */
  favoriteGenres: string[]
  /** 'first' = 처음, 'edit' = 메뉴에서 다시 분석 */
  mode?: 'first' | 'edit'
  onCancel?: () => void
  /** 선택을 storage에 저장한 뒤 호출 (선택 개수 전달) */
  onDone: (likedCount: number) => void
}

const MIN_PICKS = 3
const PER_PAGE = 24

export function TasteOnboardingScreen({
  favoriteGenres,
  mode = 'first',
  onCancel,
  onDone,
}: Props) {
  const [pool,    setPool]    = useState<Anime[]>([])
  const [loading, setLoading] = useState(true)
  const [swipeMap, setSwipeMap] = useState<Record<number, SwipeResult>>({})
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  // 처음 한 번 로드
  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const load = async () => {
    try {
      setLoading(true)
      setError(null)
      const sm = await getSwipeMap()
      setSwipeMap(sm)
      const raw = await fetchTasteCandidates(favoriteGenres, PER_PAGE)
      const translated = await translateAnimeList(raw)
      setPool(translated)
    } catch (e) {
      setError((e as Error).message ?? '불러오기 실패')
    } finally {
      setLoading(false)
    }
  }

  const togglePick = async (anime: Anime) => {
    void hapticLight()
    const cur = swipeMap[anime.id]
    if (cur === 'like') {
      // 해제
      setSwipeMap((m) => {
        const next = { ...m }
        delete next[anime.id]
        return next
      })
      await removeSwipe(anime.id)
    } else {
      // 좋아요로 설정 (skip/dislike이었더라도 like로 덮어씀)
      setSwipeMap((m) => ({ ...m, [anime.id]: 'like' }))
      await addSwipe({ animeId: anime.id, result: 'like', swipedAt: new Date().toISOString() })
    }
  }

  // 현재 화면 풀 안에서 좋아요한 개수 (전체 likedIds가 아니라, 이번 세션에서 새로 고른 게 명확하지 않으므로
  //  "보여진 후보 중 like" 기준)
  const likedInPool = useMemo(
    () => pool.filter((a) => swipeMap[a.id] === 'like').length,
    [pool, swipeMap],
  )

  const handleDone = async () => {
    setSaving(true)
    try {
      // 모든 like는 togglePick에서 이미 저장됨. 여기선 단순 콜백.
      void hapticSuccess()
      onDone(likedInPool)
    } finally {
      setSaving(false)
    }
  }

  const isEdit = mode === 'edit'
  const canSubmit = isEdit ? likedInPool > 0 : likedInPool >= MIN_PICKS

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* 헤더 */}
      <View style={{ paddingHorizontal: 20, paddingTop: 60, paddingBottom: 12 }}>
        {isEdit && onCancel ? (
          <Pressable
            onPress={onCancel}
            style={{
              position: 'absolute', top: 12, right: 12,
              backgroundColor: 'rgba(255,255,255,0.06)',
              borderRadius: 999, padding: 8,
            }}
          >
            <X size={18} color={C.inkSub} strokeWidth={2.5} />
          </Pressable>
        ) : null}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <Sparkles size={14} color={C.accentGlow} strokeWidth={2.5} />
          <Text style={{ color: C.accentGlow, fontSize: 13, fontWeight: '900', letterSpacing: 1.5 }}>
            {isEdit ? 'TASTE EDIT' : 'TASTE CHECK'}
          </Text>
        </View>
        <Text style={styles.onboardingTitle}>
          {isEdit ? '취향 다시 분석 ✨' : '좋아하는 작품을 골라줘 ❤️'}
        </Text>
        <Text style={[styles.onboardingSubtitle, { marginTop: 6 }]}>
          {isEdit
            ? '추가/제거하면 추천이 바로 갱신돼.'
            : `${MIN_PICKS}개 이상 골라주면 그걸 토대로 추천해줄게.\n나중에 메뉴에서 다시 고를 수도 있어.`}
        </Text>
      </View>

      {/* 본문 그리드 */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.accentGlow} />
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 20 }}>
          <Text style={{ color: C.red, fontSize: 14, textAlign: 'center' }}>{error}</Text>
          <Pressable
            onPress={() => void load()}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: C.accentSoft, paddingHorizontal: 14, paddingVertical: 8,
              borderRadius: 10,
            }}
          >
            <RefreshCw size={14} color={C.accentGlow} strokeWidth={2.5} />
            <Text style={{ color: C.accentGlow, fontWeight: '800', fontSize: 13 }}>다시 시도</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={pool}
          keyExtractor={(item) => String(item.id)}
          numColumns={3}
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 100, gap: 10 }}
          columnWrapperStyle={{ gap: 10 }}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <Pressable
              onPress={() => void load()}
              style={{
                marginTop: 16, alignSelf: 'center',
                flexDirection: 'row', alignItems: 'center', gap: 6,
                backgroundColor: 'rgba(159,103,255,0.1)',
                borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8,
              }}
            >
              <RefreshCw size={12} color={C.accentGlow} strokeWidth={2.5} />
              <Text style={{ color: C.accentGlow, fontSize: 12, fontWeight: '800' }}>
                다른 작품 더 보기
              </Text>
            </Pressable>
          }
          renderItem={({ item }) => {
            const liked = swipeMap[item.id] === 'like'
            return (
              <Pressable
                onPress={() => void togglePick(item)}
                style={{ flex: 1 / 3 }}
              >
                <View style={{
                  position: 'relative',
                  borderRadius: 10, overflow: 'hidden',
                  borderWidth: 2,
                  borderColor: liked ? C.accentGlow : 'transparent',
                }}>
                  <ImageWithLoader
                    uri={item.coverImage}
                    style={{ width: '100%', aspectRatio: 2 / 3 }}
                    resizeMode="cover"
                  />
                  {/* 선택 오버레이 */}
                  {liked ? (
                    <View style={{
                      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                      backgroundColor: 'rgba(124,58,237,0.35)',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <View style={{
                        backgroundColor: C.accent, borderRadius: 999, padding: 8,
                      }}>
                        <Heart size={20} color="#fff" fill="#fff" strokeWidth={2.5} />
                      </View>
                    </View>
                  ) : null}
                </View>
                <Text
                  style={{
                    color: liked ? C.accentGlow : C.ink,
                    fontSize: 11, fontWeight: liked ? '900' : '700', marginTop: 6,
                  }}
                  numberOfLines={2}
                >
                  {item.title}
                </Text>
              </Pressable>
            )
          }}
        />
      )}

      {/* 하단 CTA */}
      <View style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: C.bg, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28,
        borderTopWidth: 1, borderTopColor: C.border,
      }}>
        <Pressable
          onPress={() => void handleDone()}
          disabled={!canSubmit || saving}
          style={[
            styles.onboardingCTA,
            { opacity: canSubmit && !saving ? 1 : 0.4 },
          ]}
        >
          <Text style={styles.onboardingCTAText}>
            {saving
              ? '저장 중…'
              : likedInPool === 0
                ? (isEdit ? '취소하려면 X 눌러' : `좋아하는 거 ${MIN_PICKS}개 이상 골라`)
                : !canSubmit
                  ? `${likedInPool}/${MIN_PICKS}개 — ${MIN_PICKS - likedInPool}개 더 골라`
                  : isEdit
                    ? `${likedInPool}개 저장`
                    : `${likedInPool}개 선택 → 다음으로!`}
          </Text>
        </Pressable>
      </View>
    </View>
  )
}
