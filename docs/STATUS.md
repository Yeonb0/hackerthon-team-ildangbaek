# 구현 현황 (STATUS)

> 이 문서는 **실제 구현·검증·배포 상태**를 기록한다. 계획이나 목표가 아니라 **지금 저장소에 있는 것**을 적는다.
> 완료로 표시하려면 코드가 실제로 존재하고 동작이 확인되어야 한다.

- 최종 갱신: 2026-08-11
- 기준 커밋: `6e18603` (feat: USER-02) + REPORT-01 그래프 시간대 분리 작업분(ADR 0012)
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
| 백엔드 — service / controller / dto | 🟡 | **skin · report · user 3개 도메인.** 나머지 미착수 |
| 프론트엔드 | 🟡 | 기반 레이어 + 공통 컴포넌트 + S-00/S-01. 목업 모드로 동작 |
| 배포 | ⬜ | 미착수. 로컬 실행만 |

**실서버로 동작이 확인된 백엔드 엔드포인트는 여섯이다** — `GET /api/v1/health` ·
`POST /api/v1/skin-records` · `GET /api/v1/reports` · `GET /api/v1/reports/daily` ·
`GET /api/v1/reports/insights/{insightId}` · `GET /api/v1/users/me/ingredient-profile`.

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
| 날짜 귀속 유틸 | ✅ | `global/util/RecordDateResolver` · 경계값 테스트 13종 (ADR 0005 — **확정**) |
| 피부 분석 클라이언트 | 🟡 | `SkinAnalysisClient` + 목업 (ADR 0003). 결정적 · 실패 재현 가능 |

> ⚠️ **인증은 임시 방편으로 우회한 상태다.** 실제 인증(AUTH-01~03, A 담당)이 들어오기 전까지
> 프로덕션 배포는 불가능하다.

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
| F-ANALYSIS-04 성분 프로파일 갱신 | 🟡 | 분류 로직 구현 완료(ADR 0010). **USER-02 응답 경로로 실서버 확인**(2026-08-11) — 목업 시드가 만든 행이 JSON까지 나온다. 다만 입력이 여전히 목업 시드라, 실입력인 제품 기록(A · PRODUCT-05)이 없는 사용자에게는 결과가 비어 있다 |
| F-ANALYSIS-05 프로파일 완성도 계산 | 🟡 | 산출식 구현 완료(ADR 0011). **호출자 생김** — USER-02가 `completionRate`를 싣는다(실서버 확인). USER-01 · CHECK-01은 여전히 미구현이라 세 곳 값 일치(BR 4)는 아직 검증 못 했다 |
| CHECK-01 쇼핑 홈 | ⬜ | 프로파일 · `ProductRepository`(A) |
| CHECK-02 위험도 분석 | ⬜ | 프로파일 |
| CHECK-03 확인 결과 조회 | ⬜ | CHECK-02 |
| USER-02 성분 프로파일 전체 조회 | ✅ | 로컬 MySQL로 실서버 확인(2026-08-11 · 2.10절). ADR 0004 양방향 변환 · ADR 0011 완성도 연결 |
| REPORT-01 리포트 조회 | 🟡 | SKIN-01. `insights`는 F-ANALYSIS-01 결과를 반환한다(목업 시드로 실서버 확인). 제품 기록이 없는 사용자에게는 빈 배열 |
| REPORT-02 요인 상세 조회 | ✅ | 로컬 MySQL로 실서버 확인(2026-08-11 · 2.12절). ADR 0013 — 이벤트 조회 시점 도출 · 그래프 ADR 0012 적용 |
| REPORT-03 일자별 리포트 조회 | ✅ | 로컬 MySQL로 실서버 확인(2026-08-11 · 2.11절). SKIN-01 응답 구조 재사용 · ADR 0012 원칙 유지 |

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
- 하루 2건(모닝·나이트)을 **대표값으로 접지 않고 각각 반환한다** — `graph` 항목이
  `{date, morningScore, nightScore}`다. 프론트 요청(`backend-requests-phase6.md` A1)을 반영해
  TBD-12를 "대표값을 쓰지 않는다"로 확정했다([ADR 0012](decisions/0012-리포트-그래프-시간대-분리.md)).
  기존 `score` 필드는 **제거됐다.**
