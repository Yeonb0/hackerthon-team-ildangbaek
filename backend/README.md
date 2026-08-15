# Backend

피부 관리 서비스(팀 일당백) 백엔드. 저장소 전체 개요는 [루트 README](../README.md)를 참고하세요.
`docs/` 하위 PRD · ERD · 기능명세서 · api 명세서 · 공통응답포맷 문서를 기준으로 구성했습니다.

## 기술 스택

- Java 21, Spring Boot 4.1.0 (Gradle)
- Spring Web MVC, Spring Data JPA, Bean Validation
- MySQL 8.0 (로컬은 docker-compose)
- Lombok

## 실행 방법

```bash
# 1. 로컬 MySQL 기동
docker compose up -d

# 2. 애플리케이션 실행 (local 프로필 기본 적용)
./gradlew bootRun
```

기동 후 `GET http://localhost:8080/api/v1/health` 로 공통 응답 envelope가 정상 동작하는지 확인할 수 있습니다.

```bash
curl http://localhost:8080/api/v1/health
# {"isSuccess":true,"code":"COMMON_SUCCESS","message":"...","result":{...}}
```

기타 명령:

| 명령 | 설명 |
| --- | --- |
| `./gradlew bootRun` | 애플리케이션 실행 (프로필 `local`) |
| `./gradlew build` | 컴파일 + 테스트 + jar 빌드 |
| `./gradlew test` | 테스트만 실행 — H2 인메모리 DB로 돈다(`src/test/resources/application.yml`). 로컬 MySQL을 안 띄워도 통과한다 |
| `docker compose down` | 로컬 MySQL 종료 (`-v`를 붙이면 데이터까지 삭제) |

## 환경 설정

`application.yml`은 `server.port=8080`, `spring.profiles.active=local`을 기본값으로 두고,
DB 설정은 `application-local.yml`에 있습니다.

| 환경변수 | 기본값 | 설명 |
| --- | --- | --- |
| `DB_HOST` | `localhost` | |
| `DB_PORT` | `3306` | |
| `DB_NAME` | `ildangbaek` | |
| `DB_USERNAME` | `ildangbaek` | |
| `DB_PASSWORD` | `ildangbaek1234` | |
| `STORAGE_LOCAL_DIR` | `./uploads/images` | 이미지 저장 경로 ([ADR 0007](../docs/decisions/0007-이미지-스토리지.md)) |
| `STORAGE_LOCAL_URL_PREFIX` | `/images/` | 반환 URL 접두사 |
| `SKIN_ANALYSIS_PROVIDER` | `mock` | 분석 구현체 선택. `mock` · `local-vision` ([ADR 0003](../docs/decisions/0003-AI-분석-목업-우선.md) · [ADR 0020](../docs/decisions/0020-규칙-기반-로컬-비전-분석.md) · [ADR 0022](../docs/decisions/0022-openai-비전-2단계-점수-확정.md)) |
| `LOCAL_VISION_BASE_URL` | `http://localhost:8000` | `ai-server/` 주소. `SKIN_ANALYSIS_PROVIDER=local-vision`일 때 피부 분석에 쓰이고, `ProductCommentClient`(CHECK-01 AI 코멘트, [ADR 0025](../docs/decisions/0025-제품-추천-AI-코멘트.md))도 항상 이 주소를 재사용한다 |

업로드 상한은 `spring.servlet.multipart.max-file-size=10MB`다. Spring 기본값(파일 1MB)이면
정상 사진도 튕기므로 올려 두었다.

**목업 분석 실패 재현** — `app.skin.analysis.mock.failure-mode`에 아래 값을 주면 해당 실패를 유발한다.

| 값 | 결과 |
| --- | --- |
| `face-not-detected` | 422 `SKIN_FACE_NOT_DETECTED` |
| `timeout` | 504 `SKIN_ANALYSIS_TIMEOUT` |
| `failed` | 500 `SKIN_ANALYSIS_FAILED` |
| (미설정) | 정상 분석 |

```bash
./gradlew bootRun --args='--app.skin.analysis.mock.failure-mode=timeout'
```

