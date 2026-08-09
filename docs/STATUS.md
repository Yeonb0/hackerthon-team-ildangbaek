# 구현 현황 (STATUS)

> 이 문서는 **실제 구현·검증·배포 상태**를 기록한다. 계획이나 목표가 아니라 **지금 저장소에 있는 것**을 적는다.
> 완료로 표시하려면 코드가 실제로 존재하고 동작이 확인되어야 한다.

- 최종 갱신: 2026-08-10
- 기준 커밋: `f515249` (docs: F-ANALYSIS-01 ADR 추가 및 정본 문서 동기화) + F-ANALYSIS-04 작업분
- 기준 브랜치: `yunjin` · 기본 브랜치: `boyeon`

## 상태 표기

| 표기 | 의미 |
| --- | --- |
| ✅ | 구현 완료 · 동작 확인됨 |
| 🟡 | 부분 구현 · 확인 필요 |
| ⬜ | 미착수 |
| ⛔ | 블로커로 인해 착수 불가 |

---

## 1. 한눈에 보기

| 영역 | 상태 | 비고 |
| --- | --- | --- |
| 백엔드 — 공통 인프라 | 🟡 | 응답/예외 envelope 완비. 스토리지·날짜 유틸 추가. **인증은 임시 방편** |
| 백엔드 — 엔티티 · 리포지토리 | ✅ | 전 도메인 정의 완료 |
| 백엔드 — service / controller / dto | 🟡 | **SKIN-01 1개.** 나머지 도메인 미착수 |
| 프론트엔드 | 🟡 | 기반 레이어 + 공통 컴포넌트 + S-00/S-01. 목업 모드로 동작 |
| 배포 | ⬜ | 미착수. 로컬 실행만 |

**동작이 확인된 백엔드 엔드포인트는 `GET /api/v1/health`와 `POST /api/v1/skin-records` 둘이다.**

> ⚠️ 현재 인증은 `X-User-Id` 헤더를 그대로 신뢰하는 임시 방편이다(ADR 0006). **위조 가능하며
> 배포 전 반드시 교체해야 한다.**

---

## 2. 백엔드

### 2.1 공통 인프라

| 항목 | 상태 | 위치 · 비고 |
| --- | --- | --- |
| 프로젝트 부팅 (Spring Boot 4.1 / Java 21) | ✅ | `build.gradle` |
| 로컬 MySQL 8.0 | ✅ | `docker-compose.yml` · `ddl-auto: update` |
| 공통 응답 envelope | ✅ | `global/response/` — `ApiResponse` · `ResultCode` · `SuccessCode` |
| 예외 처리 · 에러코드 | ✅ | `global/exception/` — **SKIN/ANALYSIS/CHECK/REPORT 코드 정의 완료** |
| JPA Auditing | ✅ | `global/config/JpaAuditingConfig` · `BaseTimeEntity` |
| CORS | 🟡 | `WebConfig` — 개발용 전체 허용. **배포 전 축소 필요** |
| 헬스체크 | ✅ | `GET /api/v1/health` |
| **인증 (JWT · Security)** | 🟡 | **임시 방편만 있음.** `X-User-Id` 헤더 → `@CurrentUserId` (ADR 0006). 위조 가능 · 배포 전 교체 필수 |
| 이미지 업로드 · 스토리지 | 🟡 | `ImageStorage` + `LocalImageStorage` (ADR 0007). multipart 10MB. **로컬 저장이라 다중 인스턴스·재배포 시 유실** |
| 날짜 귀속 유틸 | ✅ | `global/util/RecordDateResolver` · 경계값 테스트 13종 (ADR 0005 — **`제안` 상태**) |
| 피부 분석 클라이언트 | 🟡 | `SkinAnalysisClient` + 목업 (ADR 0003). 결정적 · 실패 재현 가능 |

