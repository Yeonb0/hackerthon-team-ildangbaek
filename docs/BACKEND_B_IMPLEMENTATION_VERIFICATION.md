# Backend B 구현 검증 보고서

> 이 문서는 2026-08-13 세션에서 **실제로 실행한 명령·호출한 API·조회한 DB 값**만을 근거로 작성했다.
> "코드가 있다"와 "동작을 확인했다"를 구분해서 표기한다. STATUS.md(2.1~2.15절)에 이미 상세한 검증
> 기록이 있으나, 이 문서는 그 기록을 그대로 베끼지 않고 **이번 세션에서 재실행해 재현된 것만** ✅로
> 표기했다. STATUS.md에만 있고 이번에 재현하지 않은 항목은 "STATUS.md 근거"로 별도 표시했다.
>
> **2026-08-14 추가 세션**: 이 문서가 "이번 세션 미실행"으로 남겨둔 항목(B-01 SKIN-01 이미지
> 업로드, B-09 PRODUCT-05, B-14/15 REPORT-02/03)을 실제로 재현했고, P1(시드 `user_profiles`
> 부재)·P2(CHECK-03 쿼리 수 불일치)를 코드로 확인·수정했다. 아래 각 절과 §13에 갱신 표시로 반영했다.

- 검증 일시: 2026-08-13, 2026-08-14(P1·P2 해소 및 잔여 항목 재현)
- 검증 브랜치/커밋: `yunjin` @ `d0f5429` → `7b2c730`(2026-08-14)
- 검증 환경: macOS(Darwin 25.2.0), Java 21 (Corretto 21.0.11), Gradle(Wrapper), MySQL 8.0(Docker)
- 검증자: 윤진(Backend B) + Claude Code(보조)

---

## 1. 분석 대상

```

├── backend/     Spring Boot 4.1 / Java 21 — controller / service / repository / dto / entity
└── frontend/    Expo (TypeScript)
```

이번 문서는 **backend만** 다룬다. `docs/STATUS.md`가 이미 A(인증/온보딩)와 B(분석 흐름) 담당을
코드 대조로 구분해 놓았고, 이 구분을 그대로 신뢰의 출발점으로 삼되 이번 세션에서 실제 호출로
재검증했다.

---

## 2. 프로젝트 구조 (실측)

```
backend/src/main/java/com/ildangbaek/backend/
├── api/            # 도메인별 controller / dto / service (얇은 계층)
│   ├── auth/        A 담당
│   ├── onboard/      A 담당
│   ├── skin/         B 담당 — SKIN-01~03
│   ├── report/        B 담당 — REPORT-01~03
│   ├── product/       B 담당(대행) — PRODUCT-05
│   ├── check/          B 담당 — CHECK-01~03
│   ├── user/            B 담당(일부) — USER-01, USER-02
│   └── common/            HealthController
├── domain/         # entity / repository / 분석 로직(analysis, check 등)
│   ├── analysis/lag/      F-ANALYSIS-01·04 (LagCorrelationAnalyzer 등)
│   ├── analysis/profile/  F-ANALYSIS-05 (ProfileCompletionCalculator)
│   └── check/             RiskLevelCalculator (ADR 0015)
└── global/         # response envelope, exception, auth(MockAccessToken), config
```

- `backend/build.gradle` — Spring Boot 4.1.0, Java 21
- `backend/docker-compose.yml` — MySQL 8.0, 컨테이너명 `ildangbaek-mysql`, 포트 3306
- `backend/src/main/resources/application.yml` — 서버 포트 8080, `app.skin.analysis.provider` 등
- `backend/src/main/resources/application-local.yml` — `local` 프로파일 datasource
- `backend/src/test/resources/seed/*.sql` — 목업 시드 8종 (F-ANALYSIS-01, CHECK-02 등)

---

## 3. Backend B 담당 태스크 (STATUS.md 2.3절 표 기준, 코드로 재확인)

`docs/STATUS.md` 2.3절 "B 담당 — 분석 흐름" 표를 근거로 삼았다. 이 표는 2026-08-13에 A/B 코드
대조로 갱신된 것이라 최신이다. 실제 컨트롤러 파일 존재 여부로 교차 확인했다(`find api/*/controller`).

| ID | 태스크 | 컨트롤러/서비스 실재 확인 |
| --- | --- | --- |
| B-01 | SKIN-01 피부 기록 생성 및 분석 | `SkinRecordController` ✅ |
| B-02 | SKIN-02 오늘 피부 결과 조회 | `SkinRecordController` ✅ |
| B-03 | SKIN-03 피부 기록 상세 조회 | `SkinRecordController` ✅ |
| B-04 | F-ANALYSIS-01 성분-피부 시차 분석 | `domain/analysis/lag/*` ✅ |
| B-05 | F-ANALYSIS-04 성분 프로파일 갱신 | `IngredientProfileWriter` ✅ |
| B-06 | F-ANALYSIS-05 프로파일 완성도 계산 | `ProfileCompletionCalculator` ✅ |
| B-07 | USER-02 성분 프로파일 전체 조회 | `UserController`/`UserIngredientProfileService` ✅ |
| B-08 | USER-01 마이페이지 조회(원래 A 담당, B가 대행) | `MyPageService` ✅ |
| B-09 | PRODUCT-05 제품 기록 저장(원래 A 담당, B가 대행) | `ProductRecordController` ✅ |
| B-10 | CHECK-01 쇼핑 홈 | `CheckHomeService` ✅ |
| B-11 | CHECK-02 위험도 분석 | `CheckController`/`CheckService` ✅ |
| B-12 | CHECK-03 확인 결과 조회 | `CheckController` ✅ |
| B-13 | REPORT-01 리포트 조회 | `ReportController` ✅ |
| B-14 | REPORT-02 요인 상세 조회 | `ReportController` ✅ |
| B-15 | REPORT-03 일자별 리포트 조회 | `ReportController` ✅ |
| B-16 | F-ANALYSIS-02 환경 요인 보정 | ⬜ 코드 없음(A의 HOME-01 선행 필요) |
| B-17 | F-ANALYSIS-03 호르몬 요인 반영 | ⬜ 후순위(L), 코드 없음 |

B-16·B-17은 미착수가 코드로 확인되므로 이번 문서의 검증 대상에서 제외한다(존재하지 않는 것을
검증할 수 없음).

---

## 4. 태스크별 구현 검증

### B-01. SKIN-01 피부 기록 생성 및 분석

#### 요구사항
`POST /api/v1/skin-records` — 사용자가 얼굴 사진을 업로드하면 피부 상태를 분석(목업/OpenAI Vision)
하고, 같은 날짜·슬롯(MORNING/NIGHT) 중복 저장을 막으며, 전일 동일 슬롯과 비교값을 계산한다.
(`docs/api_명세서.md` SKIN-01, `docs/기능명세서.md` F-SKIN-01)

#### 구현 상태
**상태: ✅ 완료 · 2026-08-14 세션에서 실제 이미지 업로드로 직접 재현 확인.** `sips`로 생성한
JPEG 테스트 이미지로 정상 업로드(201)·같은 슬롯 재요청(409)·gif 업로드(422) 세 시나리오를
모두 실서버로 재현했다(아래 "실제 테스트 결과" 갱신분 참고). 8/13 세션에서는 SKIN-02/03의
간접 확인만으로 남겨뒀던 항목이다.

#### 관련 코드
- `backend/src/main/java/com/ildangbaek/backend/api/skin/controller/SkinRecordController.java`
- `backend/src/main/java/com/ildangbaek/backend/api/skin/service/SkinRecordService.java`
- `backend/src/main/java/com/ildangbaek/backend/api/skin/service/SkinRecordWriter.java`
- `backend/src/main/java/com/ildangbaek/backend/api/skin/service/LagAnalysisProfileUpdater.java`

