import AsyncStorage from '@react-native-async-storage/async-storage'

// Railway 배포 후 실제 URL로 교체
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8092'

const TOKEN_KEY = 'otaku:jwt'

// ── Token 관리 ────────────────────────────────────────────────────────────────

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY)
}

export async function saveToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token)
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY)
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

export async function apiMe(): Promise<AuthResponse> {
  return request<AuthResponse>('GET', '/auth/me')
}

export async function apiLogout(): Promise<void> {
  await clearToken()
}

// ── Swipes ────────────────────────────────────────────────────────────────────

export type SwipeResponse = {
  id: string
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