- `metric` 쿼리 파라미터는 미지정 시 `TROUBLE`. 잘못된 값은 `422 COMMON_VALIDATION_FAILED`
  (전용 에러 코드가 명세에 없어 SKIN-01의 `timeSlot` 처리 관례를 따름).
- **`insights`는 F-ANALYSIS-01의 결과를 반환한다.** `analysis_insights`를 신뢰도 내림차순으로 읽는다.
  분석 결과가 없으면 빈 배열이며, 이는 명세 규칙("실제 분석 데이터가 있는 인사이트만 반환")과 정합적이다.
  `confidenceScore` → `confidence`("OBSERVED"/"OBSERVING") 변환 임계값은 **67**로 확정했다.
  패턴 확정 기준과 같은 값이라 한쪽만 바꾸면 어긋난다 ([ADR 0009](decisions/0009-시차-분석-패턴-확정-기준.md)).
- ~~REPORT-02·REPORT-03은 이번 범위에 포함하지 않았다.~~ → 둘 다 이후 구현했다(2.11 · 2.12절).

서비스 단위 테스트 8개(기간 검증 1 · 데이터 부족 1 · 결측 null 1 · 두 슬롯 각각 반환 1 ·
한쪽 슬롯만 기록 1 · insights 빈 배열 1 · 신뢰도 라벨 매핑 1 · metric 필터링 1).
REPORT-01의 `insights`는 F-ANALYSIS-01 검증에서 실서버로 확인했다(아래 2.7).

**로컬 MySQL 실서버 검증** (2026-08-11). 목업 시드가 `NIGHT`만 심어 네 조합을 만들 수 없어,
`MORNING` 기록을 얹는 보조 시드(`seed/report-01-slots.sql`)를 함께 썼다.

| 시나리오 | 기대 | 결과 |
| --- | --- | --- |
| 모닝 · 나이트 모두 기록 | 두 값 다 반환 | `morningScore: 40` · `nightScore: 50` — 접히지 않음 |
| 모닝만 기록 | 나이트 결측 | `40` · `null` |
| 나이트만 기록 | 모닝 결측 | `null` · `50` |
| 기록 없는 날 | 둘 다 결측 | `null` · `null` |
| `score` 필드 | 제거됨 | 응답 키가 `date` · `morningScore` · `nightScore` 3개뿐 |
| `metric=REDNESS` · `period=30` | 지표 · 기간 전환 | 30개 지점 · 지표별 값 정상 |
| `period=14` | 422 | `REPORT_INVALID_PERIOD` |
| `X-User-Id` 누락 | 401 | `COMMON_UNAUTHORIZED` |
| 기록 없는 사용자 | 409 | `REPORT_DATA_INSUFFICIENT` |

> ⚠️ **`insights`는 이번 회차에서 빈 배열이었다.** 보조 시드가 "모닝만" 케이스를 만들려고 레티놀
> 패턴의 스파이크일 하나를 지웠기 때문이며, 시차 분석은 SKIN-01 저장 경로에서만 돌아 DB 직접
> 조작으로는 재실행되지 않는다. `insights` 자체는 2.7에서 실서버로 확인된 상태다.

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

**응답 경로 확인 완료** (2026-08-11 · 아래 2.10). USER-02를 구현해 위 표의 세 행이 JSON으로
나오는 것까지 확인했다. F-CHECK는 여전히 미구현이다.

