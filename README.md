# 팀 일당백 · 피부 관리 서비스

> 매일의 제품 사용과 피부 상태를 기록해 **개인 성분 반응 프로파일**을 만드는 피부 관리 앱

일반적인 성분 정보가 아니라, 사용자가 **실제로 사용한 제품 + 이후의 피부 변화 + 환경 정보**를 연결해
"이 성분이 나에게 맞는가"에 대한 개인화된 판단 근거를 제공합니다.

- 제품 사용 기록 (검색 · 스캔 · 저장 제품 · 루틴)
- 얼굴 사진 기반 피부 분석 (트러블 · 홍조 · 모공 · 색소잡티)
- 성분 사용 후 1~7일 피부 변화를 추적하는 시차 연관 분석
- 성분별 `잘 맞음 / 지켜보는 중 / 주의 필요` 프로파일
- 구매 전 제품 위험도 (`낮음 / 보통 / 높음`) + 판단 근거
- 7일 · 30일 피부 트렌드 리포트

> MVP의 분석 결과는 의학적 인과관계가 아니라 **기록에서 반복 관찰된 연관 패턴**입니다. (PRD 4.3 / 13.3)

---

## 저장소 구조

```
hackerthon-team-ildangbaek/
├── backend/     # Spring Boot 4.1 (Java 21) — REST API
├── frontend/    # Expo 57 (React Native + TypeScript) — iOS / Android
└── docs/        # 제품 · 설계 문서 (source of truth)
```

각 파트의 상세 실행 방법은 [backend/README.md](backend/README.md), [frontend/README.md](frontend/README.md)를 참고하세요.

---

## 빠른 시작

### 사전 준비

| 도구 | 버전 |
| --- | --- |
| JDK | 21 |
| Node.js | 20 이상 |
| Docker | 로컬 MySQL 8.0 구동용 |

### 백엔드

```bash
cd backend
docker compose up -d      # MySQL 8.0
./gradlew bootRun         # http://localhost:8080
```

동작 확인: `GET http://localhost:8080/api/v1/health`

### 프론트엔드

```bash
cd frontend
npm install
cp .env.example .env      # 백엔드 준비 전이면 EXPO_PUBLIC_USE_MOCK=true 유지
npx expo start            # Expo Go 앱으로 QR 스캔
```

`EXPO_PUBLIC_USE_MOCK=true`이면 `src/api/mock`의 목업 응답을 사용하므로 백엔드 없이도 화면 개발이 가능합니다.
백엔드를 붙일 때는 `EXPO_PUBLIC_API_BASE_URL`을 채우고 `EXPO_PUBLIC_USE_MOCK=false`로 바꿉니다.

---

## 기술 스택

| 파트 | 스택 |
| --- | --- |
| Backend | Java 21, Spring Boot 4.1.0, Spring Web MVC, Spring Data JPA, Bean Validation, Lombok, MySQL 8.0, Gradle |
| Frontend | Expo 57, React Native 0.86, TypeScript, React Navigation 7, TanStack Query 5, zustand, axios, react-native-svg |

---

## API 규약 요약

전체 명세는 [docs/api_명세서.md](docs/api_명세서.md), 코드 체계는 [docs/공통응답포맷_예외처리코드.md](docs/공통응답포맷_예외처리코드.md)를 따릅니다.

- Base URL: `/api/v1`
- 인증: `Authorization: Bearer {accessToken}` (예외: `POST /auth/login`, `POST /auth/refresh`)
- 리소스는 복수형 · kebab-case, URI에 동사 금지, `PUT` 미사용
- 저장 API(`/product-records`, `/routines/{id}/records`, `/skin-records`, `/checks`)는 `Idempotency-Key` 헤더로 중복 저장을 방지
- 모든 응답은 동일한 봉투를 사용

```json
{
  "isSuccess": true,
  "code": "COMMON_SUCCESS",
  "message": "조회에 성공했습니다.",
  "result": {}
}
```

### 도메인 구성