**규칙 기반 자체 분석 서버(local-vision) 사용** — 딥러닝 모델이 아니라 MediaPipe·OpenCV로 얼굴을
검출하고 영상처리 규칙으로 1차 지표를 산출한 뒤, OpenAI Vision(`gpt-4o`)이 그 1차 점수를 근거로
최종 점수를 확정한다. OpenAI 호출은 이 서버(`ai-server/`) 내부에서만 이루어지며 Spring은 OpenAI를
직접 호출하지 않는다. 절대 정확도가 아니라 개인의 상대적 변화 추적용이다. 한계와 신뢰도, OpenAI
연동 설정(`OPENAI_API_KEY` 등)은 `ai-server/README.md`,
[ADR 0020](../docs/decisions/0020-규칙-기반-로컬-비전-분석.md),
[ADR 0022](../docs/decisions/0022-openai-비전-2단계-점수-확정.md) 참고.

```bash
# 1) 별도 터미널에서 분석 서버를 먼저 띄운다
cd ../ai-server
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
./scripts/download_model.sh
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000

# 2) backend에서 provider를 지정해 기동한다
SKIN_ANALYSIS_PROVIDER=local-vision ./gradlew bootRun
```

기본값은 `docker-compose.yml`의 MySQL 컨테이너와 그대로 맞춰져 있어, 로컬에서는 별도 설정 없이 실행됩니다.

`spring.jpa.hibernate.ddl-auto=update`라 엔티티를 추가하면 테이블이 자동으로 생성됩니다.
`open-in-view=false`이므로 지연 로딩은 트랜잭션 안에서 처리해야 합니다. `show-sql`과 SQL 로그는 개발 편의를 위해 켜져 있습니다.

## 패키지 구조

```
com.ildangbaek.backend
├── BackendApplication.java
├── global                     # 도메인에 종속되지 않는 공통 인프라
│   ├── config                 # JpaAuditingConfig, WebConfig(CORS + ArgumentResolver)
│   ├── entity                 # BaseTimeEntity (createdAt/updatedAt)
│   ├── response               # ApiResponse, SuccessCode, ResultCode
│   ├── exception              # ErrorCode, BusinessException, GlobalExceptionHandler
│   ├── auth                   # @CurrentUserId — 임시 인증 (ADR 0006) ⚠️ 배포 전 교체
│   ├── storage                # ImageStorage / LocalImageStorage (ADR 0007)
│   └── util                   # RecordDateResolver — 날짜 귀속 규칙 (ADR 0005)
├── domain                     # 영속성 계층 — ERD 기준으로 묶은 엔티티/리포지토리
│   ├── user                   # User, UserProfile, SkinType, UserSkinType, NotificationSetting
│   ├── product                # Product, Ingredient, ProductIngredient, UserProduct
│   ├── routine                # Routine, RoutineProduct
│   ├── record                 # ProductRecord, ProductRecordItem, SkinRecord, SkinMetric
│   ├── environment            # DailyEnvironment
│   ├── analysis               # IngredientProfile, AnalysisInsight
│   └── check                  # ProductRiskAssessment, ProductRiskIngredient
└── api                        # 표현 계층 — api_명세서.md 2장 도메인 구성과 맞춤
    ├── common/controller/HealthController.java   # 배선 확인용 예시
    └── skin                   # SKIN-01 — controller / service / dto
```

새 API를 붙일 때는 `api.{domain}.controller` / `.service` / `.dto` 하위에 추가하고,
`api_명세서.md`의 도메인 목록(auth, onboard, user, home, record, product, skin, check, report)을 그대로 패키지명으로 씁니다.
영속성(엔티티/리포지토리)은 이미 있는 `domain.*` 패키지를 재사용하세요.

## API 규약

전체 명세는 [docs/api_명세서.md](../docs/api_명세서.md)를 기준으로 합니다. 구현 시 지켜야 할 규칙만 요약하면:

- Base URL은 `/api/v1`, 리소스는 복수형 · kebab-case, URI에 동사를 쓰지 않음
- `PUT`은 사용하지 않고 부분 수정은 모두 `PATCH`
- 인증은 `Authorization: Bearer {accessToken}` (예외: `POST /auth/login`, `POST /auth/refresh`)
  — **다만 실제 인증(JWT 서명 검증)은 아직 없다.** 현재는 로그인 시 발급되는 목업 토큰을 그대로
  신뢰한다 (아래 「임시 인증」 참고)
