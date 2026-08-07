# skinteller · frontend

피부 기록 기반 성분-피부변화 시차 상관분석 앱의 프론트엔드입니다.
React Native (Expo) + TypeScript, iOS/Android 단일 코드베이스.

기준 문서: `frontend-roadmap-phases.md` (Phase 0~8), 화면 구조 정의서 v3, API 명세 v1.0

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
├─ app/          # 네비게이터만 (RootNavigator, OnboardingNavigator, MainTabNavigator, routes.ts)
├─ api/          # client / unwrap / adapters / mock / queries
├─ components/   # base(공통 UI) · state(로딩·에러·빈화면) · chart · domain
├─ screens/      # auth / onboarding / home / record / product / skin / report / my / dev(카탈로그)
├─ theme/        # tokens.ts, typography.ts — 색상은 반드시 여기서만 정의
├─ lib/          # scale.ts, date.ts, dayNight.ts, permission.ts 등 순수 유틸
├─ store/        # zustand 스토어
└─ types/        # api.ts, domain.ts, errorCodes.ts
```

절대경로 alias `@/*` → `src/*` 가 설정되어 있습니다. `import { color } from '@/theme'` 형태로 사용합니다.

**규칙:** `src/screens/**` 안에서 `#RRGGBB` 형태의 색상 하드코딩은 ESLint 경고 대상입니다. 반드시 `theme/tokens.ts`의 토큰을 사용해 주세요.

## Git 브랜치 규칙

- `main` — 항상 실행 가능한 상태만 유지합니다. 데모 리허설 직전 상태가 곧 `main`입니다.
- `feat/S-XX-설명` 또는 `feat/기능명` — 화면·기능 단위 작업 브랜치. 예: `feat/S-18-report-metric-list`
- 커밋 메시지에 화면 ID를 답니다 — `feat(S-18): 분석 결과 지표 리스트`
- 화면 하나가 끝나면 (로딩/빈데이터/에러/정상 4가지 상태 확인 후) `main`에 병합합니다.

## Phase 진행 상태

- [x] Phase 0 · 프로젝트 부팅
- [ ] Phase 1 · 기반 레이어
- [ ] Phase 2 · 공통 컴포넌트
- [ ] Phase 3~8

세부 내용은 `frontend-roadmap-phases.md` 참고.
