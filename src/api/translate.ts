import AsyncStorage from '@react-native-async-storage/async-storage'

// tl4: → AniList synonyms에서 한국 출시명을 우선 사용하도록 바뀐 시점.
//        기존 tl3 캐시엔 영어 → Google 번역으로 만든 "장례식의 프리렌" 같은
//        잘못된 한글이 들어있어서 prefix를 bump해 모두 무효화.
const CACHE_PREFIX = 'tl4:'
const DEEPL_KEY = process.env.EXPO_PUBLIC_DEEPL_API_KEY ?? ''
const DEEPL_URL = 'https://api-free.deepl.com/v2/translate'

// ── 인메모리 캐시 (AsyncStorage 위에 한 겹) ───────────────────────────────────
// 같은 작품을 다른 탭에서 다시 보거나 carousel 재렌더 시 디스크 IO 회피.
const MEM_CACHE = new Map<string, string>()
const MEM_CACHE_MAX = 1000

function memSet(key: string, value: string) {
  if (MEM_CACHE.size >= MEM_CACHE_MAX) {
    const first = MEM_CACHE.keys().next().value
    if (first !== undefined) MEM_CACHE.delete(first)
  }
  MEM_CACHE.set(key, value)
}

// ── DeepL 쿼터 추적 + 회로 차단기 ─────────────────────────────────────────────
// DeepL 무료는 500k chars/월. 80% 도달 시 1회 경고.
// 429/456 받으면 1시간 동안 DeepL 스킵 → Google 직행 (불필요 RTT 절약).
const DEEPL_QUOTA_KEY = 'deepl:quota'   // value: { month: '2026-04', chars: number, warned: boolean }
const DEEPL_QUOTA_LIMIT = 500_000
const DEEPL_QUOTA_WARN_AT = 0.8

let deeplBlockedUntil = 0  // ms timestamp
const DEEPL_BLOCK_MS = 60 * 60 * 1000

type QuotaState = { month: string; chars: number; warned: boolean }
function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

async function loadQuota(): Promise<QuotaState> {
  const raw = await AsyncStorage.getItem(DEEPL_QUOTA_KEY)
  const month = currentMonth()
  if (!raw) return { month, chars: 0, warned: false }
  const parsed = JSON.parse(raw) as QuotaState
  if (parsed.month !== month) return { month, chars: 0, warned: false }   // 월 바뀌면 리셋
  return parsed
}

/**
 * DeepL 쿼터 사용량 조회 (UI에서 노출 가능).
 * 반환: { chars, limit, ratio, warning } — ratio 0..1+
 */
export async function getDeeplQuota(): Promise<{ chars: number; limit: number; ratio: number; warning: boolean }> {
  const q = await loadQuota()
  return {
    chars: q.chars,
    limit: DEEPL_QUOTA_LIMIT,
    ratio: q.chars / DEEPL_QUOTA_LIMIT,
    warning: q.chars >= DEEPL_QUOTA_LIMIT * DEEPL_QUOTA_WARN_AT,
  }
}

async function recordDeeplUsage(chars: number, onWarn?: (q: QuotaState) => void): Promise<void> {
  const q = await loadQuota()
  q.chars += chars
  if (!q.warned && q.chars >= DEEPL_QUOTA_LIMIT * DEEPL_QUOTA_WARN_AT) {
    q.warned = true
    onWarn?.(q)
  }
  await AsyncStorage.setItem(DEEPL_QUOTA_KEY, JSON.stringify(q))
}

// ── DeepL 배치 번역 ───────────────────────────────────────────────────────────
// DeepL은 text: string[] 입력 지원 → 1회 호출로 N개 번역.
async function translateBatchWithDeepl(texts: string[]): Promise<string[] | null> {
  if (!DEEPL_KEY) return null
  if (Date.now() < deeplBlockedUntil) return null   // 회로 차단 중
  try {
    const res = await fetch(DEEPL_URL, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${DEEPL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: texts, source_lang: 'EN', target_lang: 'KO' }),
    })

    if (res.status === 456 || res.status === 429) {
      console.warn('[DeepL] 한도/요청 초과 — 1시간 차단 후 Google 폴백')
      deeplBlockedUntil = Date.now() + DEEPL_BLOCK_MS
      return null
    }
    if (!res.ok) return null

    const json = await res.json() as { translations?: { text: string }[] }
    const out = json.translations?.map((t) => t.text)
    if (!out || out.length !== texts.length) return null

    // 사용량 기록 (input 기준)
    const charCount = texts.reduce((sum, t) => sum + t.length, 0)
    void recordDeeplUsage(charCount)
    return out
  } catch {
    return null
  }
}