- `onboardingCompleted = false`인 사용자가 온보딩 외 API를 호출하면 `403 ONBOARD_NOT_COMPLETED`
- 날짜/시간은 ISO-8601, ID는 `Long`, Enum은 문자열, 빈 목록은 `[]` (null 금지)
- 저장 API(`POST /product-records`, `/routines/{id}/records`, `/skin-records`, `/checks`)는 `Idempotency-Key` 헤더로 중복 저장을 방지 — 처리 완료된 키는 최초 응답을 그대로 반환, 처리 중인 키는 `409 COMMON_DUPLICATE_REQUEST`
- MVP에서는 Pagination을 쓰지 않고 조회 API마다 최대 반환 건수를 명시

### 도메인별 담당 범위

| 도메인 | 주요 API |
| --- | --- |
| `auth` | AUTH-01~03 · 로그인, 토큰 재발급, 로그아웃 |
| `onboard` | ONBOARD-01~05 · 온보딩 상태 조회, 단계별 저장, 완료 |
| `user` | USER-01~07 · 마이페이지, 성분 프로파일, 프로필, 지역, 위치, 알림 |
| `home` | HOME-01 · 낮 · 밤 홈 BFF |
| `record` | RECORD-01~02 · 월간 캘린더, 오늘 슬롯 상태 |
| `product` | PRODUCT-01~08 · 제품 기록 화면, 검색, 상세, 스캔, 기록 저장/수정, 루틴 |
| `skin` | SKIN-01~03 · 피부 기록 생성 및 분석, 결과 조회 |
| `check` | CHECK-01~03 · 쇼핑 홈, 위험도 분석, 결과 조회 |
| `report` | REPORT-01~03 · 리포트, 요인 상세, 일자별 조회 |

## 공통 응답 / 예외 처리

- 모든 API는 `ApiResponse<T>` (`isSuccess`, `code`, `message`, `result`)로 감싸 반환합니다.
  `ApiResponse.success(result)` / `ApiResponse.created(result)`를 사용하세요.
- 컨트롤러/서비스에서 도메인 예외가 필요하면 `throw new BusinessException(ErrorCode.XXX)`를 던지세요.
  `GlobalExceptionHandler`가 잡아서 문서에 정의된 HTTP 상태 · 코드 · 메시지로 변환합니다.
- `ErrorCode`는 `docs/공통응답포맷_예외처리코드.md` 5장의 코드를 전부 옮겨둔 것입니다. 새 코드가 필요하면 문서를 먼저 갱신하세요.
- `@Valid` 검증 실패, `@Validated` 파라미터 검증 실패는 자동으로 `COMMON_VALIDATION_FAILED` + `errors[]` 형태로 내려갑니다.
- 엔티티가 `BaseTimeEntity`를 상속하면 `createdAt` / `updatedAt`이 자동으로 채워집니다 (`JpaAuditingConfig`).

## 알려진 미확정 사항 (엔티티 주석 참고)

ERD.md와 api_명세서.md/기능명세서.md 사이에 값 체계가 다른 필드가 몇 개 있습니다(PRD 14장 "미확정 사항" 참고). 엔티티는 ERD.md를 기준으로 만들었고, 차이가 있는 지점은 코드 주석에 남겨뒀습니다.

- `UserProfile.gender` — ERD `NOT_SELECTED` vs api 명세서 `UNSPECIFIED`
- `UserProfile.menstrualStatus` — ERD 3종 vs api 명세서 `HormoneStatus` 4종(HORMONE_PILL/HORMONE_INJECTION 포함)
- `IngredientProfile.reactionType` / `ProductRiskIngredient.reactionType` — ERD `SUITABLE` vs api 명세서 `IngredientStatus.GOOD`. DB는 `SUITABLE` 유지, API 응답에서만 `GOOD`으로 매핑 확정 ([ADR 0004](../docs/decisions/0004-성분-반응-상태-명칭.md))