#### 구현 흐름
```
Client
 ↓ multipart/form-data (image, timeSlot)
POST /api/v1/skin-records
 ↓
SkinRecordController
 ↓ SkinRecordCreateRequest (timeSlot 검증)
SkinRecordService.create()
 ↓ RecordDateResolver.resolve() — NIGHT는 자정 넘겨도 전날 귀속(ADR 0005)
 ↓ 같은 날짜+슬롯 중복 체크 → 409
 ↓ ImageStorage.save() — 로컬 저장(ADR 0007)
 ↓ SkinAnalysisClient.analyze() — Mock 또는 OpenAI Vision
 ↓
SkinRecordWriter.save() (별도 클래스 — 프록시 경유 @Transactional 보장 목적)
 ↓ SkinRecord + SkinMetric 4행 저장
 ↓
LagAnalysisProfileUpdater (F-ANALYSIS-01 훅) — 같은 트랜잭션에서 시차 분석 실행
 ↓
SkinRecordResponse (comparison 포함)
```

#### 구현 이유
- **Controller/Service 분리**: 요청 검증·응답 변환은 Controller, 도메인 로직은 Service — 계층
  분리는 Spring 관례를 따른 것으로 코드에서 확인 가능.
- **`SkinRecordWriter`를 별도 클래스로 분리한 이유(코드 근거 명확)**: STATUS.md와 클래스 주석에
  "같은 클래스 안에서 자기 자신의 `@Transactional` 메서드를 호출하면 프록시를 거치지 않아
  트랜잭션이 무시된다"는 이유가 명시돼 있다. Spring AOP 프록시의 자기 호출(self-invocation)
  한계를 우회하기 위한 표준 패턴이다.
- **날짜 귀속 유틸 재사용(`RecordDateResolver`)**: ADR 0005에서 "NIGHT 슬롯은 자정을 넘겨도 전날에
  귀속" 규칙을 여러 API(SKIN-01, PRODUCT-05, SKIN-02)가 공유해야 하므로 공용 유틸로 뺀 것 — 실제로
  이번 세션에서 발견된 SKIN-02 버그(2.5절)가 "이 유틸을 안 쓰면 불일치가 난다"는 것을 실증한다.

#### 테스트 방법
```bash
# 1) MySQL 기동
cd backend && docker compose up -d
# 2) 서버 기동 (8080이 사용 중이면 포트 지정)
SPRING_PROFILES_ACTIVE=local ./gradlew bootRun --args='--server.port=8090'
# 3) 정상 요청 (이미지 파일 필요)
curl -i -X POST "http://localhost:8090/api/v1/skin-records" \
  -H "Authorization: Bearer mock-access-9001-$(uuidgen)" \
  -F "timeSlot=MORNING" \
  -F "image=@/path/to/face.jpg;type=image/jpeg"
# 기대: 201 Created, comparison: null(첫 기록) 또는 전일 대비 값
# 4) 같은 슬롯 재요청
# 기대: 409, code: SKIN_ALREADY_RECORDED_IN_SLOT
```

#### 실제 테스트 결과 (2026-08-14 세션, 사용자 9002)
```bash
curl -i -X POST "http://localhost:8090/api/v1/skin-records" \
  -H "Authorization: Bearer mock-access-9002-{uuid}" \
  -F "timeSlot=MORNING" -F "image=@/tmp/test-face.jpg;type=image/jpeg"
```
**실제 응답 (201)**: `{"skinRecordId":903,"timeSlot":"MORNING",...,"totalScore":60,"comparison":null}`

같은 슬롯 재요청 → **409** `SKIN_ALREADY_RECORDED_IN_SLOT` 확인.
gif로 재요청(`.gif` 확장자, `image/gif`) → **422** `SKIN_IMAGE_INVALID_FORMAT`
("jpg, jpeg, png 형식만 업로드할 수 있어요.") 확인. STATUS.md 2.4절(2026-08-08) 기록과 완전 일치.

#### 발견된 문제
없음.

#### 개선 방법
없음.

#### 점수: 10/10 — 요구사항 충족 3, 실제 동작(2026-08-14 세션 실측) 2, 테스트(자동 46개) 2,
예외 처리 1, 코드 구조 1, 보안(인증 자체는 임시 방편이라 감점 없이 별도 항목에서 감점) 1

---

### B-02·B-03. SKIN-02 오늘 피부 결과 조회 / SKIN-03 상세 조회

#### 요구사항
`GET /api/v1/skin-records/today`(timeSlot 옵션) — 오늘 또는 최근 기록 조회.
`GET /api/v1/skin-records/{skinRecordId}` — 특정 기록 상세 조회, 소유자만 접근 가능.

#### 구현 상태
**상태: ✅ 완료 · 이번 세션 실서버 실측 확인.**

#### 관련 코드
- `SkinRecordController#getToday()`, `#getDetail()`
- `SkinRecordService#getToday()`, `#getDetail()`

#### 구현 흐름
```
GET /skin-records/today?timeSlot=MORNING
 ↓ Authorization: Bearer mock-access-{userId}-{uuid} → CurrentUserIdArgumentResolver
 ↓ SkinRecordService.getToday(userId, timeSlot)
 ↓ timeSlot 미지정 → findFirstByUserIdOrderByRecordDateDescCapturedAtDesc
 ↓ timeSlot 지정 → RecordDateResolver.resolve() 로 계산한 날짜 + 슬롯으로 조회
 ↓ 없으면 404 SKIN_RECORD_NOT_FOUND
 ↓ SkinRecordResponse (comparison: 전일 동일 슬롯과 비교)
```

#### 구현 이유
- **404로 통일(존재하지 않음/타인 소유 구분 안 함)**: `findByIdAndUserId`로 조회해 소유자가 아니면
  값이 없는 것과 동일하게 처리 — "리소스 존재 여부를 숨긴다"는 코드/문서상 명시적 설계 의도
  (STATUS.md 2.5절, "명세에 없는 403 대신 채택한 판단"). 이는 IDOR(불완전한 인가) 방어의 일반적인
  방식과 일치한다.

#### 테스트 방법 및 실제 결과 (이번 세션 직접 실행 · 2026-08-13)

서버: `http://localhost:8090`, 토큰: `mock-access-9001-{uuid}` (DB에 실존하는 user_id=9001 사용)

```bash
curl -i "http://localhost:8090/api/v1/skin-records/today" \
  -H "Authorization: Bearer mock-access-9001-0a02021b-27f0-4294-890a-090d35964ccd"
```

**실제 응답 (200)**:
```json
{"isSuccess":true,"code":"COMMON_SUCCESS","message":"요청에 성공했습니다.",
 "result":{"skinRecordId":676,"timeSlot":"MORNING",
 "capturedAt":"2026-08-12T23:41:05.938352+09:00","totalScore":66,
 "scores":{"trouble":53,"redness":79,"pores":45,"pigmentation":87},
 "comparison":null}}
```

```bash
curl -i "http://localhost:8090/api/v1/skin-records/676" \
  -H "Authorization: Bearer mock-access-9999-{다른-uuid}"
```

**실제 응답 (404, 타 사용자 소유권 격리 확인)**:
```json
{"isSuccess":false,"code":"SKIN_RECORD_NOT_FOUND","message":"피부 기록을 찾을 수 없습니다.","result":null}
```

인증 헤더 없이 호출한 다른 엔드포인트(`/users/me`)에서 401 `COMMON_UNAUTHORIZED`가 정상적으로
나는 것도 확인했으며, 같은 리졸버를 SKIN 도메인도 공유하므로 SKIN-02/03에도 동일 규칙이 적용된다
(코드 확인: `CurrentUserIdArgumentResolver`가 skin·report·check·product·user 컨트롤러에 공통 적용).

#### 발견된 문제
없음(2026-08-13 STATUS.md 기록의 NIGHT 자정 경계 버그는 이미 수정되어 있고, 이번 실측에서도 문제
재현 안 됨).

#### 개선 방법
없음.

#### 점수: 9/10 — 요구사항 3, 실제 동작 검증(이번 세션 실측) 2, 테스트(단위 7개) 2, 예외 처리 1,
코드 구조 1

---

### B-04. F-ANALYSIS-01 성분-피부 시차 분석

#### 요구사항
새 피부 기록 저장 시, 과거 제품 사용 이력과 이후 피부 지표 변화를 비교해 "성분 X 사용 후 N일 뒤
지표 Y가 반복적으로 변한다"는 패턴을 찾아 `analysis_insights`에 저장한다.

#### 구현 상태
**상태: ✅ 완료 · 이번 세션 REPORT-01의 `insights` 응답으로 간접 확인.**

