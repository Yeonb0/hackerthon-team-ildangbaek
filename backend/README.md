# Backend

피부 관리 서비스(팀 일당백) 백엔드 API 서버입니다. 저장소 전체 개요는 [루트 README](../README.md)를 참고하세요.

사용자가 기록한 제품 사용·피부 상태 데이터를 저장하고, AI 분석 서버(`ai-server/`)와 연동해
성분별 개인 반응 인사이트(REPORT)와 구매 전 위험도 분석(CHECK)을 제공하는 REST API를 구현합니다.
`docs/` 하위 PRD·ERD·기능명세서·API 명세서·공통응답포맷 문서를 기준으로 설계했습니다.

## 기술 스택

- **Java 21, Spring Boot 4.1.0 (Gradle)** — Spring Web MVC + Spring Data JPA + Bean Validation
- **MySQL 8.0** — 로컬은 docker-compose로 구동
- **Lombok**

## 실행 방법

```bash
# 1. 로컬 MySQL 기동
docker compose up -d

# 2. 애플리케이션 실행 (local 프로필 기본 적용)
./gradlew bootRun
```

```bash
curl http://localhost:8080/api/v1/health
# {"isSuccess":true,"code":"COMMON_SUCCESS","message":"...","result":{...}}
```

| 명령 | 설명 |
| --- | --- |
| `./gradlew bootRun` | 애플리케이션 실행 (프로필 `local`) |
| `./gradlew build` | 컴파일 + 테스트 + jar 빌드 |
| `./gradlew test` | 테스트 실행 — H2 인메모리 DB로 동작해 로컬 MySQL 없이도 통과 |
| `docker compose down` | 로컬 MySQL 종료 (`-v`를 붙이면 데이터까지 삭제) |

DB 접속 정보 등 환경변수 기본값은 `application-local.yml`에 있으며, 로컬 개발 시 별도 설정 없이
docker-compose 값과 그대로 맞아 실행됩니다. `spring.jpa.hibernate.ddl-auto=update`로 엔티티 추가 시
테이블이 자동 생성됩니다.

### AI 분석 서버 연동

기본값(`SKIN_ANALYSIS_PROVIDER=local-vision`)으로 실행하면 얼굴 사진 분석 시 `ai-server/`(FastAPI)를
호출합니다. MediaPipe·OpenCV로 얼굴을 검출해 1차 지표를 산출하고, OpenAI Vision(`gpt-4o`)이 이를
근거로 최종 점수를 확정하는 2단계 파이프라인입니다([ADR 0020](../docs/decisions/0020-규칙-기반-로컬-비전-분석.md),
[ADR 0022](../docs/decisions/0022-openai-비전-2단계-점수-확정.md)). OpenAI 호출은 `ai-server/` 내부에서만
이루어지며 백엔드가 직접 호출하지 않습니다.

```bash
cd ../ai-server
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
./scripts/download_model.sh
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000

# 다른 터미널에서
SKIN_ANALYSIS_PROVIDER=local-vision ./gradlew bootRun
```

AI 서버 없이 목업 분석 결과로만 테스트하려면 `SKIN_ANALYSIS_PROVIDER=mock`을 사용합니다. 상세 환경변수와
목업 실패 시나리오 재현 방법은 `docs/STATUS.md`를 참고하세요.

## 아키텍처

```
com.ildangbaek.backend
├── global      # 공통 인프라 — 응답 포맷, 예외 처리, 임시 인증, 이미지 스토리지 등 도메인 독립 계층
├── domain      # 영속성 계층 — ERD 기준 엔티티/리포지토리 (user, product, routine, record, environment, analysis, check)
└── api         # 표현 계층 — 도메인별 controller / service / dto (auth, onboard, user, home, record, product, skin, check, report)
```

새 API는 `api.{domain}.controller` / `.service` / `.dto` 하위에 추가하고, 영속성 엔티티는 기존
`domain.*` 패키지를 재사용합니다. 도메인 이름은 [docs/api_명세서.md](../docs/api_명세서.md)의 목록을
그대로 따릅니다.

## API 규약

전체 명세는 [docs/api_명세서.md](../docs/api_명세서.md) 기준이며, 핵심 규칙은 다음과 같습니다.