> ⚠️ **인증은 임시 방편으로 우회한 상태다.** 실제 인증(AUTH-01~03, A 담당)이 들어오기 전까지
> 프로덕션 배포는 불가능하다.
>
> ⚠️ **ADR 0005가 `제안` 상태다.** `decisions/README.md`는 `제안` 상태 결정에 의존하는 코드를
> 머지하면 안 된다고 규정한다. `RecordDateResolver`가 여기 해당하므로 **머지 전 A 담당과 합의가 필요하다.**

### 2.2 엔티티 · 리포지토리

전 도메인 엔티티와 기본 리포지토리가 정의되어 있다. **단, 서비스 계층이 없어 실사용 검증은 되지 않았다.**

| 도메인 | 엔티티 | 리포지토리 |
| --- | --- | --- |
| `user` | ✅ User · UserProfile · UserSkinType · SkinType · NotificationSetting (+ enum 6종) | ✅ 5개 |
| `product` | ✅ Product · Ingredient · ProductIngredient · UserProduct (+ enum 3종) | ✅ 4개 |
| `record` | ✅ ProductRecord · ProductRecordItem · SkinRecord · SkinMetric (+ enum 6종) | ✅ 4개 |
| `routine` | ✅ Routine · RoutineProduct (+ enum 1종) | ✅ 2개 |
| `environment` | ✅ DailyEnvironment (+ enum 2종) | ✅ 1개 |
| `analysis` | ✅ IngredientProfile · AnalysisInsight (+ enum 2종) | ✅ 2개 |
| `check` | ✅ ProductRiskAssessment · ProductRiskIngredient (+ enum 1종) | ✅ 2개 |

### 2.3 API 구현 현황

**모두 미착수다.** 아래는 착수 대상 목록이며, 담당은 A(지우) / B(윤진) 분담을 따른다.

#### A 담당 — 서비스 기본 흐름 (지우)

| API | 상태 |
| --- | --- |
| AUTH-01~03 로그인 · 재발급 · 로그아웃 | ⬜ |
| ONBOARD-01~05 온보딩 | ⬜ |
| USER-01 · 03~07 마이페이지 · 프로필 · 위치 · 알림 | ⬜ |
| HOME-01 홈 조회 | ⬜ |
| RECORD-01~02 기록 허브 | ⬜ |
| PRODUCT-01~08 제품 검색 · 상세 · 기록 · 루틴 | ⬜ |

#### B 담당 — 분석 흐름 (윤진)

| API | 상태 | 선행 조건 |
| --- | --- | --- |
| SKIN-01 피부 기록 생성 및 분석 | ✅ | 임시 인증(ADR 0006) · 로컬 스토리지(ADR 0007)로 해소 |
| SKIN-02 오늘 피부 결과 조회 | 🟡 | SKIN-01 DTO 재사용. 서비스 단위 테스트만 확인, 실서버 동작 미확인 |
| SKIN-03 피부 기록 상세 조회 | 🟡 | SKIN-01 DTO 재사용. 서비스 단위 테스트만 확인, 실서버 동작 미확인 |
| F-ANALYSIS-01 성분-피부 시차 분석 | 🟡 | 분석 로직 구현 완료. **목업 시드 데이터로만 검증** — 실입력인 제품 기록(A · PRODUCT-05)이 없어 실사용 경로에서는 결과가 비어 있다 |
| F-ANALYSIS-02 환경 요인 보정 | ⬜ | `DailyEnvironment` 적재(A · HOME-01) |
| F-ANALYSIS-03 호르몬 요인 반영 | ⬜ | 우선순위 L · **후순위** |
| F-ANALYSIS-04 성분 프로파일 갱신 | 🟡 | 분류 로직 구현 완료(ADR 0010). **단위 테스트만 확인 · 실서버 미확인** — F-ANALYSIS-01과 같은 이유로 실사용 경로에서는 결과가 비어 있다 |
| F-ANALYSIS-05 프로파일 완성도 계산 | ⬜ | F-ANALYSIS-04 |
| CHECK-01 쇼핑 홈 | ⬜ | 프로파일 · `ProductRepository`(A) |
| CHECK-02 위험도 분석 | ⬜ | 프로파일 |
| CHECK-03 확인 결과 조회 | ⬜ | CHECK-02 |
| USER-02 성분 프로파일 전체 조회 | ⬜ | 프로파일 — **선행 조건 해소됨**(F-ANALYSIS-04가 `ingredient_profiles`를 채운다) |
| REPORT-01 리포트 조회 | 🟡 | SKIN-01. `insights`는 F-ANALYSIS-01 결과를 반환한다(목업 시드로 실서버 확인). 제품 기록이 없는 사용자에게는 빈 배열 |
| REPORT-02 요인 상세 조회 | ⬜ | F-ANALYSIS-01 |
| REPORT-03 일자별 리포트 조회 | ⬜ | SKIN-01 |

