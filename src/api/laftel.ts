/**
 * Laftel(라프텔) — 한국 애니 OTT.
 * 공개되어 있는 search API를 활용해서 AniList의 글로벌 외부 링크와는 다른,
 * 한국에서 실제로 시청 가능한 카탈로그 정보를 보강한다.
 */

const LAFTEL_SEARCH = 'https://api.laftel.net/api/search/v1/keyword/'

export type LaftelItem = {
  id: number
  name: string
  is_viewing: boolean
  is_expired: boolean
  is_dubbed: boolean
  is_uncensored: boolean
  medium: string
}

type LaftelSearchResponse = {
  count: number
  results: LaftelItem[]
}

/**
 * 라프텔에서 한국어 키워드로 검색.
 * 일/영 키워드는 거의 0건이라 한국어로만 호출하는 게 좋다.
 */
export async function searchLaftel(koreanKeyword: string): Promise<LaftelItem[]> {
  try {
    const url = `${LAFTEL_SEARCH}?keyword=${encodeURIComponent(koreanKeyword)}`
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return []
    const json = (await res.json()) as LaftelSearchResponse
    return json.results ?? []
  } catch {
    return []
  }
}

/**
 * 라프텔 결과 이름 정규화 — 매칭 정확도용.
 * "(자막) ~", "(더빙) ~", "(무삭제) ~", "극장판 ~", 공백/특수문자 제거.
 */
function normalize(name: string): string {
  return name
    .replace(/\([^)]*\)/g, '')        // (자막) (더빙) (무삭제) 제거
    .replace(/극장판/g, '')
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '')   // 특수문자 제거
    .toLowerCase()
}

/**
 * 후보 제목들로 라프텔에서 검색 후, 가장 잘 맞는 시청 가능 아이템을 반환.
 * - 시청 가능(is_viewing) + 만료 안됨(!is_expired)인 것만
 * - TVA / OVA / 극장판 우선
 */
export function findBestLaftelMatch(
  candidates: string[],
  items: LaftelItem[],
): LaftelItem | null {
  const watchable = items.filter((i) => i.is_viewing && !i.is_expired)
  if (watchable.length === 0) return null

  const normalizedCandidates = candidates.map(normalize).filter((s) => s.length > 0)
  if (normalizedCandidates.length === 0) return watchable[0] ?? null

  // 1) 정확히 포함되는 것 (양방향)
  for (const cand of normalizedCandidates) {
    for (const item of watchable) {
      const n = normalize(item.name)
      if (n === cand || n.includes(cand) || cand.includes(n)) {
        return item
      }
    }
  }

  // 2) 토큰 일부라도 매칭되면 채택 (관대한 fallback)
  for (const cand of normalizedCandidates) {
    if (cand.length < 3) continue
    for (const item of watchable) {
      const n = normalize(item.name)
      if (n.length < 3) continue
      // 3글자 이상 공통 substring이 있는지 단순 체크
      for (let i = 0; i + 3 <= cand.length; i++) {
        if (n.includes(cand.slice(i, i + 3))) {
          return item
        }
      }
    }
  }

  return null
}

/**
 * 라프텔 아이템 → 시청 페이지 URL.
 */
export function laftelItemUrl(id: number): string {
  return `https://laftel.net/item/${id}`
}