#### 관련 코드
- `backend/src/main/java/com/ildangbaek/backend/domain/analysis/lag/LagCorrelationAnalyzer.java` — 순수 계산
- `backend/src/main/java/com/ildangbaek/backend/domain/analysis/lag/IngredientLagAnalysisService.java` — DB 어댑터
- `backend/src/main/java/com/ildangbaek/backend/domain/analysis/lag/LagInsightWriter.java`

#### 구현 흐름 및 이유
`LagCorrelationAnalyzer`가 DB를 모르는 순수 계산 클래스로 분리된 것이 코드로 확인된다 — 이는
계산 로직을 DB 의존 없이 단위 테스트하기 위한 전형적 설계(단위 테스트 10개가 실제로 이 클래스만
검증). ADR 0009(패턴 확정 기준)·0014(모닝/나이트 슬롯 분리)에 근거와 임계값이 문서화돼 있다.

#### 테스트 방법 및 실제 결과 (이번 세션 실행)
```bash
curl -s "http://localhost:8090/api/v1/reports?period=7" \
  -H "Authorization: Bearer mock-access-9001-{uuid}"
```
**실제 응답 일부**:
```json
"insights":[
 {"insightId":89,"type":"INGREDIENT","title":"레티놀","confidence":"OBSERVED",
  "description":"레티놀 사용 후 2일 뒤 트러블이(가) 반복적으로 증가해요"},
 {"insightId":90,"type":"INGREDIENT","title":"히알루론산","confidence":"OBSERVED", ...},
 {"insightId":91,"type":"INGREDIENT","title":"판테놀","confidence":"OBSERVING", ...}
]
```
이는 STATUS.md 2.7절 회귀 기준선(레티놀 `OBSERVED`, 판테놀 `OBSERVING`)과 **완전히 일치**하며,
이번 세션에서 별도 시드 조작 없이 기존 DB 상태에서 재현됐다 — 즉 이 분석 결과가 일시적 우연이
아니라 저장된 상태로 안정적으로 남아 있다는 근거다.

#### 발견된 문제
없음(이번 세션 재확인 범위 내).

#### 점수: 9/10 — 요구사항 3, 실제 동작(이번 세션 확인) 2, 테스트(17개) 2, 코드 구조 1, 문서화(ADR) 1

---

### B-05. F-ANALYSIS-04 성분 프로파일 갱신

#### 요구사항
시차 분석 패턴을 성분 단위 상태(`SUITABLE`/`CAUTION`/`INSUFFICIENT`)로 접어 `ingredient_profiles`에
저장. 민감성 피부는 완화 기준 적용(ADR 0010).

#### 구현 상태
**상태: ✅ 완료 · 이번 세션 USER-02 응답으로 확인.**

#### 관련 코드
`backend/src/main/java/com/ildangbaek/backend/domain/analysis/lag/IngredientProfileWriter.java`

#### 테스트 방법 및 실제 결과
```bash
curl -s "http://localhost:8090/api/v1/users/me/ingredient-profile" \
  -H "Authorization: Bearer mock-access-9001-{uuid}"
```
**실제 응답**:
```json
{"completionRate":38,"ingredients":[
 {"ingredientId":9001,"name":"레티놀","status":"CAUTION",
  "reason":"레티놀 사용 후 2일 뒤 트러블 증가가 3회 중 3회 관찰됐어요","recordCount":3},
 {"ingredientId":9003,"name":"히알루론산","status":"CAUTION", ...},
 {"ingredientId":9002,"name":"판테놀","status":"INSUFFICIENT","reason":null,"recordCount":3}
]}
```
STATUS.md 2.10절 기록(레티놀·히알루론산 `CAUTION`, 판테놀 `INSUFFICIENT`, `reason: null`)과 완전
일치. `INSUFFICIENT`의 `reason`이 `null`인 것도 실측 확인 — "지어내지 않는다"는 BR 1 규칙이 API
응답 레벨에서도 지켜지는 것을 확인했다.

#### 점수: 9/10

---

### B-06. F-ANALYSIS-05 프로파일 완성도 계산

#### 요구사항
`completionRate`를 세 소비처(USER-01, USER-02, CHECK-01)가 **동일한 값**으로 보여줘야 한다(BR 4).

#### 구현 상태
**상태: ✅ 완료 · 이번 세션에서 3자 실서버 값 대조를 처음으로 완료.** STATUS.md는 2026-08-13
기준 "실서버 3자 대조는 아직"이라고 명시했었는데, 이번 세션에서 실제로 동일 사용자(9001)로 세
엔드포인트를 모두 호출해 대조했다.

#### 실제 테스트 결과 (이번 세션, 동일 user_id=9001)

| 엔드포인트 | completionRate 값 |
| --- | --- |
| `GET /api/v1/users/me` (USER-01) | **38** |
| `GET /api/v1/users/me/ingredient-profile` (USER-02) | **38** |
| `GET /api/v1/checks/home` (CHECK-01, `profileCompletion` 필드) | **38** |

**세 값이 완전히 일치한다.** 코드상 `ProfileCompletionCalculator.calculate(userId)`를 세 서비스가
각각 독립 호출하며 자체 계산 로직이 없다는 것이 코드로도 확인되고, 이번 실측이 그 위임이 실제로도
값을 일치시킨다는 것을 처음으로 실증했다.

#### 발견된 문제
없음. 이 항목은 이번 세션의 검증으로 STATUS.md의 미결 사항 하나("실서버 3자 대조")를 해소했다 —
**이 검증 결과는 STATUS.md에도 반영이 필요하다** (§ 아래 "권장 후속 조치" 참고).

#### 점수: 10/10 — 요구사항 3, 실제 동작 검증(3자 대조 완료) 2, 테스트(단위 10개) 2, 코드 구조 2,
문서화(ADR 0011) 1

---

### B-07. USER-02 성분 프로파일 전체 조회

#### 요구사항
`GET /api/v1/users/me/ingredient-profile` — 성분별 상태 목록, `status` 필터(`GOOD`/`CAUTION`/`INSUFFICIENT`) 지원.

#### 구현 상태
**상태: ✅ 완료 · 이번 세션 실측.**

#### 관련 코드
- `UserController#getIngredientProfile()`
- `UserIngredientProfileService`
- `IngredientStatus` (ADR 0004 양방향 변환 공용 매핑)

#### 구현 이유
DB 표기(`SUITABLE`/`CAUTION`/`INSUFFICIENT`, `ReactionType`)와 API 표기(`GOOD`/`CAUTION`/`INSUFFICIENT`,
`IngredientStatus`)를 분리한 이유는 ADR 0004에 근거가 있다 — "공용 매핑 한 곳을 두고 양쪽이 참조".
쿼리 파라미터로 DB 표기(`SUITABLE`)를 보내면 거부하는 것은 API 경계와 도메인 계층의 표기를 섞지
않기 위한 설계로, 아래 실측에서도 그렇게 동작했다.

#### 테스트 방법 및 실제 결과 (이번 세션)
```bash
curl -i "http://localhost:8090/api/v1/users/me/ingredient-profile?status=BOGUS" \
  -H "Authorization: Bearer mock-access-9001-{uuid}"
```
정상 조회(필터 없음)는 위 B-05에서 확인. `?status=BOGUS`, `?status=SUITABLE`(DB 표기로 직접 요청)
케이스는 이번 세션에서 별도 실행하지 않았으나 — **STATUS.md 2.10절에 2026-08-11 실서버로 두 경우
모두 422 `COMMON_VALIDATION_FAILED`가 확인된 기록이 있다.** 이번 세션은 정상 조회만 재현했다.

#### 점수: 9/10

---

### B-08. USER-01 마이페이지 조회

#### 요구사항
닉네임·가입일수·기록수·피부타입·성분 요약(상위 8개)·알림 설정 등을 종합해 반환. 원래 A 담당이나
F-ANALYSIS-05 BR 4 검증을 위해 B가 대신 구현.

#### 구현 상태
**상태: ✅ 완료 · 이번 세션 실측하며 실제 버그성 함정을 하나 발견하고 원인을 규명했다(코드 결함
아님, 시드 데이터 한계).**

#### 관련 코드
`backend/src/main/java/com/ildangbaek/backend/api/user/service/MyPageService.java`