### 2.4 SKIN-01 검증 내역

`POST /api/v1/skin-records` — 로컬 MySQL + 목업 분석으로 동작 확인 (2026-08-08).

| 시나리오 | 결과 |
| --- | --- |
| 첫 기록 | 201 · `comparison: null` · `capturedAt`에 `+09:00` |
| 같은 슬롯 재요청 | 409 `SKIN_ALREADY_RECORDED_IN_SLOT` |
| 같은 날 다른 슬롯 (MORNING → NIGHT) | 201 · 하루 2건 저장 |
| 전일 동일 슬롯 존재 | `comparison` 계산 · 모닝이 전일 나이트와 비교되지 않음 |
| `X-User-Id` 누락 | 401 `COMMON_UNAUTHORIZED` |
| gif 업로드 | 422 `SKIN_IMAGE_INVALID_FORMAT` |
| `timeSlot` 누락 | 422 `COMMON_VALIDATION_FAILED` |
| 정의되지 않은 `timeSlot` | 400 `RECORD_INVALID_TIME_SLOT` |
| DB 상태 | `skin_records` 1행당 `skin_metrics` 4행 · `COMPLETED` · `MOCK` |

자동 테스트 46개 (`RecordDateResolver` 13 · 목업 분석 9 · 서비스 10 · 스토리지 5 · 인증 5 · 요청 DTO 4).
`BackendApplicationTests`(1개)는 MySQL이 떠 있어야 통과한다.

### 2.5 SKIN-02 · SKIN-03 구현 내역

`GET /api/v1/skin-records/today`, `GET /api/v1/skin-records/{skinRecordId}` — `SkinRecordService`에
조회 메서드를 추가하고 SKIN-01의 `SkinRecordResponse`를 그대로 재사용한다.

- SKIN-02: `timeSlot` 미지정 시 `findFirstByUserIdOrderByRecordDateDescCapturedAtDesc`로 최근 기록 조회.
  지정 시 오늘 날짜 + 해당 슬롯으로 조회.
- SKIN-03: `findByIdAndUserId`로 소유자 검증. 다른 사용자의 기록이거나 존재하지 않으면 둘 다
  `404 SKIN_RECORD_NOT_FOUND`로 응답해 존재 여부를 숨긴다(명세에 없는 403 대신 채택한 판단).
- `comparison`은 SKIN-01과 동일한 규칙(전일 동일 슬롯 비교)을 재사용한다.

서비스 단위 테스트 6개 추가(정상 조회 2 · 최근 기록 자동 선택 1 · 404 2 · 소유자 검증 1).
**로컬 MySQL로 실제 HTTP 요청까지 검증하지는 않았다** — SKIN-01처럼 서버를 띄운 통합 확인이 아직 없다.

### 2.6 REPORT-01 구현 내역

`GET /api/v1/reports` — 신규 `api/report` 패키지(`controller`/`dto`/`service`)로 구현. Analysis 결과를
보여주기만 하며 분석 자체는 실행하지 않는다.

