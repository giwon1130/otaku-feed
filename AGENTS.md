# Otaku Feed — Agent Notes

React Native 0.81 + Expo 54 + TypeScript. AniList GraphQL + 라프텔 검색 API 기반 한국 사용자용 애니 추천 피드 앱.
백엔드 서버는 별도 (`otaku-feed-api`, Railway 배포 — 인증/취향 동기화).

## 도메인 한 줄

스와이프로 좋아요/패스를 모아 취향을 학습하고, 트렌딩·시즌 신작·"너 좋아할 만한 거" 등으로 피드를 구성한다.
디테일 모달에서는 라프텔 우선 + AniList 글로벌 링크로 한국 시청 가능 플랫폼을 보여준다.

## 주요 화면

| 탭 | 파일 | 역할 |
|----|------|------|
| 홈 | `src/tabs/HomeTab.tsx` | 트렌딩 + "X 좋아하니까"(최대 3개 anchor) + 너 좋아할 만한 거(top3 장르) + 시즌 신작 |
| 탐색 | `src/tabs/ExploreTab.tsx` | 검색 + 랭킹(트렌딩/점수/인기) + 장르 필터 칩 |
| 스와이프 | `src/tabs/SwipeTab.tsx` | 카드 스와이프 (좋아요/패스). 큐가 5개 이하면 자동 prefetch |
| 내 목록 | `src/tabs/MyListTab.tsx` | 좋아요/패스 리스트 + 검색·정렬 + "너의 취향" 인사이트 카드 |

**온보딩 단계 (`App.tsx` `AppStep`)**: `loading` → `onboarding`(장르) → `taste`(애니 카드 좋아요) → `auth` → `main`. 메뉴에서 장르/취향 재진입도 같은 컴포넌트 재사용 (`mode='edit'`).

## 외부 데이터

- **AniList GraphQL** (`src/api/anilist.ts`) — 핵심 카탈로그. 트렌딩/랭킹/장르/시즌/검색/추천/외부링크.
- **라프텔 검색** (`src/api/laftel.ts`) — 한국 OTT. AniList 외부링크는 글로벌 카탈로그라 한국 시청 가능 여부가 부정확해서 보강용으로 사용.
  - 영어 제목 → 한국어 자동 번역 → 검색 → fuzzy 매칭 → `is_viewing && !is_expired` 항목만 prepend.
- **Google 무료 번역** (`src/api/translate.ts`, `anilist.ts`) — KR↔EN. 검색어 번역 + 라프텔 매칭용.
- **otaku-feed-api** (`src/api/otakuApi.ts`) — 자체 백엔드. 인증 + 좋아요/패스 동기화.

## 핵심 패턴

- **로컬 우선 + 서버 동기화**: AsyncStorage에 즉시 저장 → 로그인 상태면 백엔드에 push (`syncLocalToServer`).
- **자동 prefetch**: SwipeTab — `pageRef`/`prefetchingRef`/`exhaustedRef` 같은 ref로 race condition 방지.
- **한국어 검색**: 한글 입력 → Google 번역 → AniList 영어 검색 → 결과 머지 (`HANGUL_RE` 체크).
- **이미지 로더**: `ImageWithLoader` — Skeleton 깜빡임 후 페이드인.
- **외부링크 regional 플래그**: `regional: true`(라프텔/한국 전용) 우선, `false`(Netflix 등 글로벌)는 KR/글로벌 배지로 시각 구분 + 경고 노출.
- **시리즈 보는 순서 (`fetchAnimeRelations`)**: AniList `relationType(version: 2)` 사용. main story(PARENT/PREQUEL/SIDE_STORY/SEQUEL) 4종은 연도 ASC로 섞어 시청 순서 유지, 나머지(SPIN_OFF/ALTERNATIVE/SUMMARY)는 타입별 그룹으로 끝쪽에 묶음. 모달에서 그룹이 바뀔 때 세로 디바이더로 시각 구분.
- **시리즈 카드 navigate**: 디테일 모달 시리즈 카드 탭 → SeriesEntry를 stub Anime으로 변환해서 `onSelectSimilar` 호출. 모달 useEffect의 `fetchAnimeById`가 빈 genres/studios/score를 자동 보강 (`enriched` state, `view = enriched ?? anime`).
- **추천 anchor 다양화**: 홈 "X 좋아하니까" 섹션은 최근 좋아요 10개를 셔플 → 1차 장르 중복 회피로 최대 3개 anchor 선정 → 각 anchor별로 `fetchRecommendations` 후 별개 캐러셀 렌더.
- **피드 강제 갱신 (`reloadToken`)**: 장르/취향 재선택 후 `App.tsx`에서 `homeReloadToken` bump → `HomeTab`이 prop으로 받아 useEffect 의존성에 포함 → 즉시 재로드. (탭 마운트 의존이 아니라서 사용자가 같은 탭에 머물러도 갱신됨.)

## 인증

