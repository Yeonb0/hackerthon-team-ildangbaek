# ERD

## 1. 전체 데이터 구조

```
User
├── UserProfile
├── UserSkinType ── SkinType
├── UserProduct ── Product ── ProductIngredient ── Ingredient
├── Routine ── RoutineProduct ── UserProduct
├── ProductRecord ── ProductRecordItem ── Product
├── SkinRecord ── SkinMetric
├── DailyEnvironment
├── IngredientProfile ── Ingredient
├── AnalysisInsight
├── ProductRiskAssessment ── ProductRiskIngredient ── Ingredient
└── NotificationSetting
```

---

# 2. 엔티티 목록

| 영역 | 엔티티 | 역할 |
| --- | --- | --- |
| 사용자 | `User` | 로그인 계정 및 인증 상태 |
| 사용자 | `UserProfile` | 이름, 나이, 성별, 수면·호르몬 정보 |
| 사용자 | `SkinType` | 피부 타입 공통 데이터 |
| 사용자 | `UserSkinType` | 사용자가 선택한 복수 피부 타입 |
| 사용자 | `NotificationSetting` | 아침·밤 기록 알림 설정 |
| 제품 | `Product` | 화장품 기본 정보 |
| 제품 | `Ingredient` | 화장품 성분 정보 |
| 제품 | `ProductIngredient` | 제품과 성분의 연결 |
| 제품 | `UserProduct` | 사용자가 저장한 제품 |
| 루틴 | `Routine` | 모닝·나이트 루틴 |
| 루틴 | `RoutineProduct` | 루틴에 포함된 제품과 순서 |
| 기록 | `ProductRecord` | 날짜·시간대별 제품 기록 |
| 기록 | `ProductRecordItem` | 제품 기록에 포함된 개별 제품 |
| 기록 | `SkinRecord` | 날짜·시간대별 피부 사진 및 분석 |
| 기록 | `SkinMetric` | 트러블·홍조·모공·색소 분석값 |
| 환경 | `DailyEnvironment` | 날짜별 날씨·자외선·습도 |
| 분석 | `IngredientProfile` | 사용자별 성분 반응 프로파일 |
| 분석 | `AnalysisInsight` | 피부 리포트의 분석 문구 |
| 구매 전 확인 | `ProductRiskAssessment` | 제품 전체 위험도 결과 |
| 구매 전 확인 | `ProductRiskIngredient` | 성분별 위험도 근거 |

---

# 3. 사용자 영역

## User

| 컬럼 | 타입 | 조건 | 설명 |
| --- | --- | --- | --- |
| id | BIGINT | PK | 사용자 ID |
| provider | VARCHAR(20) | NOT NULL | KAKAO, GOOGLE, EMAIL |
| provider_user_id | VARCHAR(255) | NULL | 외부 인증 사용자 ID |
| email | VARCHAR(255) | NULL, UNIQUE | 이메일 |
| onboarding_completed | BOOLEAN | NOT NULL | 온보딩 완료 여부 |
| account_status | VARCHAR(20) | NOT NULL | ACTIVE, WITHDRAWN |
| created_at | DATETIME | NOT NULL | 가입 시각 |
| updated_at | DATETIME | NOT NULL | 수정 시각 |
- 소셜 로그인만 구현하면 이메일 관련 필드는 선택적으로 사용
- `provider + provider_user_id` 조합은 중복 불가

## UserProfile

| 컬럼 | 타입 | 조건 | 설명 |
| --- | --- | --- | --- |
| id | BIGINT | PK | 프로필 ID |
| user_id | BIGINT | FK, UNIQUE | 사용자 ID |
| nickname | VARCHAR(30) | NOT NULL | 이름 |
| birth_year | SMALLINT | NULL | 출생연도 |
| gender | VARCHAR(20) | NULL | FEMALE, MALE, NOT_SELECTED |
| sleep_time | TIME | NULL | 취침 시간 |
| wake_time | TIME | NULL | 기상 시간 |
| menstrual_status | VARCHAR(30) | NULL | 월경 중, 폐경, 해당 없음 |
| last_menstrual_start_date | DATE | NULL | 최근 생리 시작일 |
| menstrual_cycle_days | SMALLINT | NULL | 평균 주기 |
| oral_contraceptive | BOOLEAN | NOT NULL | 경구 피임약 |
| progesterone_injection | BOOLEAN | NOT NULL | 황체호르몬 주사 |
| hormone_replacement_therapy | BOOLEAN | NOT NULL | 호르몬 대체요법 |
| region_name | VARCHAR(100) | NULL | 설정 지역 |
| created_at | DATETIME | NOT NULL | 생성 시각 |
| updated_at | DATETIME | NOT NULL | 수정 시각 |
- 호르몬 정보는 선택 입력
- 실제 분석에 반영하지 않더라도 온보딩 입력값 저장 필요