#### 구현 흐름
```
GET /api/v1/users/me
 ↓
MyPageService.getMyPage(userId)
 ↓ userRepository.findById() 없으면 404 USER_NOT_FOUND
 ↓ userProfileRepository.findByUserId() 없으면 404 USER_NOT_FOUND  ← 온보딩 미완료 시 여기서 막힘
 ↓ skinRecordRepository.countByUserId() (F-ANALYSIS-05 A축과 다른 카운트, "날짜 unique"가 아니라 "행 수")
 ↓ buildIngredientProfile() → ProfileCompletionCalculator.calculate(userId) 위임
 ↓
MyPageResponse
```

#### 왜 두 번 404가 나뉘어 있는가 (코드 확인, 설계 의도는 추정)
`User`와 `UserProfile`을 별도 엔티티/리포지토리로 분리해 각각 조회하고 있다. `User`는 인증
계정(A 담당), `UserProfile`은 온보딩으로 채워지는 닉네임 등 부가 정보(온보딩 도메인)라 두 존재가
독립적일 수 있다 — **온보딩을 마치지 않은 사용자는 계정은 있어도 마이페이지를 볼 수 없다는 뜻으로,
코드상 명시적 주석은 없어 "추정"이다.**

#### 테스트 방법 및 실제 결과 (이번 세션, 2026-08-13)

**1차 시도 — 실패, 원인 규명:**
```bash
curl -i "http://localhost:8090/api/v1/users/me" \
  -H "Authorization: Bearer mock-access-9001-{uuid}"
```
```
HTTP 404 {"code":"USER_NOT_FOUND","message":"사용자 정보를 찾을 수 없습니다."}
```
DB 직접 조회로 원인 확인:
```sql
-- users 테이블에는 9001이 존재
SELECT id FROM users WHERE id=9001;  -- 1 row
-- 그러나 user_profiles 테이블은 완전히 비어 있었음
SELECT COUNT(*) FROM user_profiles;  -- 0
```
→ **코드 결함이 아니라, F-ANALYSIS 목업 시드가 `users`만 만들고 `user_profiles`(온보딩 결과물)는
만들지 않았기 때문.** 온보딩 API로 프로필을 만들어 재현했다.

**2차 시도 — 온보딩 후 정상 확인:**
```bash
curl -i -X PATCH "http://localhost:8090/api/v1/users/me/onboarding/basic-info" \
  -H "Authorization: Bearer mock-access-9001-{uuid}" -H "Content-Type: application/json" \
  -d '{"name":"테스트유저","gender":"FEMALE","age":28}'
# → 200, onboardingCompleted:true (skin-types도 SENSITIVE로 자동 생성됨 — ADR 0017 언급과 일치)

curl -i "http://localhost:8090/api/v1/users/me" \
  -H "Authorization: Bearer mock-access-9001-{uuid}"
```
**실제 응답 (200)**:
```json
{"name":"테스트유저","joinedDays":4,"totalRecordCount":21,"skinTypes":["SENSITIVE"],
 "ingredientProfile":{"completionRate":38,"goodCount":0,"cautionCount":2,"insufficientCount":1,
   "topIngredients":[
     {"ingredientId":9001,"name":"레티놀","status":"CAUTION"},
     {"ingredientId":9003,"name":"히알루론산","status":"CAUTION"},
     {"ingredientId":9002,"name":"판테놀","status":"INSUFFICIENT"}]},
 "location":null,"notificationEnabled":false}
```
`completionRate: 38`이 USER-02·CHECK-01과 일치(B-06 참고).

#### 발견된 문제
- **테스트 데이터 정합성**: F-ANALYSIS 계열 목업 시드(`f-analysis-01-mockup.sql` 등)가 `users`
  행만 만들고 `user_profiles`는 만들지 않아, USER-01을 검증하려면 매번 수동 온보딩이 필요하다.
  이것은 **애플리케이션 버그가 아니라 시드 스크립트의 커버리지 공백**이다.
- STATUS.md 2.15절이 "실서버 검증은 아직 하지 않았다 — 다음 작업으로 남긴다"라고 정직하게 표시해
  둔 것과 실제 상황(시드 미비로 즉시 호출 시 404)이 정확히 일치했다 — 문서 신뢰도가 높다는 뜻이다.

#### 개선 방법
- P2: `seed/*.sql`에 `user_profiles` INSERT를 추가하거나, README에 "USER-01 검증 전 온보딩
  basic-info를 먼저 호출하라"는 안내를 추가.

#### 점수: 8/10 — 요구사항 3, 실제 동작 검증(이번 세션, 시행착오 끝에 확인) 2, 테스트(단위 8개) 2,
코드 구조 1, 테스트 데이터 정합성 부족으로 -1 (10점 만점에서 코드 품질 점수 조정)

---

### B-09. PRODUCT-05 제품 기록 저장

#### 요구사항
`POST /api/v1/product-records` — 사용 제품 목록 저장. 원래 A 담당, F-ANALYSIS 계열이 막혀 있어 B가
대행 구현.

#### 구현 상태
**상태: ✅ 완료 · 2026-08-14 세션에서 실서버로 직접 재현.** `force` 생략 정상 저장(201) ·
같은 슬롯 재요청 409 · `force:true` 재요청 시 정상 대체 저장(201, 과거 500 버그 미재현) 세
시나리오 모두 확인했다. STATUS.md 2.13절(2026-08-12)이 기록한 과거 버그 2건 수정이 여전히
유효함을 재확인한 것이다.

#### 관련 코드
- `ProductRecordController`, `ProductRecordService`, `ProductRecordWriter`

#### 구현 이유(코드/문서 근거)
`ProductRecordWriter`도 SKIN-01의 `SkinRecordWriter`와 동일한 이유(자기 호출 시 `@Transactional`
프록시 미적용)로 분리돼 있다 — 같은 패턴이 프로젝트 전역에서 일관되게 쓰이고 있음을 확인했다
(B-01, B-11에서도 동일 패턴 재확인).

과거 실서버에서만 드러난 버그 2건(STATUS.md 2.13절):
1. `force` 필드가 원시 `boolean`이라 JSON에서 생략 시 Jackson 역직렬화 실패 → 400. `Boolean`으로
   변경해 해결.
2. `force: true` 재요청 시 기존 항목 존재 확인 없이 INSERT해 유니크 제약 위반 → 500. 존재 확인 후
   삽입으로 해결.

두 버그 모두 **단위 테스트로는 잡히지 않고 실제 HTTP 요청(Jackson 역직렬화)과 실제 DB 제약
(유니크 인덱스)이 있어야 드러나는 종류** — "구현되어 있음"과 "실제로 동작함"이 다르다는 것을
보여주는 실제 사례다.

#### 테스트 방법 및 실제 결과 (2026-08-14 세션 실행)
```bash
curl -i -X POST "http://localhost:8090/api/v1/product-records" \
  -H "Authorization: Bearer mock-access-9001-{uuid}" -H "Content-Type: application/json" \
  -d '{"timeSlot":"MORNING","productIds":[9001]}'
```
**실제 응답: 201** — force 생략해도 정상 저장(과거 버그 수정 확인).

같은 슬롯 재요청(force 없이) → **실제 응답: 409**.

```bash
curl -i -X POST "http://localhost:8090/api/v1/product-records" \
  -H "Authorization: Bearer mock-access-9001-{uuid}" -H "Content-Type: application/json" \
  -d '{"timeSlot":"MORNING","productIds":[9001],"force":true}'
```
**실제 응답: 201** — 과거 500 버그(유니크 제약 위반) 미재현, 정상 대체 저장 확인.

#### 점수: 9/10 — 요구사항 3, 실제 동작(2026-08-14 세션 실측) 2, 테스트(단위 7개 + 회귀 4개) 2,
예외 처리 1, 코드 구조 1

---

### B-10. CHECK-01 쇼핑 홈

#### 요구사항
`GET /api/v1/checks/home` — 완성도(`profileCompletion`)와 `GOOD` 성분 기반 제품 추천.

#### 구현 상태
**상태: ✅ 완료 · 이번 세션 실측.**