팀 내에서 스키마가 확정되면 해당 enum과 주석만 정리하면 됩니다. 확정 내용은 새 ADR로 `docs/decisions/`에 남깁니다.

**`SkinMetric.metricType`은 확정되었습니다.** 트러블(`TROUBLE`) · 홍조(`REDNESS`) · 모공(`PORES`) ·
색소잡티(`PIGMENTATION`) 4종. ([ADR 0002](../docs/decisions/0002-피부-지표-체계.md))

## 임시 인증 ⚠️

인증이 아직 없어 목업 Bearer 토큰으로 사용자를 식별합니다
([ADR 0006](../docs/decisions/0006-임시-인증-방편.md) ·
[ADR 0017](../docs/decisions/0017-임시-인증-토큰-통합.md)). `POST /api/v1/auth/login`으로 로그인하면
`mock-access-{userId}-{uuid}` 형식의 토큰이 발급되고, 이후 모든 API는 이 토큰을
`Authorization: Bearer ...` 헤더로 받습니다. AUTH·ONBOARD를 포함해 전 도메인이 같은 토큰을 씁니다.

```bash
# 1) 로그인해서 토큰을 받습니다 (신규 provider_user_id면 사용자도 자동 생성됩니다)
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"provider":"EMAIL","oauthAccessToken":"local-dev@example.com"}' \
  | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

# 2) 받은 토큰으로 나머지 API를 호출합니다
curl -X POST http://localhost:8080/api/v1/skin-records \
  -H "Authorization: Bearer $TOKEN" -F "image=@face.jpg" -F "timeSlot=MORNING"
```

**이것은 인증이 아닙니다.** 토큰은 서명 검증이 없어 `mock-access-2-x` 형식만 맞추면 누구나 2번
사용자로 행세할 수 있습니다. 로컬 개발과 내부 시연에만 쓰고, **실제 인증(JWT 등) 도입 즉시
제거합니다.** 교체 시 고칠 곳은 `MockAccessToken`과 두 리졸버(`CurrentUserIdArgumentResolver`·
`CurrentUserResolver`)로 한정됩니다.

아래 절들의 curl 예제는 시드 데이터가 지정하는 `userId`(9001 등)에 맞춰 `$TOKEN`을 씁니다.
특정 `userId`로 시드와 맞추고 싶다면 아래처럼 직접 사용자를 만들고 그 `id`로 토큰 형식을 흉내
내면 됩니다(UUID 부분은 파싱에 쓰이지 않으므로 아무 값이나 가능):

```sql
INSERT INTO users (id, provider, provider_user_id, onboarding_completed, account_status, created_at, updated_at)
VALUES (9001, 'KAKAO', 'local-dev', true, 'ACTIVE', NOW(), NOW());
```

```bash
TOKEN="mock-access-9001-local-dev"
```

## F-ANALYSIS-01 시차 분석 · 목업 시드

성분-피부 시차 분석은 **제품 기록**을 입력으로 씁니다. 제품 기록 저장 API(PRODUCT-05)는 구현되어
있으므로 실사용 경로로도 채울 수 있지만(아래 "실입력 경로로 검증하기"), 이 API는 **오늘 날짜로만**
기록합니다. 과거 사용일에 걸친 패턴을 한 번에 만들려면 시드 쪽이 훨씬 빠르므로, 회귀 검증에는
아래 시드를 그대로 씁니다.

```bash
# 앱을 한 번 띄워 스키마가 생성된 뒤에 실행합니다 (ddl-auto: update)
docker exec -i ildangbaek-mysql mysql --default-character-set=utf8mb4 \
  -uildangbaek -pildangbaek1234 ildangbaek \
  < backend/src/test/resources/seed/f-analysis-01-mockup.sql

# 분석은 피부 기록 저장 시 실행됩니다. 사용자 9001로 기록을 남기면 트리거됩니다.
TOKEN="mock-access-9001-local-dev"
curl -X POST http://localhost:8080/api/v1/skin-records \
  -H "Authorization: Bearer $TOKEN" -F "image=@face.jpg;type=image/jpeg" -F "timeSlot=MORNING"

# 결과 확인
curl "http://localhost:8080/api/v1/reports?period=30&metric=TROUBLE" -H "Authorization: Bearer $TOKEN"
```

