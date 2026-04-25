import AsyncStorage from '@react-native-async-storage/async-storage'

// tl4: → AniList synonyms에서 한국 출시명을 우선 사용하도록 바뀐 시점.
//        기존 tl3 캐시엔 영어 → Google 번역으로 만든 "장례식의 프리렌" 같은
//        잘못된 한글이 들어있어서 prefix를 bump해 모두 무효화.
const CACHE_PREFIX = 'tl4:'
const DEEPL_KEY = process.env.EXPO_PUBLIC_DEEPL_API_KEY ?? ''
const DEEPL_URL = 'https://api-free.deepl.com/v2/translate'

async function getCached(key: string): Promise<string | null> {
  return AsyncStorage.getItem(`${CACHE_PREFIX}${key}`)
}

async function setCached(key: string, value: string): Promise<void> {
  await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, value)
}

// 1순위: DeepL
async function translateWithDeepl(text: string): Promise<string | null> {
  try {
    const res = await fetch(DEEPL_URL, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${DEEPL_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: [text], source_lang: 'EN', target_lang: 'KO' }),
    })

    // 456 = 한도 초과, 429 = 요청 초과 → 폴백
    if (res.status === 456 || res.status === 429) {
      console.warn('[DeepL] 한도 초과, Google 번역으로 전환')
      return null
    }

    const json = await res.json() as { translations?: { text: string }[] }
    return json.translations?.[0]?.text ?? null
  } catch {
    return null
  }
}

// 2순위: Google 번역 (폴백)
async function translateWithGoogle(text: string): Promise<string | null> {
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

// 한글이 일정 비율 이상이면 이미 한국어로 간주 (mapAnime이 synonyms에서 한국명 골라줬을 가능성)
const HANGUL_RE = /[\uac00-\ud7af]/g
function looksKorean(text: string): boolean {
  const matches = text.match(HANGUL_RE)
  if (!matches) return false
  return matches.length / text.length >= 0.3
}

async function translateText(text: string): Promise<string> {
  if (!text?.trim()) return text
  // 이미 한국어면 번역 스킵 (AniList synonyms에서 받은 한국 출시명 보호)
  if (looksKorean(text)) return text

  // 길이+해시로 키 생성 → 같은 첫 120자 다른 길이 텍스트가 같은 캐시 hit하던 버그 방지
  const cacheKey = `${text.length}:${hash32(text)}`
  const cached = await getCached(cacheKey)
  if (cached) return cached

  // DeepL 먼저 시도 → 실패 시 Google 번역
  const result =
    (await translateWithDeepl(text)) ??
    (await translateWithGoogle(text)) ??
    text  // 둘 다 실패하면 원문

  await setCached(cacheKey, result)
  return result
}

export async function translateAnimeInfo(
  title: string,
  description: string,
): Promise<{ title: string; description: string }> {
  const [translatedTitle, translatedDesc] = await Promise.all([
    translateText(title),
    translateText(description),
  ])
  return { title: translatedTitle, description: translatedDesc }
}

/** 애니 배열 전체를 번역. 4개 탭에서 반복되던 map+translateAnimeInfo 패턴 통합. */
export async function translateAnimeList<T extends { title: string; description: string }>(
  animes: T[],
): Promise<T[]> {
  return Promise.all(
    animes.map(async (a) => {
      const { title, description } = await translateAnimeInfo(a.title, a.description)
      return { ...a, title, description }
    }),
  )
}