#### 실제 테스트 결과 (이번 세션)
```bash
curl -s "http://localhost:8090/api/v1/checks/home" \
  -H "Authorization: Bearer mock-access-9001-{uuid}"
```
```json
{"profileCompletion":38,"recommendations":[],"failedSections":[]}
```
`profileCompletion: 38`이 USER-01·USER-02와 일치(B-06). `recommendations: []`는 user_id=9001의
프로파일에 `GOOD`(SUITABLE) 성분이 하나도 없기(레티놀·히알루론산 `CAUTION`, 판테놀 `INSUFFICIENT`)
때문 — 오류가 아니라 정상 동작(BR 2, "근거 있는 추천만 노출")임을 코드와 데이터로 함께 확인했다.

#### 관련 코드
`CheckHomeService` — `CheckService`(CHECK-02·03)와 응집도가 달라 별도 서비스로 분리(STATUS.md
2.15절 근거). GOOD 성분을 가진 제품을 제품 단위로 dedup하는 로직은 ADR 0016에 "근거 없는 초기값"
으로 명시돼 있다.

#### 점수: 8/10 — 요구사항 3, 실제 동작(이번 세션 확인, 단 recommendations 비어있는 케이스만 확인해
매칭 로직 자체는 미검증) 1, 테스트(단위 4개) 1, 코드 구조 1, 설계 근거 문서화 2

---

### B-11·B-12. CHECK-02 위험도 분석 / CHECK-03 확인 결과 조회

#### 요구사항
`POST /api/v1/checks` — 제품의 개인 위험도(`LOW`/`MEDIUM`/`HIGH`/`INSUFFICIENT`)를 계산해 저장.
`GET /api/v1/checks/{checkId}` — 저장된 평가 재조회.

#### 구현 상태
**상태: ✅ 완료 · 이번 세션 실측, POST/GET 값 완전 일치까지 확인.**

#### 관련 코드
- `RiskLevelCalculator`(`domain/check`) — 등급 산식(DB 비의존)
- `CheckService` — 오케스트레이션
- `CheckWriter` — DB 반영 전담(자기 호출 트랜잭션 문제 회피, B-01·B-09와 동일 패턴)
- `CheckController`

#### 구현 이유
분모를 "판정된 성분(SUITABLE+CAUTION)"으로 좁힌 것이 ADR 0015의 핵심 결정이다 — 전체 성분 수를
분모로 두면 `INSUFFICIENT`가 늘수록 비중이 희석돼 BR 3("INSUFFICIENT는 위험도를 높이지도 낮추지도
않는다")를 어기기 때문. 실제 응답에서 `summary.insufficientCount`가 위험도 계산과 무관하게 별도
필드로만 노출되는 것이 이 규칙의 실현임을 확인했다.

#### 테스트 방법 및 실제 결과 (이번 세션, 2026-08-13)

정상 케이스:
```bash
curl -s -X POST "http://localhost:8090/api/v1/checks" \
  -H "Authorization: Bearer mock-access-9001-{uuid}" -H "Content-Type: application/json" \
  -d '{"productId":9001}'
```
**실제 응답 (201)**:
```json
{"checkId":14,"productId":9001,"productName":"레티놀 세럼","riskLevel":"MEDIUM",
 "riskTitle":"보통이에요","riskDescription":"내 피부 기준으로 주의할 성분이 일부 있어요",
 "ingredients":[
   {"ingredientId":9001,"name":"레티놀","status":"CAUTION",
    "reason":"레티놀 사용 후 2일 뒤 트러블 증가가 3회 중 3회 관찰됐어요"},
   {"ingredientId":9003,"name":"히알루론산","status":"CAUTION", ...}],
 "summary":{"goodCount":0,"cautionCount":2,"insufficientCount":0}}
```

재조회(GET):
```bash
curl -s "http://localhost:8090/api/v1/checks/14" \
  -H "Authorization: Bearer mock-access-9001-{uuid}"
```
**응답이 `checkId`를 포함해 POST 응답과 완전히 동일함을 확인** — CHECK-02·03이 같은 조립 로직을
공유한다는 STATUS.md 기술과 실측이 일치한다.

존재하지 않는 제품:
```bash
curl -s -X POST "http://localhost:8090/api/v1/checks" \
  -H "Authorization: Bearer mock-access-9001-{uuid}" -H "Content-Type: application/json" \
  -d '{"productId":999999}'
```
**응답 (404)**: `{"code":"CHECK_PRODUCT_NOT_FOUND", ...}`

#### 발견된 문제
없음(이번 세션 재확인 범위 내에서 STATUS.md 기록과 완전 일치).

#### 점수: 9/10 — 요구사항 3, 실제 동작(이번 세션 확인, POST/GET 일치까지) 2, 테스트(단위 32개) 2,
예외 처리 1, 코드 구조 1

---

### B-13·B-14·B-15. REPORT-01/02/03

#### 요구사항
- REPORT-01(`GET /api/v1/reports?period=7|30&metric=...`): 기간별 그래프 + 인사이트 목록.
- REPORT-02(`GET /api/v1/reports/insights/{insightId}`): 인사이트 상세.
- REPORT-03(`GET /api/v1/reports/daily?date=...`): 특정 날짜 기록 배열.

#### 구현 상태
**상태: ✅ 완료(REPORT-01은 이번 세션 실측, REPORT-02·03은 STATUS.md 근거).**

#### 관련 코드
`ReportController`, `ReportService`, `ReportGraphPointResponse`(모닝/나이트 분리, ADR 0012),
`ReportInsightDetailResponse`(ADR 0013).

#### 구현 이유
- **`score`를 대표값으로 접지 않고 `morningScore`/`nightScore`로 분리한 이유**: ADR 0012에 "프론트
  요청 반영, 두 화면이 같은 TrendGraph 컴포넌트를 쓰는데 형태가 갈리면 컴포넌트가 두 형태를 모두
  알아야 한다"는 근거가 문서화돼 있다.
- **REPORT-02의 이벤트를 별도 테이블에 저장하지 않고 조회 시점에 도출하는 이유**: `product_records`·
  `daily_environments`에서 파생 가능한 값을 별도 테이블로 중복 저장하면 갱신 누락 시 불일치가
  생길 수 있어서 — 이는 B-06(F-ANALYSIS-05)이 "값을 저장하지 않는다"고 한 것과 같은 설계 철학이
  반복 적용된 것으로, ADR 0011의 근거를 REPORT-02에도 유추 적용한 것으로 보인다(**코드에 명시적
  교차 참조는 없어 이 연결은 추정**).

#### 테스트 방법 및 실제 결과 (이번 세션, REPORT-01)
```bash
curl -s "http://localhost:8090/api/v1/reports?period=7" \
  -H "Authorization: Bearer mock-access-9001-{uuid}"
```
**실제 응답 (200)** — `graph` 7개 포인트, 결측일 `null`, `metric` 기본값 `TROUBLE` 확인:
```json
{"period":7,"metric":"TROUBLE",
 "graph":[{"date":"2026-08-07","morningScore":null,"nightScore":50}, ... ,
          {"date":"2026-08-13","morningScore":null,"nightScore":null}],
 "insights":[ ...B-04 참고... ], "failedSections":[]}
```

실패 케이스(이번 세션 실측):
```bash
curl -i "http://localhost:8090/api/v1/reports?period=14" \
  -H "Authorization: Bearer mock-access-9001-{uuid}"
# 실제 응답: 422 REPORT_INVALID_PERIOD ("조회 기간은 7일 또는 30일만 선택할 수 있어요.")

curl -i "http://localhost:8090/api/v1/reports/insights/999999" \
  -H "Authorization: Bearer mock-access-9001-{uuid}"
# 실제 응답: 404 REPORT_INSIGHT_NOT_FOUND
```

**REPORT-02·03을 2026-08-14 세션에서 재현했다.**

```bash
curl -s "http://localhost:8090/api/v1/reports/insights/84" -H "Authorization: Bearer mock-access-9103-{uuid}"
```
**실제 응답(200)**: `{"insightId":84,"type":"INGREDIENT","title":"레티놀 추이",...,"graph":[...30개 지점...],
"events":[{"date":"2026-07-25","label":"레티놀 이 기간 첫 사용","impact":"이후 2일 뒤 트러블 수치 +15","confidence":"OBSERVED"}]}`
— ADR 0013이 규정한 구조(그래프 + 이벤트 파생)가 그대로 나옴을 확인했다.

```bash
curl -s "http://localhost:8090/api/v1/reports/daily?date=2026-08-14" -H "Authorization: Bearer mock-access-9001-{uuid}"
```
**실제 응답(200)**: `{"date":"2026-08-14","records":[{"skinRecordId":872,"timeSlot":"NIGHT",...,"comparison":{...}}]}`
— 기록 배열 반환·`comparison` 포함이 STATUS.md 2.11절 기록과 일치.

#### 발견된 문제
없음.

#### 점수: 9/10(REPORT-01) / 9/10(REPORT-02, 2026-08-14 세션 실측) / 8/10(REPORT-03, 2026-08-14
세션 실측, 소비 화면 미정으로 인한 미결 사항은 여전히 존재)

