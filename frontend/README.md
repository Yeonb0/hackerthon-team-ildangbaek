# SkinTeller · frontend

피부 기록과 성분 반응을 연결해 개인 피부 프로파일을 만드는 앱의 프론트엔드입니다.
React Native (Expo) + TypeScript, iOS / Android 단일 코드베이스.

전체 프로젝트 개요는 [루트 README](../README.md), API 규약은 [docs/api_명세서.md](../docs/api_명세서.md)를 참고하세요.

---

## 시작하기

```bash
npm install
cp .env.example .env      # 백엔드가 아직 없으면 EXPO_PUBLIC_USE_MOCK=true 유지
npx expo start            # Expo Go 앱으로 QR 스캔
```

Wi-Fi 환경에서 기기가 개발 서버를 못 찾으면 `npx expo start --tunnel`로 실행합니다.

> ⚠️ **RoutineEdit(루틴 수정) 화면은 Expo Go에서 크래시합니다.** `react-native-reanimated`의 네이티브
> 모듈을 쓰는 드래그 순서 변경이 들어 있어 Development Build가 필요합니다. 그 외 화면은 Expo Go로
> 모두 확인할 수 있습니다.

### 스크립트

| 명령 | 설명 |
| --- | --- |
| `npm start` | Expo 개발 서버 시작 |
| `npm run typecheck` | TypeScript 타입 검사 (`tsc --noEmit`) |
| `npm run lint` | ESLint 검사 |
| `npm run format` | Prettier로 전체 포맷 |
| `npm run android` / `npm run ios` | 네이티브 빌드 실행 (Development Build) |

병합 전에는 `npm run typecheck`와 `npm run lint`가 모두 통과해야 합니다.
현재 기준선은 **타입 오류 0 / ESLint 오류 0 · 경고 79**입니다.

---

## 환경 변수

`.env.example`을 복사해 `.env`로 만들어 씁니다. `.env`는 커밋되지 않습니다.

| 변수 | 설명 |
| --- | --- |
| `EXPO_PUBLIC_API_BASE_URL` | 백엔드 주소. **`/api/v1`까지 포함**해서 적습니다. 실기기에서는 `localhost`가 아니라 PC의 LAN IP를 씁니다. |
| `EXPO_PUBLIC_USE_MOCK` | `true`면 모든 API 호출이 `src/api/mock`의 목업으로 응답합니다. |
| `EXPO_PUBLIC_DEV_OAUTH_TOKEN` | 임시 인증용 토큰 자리값. **값을 바꾸면 새 계정이 생깁니다** — 온보딩을 처음부터 테스트할 때 씁니다. (백엔드 [ADR 0006](../docs/decisions/0006-임시-인증-방편.md) · [ADR 0017](../docs/decisions/0017-임시-인증-토큰-통합.md)) |
| `EXPO_PUBLIC_SHOW_CATALOG` | `true`면 로그인·온보딩을 건너뛰고 컴포넌트 카탈로그로 진입합니다. `.env.example`에는 없으니 필요할 때 직접 추가하세요. |

---

## 화면 목록

화면 ID는 [docs/screen-structure-v3.html](../docs/screen-structure-v3.html) 기준이며, 라우트 상수는
`src/app/routes.ts`에 정의되어 있습니다.

### 인증 · 온보딩

| ID | 화면 | 비고 |
| --- | --- | --- |
| S-00 | 로그인 | 소셜 로그인은 목업 흐름 (실 SDK 미연동) |
| AUTH-03~06.2 | 이메일 로그인 · 회원가입 · 비밀번호 설정 · 인증 · 성공/실패 | **프론트 목업 전용** — 백엔드 API 없음 |
| S-01 | 기본 정보 | |
| S-02 | 피부 타입 | |
| S-04 | 호르몬 정보 | |
| S-05 | 온보딩 완료 요약 | |
| S-06 | 알림 설정 | 앱 내부 설정만 저장 (OS 권한 요청 없음) |

### 메인 탭

| ID | 화면 | 비고 |
| --- | --- | --- |
| S-07 / S-08 | 홈 (낮 / 밤) | 시간대 내부 상태로 분기 |
| S-09 / S-10 | 기록 허브 (모닝 / 나이트) | 내부 탭으로 분기 |
| S-19 | 리포트 | 7일 · 30일 추이 |
| S-21 | 쇼핑 | |
| S-23 | 마이페이지 | |

### 상세 화면

| ID | 화면 | 비고 |
| --- | --- | --- |
| S-11 / S-12 | 제품 기록 (기본 ↔ 검색 결과) | 내부 상태로 분기 |
| S-13 | 바코드 스캔 | |
| S-14 | 성분 확인 | **제품 기록 저장 지점** |
| S-15 | 촬영 가이드 | |
| S-16 | 얼굴 촬영 | 프리뷰 · 재촬영은 내부 상태 |
| S-17 | 분석 중 | |
| S-18 | 피부 분석 결과 | 지표 4종 + 레이더 차트 |
| S-20 | 요인 상세 | |
| S-22 | 구매 전 확인 결과 | **현재 미사용** — ProductDetail이 상위 호환 |
| S-24 | 위치 설정 | |
| S-25 | 위시리스트 | 백엔드 API 없음 — `wishlistStore` 클라이언트 저장 |
| — | 제품 상세 (SHOP-02) | 추천 · 검색 · 스캔 3개 진입 경로가 모두 여기로 모임 |
| — | 성분 전체 보기 (F-MY-03) | S-23에서 진입 |
| — | 루틴 수정 (PROD-07) | Development Build 필요 |
| — | 루틴 제품 추가 | 저장된 제품을 체크박스로 다중 선택 |
| — | 제품 직접 등록 (PROD-05) | 프론트 목업 전용 |
| — | 제품 등록 완료 | 제품 기록 저장 직후 |
| — | 월간 기록 캘린더 (F-RECORD-02) | 날짜 탭 시 바텀시트 |