- Base URL `/api/v1`, 리소스는 복수형·kebab-case, URI에 동사 미사용, 부분 수정은 `PATCH`만 사용(`PUT` 미사용)
- 인증은 `Authorization: Bearer {accessToken}` (로그인·토큰 재발급 제외) — 모든 응답은 `ApiResponse<T>`
  (`isSuccess`, `code`, `message`, `result`) 공통 포맷으로 감싸 반환
- 저장 API(`POST /product-records`, `/routines/{id}/records`, `/skin-records`, `/checks`)는
  `Idempotency-Key` 헤더로 중복 저장을 방지
- 날짜/시간은 ISO-8601, ID는 `Long`, Enum은 문자열, 빈 목록은 `[]`(null 금지)

### 도메인 구성

| 도메인 | 주요 기능 |
| --- | --- |
| `auth` | 로그인, 토큰 재발급, 로그아웃 |
| `onboard` | 온보딩 상태 조회, 단계별 저장, 완료 |
| `user` | 마이페이지, 성분 프로파일, 프로필, 지역, 알림 |
| `home` | 낮·밤 홈 BFF |
| `record` | 월간 캘린더, 오늘 슬롯 상태 |
| `product` | 제품 기록, 검색, 상세, 스캔, 루틴 |
| `skin` | 피부 기록 생성 및 AI 분석, 결과 조회 |
| `check` | 구매 전 성분 위험도 분석 |
| `report` | 성분-피부 변화 리포트, 요인 상세 |

### 공통 응답 / 예외 처리

- `ApiResponse.success(result)` / `ApiResponse.created(result)`로 성공 응답을 감쌉니다.
- 도메인 예외는 `throw new BusinessException(ErrorCode.XXX)`로 던지면 `GlobalExceptionHandler`가
  문서에 정의된 HTTP 상태·코드·메시지로 자동 변환합니다.
- `ErrorCode`는 [docs/공통응답포맷_예외처리코드.md](../docs/공통응답포맷_예외처리코드.md) 기준으로
  관리하며, 새 코드가 필요하면 문서를 먼저 갱신합니다.
- `@Valid` 검증 실패는 자동으로 `COMMON_VALIDATION_FAILED` + `errors[]` 형태로 응답됩니다.

## 핵심 기능 구현

### 성분-피부 시차 분석 (F-ANALYSIS-01)

제품 사용 시점과 이후 피부 지표 변화를 비교해 반복 패턴을 찾아내는 핵심 로직입니다
(`LagCorrelationAnalyzer`). 예: 레티놀 사용 2일 뒤 트러블 지표가 반복적으로 상승하면 `OBSERVED`로
확정합니다. 모닝/나이트 슬롯을 분리해 집계하며([ADR 0014](../docs/decisions/0014-시차-분석-모닝나이트-슬롯-분리.md)),
민감성 피부 사용자는 더 완화된 기준을 적용합니다([ADR 0009](../docs/decisions/0009-시차-분석-패턴-확정-기준.md)).

### 성분 프로파일 & 위험도 분석 (F-ANALYSIS-04, CHECK-02)

축적된 시차 분석 결과로 사용자별 성분 반응 프로파일(`SUITABLE`/`CAUTION`/`INSUFFICIENT`)을 만들고,
제품 구매 전 이 프로파일을 근거로 위험도 등급(`LOW`/`MEDIUM`/`HIGH`)을 산출합니다
([ADR 0010](../docs/decisions/0010-성분-프로파일-분류-기준.md),
[ADR 0015](../docs/decisions/0015-위험도-등급-산출-기준.md)).

### 임시 인증

정식 인증(JWT) 구현 전까지 로그인 시 발급되는 목업 토큰(`mock-access-{userId}-{uuid}`)으로
사용자를 식별합니다([ADR 0006](../docs/decisions/0006-임시-인증-방편.md)). 서명 검증은 하지 않으므로
로컬 개발·시연 전용이며, 정식 인증 도입 시 교체될 예정입니다.

```bash
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"provider":"EMAIL","oauthAccessToken":"local-dev@example.com"}' \
  | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

curl -X POST http://localhost:8080/api/v1/skin-records \
  -H "Authorization: Bearer $TOKEN" -F "image=@face.jpg" -F "timeSlot=MORNING"
```

담당 범위, 시드 데이터 기반 검증 절차 등 상세 구현 내역은 [docs/STATUS.md](../docs/STATUS.md)를
참고하세요.
