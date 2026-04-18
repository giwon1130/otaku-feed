# OtakuFeed — Agent Reference

이 문서는 AI 에이전트가 프로젝트 작업 시 참고할 핵심 정보를 담고 있다.

---

## 프로젝트 구조

```
otaku-feed/          # React Native (Expo) 프론트엔드
otaku-feed-api/      # Spring Boot 백엔드
```

### 프론트엔드 주요 경로
```
App.tsx                          # 루트: 탭 네비게이션, AnimeDetailModal 연결
src/
  api/
    otakuApi.ts                  # 모든 API 함수 (auth, swipes, prefs)
    translate.ts                 # DeepL 번역 + translateAnimeList<T> 유틸
  components/
    AuthScreen.tsx               # 이메일/구글/카카오 로그인 화면
    AnimeDetailModal.tsx         # 애니 상세 모달
    OnboardingScreen.tsx         # 온보딩
  tabs/
    HomeTab.tsx                  # 홈 (HorizontalAnimeList - React.memo)
    SwipeTab.tsx                 # 스와이프 카드
    ExploreTab.tsx               # 탐색/검색
    MyListTab.tsx                # 내 목록
  constants.ts                   # GENRE_KO, SEASON_KO, STATUS_KO (공유 상수)
  styles.ts                      # 전역 스타일
scripts/
  generate-icon.mjs              # 아이콘 생성 스크립트 (sharp)
```

### 백엔드 주요 경로
```
otaku-feed-api/src/main/kotlin/com/giwon/otakufeed/
  features/auth/
    application/
      AuthService.kt             # 로그인/회원가입/OAuth 로직
      AuthRepository.kt          # DB 접근 (JdbcTemplate)
      UserDomain.kt              # User 도메인 모델
    presentation/
      AuthController.kt          # /auth/* 엔드포인트
  ...
src/main/resources/db/migration/
  V1__init.sql                   # 초기 스키마
  V2__add_oauth_columns.sql      # password nullable, google_id, kakao_id 추가
```

---

## 환경 변수 (.env)

```
EXPO_PUBLIC_API_URL=https://otaku-feed-api-production.up.railway.app
EXPO_PUBLIC_DEEPL_API_KEY=5b8f2b7b-734a-4e24-a35e-aff7fd5ba501:fx
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=496073748220-lvagt9ir98pc3qc2lfqtglqbjem4ed2c.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=496073748220-8j71chi4u7m9vpop8kn5vg30hvgh6an8.apps.googleusercontent.com
EXPO_PUBLIC_KAKAO_APP_KEY=ef9338c2b5ac76546d547e71bda8b580
```

---

## 빌드 / 배포 방법

### iOS 빌드 (매번 동일한 순서)

```bash
# 1. prebuild (app.json 플러그인 변경 시에만)
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx expo prebuild --platform ios

# 2. pod install (prebuild 후 항상)
cd ios && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install && cd ..

# 3. pbxproj 서명 패치 (prebuild 후 항상)
PROJ="ios/OtakuFeed.xcodeproj/project.pbxproj"
sed -i '' \
  's|CODE_SIGN_ENTITLEMENTS = OtakuFeed/OtakuFeed.entitlements;|CODE_SIGN_ENTITLEMENTS = OtakuFeed/OtakuFeed.entitlements;\n\t\t\t\tCODE_SIGN_STYLE = Automatic;\n\t\t\t\tDEVELOPMENT_TEAM = 776H9NV6HT;|g' \
  "$PROJ"

# 4. xcodebuild (번들 포함 Debug 빌드)
xcodebuild \
  -workspace ios/OtakuFeed.xcworkspace \
  -scheme OtakuFeed \
  -configuration Debug \
  -destination 'id=00008150-0003452E0A28401C' \
  -allowProvisioningUpdates \
  CODE_SIGN_STYLE=Automatic \
  DEVELOPMENT_TEAM=776H9NV6HT \
  FORCE_BUNDLING=true \
  BUNDLE_COMMAND=bundle

# 5. iPhone 설치
APP_PATH=$(find ~/Library/Developer/Xcode/DerivedData/OtakuFeed-*/Build/Products/Debug-iphoneos -name "OtakuFeed.app" | head -1)
xcrun devicectl device install app --device 00008150-0003452E0A28401C "$APP_PATH"
```

### 주의사항

#### ❌ 자주 하는 실수들

1. **"No script URL provided" 에러**
   - 원인: Debug 빌드는 기본적으로 JS 번들을 포함하지 않고 Metro에 연결 시도
   - 해결: **Release 빌드 사용** (`-configuration Release`) → 항상 번들 포함
   - `FORCE_BUNDLING=true BUNDLE_COMMAND=bundle` (Debug에도 번들 포함 시도하지만 불안정)

2. **"No Account for Team" / "No profiles found" 에러**
   - 원인: `xcodebuild` CLI가 Xcode 키체인 세션에 접근 못함
   - 해결: Xcode GUI를 먼저 열고 → Signing & Capabilities에서 Team 설정 → 그 다음 CLI 빌드
   - Team ID는 Xcode 설정 후 pbxproj에서 확인: `grep DEVELOPMENT_TEAM ios/OtakuFeed.xcodeproj/project.pbxproj`

3. **`expo prebuild --clean` 후 서명 초기화**
   - 원인: `--clean`이 ios/ 폴더를 완전히 재생성
   - 해결: prebuild 후 반드시 pbxproj 패치 스크립트 실행 (위 3번 참고)
   - `--clean` 없이 `expo prebuild`만 해도 대부분 동작함