## SkinType

| 컬럼 | 타입 | 조건 | 설명 |
| --- | --- | --- | --- |
| id | BIGINT | PK | 피부 타입 ID |
| code | VARCHAR(30) | UNIQUE | OILY, DRY, SENSITIVE, UNKNOWN |
| name | VARCHAR(30) | NOT NULL | 표시 이름 |
| description | VARCHAR(300) | NULL | 타입 설명 |

## UserSkinType

| 컬럼 | 타입 | 조건 | 설명 |
| --- | --- | --- | --- |
| id | BIGINT | PK | 연결 ID |
| user_id | BIGINT | FK | 사용자 ID |
| skin_type_id | BIGINT | FK | 피부 타입 ID |

```
UNIQUE(user_id, skin_type_id)
```

- 지성·건성·민감성은 복수 선택 가능
- `UNKNOWN` 선택 시 다른 피부 타입과 동시 저장 불가

## NotificationSetting

| 컬럼 | 타입 | 조건 | 설명 |
| --- | --- | --- | --- |
| id | BIGINT | PK | 알림 설정 ID |
| user_id | BIGINT | FK, UNIQUE | 사용자 ID |
| morning_enabled | BOOLEAN | NOT NULL | 아침 기록 알림 |
| night_enabled | BOOLEAN | NOT NULL | 밤 기록 알림 |
| morning_time | TIME | NULL | 아침 알림 시간 |
| night_time | TIME | NULL | 밤 알림 시간 |
| push_token | VARCHAR(500) | NULL | 푸시 토큰 |

---

# 4. 제품·성분 영역

## Product

| 컬럼 | 타입 | 조건 | 설명 |
| --- | --- | --- | --- |
| id | BIGINT | PK | 제품 ID |
| brand_name | VARCHAR(100) | NULL | 브랜드명 |
| product_name | VARCHAR(200) | NOT NULL | 제품명 |
| category | VARCHAR(50) | NOT NULL | TONER, ESSENCE, SERUM, AMPOULE, GEL, LOTION, CREAM, BALM, OIL, SUNCREAM, CLEANSING, MASK |
| barcode | VARCHAR(100) | NULL, UNIQUE | 제품 스캔 식별용 바코드 |
| image_url | VARCHAR(500) | NULL | 제품 이미지 URL |
| data_source | VARCHAR(30) | NOT NULL | SAMPLE, API, USER |
| active | BOOLEAN | NOT NULL | 사용 가능 여부 |
| created_at | DATETIME | NOT NULL | 생성 시각 |
| updated_at | DATETIME | NOT NULL | 수정 시각 |

- `category`는 프론트 필터와 API 응답 일관성을 위해 위 12개 영문 코드 중 하나만 사용한다.
- `image_url`이 없는 제품은 API 응답에서 `imageUrl: null`로 반환한다.
- 데모 시연용 제품 3~5개는 `data_source = SAMPLE`로 사전 등록한다.
- 스캔 API는 우선 `barcode` 기준으로 제품을 조회한다.

## Ingredient

| 컬럼 | 타입 | 조건 | 설명 |
| --- | --- | --- | --- |
| id | BIGINT | PK | 성분 ID |
| korean_name | VARCHAR(150) | NOT NULL | 한글 성분명 |
| english_name | VARCHAR(150) | NULL | 영문 성분명 |
| inci_name | VARCHAR(200) | NULL | 국제 성분명 |
| function_category | VARCHAR(100) | NULL | 보습, 진정 등 |
| description | TEXT | NULL | 일반 설명 |

## ProductIngredient