- `period`는 7 또는 30만 허용. 그 외는 `422 REPORT_INVALID_PERIOD`.
- 기간 내 피부 기록이 하나도 없으면 `409 REPORT_DATA_INSUFFICIENT`.
- 기록이 없는 날짜의 `score`는 `null`이다(0으로 계산하지 않는다).
- 하루 2건(모닝·나이트)이 있으면 나이트를 대표값으로 쓴다(TBD-12, 명세가 "제안"이라고 표시한 규칙을
  그대로 채택 — 확정 시 백엔드 재확인 필요).
- `metric` 쿼리 파라미터는 미지정 시 `TROUBLE`. 잘못된 값은 `422 COMMON_VALIDATION_FAILED`
  (전용 에러 코드가 명세에 없어 SKIN-01의 `timeSlot` 처리 관례를 따름).
- **`insights`는 F-ANALYSIS-01의 결과를 반환한다.** `analysis_insights`를 신뢰도 내림차순으로 읽는다.
  분석 결과가 없으면 빈 배열이며, 이는 명세 규칙("실제 분석 데이터가 있는 인사이트만 반환")과 정합적이다.
  `confidenceScore` → `confidence`("OBSERVED"/"OBSERVING") 변환 임계값은 **67**로 확정했다.
  패턴 확정 기준과 같은 값이라 한쪽만 바꾸면 어긋난다 ([ADR 0009](decisions/0009-시차-분석-패턴-확정-기준.md)).
- REPORT-02·REPORT-03은 이번 범위에 포함하지 않았다.

서비스 단위 테스트 7개(기간 검증 1 · 데이터 부족 1 · 결측 null 1 · 나이트 우선 1 · insights 빈 배열 1 ·
신뢰도 라벨 매핑 1 · metric 필터링 1). REPORT-01의 `insights`는 F-ANALYSIS-01 검증에서 실서버로
확인했다(아래 2.7).

### 2.7 F-ANALYSIS-01 구현 · 검증 내역

성분-피부 시차 분석. 새 피부 기록이 저장될 때 `IngredientProfileUpdater` 훅에서 실행된다.

| 클래스 | 역할 |
| --- | --- |
| `LagCorrelationAnalyzer` | 계산 전부. DB를 모르며 노출·관측 목록만 받는다 |
| `IngredientLagAnalysisService` | 제품 기록 → 성분 노출, 피부 기록 → 관측으로 변환하는 DB 어댑터 |
| `LagInsightWriter` | 패턴 후보를 `AnalysisInsight`로 저장 (회차마다 대체) |
| `LagAnalysisProfileUpdater` | SKIN-01의 훅 구현. `NoOpIngredientProfileUpdater`를 대체 |

확정 기준과 계산 규칙은 [ADR 0009](decisions/0009-시차-분석-패턴-확정-기준.md)에 있다.

**제품 기록 저장 API(PRODUCT-05, A 담당)가 없어 실사용 경로에서는 결과가 항상 비어 있다.**
엔티티와 테이블(`product_records` · `product_record_items` · `product_ingredients`)은 이미 있으므로,
A의 API가 붙으면 **코드 변경 없이** 실데이터로 동작한다. 검증은 목업 시드로 했다.

목업 시드(`backend/src/test/resources/seed/f-analysis-01-mockup.sql`)로 로컬 MySQL + 실서버 확인
(2026-08-09). 무작위가 아니라 **의도한 패턴**을 심는다 — 그래야 분석기가 그 패턴을 잡았는지 알 수 있다.

