import { useEffect, useState } from 'react'
import { Pressable, SafeAreaView, StatusBar, Text, View } from 'react-native'
import { BarChart2, Heart, Home, Shuffle } from 'lucide-react-native'
import { loadPrefs } from './src/storage'
import { styles } from './src/styles'
import { OnboardingScreen } from './src/components/OnboardingScreen'
import { HomeTab } from './src/tabs/HomeTab'
import { ExploreTab } from './src/tabs/ExploreTab'
import { SwipeTab } from './src/tabs/SwipeTab'
import { MyListTab } from './src/tabs/MyListTab'
import type { Anime, TabKey, UserPrefs } from './src/types'

const TABS: Array<{ key: TabKey; label: string; Icon: typeof Home }> = [
  { key: 'home',    label: '홈',      Icon: Home },
  { key: 'explore', label: '탐색',    Icon: BarChart2 },
  { key: 'swipe',   label: '스와이프', Icon: Shuffle },
  { key: 'mylist',  label: '내 목록', Icon: Heart },
]

export default function App() {
  const [prefs, setPrefs] = useState<UserPrefs | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('home')

  useEffect(() => {
    void loadPrefs().then(setPrefs)
  }, [])

  if (!prefs) return null  // 스플래시 유지

  if (!prefs.onboardingDone) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0f0f1a" />
        <OnboardingScreen onDone={setPrefs} />
      </SafeAreaView>
    )
  }

  const handleAnimePress = (_anime: Anime) => {
    // TODO: 상세 모달 or 스택 네비게이션
  }

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
            <View style={{
              backgroundColor: 'rgba(159,103,255,0.15)', borderRadius: 999,
              paddingHorizontal: 12, paddingVertical: 6,
              borderWidth: 1, borderColor: 'rgba(159,103,255,0.3)',
            }}>
              <Text style={{ color: '#9f67ff', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>
                {prefs.favoriteGenres.length}개 장르
              </Text>
            </View>
          </View>
          <Text style={styles.headerSubtitle}>
            취향 기반 · AniList 데이터 · 친구 공유
          </Text>
        </View>
      </View>

      {/* ── 탭 바 ── */}
      <View style={styles.tabBar}>
        {TABS.map(({ key, label, Icon }) => {
          const active = activeTab === key
          return (
            <Pressable
              key={key}
              onPress={() => setActiveTab(key)}
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
      {activeTab === 'home'    ? <HomeTab    favoriteGenres={prefs.favoriteGenres} onAnimePress={handleAnimePress} /> : null}
      {activeTab === 'explore' ? <ExploreTab onAnimePress={handleAnimePress} /> : null}
      {activeTab === 'swipe'   ? <SwipeTab   favoriteGenres={prefs.favoriteGenres} onAnimePress={handleAnimePress} /> : null}
      {activeTab === 'mylist'  ? <MyListTab  onAnimePress={handleAnimePress} /> : null}
    </SafeAreaView>
  )
}
