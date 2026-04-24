import type { Anime } from '../../types'
import { query } from './client'
import { ANIME_FIELDS } from './fragments'
import { mapAnime, type RawMedia } from './mappers'

const HANGUL_RE = /[\uac00-\ud7af]/

async function translateKoToEn(text: string): Promise<string | null> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=ko&tl=en&dt=t&q=${encodeURIComponent(text)}`
    const res = await fetch(url)
    const json = await res.json() as unknown[][]
    const translated = (json[0] as unknown[][])
      .map((chunk) => (chunk[0] as string) ?? '')
      .join('')
      .trim()
    return translated || null
  } catch {
    return null
  }
}

/**
 * 애니 검색.
 * 한글 키워드면 영어로도 한 번 더 검색해서 결과를 머지(중복 제거).
 * AniList는 영어/일본어/로마자에 강하고 한글에는 약하기 때문.
 */
export async function searchAnime(keyword: string, page = 1, perPage = 20): Promise<Anime[]> {
  const trimmed = keyword.trim()

  let englishKeyword: string | null = null
  if (HANGUL_RE.test(trimmed)) {
    englishKeyword = await translateKoToEn(trimmed)
  }

  const runQuery = async (search: string) => {
    const data = await query<{ Page: { media: RawMedia[] } }>(`
      query($page: Int, $perPage: Int, $search: String) {
        Page(page: $page, perPage: $perPage) {
          media(type: ANIME, search: $search, sort: POPULARITY_DESC) {
            ${ANIME_FIELDS}
          }
        }
      }
    `, { page, perPage, search })
    return data.Page.media.map(mapAnime)
  }

  const primary = await runQuery(trimmed)
  if (!englishKeyword || englishKeyword.toLowerCase() === trimmed.toLowerCase()) {
    return primary
  }

  const fallback = await runQuery(englishKeyword)
  const seen = new Set<number>()
  return [...primary, ...fallback].filter((a) => {
    if (seen.has(a.id)) return false
    seen.add(a.id)
    return true
  })
}
