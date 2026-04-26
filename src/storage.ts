import AsyncStorage from '@react-native-async-storage/async-storage'
import type { SwipeRecord, SwipeResult, UserPrefs } from './types'
import {
  apiDeleteSwipe,
  apiGetPrefs,
  apiGetSwipes,
  apiSavePrefs,
  apiSaveSwipe,
  apiSaveSwipesBulk,
  getToken,
} from './api/otakuApi'

const KEYS = {
  prefs:    'otaku:prefs',
  swipes:   'otaku:swipes',
  deviceId: 'otaku:deviceId',
  syncMeta: 'otaku:syncMeta',     // 마지막 서버 동기화 시각 — TTL 가드
  pendingWrites: 'otaku:pendingWrites',   // 서버에 아직 푸시 안 한 swipe 변경
}

// 서버 호출 빈도 제한 — Railway 비용 방어. 사용자 액션 간 5분이면 충분히 fresh.
const PREFS_TTL_MS = 5 * 60 * 1000
const SWIPES_TTL_MS = 5 * 60 * 1000
const PENDING_FLUSH_DELAY_MS = 3000   // 마지막 swipe 후 3초 idle이면 일괄 푸시

type SyncMeta = { prefsAt?: number; swipesAt?: number }

async function getSyncMeta(): Promise<SyncMeta> {
  const raw = await AsyncStorage.getItem(KEYS.syncMeta)
  return raw ? (JSON.parse(raw) as SyncMeta) : {}
}
async function setSyncMeta(patch: Partial<SyncMeta>): Promise<void> {
  const cur = await getSyncMeta()
  await AsyncStorage.setItem(KEYS.syncMeta, JSON.stringify({ ...cur, ...patch }))
}
function isFresh(ts: number | undefined, ttl: number): boolean {
  return ts !== undefined && Date.now() - ts < ttl
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
      const meta = await getSyncMeta()
      // TTL 안이면 서버 호출 스킵 — Railway 비용 방어 (favoriteGenres가 5분 안에 바뀔 일 거의 없음)
      if (isFresh(meta.prefsAt, PREFS_TTL_MS) && local) {
        return { ...DEFAULT_PREFS, ...local }
      }
      const res = await apiGetPrefs()
      const prefs: UserPrefs = {
        favoriteGenres: res.favoriteGenres,
        onboardingDone: res.favoriteGenres.length > 0,
        tasteOnboardingDone: local?.tasteOnboardingDone ?? false,
      }
      // 로컬에도 캐시 (tasteOnboardingDone 보존)
      await AsyncStorage.setItem(KEYS.prefs, JSON.stringify(prefs))
      await setSyncMeta({ prefsAt: Date.now() })
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
    if (await isLoggedIn()) {
      const meta = await getSyncMeta()
      // TTL 안이면 서버 GET 스킵 — 로컬에 이미 우리가 만든 변경 다 반영돼있음 (addSwipe/removeSwipe가 로컬 즉시 반영).
      // 다른 디바이스에서 추가한 swipe는 5분 늦게 보일 수 있지만 그게 비용 트레이드오프.
      if (isFresh(meta.swipesAt, SWIPES_TTL_MS)) {
        const raw = await AsyncStorage.getItem(KEYS.swipes)
        if (raw) return JSON.parse(raw) as SwipeRecord[]
      }
      const res = await apiGetSwipes()
      const records: SwipeRecord[] = res.map((s) => ({
        animeId:  s.animeId,
        result:   s.result as SwipeRecord['result'],
        swipedAt: s.swipedAt,
      }))
      await AsyncStorage.setItem(KEYS.swipes, JSON.stringify(records))
      await setSyncMeta({ swipesAt: Date.now() })
      return records
    }
  } catch {
    // 서버 실패 시 로컬 폴백
  }

  const raw = await AsyncStorage.getItem(KEYS.swipes)
  return raw ? (JSON.parse(raw) as SwipeRecord[]) : []
}

export async function addSwipe(record: SwipeRecord): Promise<void> {
  // 로컬 업데이트 (UI는 즉시 반영)
  const swipes = await loadLocalSwipes()
  const filtered = swipes.filter((s) => s.animeId !== record.animeId)
  filtered.push(record)
  await AsyncStorage.setItem(KEYS.swipes, JSON.stringify(filtered))

  // 서버 푸시는 큐에 쌓고 debounce로 일괄 → Railway 비용 절약
  // (스와이프 5번 빠르게 하면 5 RPC → 1 bulk RPC)
  if (await isLoggedIn()) {
    await queuePending({ type: 'add', animeId: record.animeId, result: record.result })
    scheduleFlush()
  }
}

