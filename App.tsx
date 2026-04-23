import { useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, SafeAreaView, StatusBar, Text, View } from 'react-native'
import { BarChart2, Heart, Home, LogOut, Shuffle, Sparkles, User, Wand2 } from 'lucide-react-native'
import { loadPrefs, savePrefs, syncLocalToServer } from './src/storage'
import { apiLogout, apiMe, getToken, type AuthResponse } from './src/api/otakuApi'
import { styles } from './src/styles'
import { hapticLight } from './src/utils/haptics'
import { AuthScreen } from './src/components/AuthScreen'
import { AnimeDetailModal } from './src/components/AnimeDetailModal'
import { OnboardingScreen } from './src/components/OnboardingScreen'
import { TasteOnboardingScreen } from './src/components/TasteOnboardingScreen'
import { HomeTab } from './src/tabs/HomeTab'
import { ExploreTab } from './src/tabs/ExploreTab'
import { SwipeTab } from './src/tabs/SwipeTab'
import { MyListTab } from './src/tabs/MyListTab'
import type { Anime, TabKey, UserPrefs } from './src/types'

const TABS: Array<{ key: TabKey; label: string; Icon: typeof Home }> = [
  { key: 'home',    label: '홈',       Icon: Home },
  { key: 'explore', label: '탐색',     Icon: BarChart2 },
  { key: 'swipe',   label: '스와이프', Icon: Shuffle },
  { key: 'mylist',  label: '내 목록',  Icon: Heart },
]

type AppStep = 'loading' | 'onboarding' | 'taste' | 'auth' | 'main'