> ⚠️ **민감성 완화(BR 3)는 실사용 경로에서 아직 동작하지 않는다.** 검증 중 발견 —
> `skin_types` 마스터가 비어 있고 온보딩 API(F-ONBOARD-02, A 담당)가 없어 `user_skin_types`에
> 아무도 없다. 코드는 정상이고 위 표대로 동작하지만, **입력이 없어 모든 사용자가 기본 기준으로
> 판정된다.** 안전한 쪽으로 degrade하지만 조용히 그렇게 되면 안 되므로 선택 이력이 없을 때
> `debug` 로그를 남긴다. 온보딩이 붙으면 코드 변경 없이 켜진다.
> 로컬 확인용 시드: `seed/f-analysis-04-sensitive.sql`

**아직 하지 않은 것** — F-ANALYSIS-05(프로파일 완성도)는 이번 범위 밖이다. 완화 임계값 2점은
ADR 0009의 3점과 마찬가지로 근거 없는 초기값이며, F-ANALYSIS-02 구현 시 함께 재검토해야 한다.
`skin_types` 마스터 데이터 적재(운영 시드)도 아직 없다 — 온보딩 구현과 함께 필요하다.

### 2.9 F-ANALYSIS-05 구현 내역

프로파일 완성도 계산. 기록 충분성과 성분 커버리지 두 축을 각각 목표치에서 포화시킨 뒤 동일 가중으로
평균한다. 산출식과 근거는 [ADR 0011](decisions/0011-프로파일-완성도-산출식.md)에 있다.

```
A 기록 충분성 = min(기록 일수 / 30, 1.0)
B 성분 커버리지 = min(확정 성분 수 / 20, 1.0)
completionRate = round((A * 0.5 + B * 0.5) * 100)
```

| 클래스 | 역할 |
| --- | --- |
| `ProfileCompletionCalculator` | 산출식 전부 (`domain/analysis/profile`) |

**명세의 Business Rule이 전부 금지 조항이라 계산식을 새로 정해야 했다.** `docs/PRD.md` 14장이 이
항목을 "계산식 및 사용자 노출 의미 확정 필요" 미결정으로 명시하고 있었고, ADR 0011이 그 미결정을
닫는다. 가장 소박한 안인 "전체 성분 중 판단된 비율"은 분모가 수천 종이라 완성도가 영구히 1% 미만에
갇히고, 반대로 "노출 성분 중 판단된 비율"은 성분 2종만 확정돼도 100%가 되어 BR 3을 정면으로 어긴다.
두 축 포화 방식은 분모가 상수라 두 문제를 모두 피한다.

**`INSUFFICIENT`는 세지 않는다.** 노출만으로 게이지가 오르면 "분석 가능한 축적량"(BR 2)이 아니라
제품 등록량을 세는 것이 된다.

**값을 저장하지 않는다.** 두 입력이 이미 저장돼 있는 파생값이라, 컬럼을 두면 갱신 누락 시 게이지만
낡은 값을 보여주는 버그가 생긴다.

자동 테스트 10개 — `ProfileCompletionCalculatorTest`(0%/100%/절반 3 · 한 축만 채워진 경우 2 ·
성분 2종이 100%가 되지 않음 1 · 목표치 초과 포화 1 · 가입 기간 아닌 기록 일수 사용 1 ·
`INSUFFICIENT` 미포함 1 · 반올림 1). 전체 **97개 통과**.

**JPQL 파싱은 H2로 확인했다** (2026-08-11). 새로 추가한 두 조회
(`countDistinctRecordDatesByUserId` · `countByUserIdAndReactionTypeIn`)를 실제 Hibernate에
태워 실행되는 것과 계산기가 스프링 컨텍스트에 정상 주입되는 것까지 확인한 뒤, 임시 의존성과
테스트는 되돌렸다.

