# 🎌 Otaku Feed

한국 사용자를 위한 애니 추천 피드 앱. AniList 카탈로그 + 라프텔 시청 가능 정보를 합쳐, 스와이프로 학습한 취향에 맞춰 피드를 구성한다.

React Native 0.81 · Expo 54 · TypeScript · iOS/Android.

> 백엔드(인증·동기화)는 별도 레포: [`otaku-feed-api`](https://github.com/giwon1130/otaku-feed-api) (Railway 배포)

---

## 핵심 기능

- **취향 학습**: 좋아요/패스 스와이프 → 장르·스튜디오 빈도로 "너의 취향" 인사이트 + 추천 anchor
- **시청 가능 플랫폼**: 라프텔 우선 + AniList 글로벌 링크. 한국에서 실제 볼 수 있는지 regional 배지로 구분
- **시리즈 보는 순서**: AniList relations(`version: 2`)로 main story(prequel/sequel/side story)를 연도순 + 외전(spin-off/alternative) 그룹 분리
- **한국 출시명 우선**: AniList `synonyms`에서 한글 항목을 골라 ("장송의 프리렌"). 없으면 디테일 모달에서 라프텔 매칭 결과로 보강. 영어 → 기계번역으로 만들어진 어색한 제목 회피.
- **한국어 검색**: 한글 입력 → Google 번역 → AniList 영어 검색 → 결과 머지
- **로컬 우선 + 서버 동기화**: 비로그인도 모든 기능 동작. 로그인 시 좋아요/취향이 백엔드로 sync

## 화면

| 탭 | 역할 |
|----|------|
| 홈 | 트렌딩 + "X 좋아하니까"(최대 3개 anchor) + 너 좋아할 만한 거(top3 장르) + 시즌 신작 |
| 탐색 | 검색 + 랭킹(트렌딩/점수/인기) + 장르 필터 칩 |
| 스와이프 | 카드 스와이프(좋아요/패스). 큐가 5개 이하면 자동 prefetch |
| 내 목록 | 좋아요/패스 리스트 + 검색·정렬 + "너의 취향" 인사이트 카드 |

## 프로젝트 구조

```
src/
  api/
    anilist/          # client / fragments / mappers / discovery / detail / search
    laftel.ts         # 한국 OTT 검색
    translate.ts      # KR↔EN
    otakuApi.ts       # 자체 백엔드 (인증 + 동기화)
  components/
    shared/           # ScoreBadge / GenreTag / MetaRow / RelationBadge / AnimeCard
    detail/           # DetailHeader / WhereToWatch / Synopsis / SeriesOrder / SimilarList
    AnimeDetailModal.tsx  # 섹션 조립 오케스트레이터
  tabs/               # HomeTab / ExploreTab / SwipeTab / MyListTab
  hooks/              # useToast 등
  i18n/strings.ts     # 사용자 표시 문자열 (다국어 확장 대비)
  utils/              # seriesGroup, haptics 등
  storage.ts          # AsyncStorage + 서버 동기화
  types.ts            # Anime / SeriesEntry / RelationType ...
```

## 시작하기

요구사항: **Node 22.6+**, **Xcode**, **CocoaPods**, JDK(Android 빌드 시)

```bash
# 1. 의존성
npm install

# 2. 환경변수 (.env)
cp .env.example .env
# EXPO_PUBLIC_API_URL=http://localhost:8092 등 채우기

# 3. 타입 체크 + 테스트
npm run typecheck
npm test

# 4-a. JS만 변경 — Metro 띄우면 dev client에서 Fast Refresh
npx expo start --dev-client

# 4-b. 네이티브 변경/첫 빌드 — 풀빌드 (10–15분)
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx expo run:ios --device "<UDID>"
xcrun devicectl list devices   # UDID 확인
```

> macOS 기본 locale 때문에 CocoaPods가 `Encoding::CompatibilityError`로 죽는 경우가 있음 → 항상 `LANG=en_US.UTF-8` prefix.

### 환경변수

| 키 | 용도 |
|----|------|
| `EXPO_PUBLIC_API_URL` | otaku-feed-api 베이스 URL |
| `EXPO_PUBLIC_DEEPL_API_KEY` | (옵션) DeepL 번역. 없으면 Google 무료 fallback |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` / `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Google SSO |
| `EXPO_PUBLIC_KAKAO_APP_KEY` | Kakao SSO |

## 테스트

Node native test runner + `--experimental-strip-types` 사용 — 외부 deps 없음.

```bash
npm test
```

현재 커버: `src/utils/seriesGroup.test.ts`, `src/api/anilist/mappers.test.ts` (15개 — 그룹키/정렬, mapAnime 폴백, synonyms 한국명 추출, HTML strip 등)

## 기술 노트

- **AniList 에러 통일**: `AniListError`(네트워크/HTTP 4xx·5xx/GraphQL) → `useToast`로 사용자 알림
- **단건 메모리 캐시**: `fetchAnimeById`에 5분 TTL + 200엔트리 LRU. 모달 재진입/탭 간 같은 ID 공유
- **FlatList 가상화**: `windowSize`/`initialNumToRender`/`removeClippedSubviews` 명시
- **로그아웃 시 로컬 정리**: swipes/검색기록/취향/AniList 캐시 비움 (onboarding 플래그·deviceId 보존)
- **LoadingBar (indeterminate)**: 디테일 모달 상단에 얇은 progress bar. 어떤 fetch라도 진행 중이면 표시
- **번역 캐시 prefix bump**: 번역 소스/스키마 바뀔 때 `tl3:` → `tl4:` 식으로 prefix를 올려 잘못된 한글 캐시 일괄 무효화
- **번역 배치**: `translateBatch`가 N개 텍스트를 DeepL 배열 입력 1회로 호출 (20 애니 = 40 → 1 RTT). 인메모리 + AsyncStorage `getMany/setMany`. DeepL 429/456 시 1시간 회로 차단 → Google 직행
- **AniList SWR**: trending/seasonal 같은 자주 보는 데이터를 AsyncStorage에 영구 캐시 → 부팅 시 즉시 렌더 + 백그라운드 갱신
- **동시성 제한**: AniList client에 in-flight 5개 큐 (90 req/min 레이트 리밋 방어)
- **Railway keepalive**: 앱 부팅 시 `apiHealth()` fire-and-forget — Railway 무료 플랜의 cold start (5–10s) 회피
- **DeepL 쿼터 추적**: `getDeeplQuota()`로 월별 사용량 조회. 80% 도달 시 운영 알림
- **CI**: GitHub Actions가 push/PR마다 `tsc --noEmit + npm test` 실행

## iOS 풀빌드 알려진 이슈 (Xcode 26 + Expo 54)

- `cannot link directly with 'SwiftUICore'` → deployment target 18.0
- `Undefined symbol: facebook::react::Sealable::Sealable()` → `buildReactNativeFromSource: true`
- `fmt` consteval 컴파일 실패 → fmt만 `c++17` 강제

자세한 패치 절차는 [`AGENTS.md`](./AGENTS.md#ios-풀-빌드-알려진-이슈-xcode-26--expo-54) 참고. 패치는 이미 레포에 들어가 있어서 `pod install` → `expo run:ios`만 하면 됨.

## 색상 팔레트

| 용도 | 값 |
|------|-----|
| 강조 | `#9f67ff` `#7c3aed` `#2d1b69` |
| 배경 | `#0f0f1a` `#1a1a2e` `#2a2a4a` |
| 텍스트 | `#f0f0ff` `#a8a8cc` `#6b6b99` `#45456b` |
| 점수(별) | `#f59e0b` |

`src/styles.ts`의 `C_TOKENS` 참조.

## 라이선스

개인 프로젝트. 외부 사용 시 별도 문의.
