import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'

// Railway 배포 후 실제 URL로 교체
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8092'

// expo-secure-store의 키는 영숫자/./-/_만 허용 — 콜론 사용 불가
const TOKEN_KEY = 'otaku_jwt'
// 구버전(AsyncStorage)에서 사용하던 키 — 마이그레이션용
const LEGACY_TOKEN_KEY = 'otaku:jwt'

// ── Token 관리 ────────────────────────────────────────────────────────────────
// JWT는 OS keychain/keystore에 저장 (expo-secure-store).
// AsyncStorage는 일반 파일이라 디바이스 백업/탈옥 시 노출 위험 → 토큰엔 부적합.

export async function getToken(): Promise<string | null> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY)
  if (token) return token

  // 구버전(AsyncStorage) 토큰이 남아 있으면 SecureStore로 1회 마이그레이션
  const legacy = await AsyncStorage.getItem(LEGACY_TOKEN_KEY)
  if (legacy) {
    await SecureStore.setItemAsync(TOKEN_KEY, legacy)
    await AsyncStorage.removeItem(LEGACY_TOKEN_KEY)
    return legacy
  }
  return null
}

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token)
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY)
  // 혹시 남은 레거시 키도 청소
  await AsyncStorage.removeItem(LEGACY_TOKEN_KEY).catch(() => {})
  // /me 캐시도 비움 — 다음 로그인 시 fresh 호출
  await AsyncStorage.removeItem(ME_CACHE_KEY).catch(() => {})
}

// ── HTTP 헬퍼 ─────────────────────────────────────────────────────────────────

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  auth = true,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  if (auth) {
    const token = await getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: '서버 오류' }))
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`)
  }

  return res.json() as Promise<T>
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export type AuthResponse = {
  token: string
  userId: string
  email: string
  nickname: string
}

export async function apiSignup(email: string, password: string, nickname: string): Promise<AuthResponse> {
  const res = await request<AuthResponse>('POST', '/auth/signup', { email, password, nickname }, false)
  await saveToken(res.token)
  return res
}

export async function apiLogin(email: string, password: string): Promise<AuthResponse> {
  const res = await request<AuthResponse>('POST', '/auth/login', { email, password }, false)
  await saveToken(res.token)
  return res
}

// /auth/me 결과 1시간 캐시 — 토큰 유효성 확인은 첫 보호된 API 호출 시 어차피 검증됨.
// 매 부팅마다 호출 = Railway 비용 낭비.
const ME_CACHE_KEY = 'otaku:meCache'
const ME_CACHE_TTL = 60 * 60 * 1000   // 1h

export async function apiMe(opts?: { force?: boolean }): Promise<AuthResponse> {
  if (!opts?.force) {
    const raw = await AsyncStorage.getItem(ME_CACHE_KEY)
    if (raw) {
      try {
        const { value, ts } = JSON.parse(raw) as { value: AuthResponse; ts: number }
        if (Date.now() - ts < ME_CACHE_TTL) return value
      } catch {
        // 손상된 캐시는 무시
      }
    }
  }
  const me = await request<AuthResponse>('GET', '/auth/me')
  await AsyncStorage.setItem(ME_CACHE_KEY, JSON.stringify({ value: me, ts: Date.now() }))
  return me
}

export async function apiLogout(): Promise<void> {
  await clearToken()
}

export async function apiGoogleOAuth(idToken: string): Promise<AuthResponse> {
  const res = await request<AuthResponse>('POST', '/auth/oauth/google', { idToken }, false)
  await saveToken(res.token)
  return res
}

export async function apiKakaoOAuth(accessToken: string): Promise<AuthResponse> {
  const res = await request<AuthResponse>('POST', '/auth/oauth/kakao', { accessToken }, false)
  await saveToken(res.token)
  return res
}

// ── Swipes ────────────────────────────────────────────────────────────────────

// 백엔드는 id 필드를 응답에서 제외 (클라가 안 씀, egress 절감).
export type SwipeResponse = {
  animeId: number
  result: string
  swipedAt: string
}

export async function apiGetSwipes(result?: 'like' | 'dislike' | 'skip'): Promise<SwipeResponse[]> {
  const query = result ? `?result=${result}` : ''
  return request<SwipeResponse[]>('GET', `/swipes${query}`)
}

export async function apiSaveSwipe(animeId: number, result: 'like' | 'dislike' | 'skip'): Promise<SwipeResponse> {
  return request<SwipeResponse>('POST', '/swipes', { animeId, result })
}

export async function apiDeleteSwipe(animeId: number): Promise<void> {
  await request<unknown>('DELETE', `/swipes/${animeId}`)
}

/**
 * 여러 swipe를 한 번에 푸시. 백엔드가 /swipes/bulk를 지원하면 1 RPC로 처리.
 * 미지원(404)이면 호출자가 catch해서 개별 POST로 폴백.
 */
export async function apiSaveSwipesBulk(
  swipes: { animeId: number; result: 'like' | 'dislike' | 'skip' }[],
): Promise<void> {
  await request<unknown>('POST', '/swipes/bulk', { swipes })
}

// ── Prefs ─────────────────────────────────────────────────────────────────────

export type PrefsResponse = { favoriteGenres: string[] }

export async function apiGetPrefs(): Promise<PrefsResponse> {
  return request<PrefsResponse>('GET', '/prefs')
}

export async function apiSavePrefs(favoriteGenres: string[]): Promise<PrefsResponse> {
  return request<PrefsResponse>('PUT', '/prefs', { favoriteGenres })
}

// ── 헬스 체크 ─────────────────────────────────────────────────────────────────

export async function apiHealth(): Promise<boolean> {
  try {
    await request<unknown>('GET', '/health', undefined, false)
    return true
  } catch {
    return false
  }
}
