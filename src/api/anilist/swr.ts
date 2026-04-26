import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * Stale-While-Revalidate 헬퍼.
 *
 * `swr(key, fetcher, ttlMs, onFresh)`
 *  1) AsyncStorage에서 캐시 읽음
 *  2) 즉시 stale 데이터를 반환 (있으면) → 부팅 화면을 즉시 채움
 *  3) 백그라운드에서 fetcher 호출, 성공하면 onFresh 콜백으로 새 데이터 알림
 *  4) 캐시에도 새 값 저장
 *
 * 사용 패턴 (HomeTab 등):
 *   swr('home:trending', () => fetchTrending(...), 24h, (fresh) => setTrending(fresh))
 *     → 첫 화면은 즉시 (캐시), 1초 후 백그라운드 fetch 끝나면 새 데이터로 교체
 *
 * - 캐시는 AsyncStorage(영구). 앱을 죽여도 다음 부팅 때 즉시 렌더 가능.
 * - TTL은 stale 판정용이지만, **만료돼도 일단 보여주고** 백그라운드 갱신.
 *   완전히 막으려면 호출자가 시점 체크.
 * - onFresh가 호출됐을 때만 화면 업데이트 → 같은 데이터면 재렌더 안 함 (얕은 비교).
 */

// swr2: → 캐시 의미가 "translated Anime"에서 "raw English Anime"로 바뀜.
// 옛 swr: 캐시는 한국어 title 들어있어서 그대로 쓰면 render-then-translate 패턴이 무의미해짐.
// prefix bump로 자동 무효화. 첫 부팅 한 번만 cold load.
const PREFIX = 'swr2:'

type Entry<T> = { value: T; storedAt: number }

export type SwrResult<T> = {
  /** 즉시 사용 가능한 stale 값 (없으면 null) */
  cached: T | null
  /** 백그라운드 fetch 완료 시 resolve. fresh 값 또는 fetch 실패 시 null */
  fresh: Promise<T | null>
}

export async function swr<T>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<SwrResult<T>> {
  const storageKey = `${PREFIX}${key}`

  // 1) 캐시 읽기
  let cached: T | null = null
  try {
    const raw = await AsyncStorage.getItem(storageKey)
    if (raw) {
      const entry = JSON.parse(raw) as Entry<T>
      cached = entry.value
    }
  } catch {
    // 손상된 캐시는 무시
  }

  // 2) 백그라운드 fetch (await 안 함 — 호출자가 fresh로 받음)
  const fresh = (async () => {
    try {
      const value = await fetcher()
      await AsyncStorage.setItem(
        storageKey,
        JSON.stringify({ value, storedAt: Date.now() } satisfies Entry<T>),
      )
      return value
    } catch {
      return null
    }
  })()

  return { cached, fresh }
}

/** 모든 SWR 캐시 비우기 — 로그아웃이나 디버그용. */
export async function clearSwrCache(): Promise<void> {
  const all = await AsyncStorage.getAllKeys()
  const swrKeys = all.filter((k) => k.startsWith(PREFIX))
  if (swrKeys.length > 0) await AsyncStorage.removeMany(swrKeys)
}