| 컬럼 | 타입 | 조건 | 설명 |
| --- | --- | --- | --- |
| id | BIGINT | PK | 연결 ID |
| product_id | BIGINT | FK | 제품 ID |
| ingredient_id | BIGINT | FK | 성분 ID |
| display_order | INT | NULL | 성분 표시 순서 |
| concentration_text | VARCHAR(50) | NULL | 함량 표기 |
| key_ingredient | BOOLEAN | NOT NULL | 주요 성분 여부 |

```
UNIQUE(product_id, ingredient_id)
```

## UserProduct

| 컬럼 | 타입 | 조건 | 설명 |
| --- | --- | --- | --- |
| id | BIGINT | PK | 사용자 제품 ID |
| user_id | BIGINT | FK | 사용자 ID |
| product_id | BIGINT | FK | 제품 ID |
| usage_status | VARCHAR(20) | NOT NULL | USING, STOPPED |
| first_saved_at | DATETIME | NOT NULL | 최초 저장 시각 |
| last_used_at | DATETIME | NULL | 최근 사용 시각 |

```
UNIQUE(user_id, product_id)
```

---

# 5. 루틴 영역

## Routine

| 컬럼 | 타입 | 조건 | 설명 |
| --- | --- | --- | --- |
| id | BIGINT | PK | 루틴 ID |
| user_id | BIGINT | FK | 사용자 ID |
| routine_name | VARCHAR(50) | NOT NULL | 모닝 루틴 등 |
| time_period | VARCHAR(20) | NOT NULL | MORNING, NIGHT |
| active | BOOLEAN | NOT NULL | 활성 여부 |

```
UNIQUE(user_id, time_period)
```

- MVP에서는 사용자당 모닝 루틴 1개, 나이트 루틴 1개로 제한
- MVP 데모 범위에서는 루틴 생성·수정·삭제 API를 제공하지 않고, 조회 및 바로 기록만 지원한다.
- 사용자당 모닝 루틴 1개, 나이트 루틴 1개를 샘플 또는 기본 루틴으로 제공한다.

## RoutineProduct

| 컬럼 | 타입 | 조건 | 설명 |
| --- | --- | --- | --- |
| id | BIGINT | PK | 연결 ID |
| routine_id | BIGINT | FK | 루틴 ID |
| user_product_id | BIGINT | FK | 저장 제품 ID |
| sequence_order | INT | NOT NULL | 사용 순서 |

```
UNIQUE(routine_id, user_product_id)
UNIQUE(routine_id, sequence_order)
```

---

# 6. 아침·밤 제품 기록

## ProductRecord

| 컬럼 | 타입 | 조건 | 설명 |
| --- | --- | --- | --- |
| id | BIGINT | PK | 제품 기록 ID |
| user_id | BIGINT | FK | 사용자 ID |
| record_date | DATE | NOT NULL | 기록 날짜 |
| time_period | VARCHAR(20) | NOT NULL | MORNING, NIGHT |
| source_type | VARCHAR(20) | NOT NULL | INDIVIDUAL, ROUTINE |
| recorded_at | DATETIME | NOT NULL | 기록 완료 시각 |
| created_at | DATETIME | NOT NULL | 생성 시각 |
| updated_at | DATETIME | NOT NULL | 수정 시각 |

```
UNIQUE(user_id, record_date, time_period)
```

- 하루에 아침 제품 기록 1개, 밤 제품 기록 1개 생성
- 기록 하나에 여러 제품 포함 가능

## ProductRecordItem

| 컬럼 | 타입 | 조건 | 설명 |
| --- | --- | --- | --- |
| id | BIGINT | PK | 상세 기록 ID |
| product_record_id | BIGINT | FK | 제품 기록 ID |
| product_id | BIGINT | FK | 사용 제품 |
| usage_order | INT | NULL | 사용 순서 |
| used_at | DATETIME | NULL | 실제 사용 시각 |

```
UNIQUE(product_record_id, product_id)
```

---

# 7. 아침·밤 피부 기록

## SkinRecord

| 컬럼 | 타입 | 조건 | 설명 |
| --- | --- | --- | --- |
| id | BIGINT | PK | 피부 기록 ID |
| user_id | BIGINT | FK | 사용자 ID |
| record_date | DATE | NOT NULL | 기록 날짜 |
| time_period | VARCHAR(20) | NOT NULL | MORNING, NIGHT |
| image_url | VARCHAR(500) | NULL | 얼굴 이미지 |
| overall_score | DECIMAL(5,2) | NULL | 종합 피부 점수 |
| analysis_status | VARCHAR(20) | NOT NULL | PROCESSING, COMPLETED, FAILED |
| analysis_method | VARCHAR(20) | NOT NULL | AI, API, MOCK |
| captured_at | DATETIME | NOT NULL | 촬영 시각 |
| analyzed_at | DATETIME | NULL | 분석 완료 시각 |

