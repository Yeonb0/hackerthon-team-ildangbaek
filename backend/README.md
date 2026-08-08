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
| `./gradlew test` | 테스트만 실행 |
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
| `SKIN_ANALYSIS_PROVIDER` | `mock` | 분석 구현체 선택 ([ADR 0003](../docs/decisions/0003-AI-분석-목업-우선.md)) |

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
  — **다만 아직 구현되지 않았다.** 현재는 `X-User-Id` 헤더를 임시로 쓴다 (아래 「임시 인증」 참고)
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

인증이 아직 없어 `X-User-Id` 헤더로 사용자를 식별합니다. ([ADR 0006](../docs/decisions/0006-임시-인증-방편.md))

```bash
curl -X POST http://localhost:8080/api/v1/skin-records \
  -H "X-User-Id: 1" -F "image=@face.jpg" -F "timeSlot=MORNING"
```

**이것은 인증이 아닙니다.** 헤더를 그대로 신뢰하므로 `X-User-Id: 2`를 보내면 누구나 2번 사용자로
행세할 수 있습니다. 로컬 개발과 내부 시연에만 쓰고, **AUTH-01 완료 즉시 제거합니다.**
교체 시 고칠 곳은 `CurrentUserIdArgumentResolver` 한 클래스입니다.

사용자가 없으면 `USER_NOT_FOUND`가 납니다. 회원가입 경로가 아직 없으므로 직접 넣어야 합니다.

```sql
INSERT INTO users (provider, provider_user_id, onboarding_completed, account_status, created_at, updated_at)
VALUES ('KAKAO', 'local-dev', true, 'ACTIVE', NOW(), NOW());
```

## 구현된 API

| API | 상태 |
| --- | --- |
| `GET /api/v1/health` | ✅ |
| `POST /api/v1/skin-records` (SKIN-01) | ✅ 목업 분석 · 로컬 스토리지 |

## 아직 만들지 않은 것

- 인증(JWT 발급/검증) 및 Spring Security 설정 — A 담당 AUTH-01~03.
- SKIN-02 · SKIN-03 조회 API — 응답 구조는 SKIN-01과 같아 DTO를 재사용할 수 있습니다.
- 성분 프로파일 갱신(F-ANALYSIS-01·04) — 호출 훅(`IngredientProfileUpdater`)만 있고 내용은 비어
  있습니다. 입력인 제품 기록(A 담당)이 선행되어야 합니다.
- 그 외 도메인 컨트롤러/서비스/DTO — `api.skin`을 예시로 추가해나가면 됩니다.
- `Idempotency-Key` 처리 로직 — 저장 API 4개가 공유할 공통 인프라라 단독 구현을 피했습니다.
  SKIN-01은 슬롯 유니크 제약이 중복 저장을 막고 있습니다.
- 외부 연동(소셜 로그인, 날씨·자외선 API) — AI 피부 분석과 이미지 스토리지는 인터페이스 뒤에
  목업/로컬 구현이 들어가 있습니다 (ADR 0003 · 0007).
