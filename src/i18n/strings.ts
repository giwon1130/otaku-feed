/**
 * 사용자에게 보이는 문자열 모음 (i18n 기초).
 *
 * 지금은 한국어 전용이지만, 미래에 다국어가 필요해지면 이 파일을
 * `ko.ts` / `en.ts` 같은 로케일별 파일로 분리하고 `t(key)` 헬퍼를
 * 도입하기 쉽게 키 구조를 미리 정리해둠.
 *
 * 규칙:
 * - 같은 의미의 문자열을 두 곳에서 반복하면 여기에 추가
 * - 한 곳에서만 쓰이는 컴포넌트 라벨은 굳이 옮기지 않아도 됨
 * - 에러 메시지(특히 throw하는 쪽)는 우선적으로 여기에 모음
 */
export const STRINGS = {
  errors: {
    network:        '네트워크 연결을 확인해줘',
    rateLimit:      'AniList 요청이 너무 잦아. 잠시 후 다시 시도해줘',
    serverDown:     'AniList 서버에 문제가 있어. 잠시 후 다시 시도해줘',
    requestFailed:  (status: number) => `AniList 요청 실패 (${status})`,
    unreadable:     '응답을 읽을 수 없어',
    graphqlDefault: 'AniList GraphQL 오류',
    rankingFailed:  '랭킹을 불러오지 못했어',
    searchFailed:   '검색 실패',
    feedFailed:     '피드를 불러오지 못했어',
  },
  toast: {
    removedFromList: '목록에서 삭제했어.',
  },
} as const
