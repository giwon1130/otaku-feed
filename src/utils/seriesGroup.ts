import type { RelationType } from '../types'

/**
 * 시리즈 그룹 키 — main story 4종(PARENT/PREQUEL/SIDE_STORY/SEQUEL)은 한 묶음으로 보고,
 * 나머지(SPIN_OFF/ALTERNATIVE/SUMMARY/ADAPTATION/SOURCE/OTHER)는 자기 타입이 곧 그룹.
 *
 * AnimeDetailModal의 시리즈 정렬 + 시각적 디바이더, anilist.ts의 정렬에서 공유.
 */
export function seriesGroupKey(rel: RelationType): string {
  return (rel === 'PARENT' || rel === 'PREQUEL' || rel === 'SIDE_STORY' || rel === 'SEQUEL')
    ? 'main' : rel
}

/** 그룹 정렬 우선순위 — main(보는 순서) → 외전 계열 → 기타. */
export const GROUP_ORDER: Record<string, number> = {
  main: 0, SPIN_OFF: 1, ALTERNATIVE: 2, SUMMARY: 3, ADAPTATION: 4, SOURCE: 5, OTHER: 6,
}