```
UNIQUE(user_id, record_date, time_period)
```

- 하루에 아침 피부 기록 1개, 밤 피부 기록 1개 생성
- 밤 피부 분석 완료 후 당일 리포트 및 개인 프로파일 갱신 가능

## SkinMetric

| 컬럼 | 타입 | 조건 | 설명 |
| --- | --- | --- | --- |
| id | BIGINT | PK | 피부 지표 ID |
| skin_record_id | BIGINT | FK | 피부 기록 ID |
| metric_type | VARCHAR(30) | NOT NULL | TROUBLE, REDNESS, PORES, PIGMENTATION |
| metric_value | DECIMAL(8,2) | NOT NULL | 0~100 정규화 점수 |
| comparison_difference | DECIMAL(8,2) | NULL | 비교 대상과의 차이 |
| trend_status | VARCHAR(20) | NULL | IMPROVED, MAINTAINED, WORSENED |
| raw_value | DOUBLE | NULL | AI/CV가 실제 측정한 원시값(정규화 이전). 분석 서버가 값을 안 주면(목업 등) NULL. 기존 score만 있는 과거 기록도 역산하지 않고 NULL로 둔다 (ADR 0026) |
| confidence | VARCHAR(20) | NULL | 분석 결과 신뢰도. 실제 근거가 있는 지표만 채운다 — 현재는 PORES(`LOW`/`NORMAL`, 카메라 노이즈 대역 판정)만 해당. 근거 없는 지표는 NULL (ADR 0026) |
| algorithm_version | VARCHAR(30) | NULL | raw_value를 산출한 분석 알고리즘 버전. 근거 없으면 NULL (ADR 0026) |
| normalization_version | VARCHAR(30) | NULL | raw_value → metric_value 변환에 쓰인 정규화 기준 버전. 근거 없으면 NULL (ADR 0026) |

```
UNIQUE(skin_record_id, metric_type)
```

- 아침은 이전 아침 기록과 비교
- 밤은 당일 아침 기록과 비교하는 방향 권장
- 비교 기준은 디자인 문구와 함께 최종 확정 필요

---

# 8. 환경 및 추천 데이터

## DailyEnvironment

| 컬럼 | 타입 | 조건 | 설명 |
| --- | --- | --- | --- |
| id | BIGINT | PK | 환경 데이터 ID |
| user_id | BIGINT | FK | 사용자 ID |
| record_date | DATE | NOT NULL | 날짜 |
| region_name | VARCHAR(100) | NOT NULL | 조회 지역 |
| weather_condition | VARCHAR(50) | NULL | SUNNY, CLOUDY, OVERCAST, RAIN, SNOW, YELLOW_DUST, THUNDERSTORM |
| temperature | DECIMAL(5,2) | NULL | 기온 |
| humidity | DECIMAL(5,2) | NULL | 습도 |
| uv_index_current | DECIMAL(5,2) | NULL | 현재 자외선 |
| uv_index_max | DECIMAL(5,2) | NULL | 당일 최고 자외선 |
| data_source | VARCHAR(30) | NOT NULL | API, MOCK |
| fetched_at | DATETIME | NOT NULL | 조회 시각 |

```
UNIQUE(user_id, record_date)
```

- 아침 추천: 현재·예상 환경 기준
- 밤 추천: 당일 누적 환경 및 최고 자외선 기준
- 추천 결과를 저장하지 않는다면 API 조회 시 계산 가능
- 날씨 코드는 홈 API의 `environment.weather`와 동일한 7개 영문 코드를 사용한다.

---

# 9. 개인 성분 프로파일

## IngredientProfile

