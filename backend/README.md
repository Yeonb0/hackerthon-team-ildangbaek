# Backend

피부 관리 서비스(팀 일당백) 백엔드. `docs/` 하위 PRD · ERD · 기능명세서 · api 명세서 · 공통응답포맷 문서를 기준으로 구성한 기본 구조입니다.

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

DB 접속 정보는 `application-local.yml`에 기본값(`ildangbaek` / `ildangbaek1234` / db `ildangbaek`)이 들어 있고, 필요하면 `DB_HOST`/`DB_PORT`/`DB_NAME`/`DB_USERNAME`/`DB_PASSWORD` 환경변수로 덮어쓸 수 있습니다. `spring.jpa.hibernate.ddl-auto=update`라 엔티티를 추가하면 테이블이 자동으로 생성됩니다.

## 패키지 구조

```
com.ildangbaek.backend
├── BackendApplication.java
├── global                     # 도메인에 종속되지 않는 공통 인프라
│   ├── config                 # JpaAuditingConfig, WebConfig(CORS)
│   ├── entity                 # BaseTimeEntity (createdAt/updatedAt)
│   ├── response                # ApiResponse, SuccessCode, ResultCode
│   └── exception               # ErrorCode, BusinessException, GlobalExceptionHandler
├── domain                     # 영속성 계층 — ERD 기준으로 묶은 엔티티/리포지토리
│   ├── user                    # User, UserProfile, SkinType, UserSkinType, NotificationSetting
│   ├── product                 # Product, Ingredient, ProductIngredient, UserProduct
│   ├── routine                 # Routine, RoutineProduct
│   ├── record                  # ProductRecord, ProductRecordItem, SkinRecord, SkinMetric
│   ├── environment              # DailyEnvironment
│   ├── analysis                 # IngredientProfile, AnalysisInsight
│   └── check                    # ProductRiskAssessment, ProductRiskIngredient
└── api                          # 표현 계층(컨트롤러) — api_명세서.md 2장 도메인 구성과 맞춤
    └── common/controller/HealthController.java   # 배선 확인용 예시
```

새 API를 붙일 때는 `api.{domain}.controller` / `.service` / `.dto` 하위에 추가하고,
`api_명세서.md`의 도메인 목록(auth, onboard, user, home, record, product, skin, check, report)을 그대로 패키지명으로 씁니다.
영속성(엔티티/리포지토리)은 이미 있는 `domain.*` 패키지를 재사용하세요.

## 공통 응답 / 예외 처리

- 모든 API는 `ApiResponse<T>` (`isSuccess`, `code`, `message`, `result`)로 감싸 반환합니다.
- 컨트롤러/서비스에서 도메인 예외가 필요하면 `throw new BusinessException(ErrorCode.XXX)`를 던지세요.
  `GlobalExceptionHandler`가 잡아서 문서에 정의된 HTTP 상태 · 코드 · 메시지로 변환합니다.
- `ErrorCode`는 `docs/공통응답포맷_예외처리코드.md` 5장의 코드를 전부 옮겨둔 것입니다. 새 코드가 필요하면 문서를 먼저 갱신하세요.
- `@Valid` 검증 실패, `@Validated` 파라미터 검증 실패는 자동으로 `COMMON_VALIDATION_FAILED` + `errors[]` 형태로 내려갑니다.

## 알려진 미확정 사항 (엔티티 주석 참고)

ERD.md와 api_명세서.md/기능명세서.md 사이에 값 체계가 다른 필드가 몇 개 있습니다(PRD 14장 "미확정 사항" 참고). 엔티티는 ERD.md를 기준으로 만들었고, 차이가 있는 지점은 코드 주석에 남겨뒀습니다.

- `UserProfile.gender` — ERD `NOT_SELECTED` vs api 명세서 `UNSPECIFIED`
- `UserProfile.menstrualStatus` — ERD 3종 vs api 명세서 `HormoneStatus` 4종(HORMONE_PILL/HORMONE_INJECTION 포함)
- `SkinMetric.metricType` — ERD 3종(TROUBLE/REDNESS/MOISTURE_OIL) vs 기능명세서 F-SKIN-04 4종(+PORES/PIGMENTATION), PRD 8.4/9.6도 서로 다름 (TBD-11)
- `IngredientProfile.reactionType` / `ProductRiskIngredient.reactionType` — ERD `SUITABLE` vs api 명세서 `IngredientStatus.GOOD`

팀 내에서 스키마가 확정되면 해당 enum과 주석만 정리하면 됩니다.

## 아직 만들지 않은 것

- 인증(JWT 발급/검증) 및 Spring Security 설정 — 이번 스캐폴딩 범위에서 의도적으로 제외했습니다.
- 도메인별 컨트롤러/서비스/DTO — `HealthController`를 예시로 도메인별로 추가해나가면 됩니다.