`--default-character-set=utf8mb4`를 빼면 성분 한글명이 깨져 들어갑니다.

스크립트는 **의도한 패턴**을 심습니다 — 레티놀을 18·12·6일 전에 쓰고 그 2일 뒤 트러블을 +15 올려두므로
`OBSERVED`로 확정되어야 하고, 판테놀은 뒤따르는 변화가 없어 `OBSERVING`에 머물러야 합니다.
무작위 데이터로는 "분석기가 패턴을 제대로 잡았는지"를 확인할 수 없어 이렇게 만들었습니다 (ADR 0003).

레티놀 세럼에 히알루론산이 함께 들어 있어 **두 성분이 같은 패턴으로 나오는데, 이는 의도된 동작입니다.**
한 제품에 든 성분들은 항상 같이 노출되므로 기록만으로는 분리할 수 없습니다
([ADR 0009](../docs/decisions/0009-시차-분석-패턴-확정-기준.md)의 알려진 한계).

확정 임계값은 `LagCorrelationAnalyzer`의 상수 3개에 모여 있고, REPORT-01의 `OBSERVED` 임계값
(`ReportService.OBSERVED_THRESHOLD`)과 같은 값이어야 합니다. **한쪽만 바꾸면 판정이 어긋납니다.**

### 슬롯 분리(ADR 0014) 검증 시드

위 시드는 피부 기록도 제품 기록도 전부 `NIGHT` 단일 슬롯이라, 슬롯을 평균으로 접든 슬롯별로
나누든 결과가 같습니다. 그래서 그 시드로는
[ADR 0014](../docs/decisions/0014-시차-분석-모닝나이트-슬롯-분리.md)가 고친 결함을 확인할 수 없습니다.
전용 시드를 따로 씁니다. **위 시드는 회귀 기준선이라 그대로 두세요** — 기대값이 바뀌면 ADR 0014
전후를 비교할 근거가 사라집니다.

```bash
docker exec -i ildangbaek-mysql mysql --default-character-set=utf8mb4 \
  -uildangbaek -pildangbaek1234 ildangbaek \
  < backend/src/test/resources/seed/f-analysis-01-slots.sql

# 분석은 피부 기록 저장 시에만 돌아갑니다. 두 사용자 모두 트리거해야 합니다.
for u in 9101 9102; do
  curl -s -o /dev/null -w "$u %{http_code}\n" -X POST http://localhost:8080/api/v1/skin-records \
    -H "Authorization: Bearer mock-access-$u-local-dev" -F "image=@face.jpg;type=image/jpeg" -F "timeSlot=MORNING"
done

docker exec -i ildangbaek-mysql mysql --default-character-set=utf8mb4 \
  -uildangbaek -pildangbaek1234 ildangbaek -e \
  "SELECT user_id, title, confidence_score, average_delta FROM analysis_insights
    WHERE user_id IN (9101, 9102) AND metric_type = 'TROUBLE';"
```

| 사용자 | 심은 것 | 기대 |
| --- | --- | --- |
| 9101 | 나이트에만 쓴 나이아신아마이드. 나이트 트러블은 20일 내내 50, **모닝만** 사용일 10 / 2일 뒤 90 | `average_delta` **0.00** · 확정 안 됨(`INSUFFICIENT`) |
| 9102 | 세라마이드를 같은 날 모닝·나이트 **양쪽**에 사용(15·9·3일 전), 두 슬롯 모두 2일 뒤 +12 | 신뢰도 100 · 근거 "**6회 중 6회**" |

**9101이 핵심 판정입니다.** 여기서 `OBSERVED`가 나오면 슬롯 분리가 깨진 것입니다 — 모닝 점수가
나이트 기준선에 섞였다는 뜻이고, 구버전(평균 합산) 규칙이면 `+40`으로 확정됩니다.
9102의 근거 문구가 "3회 중 3회"면 노출이 슬롯별로 분리되지 않은 것입니다.

`ingredient_profiles.observation_count`는 9102에서 **3**입니다(근거 문구의 "6회"와 다릅니다).
전자는 **사용일 수**, 후자는 **관측 쌍 수**로 서로 다른 것을 셉니다 — 불일치가 아닙니다.