4. **`pod install` Unicode 에러**
   - 에러: `Unicode Normalization not appropriate for ASCII-8BIT`
   - 원인: Ruby 4.x + CocoaPods 인코딩 버그
   - 해결: 반드시 `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install`

5. **`expo run:ios` 실패**
   - 원인: 내부적으로 `pod install`을 LANG 설정 없이 실행 → Ruby 인코딩 에러
   - 해결: `expo run:ios` 쓰지 말고 수동으로 `pod install` + `xcodebuild` 조합 사용

6. **scheme 이름 오류**
   - `xcodebuild -scheme otakufeed` → 오류
   - 올바른 scheme: `-scheme OtakuFeed` (대문자 O, F)
   - 확인: `xcodebuild -workspace ios/OtakuFeed.xcworkspace -list`

7. **빌드 후 설치 안 됨**
   - Release 빌드 결과물 경로: `~/Library/Developer/Xcode/DerivedData/OtakuFeed-*/Build/Products/Release-iphoneos/OtakuFeed.app`
   - Debug 빌드 결과물 경로: `~/Library/Developer/Xcode/DerivedData/OtakuFeed-*/Build/Products/Debug-iphoneos/OtakuFeed.app`

### 권장 빌드 플로우 (JS 코드만 변경 시)

JS/TS 코드만 바꿨다면 prebuild/pod install 불필요:

```bash
# JS만 변경 → Release 빌드 + 설치만
xcodebuild \
  -workspace ios/OtakuFeed.xcworkspace \
  -scheme OtakuFeed \
  -configuration Release \
  -destination 'id=00008150-0003452E0A28401C' \
  -allowProvisioningUpdates \
  CODE_SIGN_STYLE=Automatic \
  DEVELOPMENT_TEAM=776H9NV6HT

APP_PATH=$(find ~/Library/Developer/Xcode/DerivedData/OtakuFeed-*/Build/Products/Release-iphoneos -name "OtakuFeed.app" | head -1)
xcrun devicectl device install app --device 00008150-0003452E0A28401C "$APP_PATH"
```

### 네이티브 코드 변경 시 (새 패키지 설치, app.json 플러그인 변경)

```bash
LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 npx expo prebuild --platform ios
cd ios && LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 pod install && cd ..
# pbxproj 패치 (위 3번)
# xcodebuild + 설치 (위 권장 플로우)
```

### 백엔드 배포
- Railway 자동 배포: `otaku-feed-api` main 브랜치에 push하면 자동 배포
- 배포 URL: `https://otaku-feed-api-production.up.railway.app`

---

## 기기 정보

| 항목 | 값 |
|------|-----|
| iPhone Device ID | `00008150-0003452E0A28401C` |
| Apple Team ID | `776H9NV6HT` |
| Bundle ID | `com.giwon.otakufeed` |

---

## 핵심 설계 결정

### 번역
- `translateAnimeList<T extends { title, description }>(animes)` — 제네릭 유틸
- 4개 탭 모두 이걸로 번역 (중복 제거)
- DeepL 무료 키 사용 중

### 스타일 / 상수
- `src/constants.ts`: `GENRE_KO`, `SEASON_KO`, `STATUS_KO` 공유
- `src/styles.ts`: 전역 스타일 (모든 컴포넌트 공유)

### SwipeTab 레이아웃
- 카드: `flex: 1` (이전 `aspectRatio: 2/3` → 화면 잘림 버그 있었음)
- panResponder stale closure 수정: `handleSwipeRef = useRef(handleSwipe)` + useEffect로 항상 최신 유지

### HomeTab 최적화
- `HorizontalAnimeList`: `React.memo` + `useCallback(renderItem, [swipeMap, onPress])`

### MyListTab 무한루프 방지
- `load` useCallback에서 `animeMap` 의존성 제거
- `setAnimeMap(prevMap => ...)` 함수형 업데이트 사용

### OAuth
- Google: `idToken` → 백엔드가 `https://oauth2.googleapis.com/tokeninfo?id_token=...` 검증
- Kakao: `accessToken` → 백엔드가 `https://kapi.kakao.com/v2/user/me` 검증
- 기존 이메일 계정에 OAuth 연결 가능 (자동 linking)
- 소셜 계정은 password nullable (V2 마이그레이션)

---

## 자주 하는 실수 (백엔드/인프라)

- **Dockerfile Java 버전 불일치**: `build.gradle.kts`의 `JavaLanguageVersion`이랑 Dockerfile의 `eclipse-temurin:XX` 버전 항상 일치시켜야 함. 현재 둘 다 **21**
- **Kakao SDK 초기화 누락**: `expo prebuild`가 AppDelegate에 Kakao 초기화를 자동으로 안 넣을 수 있음. 직접 `AppDelegate.swift`에 추가해야 함:
  ```swift
  import KakaoSDKCommon
  // didFinishLaunchingWithOptions 첫 줄:
  KakaoSDK.initSDK(appKey: "ef9338c2b5ac76546d547e71bda8b580")
  ```
- **prebuild 후 AppDelegate 덮어써짐**: `expo prebuild` 실행하면 `AppDelegate.swift` 초기화됨 → Kakao init 코드 사라짐 → 다시 추가해야 함

## 알려진 이슈 / TODO

- [ ] 구글/카카오 로그인 실제 테스트 (키 발급 완료, 빌드 완료)
- [ ] Kakao Developers 콘솔에서 iOS 플랫폼 등록 확인 (번들 ID: `com.giwon.otakufeed`)
- [ ] Google Cloud Console에서 OAuth 동의 화면 퍼블리시 (현재 테스트 모드)