- 카카오 / 구글 SSO (`@react-native-kakao/user`, `@react-native-google-signin/google-signin`).
- Expo Go에선 안 돼. **dev client 빌드 필요** (`npx expo run:ios --device`).
- 토큰은 AsyncStorage(`apiSetToken`/`getToken`).

## 개발 환경

요구사항: Node 20+, Xcode (iOS 빌드용), CocoaPods, JDK (Android 빌드 시).

```bash
# 의존성
npm install

# 타입 체크
npx tsc --noEmit

# Metro만 띄우기 (이미 dev client 폰에 있을 때)
npx expo start --dev-client

# iOS 폰에 빌드+설치 (네이티브 모듈 변경 시 필수)
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx expo run:ios --device "<UDID>"

# UDID 확인
xcrun devicectl list devices
```

**중요**: macOS 기본 locale 때문에 CocoaPods가 `Encoding::CompatibilityError`로 죽음. `LANG=en_US.UTF-8` 항상 prefix.

## 환경변수 (`.env`)

| 키 | 용도 |
|----|------|
| `EXPO_PUBLIC_API_URL` | otaku-feed-api 베이스 URL |
| `EXPO_PUBLIC_DEEPL_API_KEY` | (옵션) DeepL 번역 — 없으면 Google 무료 fallback |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` / `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Google SSO |
| `EXPO_PUBLIC_KAKAO_APP_KEY` | Kakao SSO |

## 개발 워크플로 (에이전트가 따를 절차)

다른 PC에서도 작업하기 때문에 항상 원격지 최신화부터 시작한다.

1. **요구사항 받으면 먼저 `git pull`** — origin/main 기준으로 최신화. 충돌나면 사용자에게 알리고 멈춤.
2. **작업 진행** — 코드 수정.
3. **검증** — `npx tsc --noEmit`로 타입 체크 (최소 컴파일 에러 0).
4. **커밋 + 푸시** — `git push origin <branch>:main`이 막히면 feature 브랜치로 푸시 + PR 링크 안내.
5. **모바일 반영 — 네이티브 변경 여부로 분기** (iPhone이 `xcrun devicectl list devices`로 연결 확인됐을 때):

   **(a) JS/TSX만 변경** → Metro 리로드로 충분. 풀 빌드 **금지** (5–10분 낭비).
   ```bash
   cd <repo> && nohup npx expo start --dev-client > /tmp/expo-metro.log 2>&1 &
   ```
   이미 폰에 dev client 앱이 깔려 있다는 가정. 열면 Fast Refresh로 즉시 반영.

   **(b) 네이티브 변경 있음** → 풀 빌드 필수.
   ```bash
   cd <repo> && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 \
     nohup npx expo run:ios --device "<UDID>" > /tmp/expo-build.log 2>&1 &
   ```
   Monitor로 `BUILD SUCCEEDED|BUILD FAILED|error:|Installing` 추적.

   **네이티브 변경 판정 (다음 중 하나라도 해당하면 (b))**:
   - `package.json` dependencies 변경 (특히 네이티브 모듈 추가/제거/업그레이드)
   - `ios/` 하위 아무 파일 (Podfile, Info.plist, xcodeproj, Swift/ObjC)
   - `android/` 하위 아무 파일
   - `app.json`, `app.config.ts`/`.js` 의 권한/번들ID/네이티브 설정
   - `expo` / `react-native` / 플러그인 메이저·마이너 업데이트

   판정 방법: `git diff --name-only <이전커밋> HEAD`로 위 경로 걸리는지 확인.
   폰 안 붙어 있으면 5단계 스킵하고 사용자에게 "폰 연결하면 Metro 띄울게" 안내.

6. **백엔드 변경이 있었으면 Railway**: 백엔드 레포(`otaku-feed-api`)가 따로 있으니, 거기서 push되면 자동 빌드. 이 레포 자체는 Railway 배포 대상이 아님.

## iOS 풀 빌드 알려진 이슈 (Xcode 26 + Expo 54)

> 다른 PC에서 `ios/Pods` 없이 처음 빌드하면 아래 3개 에러를 순서대로 만남.
> 이 레포에는 이미 패치가 들어가 있으니 (Podfile / Podfile.properties.json /
> project.pbxproj) 그대로 `pod install` → `expo run:ios`만 하면 돼.
> 만약 `git clean -fdx` 같은 걸로 패치 자체가 날아갔다면 아래 순서대로 복구.

**왜 otaku-feed만 터지나** — signal-desk-app 같은 가벼운 RN 앱은 멀쩡함. 차이는
`react-native-reanimated@4` + `@react-native-kakao/*` 이 두 개. Reanimated 4는
expo-modules-core의 SwiftUI 코드를 링크 경로에 끌어들이고, Kakao SDK는 Swift native
모듈이라 추가로 SwiftUI 의존성을 키움. 그 조합 때문에 아래 체인이 발생.

### (1) `cannot link directly with 'SwiftUICore'`

```
ld: Could not parse or use implicit file '.../SwiftUICore.framework/SwiftUICore.tbd':
    cannot link directly with 'SwiftUICore' because product being built is not an allowed client of it
```