### 실입력 경로로 검증하기 (PRODUCT-05)

시드 없이 제품 기록 저장 API로만 같은 결과를 낼 수 있습니다. 실사용 경로가 살아 있는지 확인할 때
씁니다. 다만 이 API는 **오늘 날짜로만** 기록하므로(`RecordDateResolver`), 과거 사용일 패턴을
만들려면 만들어진 행의 `record_date`를 뒤로 옮겨야 합니다.

```bash
# 제품 기록을 HTTP로 생성합니다 (시드로 product_records를 채우지 않습니다)
curl -s -X POST http://localhost:8080/api/v1/product-records \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"timeSlot":"NIGHT","productIds":[9001]}'
```

`force`는 선택 필드입니다(기본 `false`). 생략해도 201이어야 합니다 — 한때 400이 나던 자리라
회귀 시 가장 먼저 확인할 지점입니다(`docs/STATUS.md` 2.13절).

## REPORT-02 요인 상세 검증

위 시드를 그대로 씁니다. **`insightId`를 먼저 받아 와야 합니다** — 시차 분석이 피부 기록 저장마다
성분 인사이트를 지우고 다시 넣으므로 id가 매번 바뀝니다
([ADR 0013](../docs/decisions/0013-요인-상세-응답-구성.md)).

```bash
# 1) 위 POST /skin-records를 먼저 실행한 뒤, 인사이트 목록에서 id를 확인합니다
curl -s "http://localhost:8080/api/v1/reports?period=30&metric=TROUBLE" -H "Authorization: Bearer $TOKEN"

# 2) 레티놀 인사이트의 insightId로 상세를 조회합니다
curl -s "http://localhost:8080/api/v1/reports/insights/{위에서 받은 id}" -H "Authorization: Bearer $TOKEN"
```

기대값 — `title: "레티놀 추이"`, `subtitle: "최근 30일 · 이벤트와 상관관계"`, `graph` 30개(시드가
NIGHT 슬롯만 심으므로 `morningScore`는 전부 `null`), `events`에 18일 전 "레티놀 이 기간 첫 사용"
1건과 `confidence: "OBSERVED"`. 판테놀은 `OBSERVING`이라 `impact`가 "확인 중" 문구입니다.

자외선 이벤트는 `daily_environments`에 시드가 없어 임시로 넣어야 확인됩니다. 이 표는
F-ANALYSIS-01 시드의 범위가 아니라 시드 파일에 넣지 않았습니다.

```bash
docker exec -i ildangbaek-mysql mysql --default-character-set=utf8mb4 \
  -uildangbaek -pildangbaek1234 ildangbaek -e \
  "INSERT INTO daily_environments (user_id, record_date, region_name, uv_index_max, data_source, fetched_at)
   VALUES (9001, CURDATE() - INTERVAL 7 DAY, '서울', 9.0, 'MOCK', NOW()),
          (9001, CURDATE() - INTERVAL 6 DAY, '서울', 9.0, 'MOCK', NOW()),
          (9001, CURDATE() - INTERVAL 5 DAY, '서울', 9.0, 'MOCK', NOW());"
```

7일 전 날짜에 "자외선 지수 8 이상 3일 연속" 이벤트가 붙고, 성분 인사이트에 붙은 자외선 이벤트라
`confidence`는 항상 `OBSERVING`입니다. 임계값(8 이상 · 2일 연속)은 `ReportService`의 상수 2개에
있습니다.

## F-ANALYSIS-04 성분 프로파일

같은 시드로 성분 프로파일도 함께 갱신됩니다. 위 `POST /skin-records` 호출 뒤 표를 직접 확인합니다.

```bash
docker exec -i ildangbaek-mysql mysql --default-character-set=utf8mb4 \
  -uildangbaek -pildangbaek1234 ildangbaek -e \
  "SELECT i.korean_name, p.reaction_type, p.observation_count, p.reason_summary
     FROM ingredient_profiles p JOIN ingredients i ON i.id = p.ingredient_id
    WHERE p.user_id = 9001;"
```

