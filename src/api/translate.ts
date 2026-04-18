import AsyncStorage from '@react-native-async-storage/async-storage'

const CACHE_PREFIX = 'tl2:'
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

async function translateText(text: string): Promise<string> {
  if (!text?.trim()) return text

  const cacheKey = text.slice(0, 120)
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