원인: Xcode 26 SDK에서 `SwiftUICore.tbd`의 `allowable_clients`가 deployment target
≥ 18.0 만 허용. expo-modules-core가 `import SwiftUI`를 하는데 deployment target이
15.1이면 implicit autolink가 막힘.

**픽스** (3 곳 동시 갱신):
- `ios/Podfile.properties.json`: `"ios.deploymentTarget": "18.0"` 추가
- `ios/OtakuFeed.xcodeproj/project.pbxproj`: `IPHONEOS_DEPLOYMENT_TARGET = 15.1;` →
  `18.0;` (4군데)
- `ios/Podfile` `post_install`에 모든 Pod target을 18.0으로 강제하는 루프 추가
  (10.0이나 15.1짜리 transitive pod이 남으면 같은 에러 재발)

iPhone 17 / iOS 26+만 쓰니까 18.0 deployment 으로 잘라도 문제 없음.

### (2) `Undefined symbol: facebook::react::Sealable::Sealable()`

```
Undefined symbols for architecture arm64
  Symbol: facebook::react::Sealable::Sealable()
  Referenced from: expo::ExpoViewProps::ExpoViewProps() in libExpoModulesCore.a
```

원인: deployment target을 바꾸면 ExpoModulesCore가 다시 컴파일되는데, 기본 설정은
prebuilt RN core(`RCT_USE_PREBUILT_RNCORE=1`)를 쓰는 모드라서 ABI가 안 맞음.

**픽스**: `ios/Podfile.properties.json`에 `"ios.buildReactNativeFromSource": "true"`
추가 → `pod install` 다시 (Pods 100개로 늘어남, RN core source pod 5개 추가됨).

### (3) `fmt` consteval 컴파일 실패

```
ios/Pods/fmt/include/fmt/format-inl.h:59:24
  call to consteval function 'fmt::basic_format_string<...>::basic_format_string'
  is not a constant expression
```

원인: Xcode 26.4 clang이 C++20 모드에서 RN이 번들한 fmt의 `FMT_STRING` 매크로를
consteval로 평가하다가 깨짐. 알려진 toolchain 회귀 (참고: BleepingSwift 글).

**픽스**: `ios/Podfile` `post_install`에서 `target.name == 'fmt'`만 골라서
`CLANG_CXX_LANGUAGE_STANDARD = 'c++17'` 강제. fmt만 다운그레이드, 나머지는 RN이
요구하는 c++20 그대로 둠.

### 패치 적용 후 절차

```bash
cd ios && rm -rf Pods Podfile.lock
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install
cd .. && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 \
  npx expo run:ios --device "<UDID>"
```

> 첫 풀 빌드는 RN core 까지 source 컴파일이라 10–15분 걸림.
> 다음에 빠르게 하려면 `Podfile.properties.json`에 `"apple.ccacheEnabled": "true"`
> 추가 → 두 번째 빌드부터 3-5배 빠름 (변경 안 된 pod은 ccache 히트).

## 작업 규약

- **타입 우선**: 새 응답 필드는 `src/types.ts`에 먼저 정의, 컴포넌트는 그 타입을 import.
- **외부 API는 항상 try/catch + fallback**: 라프텔/번역 API 죽었다고 모달 전체가 깨지면 안 됨.
- **새 화면/컴포넌트 색상 팔레트**: 보라(`#9f67ff`/`#7c3aed`/`#2d1b69`) 강조, 배경(`#0f0f1a`/`#1a1a2e`/`#2a2a4a`), 텍스트(`#f0f0ff`/`#a8a8cc`/`#6b6b99`/`#45456b`).
- **한국어 카피**: 친근한 반말 톤 ("좋아요한 애니가 없어", "너 좋아할 만한 거", "어디서 볼 수 있어?").
- **햅틱**: 액션마다 `hapticLight`/`hapticMedium`/`hapticError`. 버튼 누르면 무조건 light 이상.

## 최근 변경 (역순)

| 커밋 | 요약 |
|------|------|
| _다음_ | 시리즈 그룹 디바이더 + 멀티 anchor 캐러셀 + 취향 재분석 즉시 갱신 + navigate 풀메타 보강 |
| `3463096` | 시리즈 관계 필터 확장 (SPIN_OFF/ALTERNATIVE/SUMMARY까지 노출, MUSIC 블랙리스트 제거) |
| `043b4a0` | 디테일 줄거리 잘림 fix + 시리즈 보는 순서 + 취향 분석 온보딩 |
| `2517f55` | 라프텔 통합 + ExternalLink regional 플래그 + ExploreTab 장르 필터 + MyListTab 인사이트 카드 + 장르 재선택 |
| `a7fabc8` | 5개 사용성 업그레이드 (홈 추천 / 검색 한글지원 / 비슷한 작품 / 정렬·검색 / 자동 prefetch) |
| `117664d` | OAuth, 리팩토링, UI 개선, 아이콘 |
| `7753e29` | OtakuFeed 초기 구현 |