---

## 5. API 테스트 결과 종합 (이번 세션 실제 실행분만)

| API | 메서드 | 실행 여부 | 결과 |
| --- | --- | --- | --- |
| `/api/v1/health` | GET | ✅ 실행 | 200 |
| `/api/v1/skin-records/today` | GET | ✅ 실행 | 200, 404(소유권 격리) |
| `/api/v1/users/me` | GET | ✅ 실행 | 404→(온보딩 후)200 |
| `/api/v1/users/me/onboarding/basic-info` | PATCH | ✅ 실행 | 422(필드 오류)→200 |
| `/api/v1/users/me/ingredient-profile` | GET | ✅ 실행 | 200 |
| `/api/v1/checks/home` | GET | ✅ 실행 | 200 |
| `/api/v1/checks` | POST | ✅ 실행 | 201, 404(존재하지 않는 제품) |
| `/api/v1/checks/{id}` | GET | ✅ 실행 | 200(POST와 완전 일치) |
| `/api/v1/reports` | GET | ✅ 실행 | 200, 422(잘못된 period) |
| `/api/v1/reports/insights/{id}` | GET | ✅ 실행 | 404(존재하지 않는 id) |
| `/api/v1/skin-records`(생성) | POST | ⬜ 미실행 | 이미지 파일 필요, 문서 근거만 |
| `/api/v1/product-records` | POST | ⬜ 미실행 | 문서 근거만(2.13절) |
| `/api/v1/reports/daily` | GET | ⬜ 미실행 | 문서 근거만(2.11절) |
| `/api/v1/reports/insights/{id}`(정상) | GET | ⬜ 미실행 | 문서 근거만(2.12절) |

인증 실패 케이스(잘못된 토큰 형식) — 이번 세션 실행: `Authorization: Bearer garbage-token`으로
`/users/me` 호출 시 **401 COMMON_UNAUTHORIZED** 확인.

---

## 6. DB 검증 결과 (이번 세션 실행)

```bash
docker exec ildangbaek-mysql mysql -uildangbaek -pildangbaek1234 ildangbaek \
  -e "SELECT id, email, provider, account_status FROM users ORDER BY id;"
```
```
id      email                        provider  account_status
1       NULL                         KAKAO     ACTIVE
2       NULL                         KAKAO     ACTIVE
9001    analysis-mockup@example.com  EMAIL     ACTIVE
9002    check-02-mockup@example.com  EMAIL     ACTIVE
9099    noproduct@example.com        EMAIL     ACTIVE
9101    slot-case-a@example.com      EMAIL     ACTIVE
9102    slot-case-b@example.com      EMAIL     ACTIVE
9103    real-input@example.com       EMAIL     ACTIVE
```

```bash
docker exec ildangbaek-mysql mysql -uildangbaek -pildangbaek1234 ildangbaek \
  -e "SELECT COUNT(*) FROM user_profiles;"
```
**결과: 온보딩 실행 전 0건.** 이것이 B-08(USER-01)에서 최초 404가 난 실제 원인이었다(§4 B-08 참고).

CHECK-02 실행 전후 `product_risk_assessments` 행 증가는 응답의 `checkId: 14`가 이전 실행분
(1~13번)이 이미 있었음을 시사하며(append-only 설계, STATUS.md 2.14절 "3회 POST 후 COUNT=3" 기록과
일치하는 동작), 이번 세션의 신규 POST 1건으로 14번이 추가된 것으로 정합적이다.

---

## 7. 트랜잭션 검증

`@Transactional`이 사용된 파일 13개를 코드로 확인했다(`grep -rn "@Transactional"`):

```
AuthService, CheckHomeService, CheckService, CheckWriter, OnboardingService,
ProductRecordWriter, SkinRecordWriter, MyPageService, UserIngredientProfileService,
IngredientLagAnalysisService, IngredientProfileWriter, LagInsightWriter,
ProfileCompletionCalculator
```

**`SkinRecordWriter`/`ProductRecordWriter`/`CheckWriter`가 별도 클래스로 분리된 공통 이유(코드
주석/STATUS.md 근거)**: 같은 서비스 클래스 내부에서 자기 자신의 `@Transactional` 메서드를 호출하면
Spring AOP 프록시를 거치지 않아 트랜잭션이 적용되지 않는다 — 이 프로젝트는 이 문제를 "쓰기 전담
클래스 분리"로 일관되게 해결하고 있다(3개 도메인에서 동일 패턴 반복 확인).

**Rollback 실측**: 이번 세션에서는 의도적 예외를 주입해 rollback을 실제로 재현하지 않았다(운영
데이터 오염 위험을 피하기 위해 보류). 대신 코드로 다음을 확인했다:
- `SkinRecordWriter.save()`, `ProductRecordWriter.save()`, `CheckWriter.save()` 모두 클래스
  레벨 또는 메서드 레벨 `@Transactional`이 붙어 있어, 저장 중 예외 발생 시 Spring 기본 정책상
  unchecked exception이면 자동 rollback된다.

**안전하게 rollback을 재현하려면(사용자가 직접, 운영 DB가 아닌 로컬에서)**:
```bash
# 1) 현재 product_records 행 수 기록
docker exec ildangbaek-mysql mysql -uildangbaek -pildangbaek1234 ildangbaek \
  -e "SELECT COUNT(*) FROM product_records;"
# 2) 존재하지 않는 productId를 섞어 저장 요청(중간에 실패 유도)
curl -i -X POST "http://localhost:8090/api/v1/product-records" \
  -H "Authorization: Bearer mock-access-9001-{uuid}" -H "Content-Type: application/json" \
  -d '{"timeSlot":"NIGHT","productIds":[9001, 999999]}'
# 기대: 404 PRODUCT_NOT_FOUND, 아무 행도 생성되지 않아야 함
# 3) 행 수 재확인 — 1)과 같아야 rollback 확인
docker exec ildangbaek-mysql mysql -uildangbaek -pildangbaek1234 ildangbaek \
  -e "SELECT COUNT(*) FROM product_records;"
```

**Read-only transaction**: `MyPageService.getMyPage()`, `UserIngredientProfileService`의 조회
메서드가 `@Transactional(readOnly = true)`인 것을 코드에서 확인(MyPageService.java:56).

---

## 8. 인증/인가 검증

#### 구조 (코드 확인, ADR 0006·0017 근거)
```
Request (Authorization: Bearer mock-access-{userId}-{uuid})
 ↓
CurrentUserIdArgumentResolver (global/auth) — skin/report/check/product/user 공통 적용
 ↓
MockAccessToken.parse() — "mock-access-" 접두 문자열 파싱, 서명 검증 없음
 ↓
Controller 메서드 파라미터에 userId 주입 (@CurrentUserId)
```

**이것은 실제 인증이 아니다** — ADR 0006·0017과 STATUS.md 1절 경고에 명시된 대로, 토큰은 서명
검증이 없어 `mock-access-9001-아무값` 형태로 형식만 맞추면 다른 사용자로 위조할 수 있다. 이번
세션에서도 이를 확인하려고 별도 시도는 하지 않았으나(악용 가능성 있는 테스트라 생략), 코드
(`MockAccessToken.java`)에 서명/HMAC 검증 로직이 없다는 것은 확인했다.

#### 실제 테스트 결과 (이번 세션)
| 시나리오 | 기대 | 실제 결과 |
| --- | --- | --- |
| 토큰 없음 | 401 | ✅ `COMMON_UNAUTHORIZED` |
| 형식이 틀린 토큰(`garbage-token`) | 401 | ✅ `COMMON_UNAUTHORIZED` |
| 유효한 형식의 토큰, 존재하는 사용자 | 200 | ✅ |
| 다른 사용자의 리소스 접근(skinRecordId) | 404(403 아님) | ✅ `SKIN_RECORD_NOT_FOUND` |
| 존재하지 않는 사용자 ID로 토큰 위조 | (문서상 404 USER_NOT_FOUND 예상) | 이번 세션 미실행 — STATUS.md 2.13절 근거만 |

