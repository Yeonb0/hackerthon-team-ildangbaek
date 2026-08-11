# skinteller · frontend

피부 기록 기반 성분-피부변화 시차 상관분석 앱의 프론트엔드입니다.
React Native (Expo) + TypeScript, iOS/Android 단일 코드베이스.

기준 문서: `frontend-roadmap-phases.md` (Phase 0~8), 화면 구조 정의서 v3, API 명세 v1.0 (모두 `../files/`)

## 시작하기

```bash
npm install
cp .env.example .env   # 값 채우기 (백엔드 URL 아직 없으면 EXPO_PUBLIC_USE_MOCK=true 유지)
npx expo start
```

실기기에서는 Expo Go 앱으로 QR코드를 스캔해 실행합니다.

## 자주 쓰는 스크립트

| 명령 | 설명 |
| --- | --- |
| `npm start` | Expo 개발 서버 시작 |
| `npm run lint` | ESLint 검사 |
| `npm run format` | Prettier로 전체 포맷 |
| `npm run typecheck` | TypeScript 타입 검사만 (빌드 없이) |

## 폴더 구조

```
src/
├─ app/          # 네비게이터 — RootNavigator, OnboardingNavigator, MainTabNavigator, routes.ts, useAuthBootstrap
├─ api/          # client / unwrap / adapters / useMock — 도메인별 파일(auth, onboarding, skin, notification)
│  ├─ mock/      # USE_MOCK일 때 반환할 목업 데이터 (도메인별) + mockPersistence
│  └─ queries/   # TanStack Query 훅 (home, record, product, report, check)
├─ components/
│  ├─ base/      # Button, Card, Chip, Tag, Popup, ProgressBar, SegmentToggle, Calendar, Stepper, WheelPicker, DateField, Input, Toast
│  ├─ chart/     # RadarChart, TrendGraph (react-native-svg 기반, n각형/가변 데이터 대응)
│  ├─ domain/    # ProductCard, MetricScoreList, RecordCalendar, InsightCard 등 화면 조합 컴포넌트
│  ├─ state/     # EmptyState / ErrorState / LoadingState / PermissionDenied / InlineErrorBanner
│  └─ dev/       # DevResetButton — 실기기용 목업 상태 초기화 메뉴 (__DEV__ 전용)
├─ screens/
│  ├─ auth/          # S-00 로그인
│  ├─ onboarding/    # S-01~06 기본정보 · 피부타입 · 호르몬 · 완료요약 · 알림허용
│  ├─ home/          # S-07~09 낮/밤 홈
│  ├─ record/        # S-10 기록 허브
│  ├─ product/       # S-11~14 제품 기록(검색·스캔), S-21~22 구매 전 확인
│  ├─ skin/          # S-15~18 촬영 · 프리뷰 · 분석 중 · 결과
│  ├─ report/        # S-19 리포트, S-20 요인 상세
│  ├─ my/            # S-23~24 — 라우팅만 연결된 빈 화면(placeholder), Phase 8 예정
│  └─ dev/           # CatalogScreen — 컴포넌트 카탈로그 (EXPO_PUBLIC_SHOW_CATALOG)
├─ theme/        # tokens.ts, typography.ts — 색상은 반드시 여기서만 정의
├─ lib/          # scale.ts, date.ts, dayNight.ts, weather.ts, image.ts, secureTokenStorage.ts, platformStorage.ts, devFlags.ts
├─ hooks/        # useDebouncedValue 등 순수 훅
├─ store/        # zustand — authStore, onboardingStore, dayNightStore, reportUiStore
└─ types/        # 도메인별 API 타입 + errorCodes.ts
```

절대경로 alias `@/*` → `src/*` 가 설정되어 있습니다. `import { color } from '@/theme'` 형태로 사용합니다.

**규칙:** `src/screens/**` 안에서 `#RRGGBB` 형태의 색상 하드코딩은 ESLint 경고 대상입니다. 반드시 `theme/tokens.ts`의 토큰을 사용해 주세요.

## 목업 · 개발 도구

백엔드 API가 준비되기 전까지 화면 작업이 막히지 않도록 하는 장치들입니다.