---

## 폴더 구조

```
src/
├─ app/          # 네비게이터 — Root · Auth · Onboarding · MainTab, routes.ts, useAuthBootstrap
├─ api/          # client / unwrap / adapters / useMock — 도메인별 파일
│  ├─ mock/      # USE_MOCK일 때 반환할 목업 데이터 + mockPersistence
│  └─ queries/   # TanStack Query 훅 (home, record, product, report, check)
├─ components/
│  ├─ base/      # Button, Card, Chip, Popup, Calendar, WheelPicker, AppTextInput 등
│  ├─ chart/     # RadarChart, TrendGraph (react-native-svg)
│  ├─ domain/    # ProductCard, MetricScoreList, EnvironmentCard, InsightCard 등
│  ├─ icons/     # 아이콘 컴포넌트
│  ├─ state/     # EmptyState / ErrorState / LoadingState / PermissionDenied
│  └─ dev/       # DevResetButton (__DEV__ 전용)
├─ screens/      # auth · onboarding · home · record · product · skin · report · my · dev
├─ theme/        # tokens.ts, typography.ts, fontFamily.ts, bootstrapFont.ts
├─ lib/          # scale, date, dayNight, weather, metricLabels, ingredientStatus 등 순수 함수
├─ hooks/        # useDebouncedValue 등
├─ store/        # zustand — auth, onboarding, dayNight, report, routine, wishlist, font 등
└─ types/        # 도메인별 API 타입 + errorCodes.ts
```

절대경로 alias `@/*` → `src/*`가 설정되어 있습니다. `import { color } from '@/theme'` 형태로 씁니다.

---

## 코딩 규칙

- **색상은 `theme/tokens.ts`에서만 정의합니다.** `src/screens/**`의 `#RRGGBB` 하드코딩은 ESLint 경고 대상입니다.
- **폰트 크기는 `adjustFontSize()`를 씁니다.** 단, 주아체(BMJUA)가 적용된 자리에서는 래퍼를 쓰지 않습니다 (`typography.ts` 규약).
- **`SvgText`는 StyleSheet의 폰트를 상속하지 않습니다.** `fontFamily`를 prop으로 직접 넘겨야 합니다.
- **목업도 실제 API와 동일한 응답 형태**(`isSuccess` / `code` / `result`)를 따릅니다. 실패 케이스도 서버와 같은 방식으로 실패해야 합니다.
- **기록 저장 후 쿼리 무효화**는 `['recordToday']` · `['recordCalendar']` · `['home']`을 항상 함께 처리합니다.
- Enum은 문자열만 쓰고, 빈 목록은 `null`이 아니라 `[]`로 다룹니다.
- Figma와 의도적으로 다르게 구현한 부분은 **코드 주석에 이유를 남깁니다.**

---

## 목업 · 개발 도구

백엔드가 준비되기 전에도 화면 작업이 막히지 않도록 하는 장치들입니다.

- **`EXPO_PUBLIC_USE_MOCK=true`** — 모든 API 호출이 목업 데이터로 응답합니다.
- **`EXPO_PUBLIC_SHOW_CATALOG=true`** — 컴포넌트 카탈로그(`CatalogScreen`)로 바로 진입합니다.
- **`DevResetButton`** — `__DEV__` 빌드 화면 우하단에 뜨는 버튼입니다. 로그인 · 온보딩 · 피부 기록 ·
  제품 기록 상태를 개별 초기화할 수 있고, 리포트(정상/데이터부족) · 바코드 스캔(성공/인식실패/화질부족/
  서비스장애) · 구매 전 확인(성공/프로필부족/성분부족) 시나리오를 실기기에서 바로 전환할 수 있습니다.
  브라우저 콘솔이 없는 실기기 테스트를 위한 장치입니다.

---

## 빌드 · 배포

EAS로 빌드합니다. 프로파일은 `eas.json`에 정의되어 있습니다.

| 프로파일 | 용도 |
| --- | --- |
| `development` | Development Build (네이티브 모듈 필요한 화면 테스트용, Android는 APK) |
| `preview` | 내부 배포용 |
| `testflight` | iOS TestFlight 배포 |
| `production` | 스토어 배포 |

```bash
eas build --profile development --platform android
eas build --profile testflight --platform ios
```

> ⚠️ **EAS는 git에 커밋된 상태를 빌드합니다.** 작업 디렉터리 변경분은 반영되지 않으니 빌드 전에 반드시 커밋하세요.

---

## Git 브랜치 규칙

- `main` — 항상 실행 가능한 상태만 유지합니다.
- 작업 브랜치: `feat/S-XX-설명` 또는 `feat/기능명` — 예: `feat/S-18-report-metric-list`
- 커밋 메시지에 화면 ID 또는 기능 ID를 답니다 — 예: `feat(S-18): 분석 결과 지표 리스트`
- 화면 하나가 끝나면 **로딩 · 빈 데이터 · 에러 · 정상** 4가지 상태를 확인한 뒤 병합합니다.