| 시나리오 | 기대 | 결과 |
| --- | --- | --- |
| 레티놀 18·12·6일 전 사용 → 2일 뒤 트러블 +15 | `OBSERVED` | 신뢰도 100 · "2일 뒤 트러블이 반복적으로 증가해요" |
| 판테놀 18·11·8일 전 사용 → 뒤따르는 변화 없음 | `OBSERVING` | 신뢰도 33.33 · "확인 중이에요" |
| 히알루론산(레티놀 세럼에 동봉) | 레티놀과 동일 패턴 | `OBSERVED` — **의도된 한계**(ADR 0009) |
| REPORT-01 `insights` 정렬 | OBSERVED 우선 | 확정 2건이 앞, 확인 중 3건이 뒤 |
| 같은 사용자 재분석 | 누적되지 않음 | 5행 유지(이전 회차 대체) |
| 제품 기록 없는 사용자 | 빈 배열 · 오류 없음 | SKIN-01 201 · `insights: []` |

자동 테스트 12개 — `LagCorrelationAnalyzerTest` 9개(확정 1 · 미확정 3 · 데이터 부족 2 · 시차 범위 1 ·
슬롯 중복 제거 1 · 정렬 1)와 `IngredientLagAnalysisServiceTest` 3개(실패 기록 제외 1 · 제품 기록 없음 1 ·
조회 횟수 고정 1). 전체 **71개 통과**.

**조회 성능** — 노출 로딩은 제품 기록 수와 무관하게 쿼리 3번으로 고정된다(기록 · 항목 · 성분).
이 분석이 SKIN-01 저장 경로에서 동기로 실행되므로 응답 시간에 그대로 얹히기 때문이다.
실서버에서 제품 기록 5건 기준 `product_record_items` · `product_ingredients` 각 1회를 확인했다.

**분석이 완료된 피부 기록만 관측으로 쓴다.** `analysisStatus != COMPLETED`인 기록은 지표를 믿을 수
없는데, 그 값이 기준선이 되면 있지도 않은 변화를 패턴으로 잡는다.

**아직 하지 않은 것** — F-ANALYSIS-02 환경 보정이 없어 자외선 영향과 성분 영향이 섞여 있다.
`IngredientProfile` 갱신은 F-ANALYSIS-04에서 이어서 구현했다(아래 2.8).

### 2.8 F-ANALYSIS-04 구현 내역

개인 성분 프로파일 생성·갱신. F-ANALYSIS-01의 패턴 후보를 성분 단위 상태로 접어
`ingredient_profiles`에 남긴다. 시차 분석과 같은 트랜잭션 안에서, 인사이트 저장 직전에 실행된다.

| 클래스 | 역할 |
| --- | --- |
| `IngredientProfileWriter` | 분류 · 피부 타입 완화 · 행 갱신 전부 |
| `IngredientLagAnalysisService` | 노출·패턴을 넘겨 호출 (기존 클래스에 연결) |

판정 기준은 [ADR 0010](decisions/0010-성분-프로파일-분류-기준.md)에 있다. 요약하면 —
확정된 악화 패턴이 있으면 `CAUTION`, 개선뿐이면 `SUITABLE`, 없으면 `INSUFFICIENT`이며,
민감성 사용자는 **악화 방향 변화량 기준만** 3점에서 2점으로 완화된다.

**명세 BR 3(온보딩 피부 타입)을 완화 조건으로만 해석했다.** 관측이 0건인 성분은 피부 타입과 무관하게
`INSUFFICIENT`로 둔다. 피부 타입만으로 성분 상태를 정하면 BR 1이 금지한 임의 분류가 되기 때문이다.
이 해석은 ADR 0010에 근거와 함께 기록했고, `기능명세서.md` F-ANALYSIS-04에도 반영했다.

**노출은 있으나 확정되지 않은 성분도 행을 남긴다.** `observation_count`(노출 일수)만 채우고
`reason_summary`는 `null`이다. USER-02가 `recordCount`로 "왜 아직 부족한지"를 설명해야 하는데
그 값을 아는 곳이 이 표뿐이다.

**인사이트와 달리 행을 지우지 않고 갱신한다.** `UNIQUE(user_id, ingredient_id)`로 기존 행을 찾아
덮어쓰므로 id가 유지된다. F-CHECK가 참조할 누적 상태이기 때문이다.

