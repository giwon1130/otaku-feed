import AsyncStorage from '@react-native-async-storage/async-storage'
import type { SwipeRecord, UserPrefs } from './types'
import {
  apiDeleteSwipe,
  apiGetPrefs,
  apiGetSwipes,
  apiSavePrefs,
  apiSaveSwipe,
  getToken,
} from './api/otakuApi'

const KEYS = {
  prefs:    'otaku:prefs',
  swipes:   'otaku:swipes',
  deviceId: 'otaku:deviceId',
}

// ── 로그인 여부 확인 ──────────────────────────────────────────────────────────

async function isLoggedIn(): Promise<boolean> {
  const token = await getToken()
  return !!token
}

// ── Device ID ─────────────────────────────────────────────────────────────────

export async function getDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(KEYS.deviceId)
  if (existing) return existing
  const id = `device_${Date.now()}_${Math.random().toString(36).slice(2)}`
  await AsyncStorage.setItem(KEYS.deviceId, id)
  return id
}

// ── User Prefs ────────────────────────────────────────────────────────────────

const DEFAULT_PREFS: UserPrefs = { favoriteGenres: [], onboardingDone: false }

export async function loadPrefs(): Promise<UserPrefs> {
  // 로컬 캐시 먼저 읽음 — tasteOnboardingDone은 디바이스 로컬 플래그라 서버엔 없음.
  // 로그인 상태에서도 이 값은 로컬에서 유지해야 매번 taste 단계로 돌아가지 않음.
  const localRaw = await AsyncStorage.getItem(KEYS.prefs)
  const local = localRaw ? (JSON.parse(localRaw) as Partial<UserPrefs>) : null

  try {
    if (await isLoggedIn()) {
      const res = await apiGetPrefs()
      const prefs: UserPrefs = {
        favoriteGenres: res.favoriteGenres,
        onboardingDone: res.favoriteGenres.length > 0,
        tasteOnboardingDone: local?.tasteOnboardingDone ?? false,
      }
      // 로컬에도 캐시 (tasteOnboardingDone 보존)
      await AsyncStorage.setItem(KEYS.prefs, JSON.stringify(prefs))
      return prefs
    }
  } catch {
    // 서버 실패 시 로컬 폴백
  }

  return local ? { ...DEFAULT_PREFS, ...local } : DEFAULT_PREFS
}

export async function savePrefs(prefs: UserPrefs): Promise<void> {
  // 항상 로컬 저장
  await AsyncStorage.setItem(KEYS.prefs, JSON.stringify(prefs))
  // 로그인 상태면 서버에도 동기화
  if (await isLoggedIn()) {
    await apiSavePrefs(prefs.favoriteGenres).catch(() => {})
  }
}

// ── Swipe Records ─────────────────────────────────────────────────────────────

export async function loadSwipes(): Promise<SwipeRecord[]> {
  try {
    // 로그인 상태면 서버에서 가져옴
    if (await isLoggedIn()) {
      const res = await apiGetSwipes()
      const records: SwipeRecord[] = res.map((s) => ({
        animeId:  s.animeId,
        result:   s.result as SwipeRecord['result'],
        swipedAt: s.swipedAt,
      }))
      // 로컬에도 캐시
      await AsyncStorage.setItem(KEYS.swipes, JSON.stringify(records))
      return records
    }
  } catch {
    // 서버 실패 시 로컬 폴백
  }

  const raw = await AsyncStorage.getItem(KEYS.swipes)
  return raw ? (JSON.parse(raw) as SwipeRecord[]) : []
}

export async function addSwipe(record: SwipeRecord): Promise<void> {
  // 로컬 업데이트
  const swipes = await loadLocalSwipes()
  const filtered = swipes.filter((s) => s.animeId !== record.animeId)
  filtered.push(record)
  await AsyncStorage.setItem(KEYS.swipes, JSON.stringify(filtered))

  // 로그인 상태면 서버에도 동기화
  if (await isLoggedIn()) {
    await apiSaveSwipe(record.animeId, record.result).catch(() => {})
  }
}

export async function removeSwipe(animeId: number): Promise<void> {
  const swipes = await loadLocalSwipes()
  await AsyncStorage.setItem(KEYS.swipes, JSON.stringify(swipes.filter((s) => s.animeId !== animeId)))

  if (await isLoggedIn()) {
    await apiDeleteSwipe(animeId).catch(() => {})
  }
}

export async function getLikedIds(): Promise<number[]> {
  const swipes = await loadSwipes()
  return swipes.filter((s) => s.result === 'like').map((s) => s.animeId)
}

export async function getSwipeMap(): Promise<Record<number, SwipeRecord['result']>> {
  const swipes = await loadSwipes()
  return Object.fromEntries(swipes.map((s) => [s.animeId, s.result]))
}

// ── 로그인 후 로컬 데이터 서버로 업로드 (계정 연동) ──────────────────────────

export async function syncLocalToServer(): Promise<void> {
  try {
    const [localSwipes, localPrefs] = await Promise.all([
      loadLocalSwipes(),
      loadLocalPrefs(),
    ])

    if (localPrefs.favoriteGenres.length > 0) {
      await apiSavePrefs(localPrefs.favoriteGenres)
    }

    for (const swipe of localSwipes) {
      await apiSaveSwipe(swipe.animeId, swipe.result).catch(() => {})
    }
  } catch {
    // 동기화 실패는 무시
  }
}

// ── 내부 로컬 전용 ────────────────────────────────────────────────────────────

async function loadLocalSwipes(): Promise<SwipeRecord[]> {
  const raw = await AsyncStorage.getItem(KEYS.swipes)
  return raw ? (JSON.parse(raw) as SwipeRecord[]) : []
}

async function loadLocalPrefs(): Promise<UserPrefs> {
  const raw = await AsyncStorage.getItem(KEYS.prefs)
  return raw ? (JSON.parse(raw) as UserPrefs) : DEFAULT_PREFS
}