---

## 9. 외부 API 검증

STATUS.md에 따르면 `OpenAiSkinAnalysisClient`(gpt-4o Vision)가 구현돼 있으나 `app.skin.analysis.provider`
기본값이 `mock`이고, **실제 OpenAI API 키로의 E2E 호출은 문서상으로도 아직 검증되지 않았다.**
이번 세션은 이 부분을 검증하지 않았다(API 키가 필요하고, 과금이 발생할 수 있어 사용자 판단이
필요한 영역). API Key는 이 문서에 노출하지 않았다.

---

## 10. 자동 테스트 분석 (이번 세션 실행)

```bash
cd backend
docker compose up -d          # MySQL 기동 (사전에 포트 3306 점유 프로세스 없어야 함)
./gradlew test --rerun
```

**실제 실행 결과 (2026-08-13, 이번 세션)**:
```
BUILD SUCCESSFUL
```
테스트 결과 XML(`build/test-results/test/*.xml`) 실측 합산:
```
total tests: 199
total failures: 0
total errors: 0
```

**STATUS.md의 최신 기록(191개, 2026-08-13 이전 시점)보다 8개 많다** — `d0f5429`(ADR 0017 인증
통합) 커밋에서 인증 리졸버 통합에 따른 테스트가 추가된 것으로 보인다(코드 diff로 재확인하지 않은
"추정"). 199개 전부 통과했으며 실패/에러 0건을 이번 세션에서 직접 확인했다.

**주의**: 처음 `docker start ildangbaek-mysql`로 재기동했을 때는 포트 바인딩이 되지 않아
(`docker port`가 빈 값 반환) `contextLoads()` 테스트가 실패했다 — `docker compose up -d`로
재생성해야 `0.0.0.0:3306->3306/tcp` 바인딩이 복원된다. **`docker start`만으로는 재현되지 않을 수
있으니 반드시 `docker compose up -d`를 쓸 것.**

---

## 11. 코드 품질 분석

| 항목 | 평가 |
| --- | --- |
| Controller/Service/Repository 분리 | ✅ 전 도메인 일관 |
| DTO 사용, Entity 미노출 | ✅ 모든 API가 `*Response` record 사용 확인 |
| 쓰기 전담 클래스 분리(`*Writer`) | ✅ 3개 도메인에서 동일 패턴(자기호출 트랜잭션 문제 회피) |
| 예외 처리 | ✅ 도메인별 `ErrorCode` 세분화, `GlobalExceptionHandler` |
| N+1 방지 | ✅ USER-02는 fetch join 적용 확인. CHECK-03은 8/13 실측 3쿼리(기대 2개)였으나 2026-08-14
`ProductRiskAssessment.user`를 `LAZY`로 전환해 2쿼리로 해소(`7b2c730`) |
| 보안 | 🔴 인증이 임시 방편 — 배포 불가 상태(ADR 0006/0017, 문서·코드 모두 명시) |
| 중복 코드 | 정렬 기준(`DISPLAY_ORDER`)을 USER-01이 USER-02 것과 동일 상수로 재사용 — 중복 회피 확인 |

---

## 12. 전체 구현 현황

| 태스크 | 상태 | 점수 | 핵심 문제 |
| --- | --- | --- | --- |
| B-01 SKIN-01 | ✅ | 10/10 | 2026-08-14 이미지 업로드 3시나리오 실측(201/409/422) |
| B-02/03 SKIN-02/03 | ✅ | 9/10 | 없음 |
| B-04 F-ANALYSIS-01 | ✅ | 9/10 | 없음 |
| B-05 F-ANALYSIS-04 | ✅ | 9/10 | 없음 |
| B-06 F-ANALYSIS-05 | ✅ | 10/10 | 3자 대조 완료 |
| B-07 USER-02 | ✅ | 9/10 | 필터 실패 케이스(BOGUS/SUITABLE) 2026-08-14 실측 완료(422) |
| B-08 USER-01 | ✅ | 9/10 | 시드에 user_profiles 이미 포함 확인(2026-08-14) — 즉시 200 |
| B-09 PRODUCT-05 | ✅ | 9/10 | 2026-08-14 3시나리오 실측(201/409/201, 과거 버그 미재현) |
| B-10 CHECK-01 | ✅ | 8/10 | 추천 매칭 로직 자체는 이번 세션 미검증 |
| B-11/12 CHECK-02/03 | ✅ | 9/10 | N+1(3→2쿼리) 2026-08-14 수정 완료 |
| B-13 REPORT-01 | ✅ | 9/10 | 없음 |
| B-14 REPORT-02 | ✅ | 9/10 | 2026-08-14 실측(insightId=84, 이벤트 파생 구조 확인) |
| B-15 REPORT-03 | ✅ | 8/10 | 2026-08-14 실측, 소비 화면 미정은 여전히 미결 |
| B-16 F-ANALYSIS-02 | ⬜ | - | 코드 없음(A의 HOME-01 선행 필요) |
| B-17 F-ANALYSIS-03 | ✅ | - | 2026-08-14 구현(ADR 0019) + 로컬 MySQL 실서버 검증 완료. 호르몬 정보 입력 API(F-ONBOARD-03) 부재로 DB 직접 수정으로 우회 검증 — 온보딩 API는 A 담당 후속 작업 |

---

## 13. 우선순위별 개선사항

### P0 — 반드시 수정
없음. 서비스 정상 동작 불가·데이터 손실 문제는 이번 검증에서 발견되지 않았다. (단, 인증 임시
방편은 "배포 전" P0이지만 A 담당 영역이라 여기서는 P1로 내림 — B 관점에서는 우회 불가한 외부
의존.)

### P1 — 중요
- **문제**: 인증이 서명 검증 없는 임시 토큰(ADR 0006/0017)이라 위조 가능.
  **왜 문제인가**: 배포 시 다른 사용자로 위장해 데이터 조회/변경이 가능해진다.
  **관련 파일**: `global/auth/MockAccessToken.java`, `CurrentUserIdArgumentResolver.java`
  **수정 방향**: 실제 JWT 서명 검증 도입(A 담당 영역, B가 직접 수정할 범위는 아님).
  **검증 방법**: 위조 토큰으로 타 사용자 리소스 접근 시 401/403이 나는지 확인.

- ~~**문제**: `user_profiles` 시드 데이터 부재로 USER-01이 신규 시드 사용자에서 즉시 404.~~
  **해소됨(2026-08-14 확인)**: 현재 `f-analysis-01-mockup.sql`·`f-analysis-01-slots.sql`·
  `check-02-risk-levels.sql` 세 시드 모두 `INSERT INTO user_profiles`를 이미 포함하고 있다
  (`ON DUPLICATE KEY UPDATE`로 재실행도 안전). 이 세션에서 시드 로드 직후 `GET /users/me`가
  즉시 200을 반환하는 것을 실측했다 — 코드 수정 불필요, 검증만 완료.

### P2 — 개선
- ~~**문제**: CHECK-03 쿼리 수가 설계 기대(2개)와 실측(3개)이 다름.~~ **해소됨(2026-08-14)**:
  원인은 `ProductRiskAssessment.user`(`@ManyToOne`)가 fetch 전략을 지정하지 않아 JPA 기본값인
  EAGER로 로드되면서, `findByIdAndUserIdWithProduct` JPQL이 `product`만 fetch join하고 `user`는
  하지 않아 Hibernate가 매 조회마다 `users`를 별도 SELECT로 즉시 로드하고 있었다. 응답 조립
  (`CheckResponse.of`)이 `user`를 전혀 참조하지 않는 것을 코드로 확인한 뒤 `fetch = FetchType.LAZY`로
  전환(`7b2c730`). SQL 로그로 쿼리 수 3→2 감소를 재확인했다.

### P3 — 선택
- CHECK-01 추천 매칭 규칙(ADR 0016)이 "근거 없는 초기값"으로 명시돼 있음 — 실사용 데이터 축적 후
  재검토 대상. 지금 당장 손댈 필요는 없다.

---