자동 테스트 17개 — `IngredientProfileWriterTest` 15개(악화/개선/혼재 분류 3 · 미확정 처리 2 ·
민감성 완화 4 · 노출 없음 1 · 마스터 누락 1 · 행 갱신 1 · 노출 일수 계산 1 · 시차 중복 제거 1 ·
목업 시드 시나리오 1)와 `IngredientLagAnalysisServiceTest` 추가 2개(패턴 없어도 프로파일 갱신 1 ·
제품 기록 없으면 미갱신 1). 전체 **88개 통과**.

**로컬 MySQL 실 DB 검증** (2026-08-10). 목업 시드 + `@SpringBootTest`로 실제 JPA 매핑을 태워
`ingredient_profiles` 행을 직접 확인했다.

| 시나리오 | 기대 | 결과 |
| --- | --- | --- |
| 레티놀 (2일 뒤 트러블 +15) | `CAUTION` | obs=3 neg=1 lag=2 score=15.0000 conf=100.00 |
| 히알루론산 (레티놀 세럼 동봉) | 레티놀과 동일 | `CAUTION` — 의도된 한계(ADR 0009) |
| 판테놀 (뒤따르는 변화 없음) | `INSUFFICIENT` | 근거·점수 전부 `NULL` |
| 재분석 2회 | 행 id 유지 · 누적 없음 | id 1·2·3 그대로 3행 (`UPDATE` 3회) |
| 민감성 + 모공 +2.5 | 완화되어 `CAUTION` | score=2.5000 · 근거에 `민감성 피부 기준 ·` |
| 위와 같은 데이터 · 민감성 해제 | `INSUFFICIENT`로 복귀 | 근거 `NULL`로 초기화됨 |

**시차 중복 제거가 실데이터에서 확인됐다** — `negative_count=1`이다. 접지 않았다면 시차 1~7이
각각 확정돼 7까지 올라갔을 값이다.

**쿼리 수는 성분·기록 수와 무관하게 고정이다.** `ingredients` · `user_skin_types` 각 1회, 갱신은
행당 `UPDATE` 1회다. 이 분석이 SKIN-01 저장 경로에서 동기로 돌기 때문에 확인했다.

**아직 응답 경로로는 확인하지 못했다.** 이 표를 읽는 API(USER-02 · F-CHECK)가 없어 DB 행까지만 봤다.

> ⚠️ **민감성 완화(BR 3)는 실사용 경로에서 아직 동작하지 않는다.** 검증 중 발견 —
> `skin_types` 마스터가 비어 있고 온보딩 API(F-ONBOARD-02, A 담당)가 없어 `user_skin_types`에
> 아무도 없다. 코드는 정상이고 위 표대로 동작하지만, **입력이 없어 모든 사용자가 기본 기준으로
> 판정된다.** 안전한 쪽으로 degrade하지만 조용히 그렇게 되면 안 되므로 선택 이력이 없을 때
> `debug` 로그를 남긴다. 온보딩이 붙으면 코드 변경 없이 켜진다.
> 로컬 확인용 시드: `seed/f-analysis-04-sensitive.sql`

**아직 하지 않은 것** — F-ANALYSIS-05(프로파일 완성도)는 이번 범위 밖이다. 완화 임계값 2점은
ADR 0009의 3점과 마찬가지로 근거 없는 초기값이며, F-ANALYSIS-02 구현 시 함께 재검토해야 한다.
`skin_types` 마스터 데이터 적재(운영 시드)도 아직 없다 — 온보딩 구현과 함께 필요하다.

---

## 3. 프론트엔드