export default function App() {
  const [step, setStep]       = useState<AppStep>('loading')
  const [prefs, setPrefs]     = useState<UserPrefs | null>(null)
  const [user, setUser]       = useState<AuthResponse | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('home')
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null)
  const [editingGenres, setEditingGenres] = useState(false)
  const [editingTaste, setEditingTaste] = useState(false)

  // 앱 시작 시 토큰·취향 복원
  useEffect(() => {
    const init = async () => {
      // 저장된 토큰 확인
      const token = await getToken()
      if (token) {
        const me = await apiMe().catch(() => null)
        if (me) setUser(me)
      }

      const loadedPrefs = await loadPrefs()
      setPrefs(loadedPrefs)

      if (!loadedPrefs.onboardingDone) {
        setStep('onboarding')
      } else if (!loadedPrefs.tasteOnboardingDone) {
        // 기존 유저(장르만 고른 상태)는 다음 진입 때 taste 단계로 유도
        setStep('taste')
      } else {
        setStep('main')
      }
    }
    void init()
  }, [])

  const handleOnboardingDone = (p: UserPrefs) => {
    setPrefs(p)
    setStep('taste')    // 장르 선택 → 취향 분석으로
  }

  const handleTasteDone = async (_likedCount: number) => {
    // 플래그 저장 → 다음 진입 때 다시 안 뜸
    const next: UserPrefs = { ...(prefs ?? { favoriteGenres: [], onboardingDone: true }), tasteOnboardingDone: true }
    setPrefs(next)
    await savePrefs(next)
    setStep('auth')   // 취향 분석 → 로그인 유도
  }

  const handleAuthDone = async (authUser: AuthResponse) => {
    setUser(authUser)
    await syncLocalToServer()   // 로그인 전 로컬 데이터 서버에 업로드
    setStep('main')
  }

  const handleSkipAuth = () => setStep('main')

  const handleLogout = async () => {
    await apiLogout()
    setUser(null)
    setShowUserMenu(false)
  }

  const handleAnimePress = (anime: Anime) => {
    setSelectedAnime(anime)
  }

  // ── 로딩 ──
  if (step === 'loading') {
    return (
      <SafeAreaView style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <StatusBar barStyle="light-content" backgroundColor="#0f0f1a" />
        <ActivityIndicator size="large" color="#9f67ff" />
      </SafeAreaView>
    )
  }

  // ── 온보딩 (장르) ──
  if (step === 'onboarding') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0f0f1a" />
        <OnboardingScreen onDone={handleOnboardingDone} />
      </SafeAreaView>
    )
  }

  // ── 취향 분석 (애니 카드) ──
  if (step === 'taste') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0f0f1a" />
        <TasteOnboardingScreen
          favoriteGenres={prefs?.favoriteGenres ?? []}
          onDone={handleTasteDone}
        />
      </SafeAreaView>
    )
  }

  // ── 로그인/회원가입 ──
  if (step === 'auth') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0f0f1a" />
        <AuthScreen onDone={handleAuthDone} onSkip={handleSkipAuth} />
      </SafeAreaView>
    )
  }

  // ── 장르 재선택 ──
  if (editingGenres) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0f0f1a" />
        <OnboardingScreen
          mode="edit"
          initialGenres={prefs?.favoriteGenres ?? []}
          onCancel={() => setEditingGenres(false)}
          onDone={(p) => {
            // 기존 tasteOnboardingDone 보존
            const merged: UserPrefs = { ...p, tasteOnboardingDone: prefs?.tasteOnboardingDone ?? false }
            setPrefs(merged)
            void savePrefs(merged)
            setEditingGenres(false)
          }}
        />
      </SafeAreaView>
    )
  }

  // ── 취향 재분석 ──
  if (editingTaste) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0f0f1a" />
        <TasteOnboardingScreen
          mode="edit"
          favoriteGenres={prefs?.favoriteGenres ?? []}
          onCancel={() => setEditingTaste(false)}
          onDone={async () => {
            // 메뉴에서 부른 거니까 main으로 복귀, 플래그는 이미 true 유지
            if (prefs && !prefs.tasteOnboardingDone) {
              const next: UserPrefs = { ...prefs, tasteOnboardingDone: true }
              setPrefs(next)
              await savePrefs(next)
            }
            setEditingTaste(false)
          }}
        />
      </SafeAreaView>
    )
  }

  // ── 메인 ──
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0f1a" />

      {/* ── 헤더 ── */}
      <View style={styles.headerWrap}>
        <View style={styles.headerGradient}>
          <View style={styles.headerTopRow}>
            <View>
              <Text style={styles.brand}>OTAKU FEED</Text>
              <Text style={styles.headerTitle}>애니 추천 피드</Text>
            </View>

            {/* 유저 상태 버튼 */}
            <Pressable
              onPress={() => setShowUserMenu((v) => !v)}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                backgroundColor: user ? 'rgba(159,103,255,0.15)' : 'rgba(255,255,255,0.08)',
                borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6,
                borderWidth: 1,
                borderColor: user ? 'rgba(159,103,255,0.3)' : 'rgba(255,255,255,0.1)',
              }}
            >
              <User size={13} color={user ? '#9f67ff' : '#6b6b99'} strokeWidth={2.5} />
              <Text style={{ color: user ? '#9f67ff' : '#6b6b99', fontSize: 11, fontWeight: '800' }}>
                {user ? user.nickname : '로그인'}
              </Text>
            </Pressable>
          </View>
          <Text style={styles.headerSubtitle}>
            {user
              ? `${prefs?.favoriteGenres.length ?? 0}개 장르 · 동기화 중`
              : `${prefs?.favoriteGenres.length ?? 0}개 장르 · 로컬 모드`}
          </Text>
        </View>
      </View>

      {/* 유저 메뉴 (로그인 상태) */}
      {showUserMenu ? (
        <View style={{
          marginHorizontal: 14, marginTop: 4,
          backgroundColor: '#1a1a2e', borderRadius: 14,
          borderWidth: 1, borderColor: '#2a2a4a', padding: 4,
        }}>
          {user ? (
            <View style={{ padding: 12 }}>
              <Text style={{ color: '#a8a8cc', fontSize: 12, fontWeight: '600' }}>{user.email}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={() => { setShowUserMenu(false); setEditingGenres(true) }}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 8,
              padding: 12, borderRadius: 10,
            }}
          >
            <Sparkles size={14} color="#9f67ff" strokeWidth={2.5} />
            <Text style={{ color: '#9f67ff', fontSize: 13, fontWeight: '700' }}>장르 다시 고르기</Text>
            <Text style={{ color: '#6b6b99', fontSize: 11, marginLeft: 'auto' }}>
              {prefs?.favoriteGenres.length ?? 0}개
            </Text>
          </Pressable>

          <Pressable
            onPress={() => { setShowUserMenu(false); setEditingTaste(true) }}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 8,
              padding: 12, borderRadius: 10,
            }}
          >
            <Wand2 size={14} color="#9f67ff" strokeWidth={2.5} />
            <Text style={{ color: '#9f67ff', fontSize: 13, fontWeight: '700' }}>취향 다시 분석</Text>
            <Text style={{ color: '#6b6b99', fontSize: 11, marginLeft: 'auto' }}>
              좋아요한 작품 기반
            </Text>
          </Pressable>

          {user ? (
            <Pressable
              onPress={handleLogout}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 8,
                padding: 12, borderRadius: 10,
              }}
            >
              <LogOut size={14} color="#ef4444" strokeWidth={2.5} />
              <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '700' }}>로그아웃</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => { setShowUserMenu(false); setStep('auth') }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 }}
            >
              <User size={14} color="#9f67ff" strokeWidth={2.5} />
              <Text style={{ color: '#9f67ff', fontSize: 13, fontWeight: '700' }}>로그인 / 회원가입</Text>
            </Pressable>
          )}
        </View>
      ) : null}

      {/* ── 탭 바 ── */}
      <View style={styles.tabBar}>
        {TABS.map(({ key, label, Icon }) => {
          const active = activeTab === key
          return (
            <Pressable
              key={key}
              onPress={() => { void hapticLight(); setActiveTab(key); setShowUserMenu(false) }}
              style={({ pressed }) => [
                styles.tabItem,
                active && styles.tabItemActive,
                pressed && styles.tabItemPressed,
              ]}
            >
              <Icon
                size={20}
                color={active ? '#9f67ff' : '#45456b'}
                strokeWidth={active ? 2.5 : 1.8}
              />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{label}</Text>
              {active && <View style={styles.tabActiveBar} />}
            </Pressable>
          )
        })}
      </View>

      {/* ── 탭 콘텐츠 ── */}
      {activeTab === 'home'    ? <HomeTab    favoriteGenres={prefs?.favoriteGenres ?? []} onAnimePress={handleAnimePress} /> : null}
      {activeTab === 'explore' ? <ExploreTab onAnimePress={handleAnimePress} /> : null}
      {activeTab === 'swipe'   ? <SwipeTab   favoriteGenres={prefs?.favoriteGenres ?? []} onAnimePress={handleAnimePress} /> : null}
      {activeTab === 'mylist'  ? <MyListTab  onAnimePress={handleAnimePress} /> : null}

      <AnimeDetailModal
        anime={selectedAnime}
        onClose={() => setSelectedAnime(null)}
        onSelectSimilar={(a) => setSelectedAnime(a)}
      />
    </SafeAreaView>
  )
}