export async function removeSwipe(animeId: number): Promise<void> {
  const swipes = await loadLocalSwipes()
  await AsyncStorage.setItem(KEYS.swipes, JSON.stringify(swipes.filter((s) => s.animeId !== animeId)))

  if (await isLoggedIn()) {
    await queuePending({ type: 'remove', animeId })
    scheduleFlush()
  }
}

// ── 배치 푸시 큐 ─────────────────────────────────────────────────────────────
// 사용자가 카드를 빠르게 넘길 때 매 swipe마다 서버 호출하면 Railway 비용 ↑.
// 마지막 swipe 후 3초 idle이면 한 번에 push. bulk 엔드포인트 우선, 미지원이면 개별.

type PendingWrite =
  | { type: 'add'; animeId: number; result: SwipeResult }
  | { type: 'remove'; animeId: number }

let flushTimer: ReturnType<typeof setTimeout> | null = null

async function queuePending(write: PendingWrite): Promise<void> {
  const raw = await AsyncStorage.getItem(KEYS.pendingWrites)
  const list: PendingWrite[] = raw ? JSON.parse(raw) : []
  // 같은 animeId의 이전 항목 제거 (멱등화: add 후 remove면 둘 다 무의미하지만 단순 last-write-wins로 처리)
  const filtered = list.filter((w) => w.animeId !== write.animeId)
  filtered.push(write)
  await AsyncStorage.setItem(KEYS.pendingWrites, JSON.stringify(filtered))
}

function scheduleFlush(): void {
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = setTimeout(() => {
    flushTimer = null
    void flushPending()
  }, PENDING_FLUSH_DELAY_MS)
}

/**
 * 큐에 쌓인 swipe 변경을 서버로 푸시.
 * - bulk POST 우선 시도 → 실패하면 개별 POST/DELETE 폴백
 * - 성공한 항목만 큐에서 제거 (네트워크 실패 시 다음 기회 재시도)
 * - 외부에서도 수동 호출 가능: 앱 종료 직전, 로그아웃 직전 등
 */
export async function flushPending(): Promise<void> {
  if (!(await isLoggedIn())) return
  const raw = await AsyncStorage.getItem(KEYS.pendingWrites)
  if (!raw) return
  const list: PendingWrite[] = JSON.parse(raw)
  if (list.length === 0) return

  const adds = list.filter((w): w is Extract<PendingWrite, { type: 'add' }> => w.type === 'add')
  const removes = list.filter((w): w is Extract<PendingWrite, { type: 'remove' }> => w.type === 'remove')

  let success = true
  // 1) add 들은 bulk 시도
  if (adds.length > 0) {
    try {
      await apiSaveSwipesBulk(adds.map((w) => ({ animeId: w.animeId, result: w.result })))
    } catch {
      // bulk 미지원 또는 실패 → 개별 POST 폴백 (병렬). 모두 실패해도 큐 유지.
      const results = await Promise.allSettled(
        adds.map((w) => apiSaveSwipe(w.animeId, w.result)),
      )
      if (results.some((r) => r.status === 'rejected')) success = false
    }
  }
  // 2) remove 들은 항상 개별 (DELETE bulk는 보통 없음)
  if (removes.length > 0) {
    const results = await Promise.allSettled(
      removes.map((w) => apiDeleteSwipe(w.animeId)),
    )
    if (results.some((r) => r.status === 'rejected')) success = false
  }

  if (success) {
    await AsyncStorage.removeItem(KEYS.pendingWrites)
    await setSyncMeta({ swipesAt: Date.now() })   // 방금 푸시했으니 fresh로 표시
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

// ── 로그아웃 시 로컬 정리 ─────────────────────────────────────────────────────

/**
 * 로그아웃 시 호출.
 * - 스와이프/취향(서버에 동기화된) 로컬 캐시를 비워서 다음 로그인 사용자가
 *   이전 계정 데이터를 못 보게 함.
 * - 검색 히스토리도 함께 정리 (계정별 사적 정보).
 * - deviceId, onboardingDone 같은 디바이스 플래그는 보존.
 */
export async function clearLocalUserData(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(KEYS.swipes),
    AsyncStorage.removeItem(KEYS.pendingWrites),
    AsyncStorage.removeItem(KEYS.syncMeta),
    AsyncStorage.removeItem('otaku:searchHistory'),
  ])
  // prefs는 favoriteGenres만 지우고 onboarding 플래그는 유지
  const raw = await AsyncStorage.getItem(KEYS.prefs)
  if (raw) {
    const prev = JSON.parse(raw) as Partial<UserPrefs>
    const next: UserPrefs = {
      favoriteGenres: [],
      onboardingDone: prev.onboardingDone ?? true,
      tasteOnboardingDone: prev.tasteOnboardingDone,
    }
    await AsyncStorage.setItem(KEYS.prefs, JSON.stringify(next))
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