- **`EXPO_PUBLIC_USE_MOCK=true`** — 모든 API 호출이 `api/mock/*`의 목업 데이터로 응답합니다. 목업도 실제 API와 동일한 응답 형태(`isSuccess`/`code`/`result`)를 따릅니다.
- **`EXPO_PUBLIC_SHOW_CATALOG=true`** — 로그인/온보딩 분기를 건너뛰고 컴포넌트 카탈로그(`CatalogScreen`)로 바로 진입합니다. 아직 `.env.example`에는 없으니 필요하면 로컬 `.env`에 직접 추가해 사용하세요.
- **`DevResetButton`** — `__DEV__` 빌드 화면 우하단에 항상 떠 있는 버튼입니다. 로그인 · 온보딩 · 피부 기록 · 제품 기록 상태를 개별 초기화할 수 있고, 리포트(정상/데이터부족) · 바코드 스캔(성공/인식실패/화질부족/서비스장애) · 구매 전 확인(성공/프로필부족/성분부족) 시나리오를 실기기에서 바로 전환할 수 있습니다. 브라우저 콘솔이 없는 실기기 테스트를 위한 장치입니다.

## Git 브랜치 규칙

- `main` — 항상 실행 가능한 상태만 유지합니다. 데모 리허설 직전 상태가 곧 `main`입니다.
- `feat/S-XX-설명` 또는 `feat/기능명` — 화면·기능 단위 작업 브랜치. 예: `feat/S-18-report-metric-list`
- 커밋 메시지에 화면 ID를 답니다 — `feat(S-18): 분석 결과 지표 리스트`
- 화면 하나가 끝나면 (로딩/빈데이터/에러/정상 4가지 상태 확인 후) `main`에 병합합니다.

## Phase 진행 상태

- [x] Phase 0 · 프로젝트 부팅
- [x] Phase 1 · 기반 레이어 (테마 · 스케일 · API 3종 · 네비게이션)
- [x] Phase 2 · 공통 컴포넌트 (9종 + 개발용 카탈로그)
- [x] Phase 3 · 인증 · 온보딩 (S-00~06)
- [x] Phase 4 · 홈 · 기록 허브 (S-07~10)
- [x] Phase 5 · 피부 기록 플로우 (S-15~18)
- [x] Phase 6 · 리포트 · 차트 (S-19~20)
- [x] Phase 7 · 제품 기록 · 구매 전 확인 (S-11~14, S-21~22)
- [ ] Phase 8 · 마이 · 마감 (S-23~24, 실기기 마감 작업) — 다음 단계

세부 내용은 `frontend-roadmap-phases.md` 참고. `npx tsc --noEmit` / `npx eslint .` 모두 오류 없이 통과하는 상태입니다.

## 남은 확인 사항 (백엔드)

- **AI 피부 분석 지표 개수** — 프론트는 4종(트러블·홍조·색소침착·모공)으로 구현했지만 실제 `SKIN-01` 명세는 3종(트러블·홍조·유수분)만 정의되어 있습니다. `RadarChart`는 n각형 범용으로 만들어 카탈로그에만 등록해두었고, 개수가 확정되기 전까지 실제 화면에는 배치하지 않았습니다. S-19/S-20은 실제 `REPORT-01`/`REPORT-02` 명세(기간별 추이 그래프 + 인사이트 카드)를 따라 구현되어 있어, 로드맵 초안의 레이더 차트 화면 구성과는 다릅니다.
- **날씨 enum** — 7종(SUNNY/CLOUDY/OVERCAST/RAIN/SNOW/YELLOW_DUST/THUNDERSTORM) 중 OVERCAST/YELLOW_DUST/THUNDERSTORM 키 이름이 백엔드 기준으로 미확정입니다.
- **카카오·구글 소셜 로그인** — 실 SDK 연동은 백엔드 통합 주간으로 미뤄두었고, 현재는 목업 로그인 흐름으로 대체되어 있습니다.
- **expo-notifications** — SDK 53+ Expo Go에서 크래시가 나서 제거했습니다. S-06은 앱 내부 알림 설정만 저장하며, Development Build로 전환할 때 재검토가 필요합니다.