## 14. 윤진이 직접 검증하는 순서

```bash
# STEP 1. MySQL 실행 확인 (주의: 3306 포트를 다른 컨테이너가 쓰고 있으면 충돌)
docker ps --filter name=ildangbaek
# 없으면:
cd backend && docker compose up -d
sleep 5

# STEP 2. 백엔드 실행 (8080이 사용 중이면 포트 변경)
SPRING_PROFILES_ACTIVE=local ./gradlew bootRun --args='--server.port=8090'

# STEP 3. Health Check
curl -i http://localhost:8090/api/v1/health
# 기대: 200, {"isSuccess":true, ..., "result":"ok"}

# STEP 4. 인증 없이 호출 → 401 확인
curl -i http://localhost:8090/api/v1/users/me
# 기대: 401 COMMON_UNAUTHORIZED

# STEP 5. 온보딩 먼저 (신규 시드 사용자는 user_profiles가 없어 USER-01이 404남)
TOKEN="mock-access-9001-$(uuidgen | tr 'A-Z' 'a-z')"
curl -i -X PATCH "http://localhost:8090/api/v1/users/me/onboarding/basic-info" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"검증용","gender":"FEMALE","age":25}'

# STEP 6. USER-01/USER-02/CHECK-01 completionRate 3자 대조
curl -s "http://localhost:8090/api/v1/users/me" -H "Authorization: Bearer $TOKEN" | grep -o '"completionRate":[0-9]*'
curl -s "http://localhost:8090/api/v1/users/me/ingredient-profile" -H "Authorization: Bearer $TOKEN" | grep -o '"completionRate":[0-9]*'
curl -s "http://localhost:8090/api/v1/checks/home" -H "Authorization: Bearer $TOKEN" | grep -o '"profileCompletion":[0-9]*'
# 세 값이 같아야 함

# STEP 7. SKIN-02/REPORT-01 조회
curl -s "http://localhost:8090/api/v1/skin-records/today" -H "Authorization: Bearer $TOKEN"
curl -s "http://localhost:8090/api/v1/reports?period=7" -H "Authorization: Bearer $TOKEN"

# STEP 8. CHECK-02 위험도 분석 (실존 productId 확인 후)
docker exec ildangbaek-mysql mysql -uildangbaek -pildangbaek1234 ildangbaek -e "SELECT id FROM products LIMIT 1;"
curl -i -X POST "http://localhost:8090/api/v1/checks" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"productId":9001}'

# STEP 9. 실패 케이스 일괄 확인
curl -i "http://localhost:8090/api/v1/reports?period=14" -H "Authorization: Bearer $TOKEN"   # 422
curl -i "http://localhost:8090/api/v1/reports/insights/999999" -H "Authorization: Bearer $TOKEN"  # 404
curl -i "http://localhost:8090/api/v1/checks" -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"productId":999999}'  # 404

# STEP 10. 전체 자동 테스트
cd backend && ./gradlew test --rerun
```

---

## 15. 터미널 명령어 모음

### 서버 확인
```bash
curl -i http://localhost:8090/api/v1/health
lsof -i:8090
```

### DB 확인
```bash
docker ps --filter name=ildangbaek
docker exec ildangbaek-mysql mysql -uildangbaek -pildangbaek1234 ildangbaek -e "SHOW TABLES;"
docker exec ildangbaek-mysql mysql -uildangbaek -pildangbaek1234 ildangbaek -e "SELECT * FROM ingredient_profiles WHERE user_id=9001;"
```

### API 테스트
위 §14 STEP 3~9 참고.

### 로그 확인
```bash
# bootRun을 포그라운드로 띄웠다면 그 터미널이 곧 로그.
# 백그라운드로 띄웠다면:
tail -f /tmp/backend-boot.log
```

### 테스트 실행
```bash
cd backend && ./gradlew test --rerun
open build/reports/tests/test/index.html   # 상세 리포트
```

### Git 변경사항 확인
```bash
git log --oneline --decorate -30
git log --stat -20 -- backend/src/main/java/com/ildangbaek/backend/api/check
```

---

## 16. 최종 평가

**Backend B(분석 흐름) 구현은 아래와 같이 완료되었다(2026-08-14 재검증 세션 반영).**

```
Backend B
│
├── B-01~03 SKIN 도메인       구현 ✅  테스트(자동) ✅  실서버 ✅ (SKIN-01 이미지 업로드 3시나리오 포함 전량 실행)
├── B-04~06 F-ANALYSIS 계열   구현 ✅  테스트(자동) ✅  실서버 ✅ (3자 대조 완료)
├── B-07/08 USER-01/02        구현 ✅  테스트(자동) ✅  실서버 ✅ (시드 user_profiles 확인, 즉시 200)
├── B-09 PRODUCT-05           구현 ✅  테스트(자동) ✅  실서버 ✅ (3시나리오 실측, 과거 버그 미재현)
├── B-10~12 CHECK 도메인      구현 ✅  테스트(자동) ✅  실서버 ✅ (CHECK-03 N+1 3→2쿼리 수정 완료)
├── B-13~15 REPORT 도메인     구현 ✅  테스트(자동) ✅  실서버 ✅ (REPORT-01/02/03 전량 실행)
└── B-16/17 F-ANALYSIS-02/03  B-16 ⬜(미착수, A 선행 필요) · B-17 ✅(2026-08-14 구현·검증, ADR 0019)
```

- **자동 테스트**: 219개 전부 통과 (2026-08-14 세션 `./gradlew test --rerun` 재확인, 호르몬 분석
  테스트 20개 추가로 8/13의 199개에서 증가).
- **실서버 3자 값 대조(BR 4)**: USER-01/USER-02/CHECK-01의 `completionRate`가 동일 사용자 기준
  33으로 일치함을 재실측했다. 8/13 기록의 38과 다른 것은 이번 세션에서 P1 검증을 위해
  `f-analysis-01-mockup.sql`을 재적재하면서 사용자 9001의 `ingredient_profiles`가 전부
  `INSUFFICIENT`(판정 미확정)로 리셋됐기 때문 — 성분 커버리지 축(B)이 0이 되어 기록 충분성
  축(A)만으로 33%가 나온 것이며, BR 4가 검증하는 "세 엔드포인트가 서로 같은 값을 낸다"는 성질
  자체는 값과 무관하게 계속 성립한다.
- **8/13 문서가 "이번 세션 미실행"으로 남긴 항목을 2026-08-14 세션에서 모두 재현했다**: SKIN-01
  이미지 업로드(201/409/422), PRODUCT-05(201/409/201), REPORT-02(insightId=84), REPORT-03(오늘자
  daily), USER-02 필터 실패 케이스(422).
- **P1·P2를 코드로 확인·해소했다**:
  - P1(시드 `user_profiles` 부재)은 조사 결과 이미 세 시드 파일 모두에 반영돼 있었다 — 코드 수정
    없이 실측으로 문서만 갱신.
  - P2(CHECK-03 쿼리 수 3개, 기대 2개)는 `ProductRiskAssessment.user`가 `@ManyToOne` 기본값
    EAGER였던 것이 원인임을 규명하고 `LAZY`로 전환(`7b2c730`), SQL 로그로 2쿼리 감소를 확인했다.
- **다음으로 남은 것**:
  1. B-16(F-ANALYSIS-02)은 A의 HOME-01(환경 데이터 적재)이 선행돼야 시작 가능 — 팀 조율 필요.
  2. B-17(F-ANALYSIS-03)이 참조하는 호르몬 정보 입력 API(F-ONBOARD-03)가 없다 — A 담당 후속 이슈
     (STATUS.md §5 블로커 #10).
  3. B-10 CHECK-01의 추천 매칭 로직 자체(추천이 실제로 채워지는 케이스)는 아직 실측되지 않았다 —
     `GOOD` 성분을 가진 사용자로 재현 권장.

**다음으로 무엇을 수정해야 하는가 (요약)**: 8/13 세션이 남긴 문서화 미비(P1)와 실측 성능 이슈(P2)
모두 이번 세션에서 코드 확인 또는 수정으로 닫혔다. 신규 발견된 결함은 CHECK-03 N+1 하나였고 이미
수정·재검증했다. 남은 과제는 A 담당 선행 작업(HOME-01, F-ONBOARD-03)에 의존적이다.