> ⚠️ **소비처 3곳 중 1곳만 붙었다.** USER-02가 `completionRate`를 싣는다(2026-08-11 · 아래 2.10).
> USER-01 · CHECK-01은 아직 미구현이며, 세 API가 **같은 값을 써야 하므로**(BR 4) 각 구현 시
> 이 컴포넌트를 호출해야 한다 — 값 일치는 세 곳이 다 붙어야 검증할 수 있다.
> 또한 제품 기록 저장 API(PRODUCT-05, A 담당)가 없어 실사용 경로에서는 B축이 항상 0이다 —
> 즉 현재 실사용 최대치는 50%다. F-ANALYSIS-01 · 04와 같은 제약이다.

**미결 — 사용자 노출 문구.** 100%의 의미("전 성분 판단 완료"가 아니라 "판단하기에 충분한 데이터가
모였다")를 게이지 옆에 어떻게 쓸지 정하지 않았다. 문구가 없으면 BR 3이 화면에서 깨진다.
S-23 구현 시 확정해야 한다.

**목표치 30일 · 20종에 이론적 근거는 없다.** ADR 0009의 3점, 0010의 2점과 같은 성격의 초기값이다.

### 2.10 USER-02 구현 내역

성분 프로파일 전체 조회. `ingredient_profiles`를 읽어 목록으로 내려준다. 분석을 실행하지 않는다.

| 클래스 | 역할 |
| --- | --- |
| `UserController` | `GET /api/v1/users/me/ingredient-profile` · `status` 파싱 |
| `UserIngredientProfileService` | 필터 · 정렬 · 근거 비우기 |
| `IngredientStatus` | `ReactionType` 양방향 변환 (ADR 0004 공용 매핑) |

**변환은 `IngredientStatus` 한 곳에만 있다.** ADR 0004가 "공용 매핑 한 곳을 두고 양쪽이 참조한다"고
정했으므로 `analysis` 도메인에 두었다. CHECK-02 · 03 구현 시 이 enum을 그대로 쓴다 —
변환을 다시 만들면 안 된다.

**역방향 변환은 쿼리 파라미터 때문에 필요하다.** `?status=GOOD`이 오면 `SUITABLE` 행을 찾는다.
반대로 **DB 표기인 `SUITABLE`을 쿼리로 보내면 422**다. API 경계에서 두 표기가 섞이면 ADR 0004가
분리해 둔 계층 구분이 무너진다.

**`INSUFFICIENT`의 근거는 표현 계층에서 한 번 더 비운다.** F-ANALYSIS-04가 이미 `null`로 쓰지만,
민감성 해제처럼 상태가 되돌아가는 경로가 있어 이전 근거가 남을 여지가 있다. BR 1은 "지어내지
않는다"이므로 나가는 쪽에서 막는 편이 안전하다.

**`completionRate`는 필터와 무관하게 전체 기준이다.** `ProfileCompletionCalculator`를 그대로
호출하며 이 서비스는 자체 계산하지 않는다(ADR 0011 BR 4).

**N+1을 피하려고 fetch join을 썼다.** `findAllByUserIdWithIngredient` — 성분명을 함께 내리므로
기본 `findAllByUserId`를 쓰면 성분 수만큼 추가 조회가 붙는다.

자동 테스트 11개 — `UserIngredientProfileServiceTest` 6개(상태 정렬 1 · 그룹 내 노출 일수 정렬 1 ·
근거 비우기 1 · 필터 1 · 완성도 위임 1 · 빈 프로파일 1)와 `IngredientStatusTest` 5개(양방향 변환 2 ·
대소문자 1 · `SUITABLE` 거부 1 · 이름 일치 값 1). 전체 **108개 통과**.

**로컬 MySQL 실서버 검증** (2026-08-11). 2.8이 남긴 `user_id=9001`의 3행을 그대로 사용했다.

| 시나리오 | 결과 |
| --- | --- |
| 전체 조회 | 200 · 3건 · `completionRate: 41` |
| `SUITABLE` 행 | 응답에 `"status": "GOOD"` |
| 정렬 | `GOOD`(12) → `CAUTION`(3) → `INSUFFICIENT`(1) |
| `?status=GOOD` | `SUITABLE` 행 1건만 · 필터해도 `completionRate` 전체 기준 |
| `INSUFFICIENT` 행 | `reason_summary`가 DB에 있어도 `reason: null` |
| `?status=BOGUS` · `?status=SUITABLE` | 422 `COMMON_VALIDATION_FAILED` |
| `X-User-Id` 누락 | 401 `COMMON_UNAUTHORIZED` |
| 프로파일 없는 사용자 | 200 · `ingredients: []` |

**이것이 F-ANALYSIS-04 · 05의 첫 응답 경로 확인이다.** 두 기능 모두 그동안 DB 행과 단위 테스트까지만
확인돼 있었다. 다만 **입력은 여전히 목업 시드다** — 제품 기록 저장(PRODUCT-05, A 담당)이 없어
실사용자에게는 `ingredients`가 빈 배열이다.

**아직 하지 않은 것** — 대상 화면이 미확정이라 프론트 연동이 없다. 화면 확정 시 필드가 추가될 수 있다.

### 2.11 REPORT-03 구현 · 검증 내역

`GET /api/v1/reports/daily` — 특정 날짜의 피부 기록을 배열로 반환한다.

**명세에 응답 본문이 없었다.** `api_명세서.md`의 REPORT-03은 Method · URI · 쿼리 파라미터 ·
업무 규칙 2개까지만 정의돼 있었고 `Success Response` 블록이 없었다. 규칙 1("모든 기록을 배열로 반환")이
응답이 **기록 목록**임을 가리키므로 SKIN-01 · 02 · 03의 `SkinRecordResponse`를 그대로 재사용하기로 했다.
새 DTO는 껍데기(`ReportDailyResponse`) 하나뿐이다. 이 결정은 명세에 응답 예시로 반영했다.

**기능 ID를 신설했다 — `F-REPORT-04`.** 엔드포인트 코드 REPORT-03과 기능 ID F-REPORT-03이 서로 다른
기능을 가리켜(F-REPORT-03 = 요인 상세 조회 = 엔드포인트 REPORT-02) 일자별 조회에는 대응하는 기능 항목이
아예 없었다. `기능명세서.md` 10장에 항목을 추가하고 두 문서의 매핑표를 갱신했다. **관련 화면은 `—`(미정)**
으로 뒀다 — 실제 소비 화면이 없는데 있는 것처럼 적지 않는다.

- **하루 2건을 접지 않는다.** 모닝 · 나이트가 각각 배열 원소다 — ADR 0012가 REPORT-03 구현 시
  확인하라고 남긴 항목을 **같은 원칙 유지**로 닫았다. 화면 성격(캘린더에서 하루를 펼쳐 봄)이
  두 슬롯을 모두 보여주는 쪽이라 그래프와 어긋날 이유가 없었다.
- **기록이 없으면 빈 배열이다. 404가 아니다.** 지정한 `timeSlot`에 기록이 없을 때도 같다.
  캘린더에서 임의 날짜를 여는 화면이라 "그날은 기록이 없다"가 정상 상태다.
- `comparison`은 `SkinRecordService.toResponse`를 재사용해 채운다. 전일 동일 슬롯 비교 계산을
  두 벌로 두면 같은 기록이 화면마다 다른 증감을 보인다. 이를 위해 해당 메서드를 `public`으로 열었다.
- `timeSlot` 파싱은 SKIN-02의 관례를 따른다 — 정의되지 않은 값은 `400 RECORD_INVALID_TIME_SLOT`.
- **오늘은 미래가 아니다.** 경계를 `isAfter(today)`로 두어 당일 조회가 막히지 않는다.

서비스 단위 테스트 6개(전체 반환 1 · 슬롯 필터 1 · 빈 배열 2 · 미래 날짜 1 · 오늘 경계 1).
`ReportServiceTest`는 8개 → 14개가 됐다.

**로컬 MySQL 실서버 검증** (2026-08-11). REPORT-01 검증에 쓴 시드(`f-analysis-01-mockup.sql` +
`report-01-slots.sql`, 사용자 9001)가 네 가지 슬롯 조합을 그대로 만들어 줘 추가 시드 없이 확인했다.
8080 포트가 사용 중이어서 `--server.port=8081`로 띄웠다.

| 시나리오 | 기대 | 결과 |
| --- | --- | --- |
| 오늘 · `timeSlot` 미지정 (모닝 + 나이트) | 2건 · 모닝 먼저 | `["MORNING","NIGHT"]` · 접히지 않음 |
| 1일 전 (모닝만) | 1건 | `["MORNING"]` |
| 2일 전 (나이트만) | 1건 | `["NIGHT"]` |
| 3일 전 (기록 없음) | 빈 배열 200 | `records: []` |
| `timeSlot=NIGHT` · `MORNING` | 해당 슬롯만 | 각각 1건 |
| 지정 슬롯에 기록 없음 | 빈 배열 200 | `records: []` — 404 아님 |
| 소문자 `night` | 정상 처리 | `["NIGHT"]` |
| 미래 날짜 | 422 | `RECORD_FUTURE_DATE_NOT_ALLOWED` |
| `timeSlot=EVENING` | 400 | `RECORD_INVALID_TIME_SLOT` |
| `date` 누락 · 형식 오류(`2026-13-99`) | 400 | `COMMON_BAD_REQUEST` |
| `X-User-Id` 누락 | 401 | `COMMON_UNAUTHORIZED` |
| 타 사용자(9999)로 조회 | 남의 기록 안 보임 | `records: []` |
| `capturedAt` 오프셋 | `+09:00` | `2026-08-11T08:00:00+09:00` |

**아직 하지 않은 것** — 프론트 연동이 없다. 기능 ID는 F-REPORT-04로 신설했지만 **이 엔드포인트를 쓰는
화면은 여전히 미정**이다(12장 Screen ↔ API 매핑에 항목이 없다. 캘린더 상세는 `GET /records/calendar` ·
`GET /records/today`로 잡혀 있어 역할이 겹칠 수 있다). 소비처가 확정되면 필드가 조정될 수 있다.

---

### 2.12 REPORT-02 구현 · 검증 내역

`GET /api/v1/reports/insights/{insightId}` — 로컬 MySQL로 동작 확인 (2026-08-11).
결정 근거는 [ADR 0013](decisions/0013-요인-상세-응답-구성.md).

**명세와 달라진 점 세 가지.** 모두 ADR 0013에 근거를 적었다.

1. **`graph`가 flat `score`가 아니라 모닝·나이트 분리다.** REPORT-01·03과 같은
   `ReportGraphPointResponse`를 재사용한다. 두 화면이 같은 `TrendGraph` 컴포넌트를 쓰는데 응답
   형태가 갈리면 컴포넌트가 두 형태를 알아야 한다. 명세의 REPORT-02 응답 예시를 대체했다.
2. **이벤트 유형이 3종이 아니라 2종이다.** 성분 첫 사용 · 자외선 급증만 만든다. "성분 재시작"은
   제품 기록이 없는 날을 사용 중단으로 판정해야 하는데, PRODUCT-05가 없어 제품 기록이 시드로만
   존재하는 현재 상태에서는 거의 모든 성분이 매번 재시작으로 잡힌다.
3. **자외선 임계값이 명세 예시(9 이상 3일)가 아니라 8 이상 2일이다.** 8은 기상청 UV "매우 높음"
   등급 경계라 근거가 있고, `daily_environments`가 앱을 연 날만 채워져 3일 연속이 실제로 거의
   잡히지 않는다.

**이벤트는 저장하지 않는다.** `AnalysisEvidence` 테이블을 신설하지 않고 `product_records` ·
`daily_environments`에서 조회 시점에 도출한다. 조회는 7번으로 고정된다(인사이트 1 · 피부기록 1 ·
지표 1 · 제품기록 3 · 환경 1). N+1 없음.

**스키마 변경 1건** — `analysis_insights`에 `lag_days`(INT, NULL) · `average_delta`(DECIMAL(6,2), NULL)를
추가했다. 명세의 `impact` 문구("이후 2일 뒤 트러블 수치 +18")를 재현하려면 시차와 변화량이 필요한데,
F-ANALYSIS-01이 `LagPattern`에서 이미 계산해 놓고 `description` 문장으로 접은 뒤 버리고 있었다.
**새 계산이 아니라 버려지던 값의 보존이라 분석 로직은 그대로다.** 마이그레이션 도구가 없어
`ddl-auto: update`로 반영된다.

**성분 매칭은 이름 비교다.** `analysis_insights`에 성분 FK가 없고 `title`에 성분명만 들어 있다.
`LagInsightWriter`가 넣는 그 값과 조회에서 읽는 값의 출처가 모두 `ingredients.korean_name`이라
문자열 동일성이 곧 성분 동일성이다. `IngredientRepository`에 조회를 추가하지 않았다.

**소유권** — 다른 사용자의 인사이트도 403이 아니라 404(`REPORT_INSIGHT_NOT_FOUND`)다. 존재 여부를
알리지 않는다.

**⚠️ `insightId`는 영속 식별자가 아니다.** `LagInsightWriter`가 피부 기록 저장마다 성분 인사이트를
전부 지우고 다시 넣으므로, 이전에 받은 id로 조회하면 404가 나는 것이 정상 동작이다. 안정적인
식별자가 필요해지면 별도 ADR로 다룬다.

서비스 단위 테스트 16개 추가(404 2 · 그래프 1 · metric 2 · subtitle/title 1 · 첫 사용 이벤트 1 ·
문구 4 · 자외선 4 · 환경 인사이트 1). `ReportServiceTest` 전체 30개, 백엔드 전체 131개 통과.

**실서버 검증** (`f-analysis-01-mockup.sql` 적재 → SKIN-01 저장으로 분석 트리거 → `GET /reports`에서
`insightId` 확인 → 상세 호출). 자외선 이벤트는 `daily_environments`에 시드가 없어 임시 INSERT를 썼다
(`backend/README.md`에 절차 기록).

| 케이스 | 기대 | 결과 |
| --- | --- | --- |
| 레티놀(확정) 상세 | `레티놀 추이` · `최근 30일 · 이벤트와 상관관계` | 일치 |
| `graph` | 30개 · 결측 `null` | 30개 · 나이트 20일 · 모닝 1일(방금 남긴 기록) |
| 첫 사용 이벤트 | 시드 최초 사용일 1건 | `레티놀 이 기간 첫 사용` (18일 전) |
| 확정 `impact` | 시차·변화량 포함 | `이후 2일 뒤 트러블 수치 +15` |
| 판테놀(미확정) | `OBSERVING` · 비단정 문구 | `이후 트러블 변화를 확인 중이에요` |
| 히알루론산 | 레티놀과 같은 첫 사용일 | 일치 — 성분 단위 매칭 확인 |
| 자외선 3일 연속 | 구간 시작일에 1건 | `자외선 지수 8 이상 3일 연속` |
| 자외선 단발(1일) | 이벤트 없음 | 제외됨 |
| 이벤트 정렬 | 날짜 오름차순 | 첫 사용(7/24) → 자외선(8/4) |
| 성분 인사이트의 자외선 이벤트 | 항상 `OBSERVING` | `OBSERVING` (첫 사용은 `OBSERVED`) |
| 없는 `insightId` | 404 | `REPORT_INSIGHT_NOT_FOUND` |
| 타 사용자(9999) 조회 | 404 (403 아님) | `REPORT_INSIGHT_NOT_FOUND` |
| `X-User-Id` 누락 | 401 | `COMMON_UNAUTHORIZED` |

`lag_days`·`average_delta`도 실제로 채워지는 것을 표에서 확인했다(레티놀 `2` · `15.00`, 판테놀
`1` · `5.00`). 시드가 의도한 패턴(레티놀 2일 뒤 +15)과 일치한다.

**아직 하지 않은 것** — 프론트 연동. `EXPO_PUBLIC_USE_MOCK=true`라 S-20은 아직 목업을 본다.

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
| `GraphPoint` 모닝·나이트 정렬 | ✅ | ADR 0012의 미이행 후속을 REPORT-02 작업에서 처리(2026-08-11). `types/report.ts` · `TrendGraph` · 목업 · 카탈로그. **`TrendGraph`는 당분간 `nightScore ?? morningScore`로 한 계열만 그린다** — 두 계열 동시 렌더는 별도 작업 |
| 백엔드 실연동 | ⬜ | `EXPO_PUBLIC_USE_MOCK=true` — **현재 전부 목업** |

---

## 4. 문서

| 문서 | 상태 | 비고 |
| --- | --- | --- |
| `docs/PRD.md` | ✅ | |
| `docs/기능명세서.md` | ✅ | TBD 항목 13장에 정리됨 |
| `docs/api_명세서.md` | ✅ | **TBD-10b 해소**(ADR 0001) · **TBD-12 해소**(ADR 0012) · **TBD-11 해소**(ADR 0013) |
| `docs/ERD.md` | ✅ | ADR 0002 반영 완료 (7장 `metric_type` 4종) · AnalysisInsight에 `lag_days`·`average_delta` 추가(ADR 0013) |
| `docs/공통응답포맷_예외처리코드.md` | ✅ | 8.1 날짜 귀속 규칙 확정됨 |
| `docs/목업 데이터 구조 정의서.md` | ✅ | |
| `docs/decisions/` | 🟡 | ADR 0001~0013 작성. **0009~0011은 `제안` 상태** (0012는 프론트 합의로 `수락`, 0013은 `수락`) |
| `docs/STATUS.md` | ✅ | 이 문서 |
| `README.md` | ✅ | ADR 0002 반영 완료 (지표 소개 문구) |
| `backend/README.md` | ✅ | 임시 인증 · 스토리지 · 분석 provider 설정 반영 |

---

## 5. 미해결 · 블로커

우선순위 순.

| # | 항목 | 영향 | 담당 |
| --- | --- | --- | --- |
| 1 | **인증 인프라 부재** | 임시 방편(ADR 0006)으로 우회 중. **배포 불가 상태** | A(지우) |
| 2 | ~~ADR 0005 `제안` 상태~~ | A 합의 완료로 **확정**. `RecordDateResolver` 머지 가능 | — |
| 3 | ~~이미지 스토리지 미결정~~ | ADR 0007로 해소 (로컬 저장 · 배포 시 외부 스토리지 전환) | — |
| 4 | ~~리포트 일자별 대표값 규칙 (TBD-12)~~ | ADR 0012로 해소 — 대표값을 쓰지 않고 모닝·나이트를 각각 반환 | — |
| 5 | ~~리포트 요인 상세의 `metric` 전환 지원 여부 (TBD-11)~~ | ADR 0013으로 해소 — 지원하지 않고 인사이트의 지표를 그대로 반환 | — |
| 6 | `MORNING` 슬롯 시각 불일치 요청 처리 | SKIN-01 · PRODUCT-05 | ADR 0005 미해결 항목 · **현재는 수용** |
| 7 | 제품 직접 등록 (F-PRODUCT-08) | 우선순위 L | 명세 미정 |
| 7b | ~~REPORT-03에 대응하는 기능 ID가 없다~~ | **F-REPORT-04 신설로 해소.** 다만 이 기능을 쓰는 **화면은 여전히 미정**이라 12장 매핑표에 항목이 없다 | 화면 확정 시 B |
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