레티놀·히알루론산은 `CAUTION`, 판테놀은 `INSUFFICIENT`(근거 `NULL`)로 나옵니다. 로컬 MySQL에서
확인한 결과입니다 (2026-08-10). 분류 기준은
[ADR 0010](../docs/decisions/0010-성분-프로파일-분류-기준.md)에 있습니다.

같은 기록으로 다시 분석해도 **행 id가 유지되고 행 수도 늘지 않습니다.** 인사이트와 달리 프로파일은
지웠다 다시 만들지 않기 때문입니다(ADR 0010). 재실행 후 `id`를 비교하면 확인됩니다.

### 민감성 완화(BR 3) 확인

위 시드만으로는 확인할 수 없습니다 — 레티놀의 변화량이 +15라 기본 기준으로도 확정되기 때문입니다.
완화 전용 시드를 이어서 적용합니다.

```bash
docker exec -i ildangbaek-mysql mysql --default-character-set=utf8mb4 \
  -uildangbaek -pildangbaek1234 ildangbaek \
  < backend/src/test/resources/seed/f-analysis-04-sensitive.sql
```

판테놀이 `INSUFFICIENT` → `CAUTION`(`profile_score` 2.5000)으로 바뀌고 근거에 `민감성 피부 기준 ·`
접두어가 붙습니다. `DELETE FROM user_skin_types WHERE user_id = 9001;` 로 되돌리면 다시
`INSUFFICIENT`가 되어 대조군이 됩니다.

> ⚠️ **실사용 경로에서는 이 완화가 아직 동작하지 않습니다.** `skin_types` 마스터가 비어 있고
> 온보딩(F-ONBOARD-02, A 담당)이 없어 `user_skin_types`에 아무도 없기 때문입니다. 위 시드가
> 그 자리를 대신합니다. 온보딩이 붙으면 코드 변경 없이 켜집니다.

민감성 완화 임계값(`IngredientProfileWriter.SENSITIVE_WORSENED_DELTA`)은 `LagCorrelationAnalyzer`의
변화량 기준과 짝입니다. **한쪽을 바꾸면 다른 쪽도 함께 봐야 합니다.**

## CHECK-02 위험도 분석 · 목업 시드

성분 프로파일(F-ANALYSIS-04)을 실제 구매 판단에 쓰는 첫 API입니다. 등급 산출 기준은
[ADR 0015](../docs/decisions/0015-위험도-등급-산출-기준.md)에 있습니다.

```bash
# 1) F-ANALYSIS-01 시드로 사용자 9001의 프로파일을 채운 뒤(위 절 참고), 등급 분기 전체를
#    보려면 아래 시드를 추가로 적재합니다 — 9001은 판정 성분이 2종뿐이라 비중 축 게이트(5종)를
#    시험할 수 없습니다.
docker exec -i ildangbaek-mysql mysql --default-character-set=utf8mb4 \
  -uildangbaek -pildangbaek1234 ildangbaek \
  < backend/src/test/resources/seed/check-02-risk-levels.sql

curl -s -X POST http://localhost:8080/api/v1/checks \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"productId":9001}'
```

레티놀·히알루론산이 둘 다 `CAUTION`이지만 판정 성분이 2종뿐이라(비중 축 게이트 5종 미달) 개수
축만 적용돼 `MEDIUM`이 나옵니다. **CAUTION 2종을 최고 등급으로 부르지 않는 것은 게이트의 의도된
동작입니다** — 표본이 작을 때 비중을 신뢰하지 않기 때문입니다.

**신선한 DB에서는 `CHECK_PROFILE_NOT_READY`(409)가 정상 응답입니다.** 온보딩이 없어 프로파일이
비어 있는 상태가 현재 실사용 경로의 기본값이기 때문입니다(ADR 0010·0011의 제약을 그대로
상속합니다). 이 시드를 먼저 적재하고 SKIN-01을 한 번 트리거해야 `CAUTION`/`SUITABLE` 행이 생깁니다.

시드가 만드는 등급 분기(사용자 9002, 5종 게이트 확인용):