| 컬럼 | 타입 | 조건 | 설명 |
| --- | --- | --- | --- |
| id | BIGINT | PK | 프로파일 ID |
| user_id | BIGINT | FK | 사용자 ID |
| ingredient_id | BIGINT | FK | 성분 ID |
| reaction_type | VARCHAR(30) | NOT NULL | SUITABLE, CAUTION, INSUFFICIENT |
| profile_score | DECIMAL(8,4) | NULL | 분석 점수 |
| confidence_score | DECIMAL(5,2) | NULL | 신뢰도 |
| observation_count | INT | NOT NULL | 성분 노출 일수 |
| positive_count | INT | NOT NULL | 긍정 반응 횟수 |
| negative_count | INT | NOT NULL | 부정 반응 횟수 |
| representative_lag_days | INT | NULL | 대표 반응 지연일 |
| reason_summary | VARCHAR(500) | NULL | 사용자 표시용 근거 |
| last_analyzed_at | DATETIME | NULL | 마지막 갱신 시각 |

```
UNIQUE(user_id, ingredient_id)
```

- 밤 피부 기록 완료 후 신규 데이터를 기반으로 갱신
- 데이터가 부족하면 맞음이나 주의로 임의 분류하지 않음
- `reaction_type`은 F-ANALYSIS-01이 **확정한** 패턴에서만 나온다. 확정된 악화 패턴이 있으면 `CAUTION`,
  개선뿐이면 `SUITABLE`, 없으면 `INSUFFICIENT`다. 민감성 사용자는 악화 방향 변화량 기준만 완화된다. (ADR 0010)
- `observation_count`는 분석 기간 내 **해당 성분의 노출 일수**다. 같은 날 모닝·나이트에 모두 썼으면 1일로 센다.
  USER-02의 `recordCount`가 이 값이다.
- `positive_count` · `negative_count`는 확정된 개선 · 악화 **패턴 수**다(관측 쌍 수가 아니다).
  같은 지표에서 시차만 다른 패턴은 **1건으로 센다** — 현상 하나가 근거 여러 건으로 부풀지 않게 한다.
- `profile_score`는 대표 패턴의 평균 변화량, `confidence_score`는 대표 패턴의 동일 방향 비율(0~100)이다.
  `INSUFFICIENT` 행은 두 값과 `reason_summary`가 모두 `NULL`이다 — 판단하지 않은 성분에 근거를 만들지 않는다.
- 행은 **삭제하지 않고 갱신한다.** `UNIQUE(user_id, ingredient_id)` 기준으로 덮어쓰므로 id가 유지된다.
  회차마다 삭제·재삽입하는 `AnalysisInsight`와 다르다. (ADR 0010)

---

# 10. 피부 리포트

## AnalysisInsight

| 컬럼 | 타입 | 조건 | 설명 |
| --- | --- | --- | --- |
| id | BIGINT | PK | 인사이트 ID |
| user_id | BIGINT | FK | 사용자 ID |
| insight_type | VARCHAR(30) | NOT NULL | INGREDIENT, ENVIRONMENT |
| metric_type | VARCHAR(30) | NULL | TROUBLE, REDNESS, PORES, PIGMENTATION |
| title | VARCHAR(200) | NOT NULL | 제목 |
| description | TEXT | NOT NULL | 분석 설명 |
| recommendation | TEXT | NULL | 관리 제안 |
| start_date | DATE | NULL | 분석 기간 시작 |
| end_date | DATE | NULL | 분석 기간 종료 |
| confidence_score | DECIMAL(5,2) | NULL | 신뢰도 (0~100) |
| lag_days | INT | NULL | 사용 후 며칠 뒤의 변화인지 (1~7). 성분 인사이트만 |
| average_delta | DECIMAL(6,2) | NULL | 관측된 지표 변화량의 평균. 양수면 증상 악화 |
| generated_at | DATETIME | NOT NULL | 생성 시각 |
- 밤 피부 분석 완료 후 당일 리포트를 제공
- 7일·30일 리포트는 누적 `SkinRecord`, `SkinMetric`을 조회해 구성
- ~~상세 이벤트까지 저장할 필요가 있으면 `AnalysisEvidence` 테이블 추가~~
  → **신설하지 않는다 (ADR 0013).** REPORT-02의 이벤트는 `product_records`·`daily_environments`에서
  조회 시점에 도출한다. 저장하면 원본과 어긋날 수 있는 사본이 하나 더 생긴다.
