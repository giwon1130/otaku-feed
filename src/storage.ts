import AsyncStorage from '@react-native-async-storage/async-storage'
import type { SwipeRecord, UserPrefs } from './types'

const KEYS = {
  prefs: 'otaku:prefs',
  swipes: 'otaku:swipes',
  deviceId: 'otaku:deviceId',
}

// ── Device ID ─────────────────────────────────────────────────────────────

export async function getDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(KEYS.deviceId)
  if (existing) return existing
  const id = `device_${Date.now()}_${Math.random().toString(36).slice(2)}`
  await AsyncStorage.setItem(KEYS.deviceId, id)
  return id
}

// ── User Prefs ────────────────────────────────────────────────────────────

const DEFAULT_PREFS: UserPrefs = {
  favoriteGenres: [],
  onboardingDone: false,
}

export async function loadPrefs(): Promise<UserPrefs> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.prefs)
    return raw ? { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<UserPrefs>) } : DEFAULT_PREFS
  } catch {
    return DEFAULT_PREFS
  }
}

export async function savePrefs(prefs: UserPrefs): Promise<void> {
  await AsyncStorage.setItem(KEYS.prefs, JSON.stringify(prefs))
}

// ── Swipe Records ─────────────────────────────────────────────────────────

export async function loadSwipes(): Promise<SwipeRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.swipes)
    return raw ? (JSON.parse(raw) as SwipeRecord[]) : []
  } catch {
    return []
  }
}

export async function addSwipe(record: SwipeRecord): Promise<void> {
  const swipes = await loadSwipes()
  const filtered = swipes.filter((s) => s.animeId !== record.animeId)
  filtered.push(record)
  await AsyncStorage.setItem(KEYS.swipes, JSON.stringify(filtered))
}

export async function getLikedIds(): Promise<number[]> {
  const swipes = await loadSwipes()
  return swipes.filter((s) => s.result === 'like').map((s) => s.animeId)
}

export async function getSwipeMap(): Promise<Record<number, SwipeRecord['result']>> {
  const swipes = await loadSwipes()
  return Object.fromEntries(swipes.map((s) => [s.animeId, s.result]))
}