| productId | 구성 | 기대 등급 |
| --- | --- | --- |
| 9003 | 판테놀(INSUFFICIENT)만 | 409 `CHECK_PROFILE_NOT_READY` |
| 9004 | 9001과 같은 성분 + INSUFFICIENT 다수 | 9001과 동일 등급(BR 3 회귀) |
| 9005 | 성분 행 없음 | 409 `CHECK_INGREDIENT_DATA_INSUFFICIENT` |
| 9006 | SUITABLE 3종만 | `LOW` |
| 9007 | SUITABLE 3 + CAUTION 1 (judged 4) | `MEDIUM` |
| 9008 | SUITABLE 3 + CAUTION 2 (judged 5, ratio 0.40) | `HIGH` (비중 축) |
| 9009 | SUITABLE 17 + CAUTION 3 (judged 20, ratio 0.15) | `HIGH` (개수 축) |

로컬 MySQL로 위 표 전체를 확인했습니다(2026-08-12, `docs/STATUS.md` 2.14절).

## 구현된 API

`docs/STATUS.md` 2.3절이 담당·선행 조건까지 포함한 정본입니다. 아래는 실행 확인용 요약입니다.

| API | 상태 |
| --- | --- |
| `GET /api/v1/health` | ✅ |
| `POST /api/v1/skin-records` (SKIN-01) | ✅ 목업 분석 · 로컬 스토리지 |
| `GET /api/v1/skin-records/today` (SKIN-02) | 🟡 단위 테스트만 |
| `GET /api/v1/skin-records/{id}` (SKIN-03) | 🟡 단위 테스트만 |
| `POST /api/v1/product-records` (PRODUCT-05) | ✅ 실서버 확인(2026-08-12) |
| `GET /api/v1/reports` (REPORT-01) | ✅ 실서버 확인 |
| `GET /api/v1/reports/insights/{id}` (REPORT-02) | ✅ 실서버 확인 |
| `GET /api/v1/reports/daily` (REPORT-03) | ✅ 실서버 확인 |
| `GET /api/v1/users/me/ingredient-profile` (USER-02) | ✅ 실서버 확인 |
| `POST /api/v1/checks` (CHECK-02) | ✅ 실서버 확인 |
| `GET /api/v1/checks/{id}` (CHECK-03) | ✅ 실서버 확인 |

## 아직 만들지 않은 것

- 인증(JWT 발급/검증) 및 Spring Security 설정 — A 담당 AUTH-01~03.
- SKIN-02 · SKIN-03 조회 API — 응답 구조는 SKIN-01과 같아 DTO를 재사용할 수 있습니다.
- 프로파일 완성도 계산(F-ANALYSIS-05) — 성분 프로파일 갱신(F-ANALYSIS-04)은 구현되어
  `ingredient_profiles`를 채우지만, 완성도 퍼센트를 내는 단계는 별도 기능이라 하지 않았습니다.
- CHECK-01(쇼핑 홈) — 제품 목록(A 담당)이 없어 미착수입니다. USER-02·CHECK-02·03은 구현됐습니다.
  그래서 F-ANALYSIS-04는 DB 행까지만 확인했고 응답 경로로는 검증하지 못했습니다.
- `skin_types` 마스터 데이터 적재 — 표가 비어 있어 민감성 완화(F-ANALYSIS-04 BR 3)가 실사용
  경로에서 켜지지 않습니다. 온보딩(F-ONBOARD-02) 구현과 함께 운영 시드가 필요합니다.
- ~~F-ANALYSIS-01의 실입력~~ → PRODUCT-05가 구현되어 실입력 경로로 검증을 마쳤습니다
  (2026-08-12 · `docs/STATUS.md` 2.7절). 회귀 검증에는 여전히 목업 시드가 편합니다.
- 그 외 도메인 컨트롤러/서비스/DTO — `api.skin`을 예시로 추가해나가면 됩니다.
- `Idempotency-Key` 처리 로직 — 저장 API 4개가 공유할 공통 인프라라 단독 구현을 피했습니다.
  SKIN-01은 슬롯 유니크 제약이 중복 저장을 막고 있습니다.
- 외부 연동(소셜 로그인, 날씨·자외선 API) — AI 피부 분석과 이미지 스토리지는 인터페이스 뒤에
  목업/로컬 구현이 들어가 있습니다 (ADR 0003 · 0007).
