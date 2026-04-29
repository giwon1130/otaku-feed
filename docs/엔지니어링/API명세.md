# API 명세 (외부 + 백엔드)

> **누가 봄**: FE
> **언제 봄**: 새 endpoint 호출, 외부 API 동작 확인
> **단일 진실의 원천 (백엔드)**: [otaku-feed-api/docs/엔지니어링/API명세.md](https://github.com/giwon1130/otaku-feed-api/blob/main/docs/엔지니어링/API명세.md)

## 외부 API

### AniList GraphQL
- **엔드포인트**: `https://graphql.anilist.co`
- **인증**: 없음
- **rate limit**: 90 req/min/IP (클라 측 큐 5개 동시성으로 방어)
- **응답**: GraphQL `{ data, errors }`. partial data 살리되 data null이면 throw.

호출은 항상 `query<T>()`(`api/anilist/client.ts`) 통해서. fetch 직접 호출 ❌.

#### 주요 쿼리

| 함수 | Query | Fragment |
|------|-------|---------|
| `fetchTrending(page, perPage)` | `Page.media(sort:TRENDING_DESC)` | LIST |
| `fetchRanking(sort, page, perPage)` | `Page.media(sort:[$sort])` | LIST |
| `fetchByGenres(genres, page, perPage)` | `Page.media(genre_in:$genres)` | LIST |
| `fetchTasteCandidates(genres, perPage)` | `Page.media(genre_in:$genres)` | LIST |
| `fetchCurrentSeason(page, perPage)` | `Page.media(season, seasonYear)` | LIST |
| `fetchHomePrimary(perPage)` | alias로 trending+seasonal 묶음 | LIST |
| `fetchAnimeById(id)` | `Media(id)` | FULL |
| `fetchAnimeRelations(id)` | `Media.relations.edges` | (relations only) |
| `fetchRecommendations(id, perPage)` | `Media.recommendations.nodes.mediaRecommendation` | LIST |
| `fetchAnimeLinks({id, title, titleNative})` | `Media.externalLinks` + 라프텔 검색 합본 | (externalLinks) |
| `fetchLaftelKoreanName({title, titleNative})` | 라프텔 검색 매칭 결과의 name | (라프텔) |
| `searchAnime(q)` | `Page.media(search:$q)` | LIST |

#### 에러 처리
모두 `AniListError`로 throw. 메시지:
- 네트워크: "네트워크 연결을 확인해줘"
- 429: "AniList 요청이 너무 잦아"
- 5xx: "AniList 서버에 문제가 있어"
- 그 외 4xx: "AniList 요청 실패 (NNN)"

호출자는 try/catch + `useToast`로 사용자 알림.

---

### 라프텔 검색
- **엔드포인트**: `https://api.laftel.net/api/search/v1/keyword/`
- **메서드**: GET
- **파라미터**: `?keyword=<한국어>`
- **인증**: 없음 (비공식 API)

응답:
```json
{
  "count": N,
  "results": [
    {
      "id": 123,
      "name": "장송의 프리렌",
      "is_viewing": true,
      "is_expired": false,
      "is_dubbed": false,
      "medium": "TVA"
    }
  ]
}
```

`searchLaftel(koreanKeyword)` + `findBestLaftelMatch(candidates, items)` 조합으로 매칭.

---

### DeepL 번역
- **엔드포인트**: `https://api-free.deepl.com/v2/translate`
- **인증**: `Authorization: DeepL-Auth-Key ${EXPO_PUBLIC_DEEPL_API_KEY}`
- **무료 한도**: 500k chars/월
- **배치**: `text: ["a","b","c"]` 배열 입력 가능 (한 호출로 N개)

429 또는 456 응답 → 1시간 회로 차단 + Google 번역 폴백. 사용량은 `getDeeplQuota()`로 확인.

### Google 번역 (폴백)
- **엔드포인트**: `https://translate.googleapis.com/translate_a/single`
- **인증**: 없음 (비공식)
- **단건만**: 배치 미지원 → DeepL 폴백 시 `Promise.all`로 병렬

---

## 백엔드 (otaku-feed-api)

베이스 URL: `${EXPO_PUBLIC_API_URL}` (.env). 로컬 `http://localhost:8092`, 프로덕션 `https://otaku-feed-api-production.up.railway.app`.

자세한 명세: [백엔드 docs](https://github.com/giwon1130/otaku-feed-api/blob/main/docs/엔지니어링/API명세.md)

### 인증

| Method | Path | Body | 응답 |
|--------|------|------|------|
| POST | `/auth/signup` | `{ email, password, nickname }` | `AuthResponse` |
| POST | `/auth/login` | `{ email, password }` | `AuthResponse` |
| GET | `/auth/me` | (Bearer) | `AuthResponse` |
| POST | `/auth/oauth/google` | `{ idToken }` | `AuthResponse` |
| POST | `/auth/oauth/kakao` | `{ accessToken }` | `AuthResponse` |

`AuthResponse = { token, userId, email, nickname }`

### Swipes (인증 필요)

| Method | Path | Body | 응답 |
|--------|------|------|------|
| GET | `/swipes` | (?result=like) | `SwipeResponse[]` |
| POST | `/swipes` | `{ animeId, result }` | `SwipeResponse` |
| **POST** | **`/swipes/bulk`** | `{ swipes: [{animeId, result}] }` | `{ saved: N }` |
| DELETE | `/swipes/{animeId}` | — | `{ deleted: bool }` |

`SwipeResponse = { animeId, result, swipedAt }` (id 제거됨, ADR-009)

### Prefs (인증 필요)

| Method | Path | Body | 응답 |
|--------|------|------|------|
| GET | `/prefs` | — | `{ favoriteGenres }` |
| PUT | `/prefs` | `{ favoriteGenres }` | `{ favoriteGenres }` |

### 헬스 체크
| Method | Path | 응답 |
|--------|------|------|
| GET | `/health` | `{ status: 'UP', application: 'otaku-feed-api' }` |

`apiHealth()`는 fire-and-forget (Railway 깨우기 + `useBackendHealth`).

### 동작 약속 (운영적)

- **gzip 응답**: 항상 활성 (1KB 이상 본문). RN fetch 자동 디코드.
- **JWT 만료**: 30일 (`expiration-hours: 720`)
- **잘못된 JWT**: 401 (이전 500이었음, 백엔드 fix됨)
- **rate limit**: 백엔드 자체엔 없음. 클라가 5분 TTL/배치/keepalive 조건부로 자율 제한.

## 호출 위치

### `api/anilist/*`
모듈별 분리. UI는 `import { fetchTrending } from '../api/anilist'`.

### `api/otakuApi.ts`
백엔드 호출. `request<T>(method, path, body, auth)` 헬퍼 사용. JWT 자동 첨부.

### `storage.ts`
백엔드 호출의 wrapper. 로컬 캐시 + TTL + 큐 처리. UI는 `loadSwipes`, `addSwipe`, `loadPrefs`, `savePrefs` 사용.

## 신규 endpoint 추가

1. **외부 API**: `api/anilist/discovery.ts` 또는 `detail.ts`에 함수 추가 + `index.ts` barrel
2. **백엔드**: 백엔드 레포에 controller 추가 → 클라 `api/otakuApi.ts`에 client 메서드
3. **타입**: `src/types.ts`에 응답 타입 정의
4. **테스트**: msw로 통합 테스트 (`api/anilist/client.test.ts` 참고)