// Google 무료 endpoint는 단건만 받음 → 병렬로 N개 호출.
async function translateOneWithGoogle(text: string): Promise<string | null> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&q=${encodeURIComponent(text)}`
    const res = await fetch(url)
    const json = await res.json() as unknown[][]
    const translated = (json[0] as unknown[][])
      .map((chunk) => (chunk[0] as string) ?? '')
      .join('')
    return translated || null
  } catch {
    return null
  }
}

// djb2 — 충돌 가능성은 있지만 같은 prefix를 가진 다른 길이 텍스트끼리 분리됨
function hash32(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36)
}

function cacheKeyFor(text: string): string {
  return `${CACHE_PREFIX}${text.length}:${hash32(text)}`
}

// 한글이 일정 비율 이상이면 이미 한국어로 간주
const HANGUL_RE = /[가-힯]/g
function looksKorean(text: string): boolean {
  const matches = text.match(HANGUL_RE)
  if (!matches) return false
  return matches.length / text.length >= 0.3
}

// ── 핵심: 배치 번역 ──────────────────────────────────────────────────────────
/**
 * texts 배열을 받아서 같은 길이의 번역 배열 반환.
 * 1) 한국어/빈 문자열은 그대로 통과
 * 2) 인메모리 → AsyncStorage multiGet으로 캐시 일괄 조회
 * 3) 미스만 모아 DeepL 배치 1회 호출
 * 4) 그래도 미스면 Google 단건 병렬
 * 5) 결과 multiSet으로 한 번에 저장
 */
export async function translateBatch(texts: string[]): Promise<string[]> {
  const result = new Array<string>(texts.length)
  const missesIdx: number[] = []
  const missesText: string[] = []
  const cacheKeys: string[] = []

  // 1) 통과 + 메모리 캐시
  for (let i = 0; i < texts.length; i++) {
    const t = texts[i] ?? ''
    if (!t.trim() || looksKorean(t)) { result[i] = t; continue }
    const key = cacheKeyFor(t)
    cacheKeys[i] = key
    const mem = MEM_CACHE.get(key)
    if (mem !== undefined) { result[i] = mem; continue }
    missesIdx.push(i)
    missesText.push(t)
  }

  if (missesIdx.length === 0) return result

  // 2) AsyncStorage getMany — 미스 indices만 일괄 조회 (v3: Record 반환)
  const missKeys = missesIdx.map((i) => cacheKeys[i]!)
  const stored = await AsyncStorage.getMany(missKeys)
  const stillMissIdx: number[] = []
  const stillMissText: string[] = []

  for (let j = 0; j < missesIdx.length; j++) {
    const idx = missesIdx[j]!
    const key = cacheKeys[idx]!
    const value = stored[key] ?? null
    if (value !== null) {
      result[idx] = value
      memSet(key, value)
    } else {
      stillMissIdx.push(idx)
      stillMissText.push(missesText[j]!)
    }
  }

  if (stillMissIdx.length === 0) return result

  // 3) DeepL 배치 1회
  const deeplResults = await translateBatchWithDeepl(stillMissText)

  // 4) DeepL 실패한 인덱스는 Google 단건 병렬
  let translated: (string | null)[]
  if (deeplResults) {
    translated = deeplResults
  } else {
    translated = await Promise.all(stillMissText.map(translateOneWithGoogle))
  }

  // 5) 결과 채우고 캐시 저장 (v3: setMany는 Record 입력)
  const toStore: Record<string, string> = {}
  for (let j = 0; j < stillMissIdx.length; j++) {
    const idx = stillMissIdx[j]!
    const out = translated[j] ?? stillMissText[j]!  // 둘 다 실패하면 원문 유지
    result[idx] = out
    const key = cacheKeys[idx]!
    memSet(key, out)
    toStore[key] = out
  }
  if (Object.keys(toStore).length > 0) {
    void AsyncStorage.setMany(toStore).catch(() => {})
  }
  return result
}

// ── 구 API 호환 래퍼 ──────────────────────────────────────────────────────────

async function translateText(text: string): Promise<string> {
  const [out] = await translateBatch([text])
  return out!
}

export async function translateAnimeInfo(
  title: string,
  description: string,
): Promise<{ title: string; description: string }> {
  const [t, d] = await translateBatch([title, description])
  return { title: t!, description: d! }
}

/**
 * 애니 배열 전체를 번역.
 * [t1,d1, t2,d2, ...] 1차원 배치로 묶어서 DeepL 1회 호출 → N×2 → 1 RTT.
 */
export async function translateAnimeList<T extends { title: string; description: string }>(
  animes: T[],
): Promise<T[]> {
  if (animes.length === 0) return animes
  const flat: string[] = []
  for (const a of animes) { flat.push(a.title); flat.push(a.description) }
  const translated = await translateBatch(flat)
  return animes.map((a, i) => ({
    ...a,
    title: translated[i * 2]!,
    description: translated[i * 2 + 1]!,
  }))
}

// translateText는 내부 호환용
export { translateText }