| 도메인 | 범위 |
| --- | --- |
| Auth | 로그인 · 토큰 재발급 · 로그아웃 |
| Onboard | 온보딩 단계별 저장 및 완료 |
| User | 프로필 · 위치 · 알림 · 마이페이지 · 성분 프로파일 |
| Home | 낮 · 밤 홈 BFF |
| Record | 기록 허브 · 월간 캘린더 · 오늘 슬롯 상태 |
| Product | 제품 검색 · 스캔 · 성분 · 제품 기록 · 루틴 |
| Skin | 피부 기록 생성 및 AI 분석 · 결과 조회 |
| Check | 구매 전 확인 (위험도 분석) |
| Report | 7일 · 30일 리포트 · 요인 상세 |

---

## 문서

| 문서 | 내용 |
| --- | --- |
| [docs/PRD.md](docs/PRD.md) | 제품 정의, 페르소나, MVP 범위, 성공 지표, 미확정 사항 |
| [docs/기능명세서.md](docs/기능명세서.md) | 기능 ID(F-XXX-NN)별 동작 · 예외 · Acceptance Criteria |
| [docs/api_명세서.md](docs/api_명세서.md) | API Convention 및 엔드포인트 전체 명세 |
| [docs/ERD.md](docs/ERD.md) | 엔티티 · 컬럼 · 관계 정의 |
| [docs/공통응답포맷_예외처리코드.md](docs/공통응답포맷_예외처리코드.md) | 응답 봉투, 성공/에러 코드 체계 |
| [docs/목업 데이터 구조 정의서.md](docs/목업%20데이터%20구조%20정의서.md) | 프론트 목업 데이터 형태 |
| [docs/screen-structure-v3.html](docs/screen-structure-v3.html) | 화면 구조 정의서 v3 (화면 ID S-XX) |

문서는 구현의 기준입니다. 코드 · 설정 · API · DB 변경 시 영향받는 문서를 같은 작업에서 갱신합니다. ([CLAUDE.md](CLAUDE.md) 참고)

---

## 개발 규칙

### 브랜치 · 커밋

- 작업 브랜치: `feat/S-XX-설명` (화면 단위) 또는 `feat/기능명`
- 커밋 메시지에 화면 ID 또는 기능 ID를 답니다 — 예: `feat(S-18): 분석 결과 지표 리스트`
- 화면 하나가 끝나면 로딩 · 빈 데이터 · 에러 · 정상 4가지 상태를 확인한 뒤 병합합니다.

### 프론트-백엔드 계약

- 목업 데이터도 실제 API 응답과 **동일한 형태**로 만듭니다. (PRD 11.1)
- 신규 에러 코드가 필요하면 `docs/공통응답포맷_예외처리코드.md`를 먼저 갱신한 뒤 코드에 반영합니다.
- Enum은 문자열만 사용하고, 빈 목록은 `null`이 아닌 `[]`로 내려줍니다.

---

## 현재 상태

- **backend** — 공통 응답 · 예외 처리 · ERD 기준 엔티티/리포지토리 스캐폴딩 완료. 도메인 컨트롤러/서비스와 인증(JWT, Spring Security)은 미구현.
- **frontend** — Phase 0(부팅) 완료, Phase 2 공통 컴포넌트 및 S-00/S-01(로그인 · 기본 정보 입력) 목업 연동 진행 중.

세부 진행 상황은 각 파트 README를 참고하세요.

---

## 알려진 미확정 사항

PRD 14장에 전체 목록이 있으며, 스키마에 직접 영향을 주는 항목은 다음과 같습니다.

| 항목 | 상태 |
| --- | --- |
| 성별 · 호르몬 상태 enum | ERD와 api 명세서의 값 체계 불일치 |
| 이메일 로그인 | MVP 포함 여부 미확정 (소셜 로그인 우선) |
| 얼굴 이미지 보관 정책 | 원본 보관 · 기간 보관 · 분석 후 삭제 중 미확정 |

확정된 항목은 `docs/decisions/`를 참고하세요. (피부 지표 4종 — [ADR 0002](docs/decisions/0002-피부-지표-체계.md),
성분 반응 상태 enum 매핑 — [ADR 0004](docs/decisions/0004-성분-반응-상태-명칭.md))

확정 시 새 ADR을 `docs/decisions/`에 추가하고, 영향받는 문서와 코드를 함께 갱신합니다.