| 항목 | 상태 | 비고 |
| --- | --- | --- |
| Expo 프로젝트 부팅 · 폴더 구조 | ✅ | `14915dd` |
| 기반 레이어 (테마 · 스케일 · API · 네비게이션) | ✅ | `abc043a` |
| 공통 컴포넌트 9종 + 개발용 카탈로그 | ✅ | `f1d1c6a` |
| S-00 로그인 (목업 연동 · 자동 로그인 분기) | ✅ | `1258c14` |
| S-01 기본 정보 입력 | ✅ | `1258c14` |
| 그 외 화면 (S-02~S-24) | ⬜ | |
| 백엔드 실연동 | ⬜ | `EXPO_PUBLIC_USE_MOCK=true` — **현재 전부 목업** |

---

## 4. 문서

| 문서 | 상태 | 비고 |
| --- | --- | --- |
| `docs/PRD.md` | ✅ | |
| `docs/기능명세서.md` | ✅ | TBD 항목 13장에 정리됨 |
| `docs/api_명세서.md` | ✅ | **TBD-10b 해소**(ADR 0001) · TBD-11 · TBD-12 미해결 |
| `docs/ERD.md` | ✅ | ADR 0002 반영 완료 (7장 `metric_type` 4종) |
| `docs/공통응답포맷_예외처리코드.md` | ✅ | 8.1 날짜 귀속 규칙 확정됨 |
| `docs/목업 데이터 구조 정의서.md` | ✅ | |
| `docs/decisions/` | 🟡 | ADR 0001~0008 작성. **0005는 `제안` 상태** |
| `docs/STATUS.md` | ✅ | 이 문서 |
| `README.md` | ✅ | ADR 0002 반영 완료 (지표 소개 문구) |
| `backend/README.md` | ✅ | 임시 인증 · 스토리지 · 분석 provider 설정 반영 |

---

## 5. 미해결 · 블로커

우선순위 순.

| # | 항목 | 영향 | 담당 |
| --- | --- | --- | --- |
| 1 | **인증 인프라 부재** | 임시 방편(ADR 0006)으로 우회 중. **배포 불가 상태** | A(지우) |
| 2 | **ADR 0005 `제안` 상태** | `RecordDateResolver`가 이에 의존. **머지 전 합의 필요** | A·B 합의 |
| 3 | ~~이미지 스토리지 미결정~~ | ADR 0007로 해소 (로컬 저장 · 배포 시 외부 스토리지 전환) | — |
| 4 | 리포트 일자별 대표값 규칙 (TBD-12) | REPORT-01 | 명세상 "나이트 우선" 제안 · 확정 필요 |
| 5 | 리포트 요인 상세의 `metric` 전환 지원 여부 (TBD-11) | REPORT-02 | 응답 필드는 이미 포함됨 |
| 6 | `MORNING` 슬롯 시각 불일치 요청 처리 | SKIN-01 · PRODUCT-05 | ADR 0005 미해결 항목 · **현재는 수용** |
| 7 | 제품 직접 등록 (F-PRODUCT-08) | 우선순위 L | 명세 미정 |
| 8 | `Idempotency-Key` 미구현 | 저장 API 4개 공통 | A·B 공통 인프라로 분리 |
| 9 | `BackendApplicationTests`가 MySQL 없이 실패 | 로컬 테스트 | H2 또는 `application-test.yml` 필요 |

---

## 6. 배포 · 운영

| 항목 | 상태 |
| --- | --- |
| 로컬 실행 (백엔드 · 프론트) | ✅ |
| 원격 DB | ⬜ |
| 서버 배포 | ⬜ |
| CI | ⬜ |
| 마이그레이션 도구 (Flyway 등) | ⬜ · 현재 `ddl-auto: update`에 의존 |

---

## 갱신 규칙

`CLAUDE.md`의 Documentation Synchronization을 따른다. 코드 · 설정 · API · 인증 · DB · 마이그레이션 · 운영
변경이 있을 때 **같은 작업 단위에서** 이 문서를 갱신한다. 완료 표시는 **동작 확인 후에만** 한다.