- `lag_days`·`average_delta`는 F-ANALYSIS-01이 이미 계산하던 값이다(`LagPattern`). 문구로 접고
  버리는 대신 남겨 REPORT-02가 이벤트 문구에 쓴다. (ADR 0013)
- `confidence_score`는 F-ANALYSIS-01의 **동일 방향 변화 비율(0~100)**이다. REPORT-01은 67 이상을
  `OBSERVED`, 미만을 `OBSERVING`으로 내려보낸다. (ADR 0009)
- `insight_type = INGREDIENT` 행은 **새 피부 기록마다 재계산되어 이전 회차를 대체**한다.
  `ENVIRONMENT` 행은 F-ANALYSIS-02가 따로 관리하므로 이 삭제 범위에 들어가지 않는다.

---

# 11. 구매 전 위험도

## ProductRiskAssessment

| 컬럼 | 타입 | 조건 | 설명 |
| --- | --- | --- | --- |
| id | BIGINT | PK | 평가 ID |
| user_id | BIGINT | FK | 사용자 ID |
| product_id | BIGINT | FK | 평가 제품 |
| risk_level | VARCHAR(20) | NOT NULL | LOW, MEDIUM, HIGH, INSUFFICIENT — **`INSUFFICIENT`는 정의만 되어 있고 저장되지 않는다.** 판정된 성분이 0건이면 등급을 매기지 않고 409(`CHECK_PROFILE_NOT_READY`)를 반환하며 행 자체를 만들지 않는다 (ADR 0015) |
| risk_score | DECIMAL(5,2) | NULL | CAUTION 비중의 백분율(판정된 성분 대비, 0~100). ADR 0015 |
| caution_count | INT | NOT NULL | 주의 성분 수 |
| suitable_count | INT | NOT NULL | 맞음 성분 수 |
| insufficient_count | INT | NOT NULL | 데이터 부족 성분 수 |
| summary | VARCHAR(500) | NULL | **현재 미사용 — 항상 NULL.** 등급 문구는 `risk_level`에서 매번 파생하며(ADR 0015), 렌더 문구를 DB에 고정하지 않는다 |
| assessed_at | DATETIME | NOT NULL | 평가 시각 |

CHECK-02 재분석은 기존 행을 갱신하지 않고 새로 추가한다(append-only) — `(user_id, product_id)`
유니크 제약이 없다. ADR 0015 결정 7.

## ProductRiskIngredient

| 컬럼 | 타입 | 조건 | 설명 |
| --- | --- | --- | --- |
| id | BIGINT | PK | 성분 평가 ID |
| assessment_id | BIGINT | FK | 평가 ID |
| ingredient_id | BIGINT | FK | 성분 ID |
| reaction_type | VARCHAR(30) | NOT NULL | 맞음, 주의, 데이터 부족 |
| reason | VARCHAR(500) | NULL | 개인화 판단 근거. `INSUFFICIENT`이거나 확정 근거 문구가 없으면 NULL(지어내지 않는다) |
| contribution_score | DECIMAL(8,4) | NULL | **현재 미사용 — 항상 NULL.** 위험도 산식이 개수·비중 규칙이라 성분별 가중치가 없다(ADR 0015). 가중 산식으로 바뀌면 쓰인다 |

```
UNIQUE(assessment_id, ingredient_id)
```

---

# 12. 핵심 관계 요약

| 부모 | 관계 | 자식 |
| --- | --- | --- |
| User | 1:1 | UserProfile |
| User | 1:N | UserSkinType |
| SkinType | 1:N | UserSkinType |
| User | 1:N | UserProduct |
| Product | 1:N | UserProduct |
| Product | 1:N | ProductIngredient |
| Ingredient | 1:N | ProductIngredient |
| User | 1:N | Routine |
| Routine | 1:N | RoutineProduct |
| UserProduct | 1:N | RoutineProduct |
| User | 1:N | ProductRecord |
| ProductRecord | 1:N | ProductRecordItem |
| Product | 1:N | ProductRecordItem |
| User | 1:N | SkinRecord |
| SkinRecord | 1:N | SkinMetric |
| User | 1:N | DailyEnvironment |
| User | 1:N | IngredientProfile |
| Ingredient | 1:N | IngredientProfile |
| User | 1:N | AnalysisInsight |
| User | 1:N | ProductRiskAssessment |
| ProductRiskAssessment | 1:N | ProductRiskIngredient |
