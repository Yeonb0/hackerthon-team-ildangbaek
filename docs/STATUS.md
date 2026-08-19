# 구현 현황 (STATUS)

> 이 문서는 **실제 구현·검증·배포 상태**를 기록한다. 계획이나 목표가 아니라 **지금 저장소에 있는 것**을 적는다.
> 완료로 표시하려면 코드가 실제로 존재하고 동작이 확인되어야 한다.

- 최종 갱신: 2026-08-19

> **2026-08-15 코드리뷰 및 수정 세션.** 백엔드 전체를 심각도 순으로 리뷰해 버그 4건과 인증 구조
> 1건을 수정했다. 커밋 단위: 테스트 DB 격리(H2, MySQL 없이도 빌드 통과) → USER-04 스킨타입 교체
> 유니크 제약 위반 → ReportService/SkinRecordService `@Transactional` 누락 → 지표 결측 조회 NPE
> → USER-04 성별 500 응답·호르몬 갱신 조건 → 인증 리졸버 단일화(ADR 0024). 상세는 아래 각 항목과
> ADR 0024 참고. 전체 테스트 210개 → **222개**(H2 인메모리 DB, 로컬 MySQL 불필요).

- 기준 커밋: `d4cacdd` (환경 요인 보정) — **`origin/main` 재확인 세션**: A 담당이 `main`에 반영한
  `home`·`location`·`record` 패키지(커밋 `1bf5f09 feat(home): add service flow APIs` 등)가 이미
  이 브랜치 HEAD에 병합돼 있음을 코드 대조로 확인. 아래 2.3절 A 담당 표를 "미착수" 위주에서
  "구현됨(대부분)"으로 갱신. **이번 세션은 코드 존재·명세 대조까지만 했고 실서버 동작 확인은
  하지 않았다** — 항목별로 아래 표에 명시
- 기준 브랜치: `yunjin` · 기본 브랜치: `boyeon`

> **2026-08-14 `origin/main` 병합.** A 담당 브랜치가 `main`에 반영한 AUTH(이메일)·PRODUCT-01~04
> ·PRODUCT-09(매칭)·PRODUCT-05 홈 조회·ROUTINE·USER 계정/저장 제품 조회를 `yunjin`에 병합했다.
> 코드 충돌 해결 내역:
> - `UserController`: `GET /users/me`는 정본(USER-01) `MyPageService.getMyPage`로 유지, main의
>   `UserService.getMe`는 `GET /users/me/account`(USER-01-B, 신규)로 경로 분리. `docs/api_명세서.md`에
>   USER-01-B·USER-01-C(`GET /users/me/products`) 추가.
> - `ProductRepository`: 양쪽 조회 메서드 모두 유지(순수 추가 충돌).
> - PRODUCT-05 저장 API 중복 구현(`api/product.ProductRecordController` vs
>   `api/productrecord.ProductRecordController`): main 쪽(`GET /home` 포함)을 정본으로 채택,
>   yunjin 쪽 구현·테스트 3개 삭제. **프론트 계약으로 확인함** —
>   `frontend/src/api/queries/product.ts`가 `GET /product-records/home?timeSlot=`을 호출하는데
>   이 엔드포인트는 main 쪽 구현에만 있었다(yunjin 쪽엔 `POST` 저장만 있고 홈 조회가 없었음).
>   `POST /product-records` 응답 필드(`recordId`·`timeSlot`·`recordedAt`·`productCount`·
>   `skinRecordSuggested`, `frontend/src/types/product.ts` `SaveProductRecordResult`)는 양쪽
>   구현이 동일해 이 필드만으로는 판별되지 않았다.
> - PRODUCT-09 매칭 API 중복 구현(`ProductMatchController` vs `ProductController.match`): main의
>   통합 `ProductController`로 일원화, yunjin의 `ProductMatchController`/`ProductMatchService` 삭제.
>   **프론트 계약으로는 확인 불가** — `GET /products/match`를 호출하는 프론트 코드가 없다(제품
>   수동 등록 화면의 매칭 자동완성이 아직 연동 전). 이 판단은 명세서(PRODUCT-09) 필드 일치 여부와
>   main 쪽 매칭 조건(대소문자 무시·부분일치)이 더 실사용에 적합하다는 점에만 근거했다 — 프론트가
>   연동되면 재검증이 필요하다.
> - `ProductCategory` enum: main의 확장 값 목록(`CLEANSING`/`SUNCREAM` 등)을 채택, `CheckHomeService`·
>   `CheckServiceTest`의 구값(`CLEANSER`/`SUNSCREEN`) 참조를 갱신. 로컬 MySQL `products` 및 FK
>   종속 테이블은 구 ENUM 스키마가 남아 있어 DROP 후 Hibernate 재생성으로 해소(로컬 개발 데이터 초기화).
> - `UserProfile.updateHormoneInfo` 시그니처 확장(피임약·프로게스테론·호르몬대체요법 3개 boolean 추가)에
>   맞춰 구 테스트 호출부 갱신.
> - 인증 방식 이원화 우려 없음: `CurrentUserResolver`(main)와 `CurrentUserIdArgumentResolver`(yunjin)
>   모두 `MockAccessToken.parseUserId`에 위임하도록 이미 통합되어 있다(ADR 0017).
>   **2026-08-15 갱신**: `CurrentUserResolver` 자체를 제거하고 `CurrentUserIdArgumentResolver`
>   하나로 합쳤다(ADR 0024). 리졸버가 `Long`뿐 아니라 `User` 엔티티 파라미터도 해석해, 컨트롤러가
>   더 이상 메서드 본문에서 인증을 직접 호출하지 않는다.
> - 백엔드 전체 테스트(210개) 통과 확인. main이 새로 들여온 AUTH(이메일)·PRODUCT-01~04·ROUTINE 도메인의
>   실제 기능 완성도·실서버 검증 상태는 이 세션에서 재조사하지 않았다 — 별도 검증 필요.

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
| 백엔드 — service / controller / dto | 🟡 | **skin · report · user · product · productrecord · routine · check · onboard · auth · home · location · record 12개 도메인 코드 존재.** 2026-08-15 재확인 — 이전 판에서 "미착수"로 적었던 HOME-01·RECORD-01/02·PRODUCT-01~05·07·08·USER-05~07은 실제로는 코드가 이미 있다(아래 2.3절). USER-03·04(프로필 조회/수정)와 PRODUCT-06(제품 기록 수정)도 2026-08-15에 구현 완료(실서버 미검증). AUTH-03(로그아웃)은 컨트롤러만 있고 토큰 폐기 로직 없는 빈 구현 |
| 프론트엔드 | 🟡 | 전 화면(S-00~S-24, S-03 결번) 구현 완료. 백엔드 실연동은 미착수 — `EXPO_PUBLIC_USE_MOCK=true`로 전부 목업 모드 동작 |
| 배포 | ⬜ | 미착수. 로컬 실행만 |

**실서버로 동작이 확인된 백엔드 엔드포인트는 여덟이다** — `GET /api/v1/health` ·
`POST /api/v1/skin-records` · `GET /api/v1/reports` · `GET /api/v1/reports/daily` ·
`GET /api/v1/reports/insights/{insightId}` · `GET /api/v1/users/me/ingredient-profile` ·
`POST /api/v1/checks` · `GET /api/v1/checks/{checkId}`.
**2026-08-15에 코드로 추가 확인된(실서버 미검증) 엔드포인트**: `GET /api/v1/home` ·
`GET /api/v1/locations` · `GET /api/v1/records/calendar` · `GET /api/v1/records/today` ·
`GET /api/v1/product-records/home` · `GET /api/v1/products` · `POST /api/v1/products/scan` ·
`GET /api/v1/products/{id}` · `GET /api/v1/products/match` · `POST/DELETE /api/v1/products/{id}/save` ·
`GET /api/v1/routines` · `POST /api/v1/routines/{routineId}/records` ·
`PATCH /api/v1/users/me/notification` · `PATCH /api/v1/users/me/location` ·
`GET /api/v1/users/me/products` · `GET /api/v1/users/me/account` ·
`POST /api/v1/auth/refresh` · `PATCH /api/v1/onboarding/hormone` · `POST /api/v1/onboarding/complete`.
컴파일되는 완성된 코드로는 보이나(TODO/스텁 아님) curl/실DB로 동작을 재현한 적은 없다 — 다음 세션 과제.

> ⚠️ **인증 방식 이원화는 해소됐다(2026-08-13, [ADR 0017](decisions/0017-임시-인증-토큰-통합.md)).**
> skin·report·check·product·user 도메인의 `CurrentUserIdArgumentResolver`가 `X-User-Id` 헤더
> 대신 A가 발급하는 `Authorization: Bearer mock-access-{userId}-{uuid}` 목업 토큰을 읽도록
> 바뀌었다(`global/auth/MockAccessToken` 공용 파서로 auth 도메인의 `CurrentUserResolver`와
> 로직 통합). **AUTH-01 로그인 → ONBOARD → SKIN/REPORT/CHECK/USER가 이제 토큰 하나로 이어진다**
> — 로컬 MySQL 실서버로 로그인 → 온보딩 → 마이페이지/성분 프로필 조회까지 같은 토큰으로 검증
> 완료(2026-08-13). 백엔드 테스트 199개 통과.
>
> **여전히 인증이 아니다.** 토큰은 서명 검증이 없어 형식만 맞추면 위조할 수 있다. `X-User-Id`
> 위조 위험과 동일 수준이며 **배포 전 반드시 실제 인증(JWT 서명 검증 등)으로 교체해야 한다.**
>
> **2026-08-15 갱신 — 리졸버 단일화([ADR 0024](decisions/0024-current-user-id-리졸버-단일화.md)).**
> `CurrentUserResolver`를 제거했다. 코드리뷰 중 `ProductController`의 세 핸들러가
> `currentUserResolver.resolve(authorization)`의 반환값을 버리고 인증 부수효과만 노리는
> 코드였음을 발견했다 — 인가 검사가 메서드 본문 한 줄에 의존하는 형태라 그 줄을 빠뜨리면
> 인증 없이 뚫린다. `CurrentUserIdArgumentResolver`가 `User` 엔티티 파라미터도 해석하도록 넓혀
> 21개 호출부를 전부 옮겼다. 토큰 검증 자체는 여전히 서명 없는 임시 방편이라 위 경고는 그대로
> 유효하다.

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
| **인증 (JWT · Security)** | 🟡 | **임시 방편만 있음.** 목업 Bearer 토큰 → `@CurrentUserId`(`Long`·`User` 모두 해석, ADR 0006 · 0017 · 0024). 위조 가능 · 배포 전 교체 필수 |
| 이미지 업로드 · 스토리지 | 🟡 | `ImageStorage` + `LocalImageStorage` (ADR 0007). multipart 10MB. **로컬 저장이라 다중 인스턴스·재배포 시 유실** |
| 날짜 귀속 유틸 | ✅ | `global/util/RecordDateResolver` · 경계값 테스트 13종 (ADR 0005 — **확정**) |
| 피부 분석 클라이언트 | 🟡 | `SkinAnalysisClient` — 목업(`MockSkinAnalysisClient`, 결정적 · 실패 재현 가능), 규칙 기반 자체 서버 연동(`LocalVisionSkinAnalysisClient`, ADR 0020) 2종. `app.skin.analysis.provider`(`mock`/`local-vision`)로 전환. Spring이 직접 호출하는 OpenAI 클라이언트는 폐기했다(ADR 0022) — OpenAI Vision은 이제 ai-server 내부의 2차 확정 단계로만 쓰인다. 단위 테스트만 검증했고 **자체 서버 경로의 실제 얼굴 사진 E2E 호출은 아직 안 함** — 실사용 전 필요. **2026-08-16**: `SkinAnalysisResult`에 `rawValues`·`confidence`·`algorithmVersion`·`normalizationVersion` 추가(ADR 0026) — ai-server 응답의 `raw`/`pores_reliability`/버전 필드를 파싱해 옮긴다. 목업은 근거가 없어 `ofScoresOnly()`로 점수만 채운다. **2026-08-17: `@Autowired` 누락으로 앱이 기동하지 않던 것을 고침** — `b061302`에서 테스트용 생성자가 추가되며 생성자가 둘이 됐는데 어느 쪽에도 표시가 없어 Spring이 주입 대상을 못 골랐다(`NoSuchMethodException: <init>()`). 단위 테스트는 목을 써서 컨텍스트 로딩을 검증하지 않아 잡히지 않았다 — **`@SpringBootTest` 스모크 테스트가 없다는 공백이 드러난 건이다**(2.20절). **2026-08-18**: `SkinAnalysisResult`에 `skinComment` 추가(ADR 0022 연장) — ai-server의 `skin_comment`를 파싱해 `SkinRecord.skin_comment`(신규 컬럼, `ddl-auto: update`로 반영)에 저장하고 `SkinRecordResponse`로 내려준다. 규칙 기반 폴백·목업은 근거가 없어 `null` |
| 규칙 기반 분석 서버 (`ai-server/`) | 🟡 | FastAPI. MediaPipe 얼굴 검출·피부 영역 분리 → Shades of Gray 화이트밸런스·품질 게이트 → CIELAB 기반 1차 지표 4종 산출(딥러닝 모델 아님, ADR 0020) → OpenAI Vision(`gpt-4o`)이 1차 점수를 근거로 최종 점수 확정, 클램핑 없음(ADR 0022). `OPENAI_API_KEY` 미설정 시 1차 점수로 자동 폴백. **`POST /product-comments`로 제품 추천 AI 코멘트도 배치 생성(ADR 0025)** — 추천 판단은 여전히 Spring의 규칙 기반, AI는 문구만 생성. **2026-08-16**: `/analyze` 응답에 1차(CIELAB) 원시 측정값(`raw`)과 `algorithm_version`/`normalization_version`을 추가(ADR 0026) — OpenAI가 최종 score를 덮어써도 `raw`는 1차 규칙 기반 값을 그대로 유지한다. **2026-08-18**: `vision.refine()`이 최종 점수와 함께 40~70자 `skin_comment`도 받도록 프롬프트·응답 스키마 확장 — 1차 규칙 기반 단계는 근거가 없어 폴백 시 `null`. 파이썬 테스트 78개(OpenAI는 fake 클라이언트로 검증), 합성 이미지로만 검증 — **실제 얼굴 사진 검증 안 함**, **OpenAI 확정·코멘트 생성 모두 실 API 키 E2E 검증 안 함**. 모공 지표는 실측상 신뢰도 낮음(`ai-server/README.md` 신뢰도 표), OpenAI에 재위임하지 않고 규칙 기반 판정 유지 |

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

담당은 A / B 분담을 따른다. **아래 A 담당 표는 2026-08-15에 코드 대조로 재갱신했다.** `origin/main`을
fetch해 확인한 결과, 2026-08-14 판까지 "미착수"로 적었던 HOME-01·RECORD-01/02·PRODUCT 대부분·
USER-05~07이 A 담당 커밋(`1bf5f09 feat(home): add service flow APIs` 등)으로 이미 구현되어
이 브랜치 HEAD(`d4cacdd`)에 들어와 있었다 — 이전 판이 이를 반영하지 못한 stale 상태였다.
**이번 재갱신은 코드 존재·명세 대조(파일 읽기)로만 판단했고, 실서버 기동·curl 검증은 하지
않았다** — 상태 기호 🟡는 "코드는 있으나 실서버 미검증"을 뜻하며 이전 판의 🟡(부분 구현)와
의미가 다를 수 있으니 비고를 함께 봐야 한다.

#### A 담당 — 서비스 기본 흐름 

| API | 상태 | 비고 |
| --- | --- | --- |
| AUTH-01~02 로그인 · 재발급 | 🟡 | 코드 존재. `POST /login`은 인증 통합 검증(ADR 0017, 2026-08-13)에서 실서버로 확인. `/refresh`는 코드 확인만(2026-08-15), 실서버 미검증. 테스트 파일 0개 |
| AUTH-03 로그아웃 | 🟡 | **컨트롤러가 `AuthService` 호출 없이 바로 200을 반환**(`AuthController.java:35-38`) — 토큰 폐기 로직이 없다. 인증 자체가 mock 토큰(서명 없음, 서버 저장 안 함)이라 "폐기할 대상"이 애초에 없는 구조적 결과로 보이나, 명세 BR 1("서버에 저장된 Refresh Token을 폐기한다")과는 형식상 어긋난다. 실제 인증 도입 시 재구현 필요 |
| ONBOARD-01~05 온보딩 | 🟡 | 코드 존재(상태조회·`basic-info`·`skin-types`·`hormone`·`complete` 5단계 모두 컨트롤러/서비스 메서드 있음). `basic-info`·`skin-types`는 인증 통합 검증(ADR 0017, 2026-08-13)에서 실서버로 확인. **`hormone`·`complete`는 2026-08-15 기준 코드 확인만, 실서버 미검증** — 5절 블로커 #10("호르몬 저장 API 없음")은 코드상 해소된 것으로 보이나 실서버 검증 전이라 완전히 닫지 않음. 테스트 파일 0개 |
| USER-01 마이페이지 조회 | ✅ | 원래 A 담당이나 F-ANALYSIS-05 BR 4(값 일치) 검증을 위해 B가 구현. `MyPageService` |
| USER-02 성분 프로파일 조회 | ✅ | B 구현(2.10절) |
| USER-03 프로필 조회 | 🟡 | `UserController.getProfile()` — `GET /api/v1/users/me/profile`. `UserService.getProfile()`이 프로필·피부타입·알림설정을 조합해 반환. 엔티티의 `menstrualStatus`+`oralContraceptive`+`progesteroneInjection` 조합을 API `hormoneStatus` 4종으로 역매핑한다. 구현 2026-08-15, 실서버 미검증, 테스트 없음 |
| USER-04 프로필 수정 | 🟡 | `UserController.updateProfile()` — `PATCH /api/v1/users/me/profile`. 전달된 필드만 수정(BR 2), `gender`를 FEMALE 외 값으로 바꾸면 `UserProfile.clearHormoneInfo()`로 호르몬 필드 초기화(BR 3), `skinTypes`는 전체 교체(BR 4). 응답은 USER-03과 동일한 전체 프로필. 구현 2026-08-15, 실서버 미검증. **2026-08-15 코드리뷰로 버그 3건 수정**: (1) `skinTypes` 교체가 `deleteAllByUserId`(select 후 개별 remove) 뒤 바로 `save`(IDENTITY 즉시 INSERT)해 기존과 겹치는 값에서 유니크 제약 위반 → flush로 순서 고정, (2) `gender`를 String으로 받아 `Gender.valueOf`가 잘못된 값에 500을 내던 것 → `GenderRequest` enum으로 Jackson이 400을 내게 함, (3) 호르몬 갱신 조건이 이미 갱신된 엔티티 값을 else-if로 읽어 `gender`만 보낸 요청에서 아무 일도 안 하던 것 → "수정 후 성별" 기준으로 재작성. H2 실DB·MockMvc로 재현·검증하는 테스트 추가(`UserProfileUpdateTest`, `ProfileUpdateValidationTest`) |
| USER-05 지역 목록 조회 | 🟡 | `LocationController.searchLocations()` — `GET /api/v1/locations?keyword=`. 코드 존재, 실서버 미검증. 지역 데이터가 하드코딩된 시/도 6개(`LocationSeed`) 샘플 수준 — 명세가 요구하는 시/구 단위 전국 목록에는 못 미침(명세 자체도 "전국 시/구 목록 확보 필요"로 미정 표시) |
| USER-06 위치 설정 | 🟡 | `UserController.updateLocation()` — `PATCH /api/v1/users/me/location`. 코드 존재, 실서버 미검증 |
| USER-07 알림 설정 | 🟡 | `UserController.updateNotification()` — `PATCH /api/v1/users/me/notification`. 코드 존재, 실서버 미검증 |
| HOME-01 홈 조회 | 🟡 | `HomeController.getHome()` — `GET /api/v1/home?homeType=&weekStart=`. `HomeService`가 낮/밤 판정·environment·routineRecommendation·todayRecord·weeklyCalendar·todayReport를 명세 필드 구조대로 채움. `weekStart`(`SUNDAY`/`MONDAY`, 기본 `MONDAY`, 그 외 값은 `MONDAY`로 처리)로 `weeklyCalendar`의 "이번 주" 시작일 계산 기준을 지정 가능(2026-08-15 추가, 프론트 요청). **다만 `environment`는 실제 날씨 API 연동 없이 단순화된 값으로 보이고, `failedSections`는 항상 빈 배열 고정 반환** — 부분 실패 처리가 명세만큼 정교하지 않을 수 있다. 테스트 없음, 실서버 미검증 |
| RECORD-01~02 기록 허브 | 🟡 | `RecordController` — `GET /api/v1/records/calendar?yearMonth=`(RECORD-01) · `GET /api/v1/records/today`(RECORD-02). `RecordHubService`(138줄), `yearMonth` 파싱 실패 시 `RECORD_INVALID_MONTH` 예외 처리도 있음. 테스트 없음, 실서버 미검증 |
| PRODUCT-01·02·03·04·05·07·08 | 🟡 | 코드 존재. `ProductController`(검색·상세·스캔·매칭·찜), `ProductRecordController`(`GET /product-records/home`=PRODUCT-01, `POST /product-records`=PRODUCT-05), `RoutineController`(`GET /routines`=PRODUCT-07, `POST /routines/{id}/records`=PRODUCT-08). PRODUCT-05만 B가 실서버 검증 완료(2.13절), 나머지는 코드 확인만(2026-08-15), 실서버 미검증. 테스트는 `ProductRecordWriterTest` 1개뿐, `productrecord`·`routine` 패키지 테스트 0개 |
| PRODUCT-06 제품 기록 수정 | 🟡 | `ProductRecordController.update()` — `PATCH /api/v1/product-records/{recordId}`. `productIds` 전체 교체(기존 항목 삭제 후 요청 순서대로 `usageOrder` 재부여), 날짜 제한 없이 과거 제품 기록도 수정 가능, 타인 기록/미존재는 `PRODUCT_RECORD_NOT_FOUND`(404). 수정 시각은 `BaseTimeEntity.updatedAt` 자동 갱신으로 처리. 성분분석 결과 재계산은 이번 범위 제외. 구현 2026-08-15, 과거 기록 수정 허용은 2026-08-19 반영, 테스트 없음 |
| F-PRODUCT-08 제품 직접 등록 | 🟡 | **TBD-07 해소**([ADR 0023](decisions/0023-제품-직접-등록-화면-확정.md), 2026-08-15) — `ProductController.register()`, `POST /api/v1/products`(PRODUCT-10, multipart). `ProductService.registerProduct()`가 `dataSource=USER`로 즉시 전체 공개 저장, 자유 텍스트 성분은 카탈로그에 없으면 신규 `Ingredient` 생성. 이미지는 `LocalImageStorage` 재사용, 형식(jpg/jpeg/png)·크기(10MB) 검증은 `SkinRecordService`와 같은 규칙으로 `ProductService.validateImage()`에서 수행. 같은 성분명이 중복 입력되면 첫 번째만 연결한다 — `product_ingredients`의 `(product_id, ingredient_id)` 유니크 제약 때문에 그대로 INSERT하면 500이 났다(2026-08-15 리뷰에서 발견·수정). 소유자별 비공개·서버측 중복 차단은 이번 범위 제외(ADR 0023 참고). 백엔드만 구현, 프론트 `registerProduct()`는 여전히 목업 — 실연동은 후속 작업. 구현 2026-08-15, 실서버 미검증, 단위 테스트 `ProductRegisterTest`(성분 중복 제거·displayOrder·이미지 형식 거절·사진 생략) |

> ⚠️ **AUTH·ONBOARD는 "코드가 있다"만 확인했다.** `saveSkinTypes`가 `skin_types` 마스터를
> `orElseGet`으로 자동 생성하도록 짜여 있어 2.8절의 "민감성 완화가 온보딩 부재로 동작 안 함" 경고도
> 이제 stale할 가능성이 있으나, 실서버로 온보딩 → 민감성 완화 흐름을 재검증하지 않아 아직 확정할 수
> 없다. B 담당 F-ANALYSIS 항목이 아니라 후속 검증 항목으로 남겨둔다.

#### B 담당 — 분석 흐름

| API | 상태 | 선행 조건 |
| --- | --- | --- |
| SKIN-01 피부 기록 생성 및 분석 | ✅ | 임시 인증(ADR 0006) · 로컬 스토리지(ADR 0007)로 해소 |
| SKIN-02 오늘 피부 결과 조회 | ✅ | 2.5절. 로컬 MySQL로 실서버 확인(2026-08-13) — 실서버에서만 드러난 버그 1건(NIGHT 자정 경계 404) 수정. **2026-08-15**: 지표 4종 중 일부가 없는 기록(분석 부분 실패 등) 조회 시 언박싱 NPE로 500 나던 버그 수정(`SkinRecordService.buildComparison`, `SkinScoresResponse.from`). 조회 메서드에 누락됐던 `@Transactional(readOnly = true)`도 함께 추가 |
| SKIN-03 피부 기록 상세 조회 | ✅ | 2.5절. 로컬 MySQL로 실서버 확인(2026-08-13). 소유권 격리(404) 확인. **2026-08-15**: `@Transactional(readOnly = true)` 누락 수정 |
| F-ANALYSIS-01 성분-피부 시차 분석 | ✅ | 로컬 MySQL로 실서버 확인(2026-08-12 · 2.7절). ADR 0014 기준 재검증 완료 — 회귀 기준선 · 슬롯 분리 전용 시드 · PRODUCT-05 실입력 경로 3축. **2026-08-19**: `LagCorrelationAnalyzer`의 악화/개선 방향이 반대로 계산되던 버그 수정(2.21절) — 지표는 점수가 높을수록 좋은 상태(ADR 0002)인데 점수 상승을 WORSENED로 세고 있었다 |
| F-ANALYSIS-02 환경 요인 보정 | ✅ | 자외선 급변일 계산(`IngredientLagAnalysisService.loadUvVolatileDates`) + `LagCorrelationAnalyzer`·`LagInsightWriter` 연동, 호르몬 보정과 곱셈 합성(ADR 0021). 로직·단위 테스트는 완료. **단, `daily_environments`에 실제로 쓰는 프로덕션 코드(F-HOME-03, A 담당)가 아직 없어 실사용 데이터에서는 급변일 집합이 항상 비어 보정이 미적용 경로로만 흐름 — BR 3이 요구하는 정상 동작이며, F-HOME-03 적재가 붙는 즉시 코드 변경 없이 동작. 검증은 목업 데이터로 함** |
| F-ANALYSIS-03 호르몬 요인 반영 | ✅ | 주기 구간 계산(`MenstrualCycleCalculator`) + `LagCorrelationAnalyzer`·`LagInsightWriter` 연동(ADR 0019). 로컬 MySQL로 실서버 확인(2026-08-14) — `user_profiles`에 호르몬 정보를 직접 넣고 SKIN-01 재분석 시 신뢰도 100→80(20% 감쇄) 및 확정→확인중 전환을 API 응답(`GET /reports`)에서 재현. **단, 호르몬 정보를 입력하는 API(F-ONBOARD-03 `hormone` 단계)가 아직 없어 DB 직접 수정으로 우회 검증함 — A 담당 온보딩 API 미구현이 후속 이슈** |
| F-ANALYSIS-04 성분 프로파일 갱신 | ✅ | 분류 로직 구현 완료(ADR 0010). **USER-02 응답 경로로 실서버 확인**(2026-08-11). PRODUCT-05 실입력 경로 재검증 완료(2026-08-12 · 2.7절) — API로 넣은 제품 기록이 `CAUTION` 행까지 만든다 |
| F-ANALYSIS-05 프로파일 완성도 계산 | ✅ | 산출식 구현 완료(ADR 0011). **소비처 3곳(USER-01 · USER-02 · CHECK-01) 모두 연결 완료.** 단위 테스트로 세 서비스가 `ProfileCompletionCalculator` 값을 그대로 위임하는지 확인(BR 4) — 실서버 3자 대조는 아직 |
| CHECK-01 쇼핑 홈 | ✅ | `ProductRepository`·`ProductIngredientRepository`가 이미 존재해 구현 가능했다(이전 "제품 목록 없어 미착수" 기록은 stale). `CheckHomeService` — GOOD 성분을 `key_ingredient`로 가진 제품을 제품 단위로 dedup해 추천. **2026-08-14: `category`·`todayContext` 추가(ADR 0018)** — 프론트 SHOP-01 3분류 요청 대응, 백엔드 API만 준비(프론트 화면은 미구현, `boyeon` 브랜치 `ShoppingScreen.tsx`는 아직 단일 섹션). **2026-08-16: `aiComment` 추가(ADR 0025)** — ai-server가 배치로 생성한 AI 코멘트, 실패 시 `null`. 단위 테스트로 확인, 실서버 미검증. **2026-08-17: `tags` 추가(ADR 0027)** — 프론트 SHOP-01 태그 칩 대응. AI가 아니라 규칙으로 도출(`category` + 사용자 CAUTION 성분 유무), 주의 성분이 있으면 둘째 칩을 붙이지 않음. 추천 제품 전체 성분을 1회 더 조회(제품 수와 무관하게 고정) |
| CHECK-02 위험도 분석 | ✅ | 로컬 MySQL로 실서버 확인(2026-08-12 · 2.14절). ADR 0015 — 등급 산출 기준 신설 |
| CHECK-03 확인 결과 조회 | ✅ | 로컬 MySQL로 실서버 확인(2026-08-12 · 2.14절). CHECK-02와 같은 DTO·조립 로직 |
| USER-02 성분 프로파일 전체 조회 | ✅ | 로컬 MySQL로 실서버 확인(2026-08-11 · 2.10절). ADR 0004 양방향 변환 · ADR 0011 완성도 연결 |
| REPORT-01 리포트 조회 | ✅ | SKIN-01. `insights`는 F-ANALYSIS-01 결과를 반환한다. PRODUCT-05 실입력 경로로도 재검증 완료(2026-08-12 · 2.7절) — API로 넣은 기록이 `insights`까지 나온다. **2026-08-15**: `ReportService`의 조회 메서드 3개(REPORT-01~03) 모두에 `@Transactional(readOnly = true)`가 빠져 있던 것을 수정 — `open-in-view: false`라 지연 로딩 프록시를 건드리면 `LazyInitializationException`이 날 수 있었다. **2026-08-17**: 프론트 요청(리포트 상단 "종합 피부 점수" 카드)에 맞춰 `summary`(`totalScore`·`totalDelta`·지표별 `metrics`·`graph`) 필드를 추가 — 실서버 미검증, 단위 테스트만 완료(아래 2.6절 추가분) |
| PRODUCT-05 제품 기록 저장 | ✅ | 2.13절. 원래 A 담당이나 B가 대신 구현. 로컬 MySQL로 실서버 확인(2026-08-12) — 실서버에서만 드러난 버그 2건(`force` 생략 400 · `force: true` 500) 수정. **2026-08-19**: `getHome()`(PRODUCT-01) 저장 목록 조회가 `usageStatus` 필터 없이 STOPPED 제품까지 보여주던 버그 수정(2.21절) |
| REPORT-02 요인 상세 조회 | ✅ | 로컬 MySQL로 실서버 확인(2026-08-11 · 2.12절). ADR 0013 — 이벤트 조회 시점 도출 · 그래프 ADR 0012 적용. **2026-08-17: `events[].delta`·`events[].eventKind`·`summary` 추가(ADR 0027)** — 프론트가 `impact` 문구를 정규식 파싱하던 것을 대체, 전부 기존 값의 노출이라 분석 로직 불변. **2026-08-17: `tip` 추가(ADR 0028)** — ai-server 생성, 실패 시 `null`. 단위 테스트로 확인, **실서버·실 OpenAI 키 미검증** |
| REPORT-03 일자별 리포트 조회 | ✅ | 로컬 MySQL로 실서버 확인(2026-08-11 · 2.11절). SKIN-01 응답 구조 재사용 · ADR 0012 원칙 유지 |
| PRODUCT-09 제품 매칭 조회(신규) | ✅ | 2026-08-14 신규. `GET /products/match?name=&brand=` — 프론트 `ProductManualRegisterScreen`(boyeon, 등록 저장은 여전히 목업) 지원용. `ProductMatchService`/`ProductMatchController`. F-PRODUCT-08 저장 자체는 PRODUCT-10(2026-08-15 구현, 아래 156행)이 맡는다. 단위 테스트 없음(단순 위임 로직), 실서버 미검증 |

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
  지정 시 `RecordDateResolver`로 계산한 날짜 + 해당 슬롯으로 조회.
- SKIN-03: `findByIdAndUserId`로 소유자 검증. 다른 사용자의 기록이거나 존재하지 않으면 둘 다
  `404 SKIN_RECORD_NOT_FOUND`로 응답해 존재 여부를 숨긴다(명세에 없는 403 대신 채택한 판단).
- `comparison`은 SKIN-01과 동일한 규칙(전일 동일 슬롯 비교)을 재사용한다.

서비스 단위 테스트 7개(정상 조회 2 · 최근 기록 자동 선택 1 · **NIGHT 자정 경계 1**(아래 버그 회귀) ·
404 2 · 소유자 검증 1).

**로컬 MySQL 실서버 검증 완료(2026-08-13).** 신규 사용자로 SKIN-01 → SKIN-02 → SKIN-03을 HTTP로
직접 호출해 확인했다.

| 시나리오 | 기대 | 결과 |
| --- | --- | --- |
| SKIN-02 `timeSlot` 미지정 | 200 · 최근 기록 | 일치 |
| SKIN-02 `timeSlot` 지정 | 200 · 해당 슬롯 기록 | 일치 |
| SKIN-02 없는 슬롯 조합 | 404 `SKIN_RECORD_NOT_FOUND` | 일치 |
| SKIN-02 정의되지 않은 `timeSlot` | 400 `RECORD_INVALID_TIME_SLOT` | 일치 |
| SKIN-03 본인 기록 상세 | 200 | 일치 |
| SKIN-03 존재하지 않는 ID | 404 | 일치 |
| SKIN-03 타 사용자 기록 조회 | 404(403 아님) | 일치 · 소유권 격리 확인 |
| SKIN-02/03 인증 헤더 누락 | 401 | 일치 |
| SKIN-01→02→03의 `comparison` 일치 | 세 응답이 동일한 구조 | 일치 · 전일 비교 계산이 세 API에서 동일하게 나옴 |

**실서버 검증에서 버그 1건을 찾아 고쳤다.** `SkinRecordService.getToday`가 `timeSlot` 지정 조회에
`RecordDateResolver.resolve(...)` 대신 `LocalDate.now()`를 그대로 썼다. NIGHT는 자정 직후
(00:00~05:59)에 전날 날짜로 귀속되는데(ADR 0005), 조회는 오늘 날짜로 찾아 **방금 저장한 기록이
404로 잡히지 않는** 경로였다. 00:02에 NIGHT 기록을 저장한 뒤 `GET /skin-records/today?timeSlot=NIGHT`로
직접 재현했고(404), 수정 후 같은 요청이 200으로 그 기록을 정확히 반환하는 것을 확인했다(2026-08-13).
서비스 단위 테스트는 `LocalDate.now()`를 그대로 검증에 썼던 기존 테스트라 이 경로를 잡지 못했다 —
`getTodayResolvesNightDateWithRecordDateResolver`를 추가해 리포지토리 호출 인자가
`RecordDateResolver.resolve(...)` 결과와 같은지 고정했다(시각 무관하게 항상 재현되도록 실시간
계산값과 비교하는 방식을 썼다).

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

**2026-08-17 추가 — `summary` 필드.** 프론트가 리포트 화면 상단 "종합 피부 점수" 카드에 쓸
기간 종합 데이터가 없다는 요청을 받아 추가했다.

- `summary.totalScore`는 기간 내 지표 4종 값을 모두 모은 평균 — SKIN-01의 `totalScore` 산출식
  (ADR 0008)을 기간 단위로 그대로 확장했다. 새 ADR을 따로 만들지 않았다 — 계산식 자체가 아니라
  적용 범위(레코드 1건 → 기간 전체)만 넓힌 것이라 기존 결정을 벗어나지 않는다고 판단했다.
- `summary.metrics[].delta` · `summary.totalDelta`는 직전 동일 길이 기간과 비교한다. 직전 기간에
  기록이 아예 없으면(신규 가입자 등) `0`을 반환한다 — SKIN-01의 "비교 대상 없으면 `comparison`
  자체가 `null`"과 달리 여기서는 필드 자체를 없앨 수 없는 구조라(항상 존재해야 하는 카드) 값이
  없다는 신호를 `0`으로 근사했다. 프론트가 "변화 없음"과 "비교 불가"를 구분해야 하면 추후
  `totalDelta`를 `Integer`(nullable)로 바꾸는 논의가 필요하다.
- `summary.graph`는 기존 `graph`와 달리 모닝·나이트를 접어 하루 하나의 값으로 낸다(ADR 0012는
  지표별 상세 그래프에만 적용되고, 종합 점수 카드의 미니 추이 그래프는 요청 문서가 대표값 하나를
  요구했다). 기록별 종합 점수는 재계산하지 않고 `SkinRecord.overallScore`를 그대로 읽는다.
- 단위 테스트 3개 추가(총점·지표별 평균 및 증감 1 · 직전 기간 기록 없을 때 증감 0 1 ·
  그래프 슬롯 병합과 결측 null 1). **실서버·프론트 연동 검증은 아직이다** — 로컬 컴파일과
  단위 테스트만 통과한 상태.

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

확정 기준과 계산 규칙은 [ADR 0009](decisions/0009-시차-분석-패턴-확정-기준.md)에 있다. 모닝·나이트
슬롯 처리는 이후 [ADR 0014](decisions/0014-시차-분석-모닝나이트-슬롯-분리.md)로 바뀌었고,
**ADR 0014 기준으로 재검증을 마쳤다(2026-08-12).** 아래 표가 그 결과다.

**제품 기록 저장 API(PRODUCT-05)는 2.13절에서 구현했다(원래 A 담당, B가 대신 구현).** 이번 회차에서
**실입력 경로(HTTP)로 재검증했다** — 아래 "실입력 경로 검증" 절을 보라. 시드로 `product_records`를
채우지 않고 `POST /api/v1/product-records`로만 넣어도 같은 결과가 나온다.

#### 회귀 기준선 — 목업 시드

목업 시드(`backend/src/test/resources/seed/f-analysis-01-mockup.sql`)로 로컬 MySQL + 실서버 확인
(2026-08-09 최초, **2026-08-12 ADR 0014 기준 재검증**). 무작위가 아니라 **의도한 패턴**을 심는다 —
그래야 분석기가 그 패턴을 잡았는지 알 수 있다.

이 시드는 피부 기록도 제품 기록도 전부 `NIGHT` 단일 슬롯이라, 슬롯을 평균으로 접든(구버전)
슬롯별로 나누든(ADR 0014) **결과가 같다.** 그래서 아래 표는 "ADR 0014가 기존 판정을 깨뜨리지
않았다"는 회귀 확인이며, 슬롯 분리 자체의 검증은 다음 절의 별도 시드가 맡는다.

| 시나리오 | 기대 | 결과(2026-08-12 재검증) |
| --- | --- | --- |
| 레티놀 18·12·6일 전 사용 → 2일 뒤 트러블 +15 | `OBSERVED` | 신뢰도 100 · `lag_days` 2 · `average_delta` 15.00 — 변동 없음 |
| 판테놀 18·11·8일 전 사용 → 뒤따르는 변화 없음 | `OBSERVING` | 신뢰도 33.33 · `average_delta` 5.00 — 변동 없음 |
| 히알루론산(레티놀 세럼에 동봉) | 레티놀과 동일 패턴 | `OBSERVED` 신뢰도 100 — **의도된 한계**(ADR 0009) |
| REPORT-01 `insights` 정렬 | OBSERVED 우선 | 확정 2건이 앞, 확인 중 3건이 뒤 |
| 같은 사용자 재분석 | 누적되지 않음 | 5행 유지 · 프로파일 행 id 1·2·3 유지 |
| 제품 기록 없는 사용자 | 빈 배열 · 오류 없음 | SKIN-01 201 · `insights: []` |

**ADR 0014 전후로 이 표의 수치는 하나도 바뀌지 않았다.** 단일 슬롯 시드에서는 두 규칙이 같은
값을 내기 때문이며, 예상된 결과다.

#### 슬롯 분리 검증 — ADR 0014 전용 시드

`backend/src/test/resources/seed/f-analysis-01-slots.sql`. 위 시드로는 확인할 수 없는 ADR 0014의
핵심(모닝 점수가 나이트 기준선에 섞이지 않는다 · 노출을 슬롯별로 센다)을 실서버로 확인한다.
기존 시드는 회귀 기준선이라 그대로 두고 별도 파일로 만들었다. 로컬 MySQL 실서버 확인(2026-08-12).

| 사용자 | 시나리오 | 기대 | 결과 |
| --- | --- | --- | --- |
| 9101 (Case A) | 나이트 사용 성분 · 나이트 트러블 20일 내내 50 고정 · 모닝만 사용일 10 / 2일 뒤 90 | 나이트끼리 비교 → `average_delta` 0 · 확정 안 됨 | `average_delta` **0.00** · `OBSERVING` · 프로파일 `INSUFFICIENT` |
| 9101 (Case A) | 같은 데이터를 구버전(평균 합산) 규칙으로 계산하면 | baseline (50+10)/2=30 → D+2 (50+90)/2=70 → **+40으로 확정** | 실제로는 확정되지 않음 — **왜곡이 사라진 것을 확인** |
| 9102 (Case B) | 같은 성분을 같은 날 모닝·나이트 모두 사용(15·9·3일 전) · 두 슬롯 모두 2일 뒤 +12 | 관측 쌍 **6건**(사용일 3 × 슬롯 2) | 신뢰도 100 · `average_delta` 12.00 · 근거 "**6회 중 6회** 관찰됐어요" |
| 9102 (Case B) | 구버전(노출 1건)이면 | 관측 쌍 3건 | 3건이 아니라 6건 — **노출이 슬롯별로 분리됨을 확인** |

**Case A가 이 시드의 핵심 판정이다.** 나이아신아마이드가 `OBSERVED`로 나오면 슬롯 분리가 깨진
것이다. 실제 결과는 `average_delta` 0.00으로, 모닝의 ±40 요동이 나이트 기준선에 전혀 섞이지 않았다.

> `ingredient_profiles.observation_count`는 Case B에서 **3**이다(근거 문구의 "6회"와 다르다).
> 전자는 **사용일 수**(날짜 단위), 후자는 **관측 쌍 수**(슬롯 단위)로 서로 다른 것을 센다.
> `IngredientProfileWriter.countExposureDays`가 의도적으로 날짜로 접는다 — 불일치가 아니다.

#### 실입력 경로 검증 — PRODUCT-05 → 분석 → REPORT-01

시드로 `product_records`를 채우지 않고, **제품 기록을 전부 `POST /api/v1/product-records`(HTTP)로
넣어** 같은 결과가 나오는지 확인했다(사용자 9103, 2026-08-12). 피부 기록만 시드로 깔았다.

| 단계 | 결과 |
| --- | --- |
| `POST /product-records` × 3 (레티놀 세럼) | 201 · `product_records` 3행이 API로 생성됨 |
| `POST /skin-records` (분석 트리거) | 201 |
| `GET /reports` `insights` | 레티놀 · 히알루론산 `OBSERVED` — 시드 기준선과 동일 |
| `analysis_insights` | 신뢰도 100 · `lag_days` 2 · `average_delta` 15.00 — 시드와 일치 |
| `ingredient_profiles` | 레티놀 · 히알루론산 `CAUTION` · 근거 "3회 중 3회" |

**"제품 기록이 시드로만 존재한다"는 제약은 이로써 해소됐다.** F-ANALYSIS-01은 실사용 경로에서
동작한다. 다만 PRODUCT-05는 오늘 날짜로만 기록하므로(`RecordDateResolver`), 과거 사용일 패턴을
만들려면 API로 만든 행의 `record_date`를 뒤로 옮겼다 — 행 자체는 API가 생성한 것이다.

**이 검증에서 실서버에서만 드러난 버그 2건을 찾아 고쳤다.** 둘 다 서비스 단위 테스트가 잡지 못한
경로다(2.13절에 상세).

자동 테스트 17개 — `LagCorrelationAnalyzerTest` 10개(확정 1 · 미확정 3 · 데이터 부족 2 · 시차 범위 1 ·
슬롯 분리 2 · 정렬 1)와 `IngredientLagAnalysisServiceTest` 7개. 슬롯 분리 2개
(`keepsSameDayBothSlotsSeparate` · `matchesExposureWithSameTimeSlotObservation`)가 ADR 0014의
규칙을 코드 레벨에서 고정하고, 위 슬롯 시드가 같은 규칙을 실서버에서 확인한다.
백엔드 전체 **179개 통과**(로컬 MySQL 기동 상태, 2026-08-13 SKIN-02 회귀 테스트 1개 추가 후 재확인).

**조회 성능** — 노출 로딩은 제품 기록 수와 무관하게 쿼리 3번으로 고정된다(기록 · 항목 · 성분).
이 분석이 SKIN-01 저장 경로에서 동기로 실행되므로 응답 시간에 그대로 얹히기 때문이다.
실서버에서 제품 기록 5건 기준 `product_record_items` · `product_ingredients` 각 1회를 확인했다.

**분석이 완료된 피부 기록만 관측으로 쓴다.** `analysisStatus != COMPLETED`인 기록은 지표를 믿을 수
없는데, 그 값이 기준선이 되면 있지도 않은 변화를 패턴으로 잡는다.

F-ANALYSIS-02 환경 보정(B-16, ADR 0021)이 자외선 급변일에 걸친 관측 쌍을 구분해 확정 임계값·
신뢰도에 반영한다(2.16절). `IngredientProfile` 갱신은 F-ANALYSIS-04에서 이어서 구현했다(아래 2.8).

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
ADR 0009의 3점과 마찬가지로 근거 없는 초기값이다. F-ANALYSIS-02가 이제 구현됐으므로(2.16절,
ADR 0021) 재검토 대상이지만 아직 하지 않았다 — 실사용 데이터가 쌓인 뒤로 미룬다.
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

> ✅ **소비처 3곳 모두 붙었다.** USER-02가 `completionRate`를 싣는다(2026-08-11 · 아래 2.10).
> USER-01(마이페이지)·CHECK-01(쇼핑 홈)도 구현 완료 — 세 서비스 모두 `ProfileCompletionCalculator`를
> 직접 호출하며 자체 계산은 하지 않는다. 단위 테스트로 값 위임을 확인했다(BR 4) — 동일 사용자로
> 세 API를 실서버에서 직접 대조하는 검증은 아직이다.
> 제품 기록 저장 API(PRODUCT-05)는 2.13절에서 구현했고, 실입력 경로 재검증도 마쳤다
> (2026-08-12 · 2.7절). API로 넣은 제품 기록만으로 USER-02가 `completionRate: 38`을 반환하는
> 것을 확인했다 — B축이 실입력으로 오르는 것이 실서버에서 확인됐다.

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
확인돼 있었다. 이 표의 입력은 목업 시드였으나, **이후 실입력 경로로도 재검증했다**
(2026-08-12 · 2.7절) — `POST /product-records`로만 넣은 제품 기록으로 이 응답이
`completionRate: 38` · 레티놀/히알루론산 `CAUTION` 2건을 반환하는 것을 확인했다.

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
   제품 기록이 없는 날을 사용 중단으로 판정해야 하는데, ADR 0013 작성 시점에는 PRODUCT-05가 없어
   제품 기록이 시드로만 존재해 기록 부재를 중단으로 읽으면 거의 모든 성분이 매번 재시작으로 잡혔다.
   PRODUCT-05는 이제 구현됐지만(2.13절) 이 판정을 다시 여는 것은 범위 밖이다 — ADR 0013을 뒤집으려면
   "기록 없음 = 중단"의 유예 기간(예: 며칠 미기록부터 중단으로 볼지) 같은 새 규칙이 필요하다.
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

### 2.13 PRODUCT-05 구현 · 검증 내역

`POST /api/v1/product-records` — 2.3절 담당표는 A 몫으로 분류돼 있으나, F-ANALYSIS-01·04·05가
공통으로 막혀 있던 실입력 경로라 B가 대신 구현했다. 담당 재배정 여부는 팀 논의로 남긴다.

| 클래스 | 역할 |
| --- | --- |
| `ProductRecordController` | `POST /api/v1/product-records` |
| `ProductRecordService` | 검증 · 중복 판정 · `skinRecordSuggested` 계산 |
| `ProductRecordWriter` | DB 반영 전담(`ProductRecord`/`ProductRecordItem` upsert · `UserProduct` upsert) — SKIN-01의
  `SkinRecordWriter`와 같은 이유로 분리했다: 같은 클래스 안에서 부르면 프록시를 안 거쳐 `@Transactional`이 무시된다 |

**날짜 귀속은 `RecordDateResolver`를 그대로 재사용한다.** SKIN-01과 공용 유틸이며(ADR 0005),
`NIGHT` 슬롯은 자정을 넘겨도 밤이 시작된 날짜로 귀속된다.

**개수 검증(`PRODUCT_RECORD_EMPTY`·`PRODUCT_RECORD_LIMIT_EXCEEDED`)은 `@Valid`가 아니라 서비스에서 한다.**
`GlobalExceptionHandler`는 `@Valid` 실패를 전부 `COMMON_VALIDATION_FAILED`(422)로 뭉뚱그리는데,
명세는 빈 목록과 30개 초과를 서로 다른 코드로 요구한다. SKIN-01이 `timeSlot`에 쓴 것과 같은 회피다.

**중복 판정은 항목 존재 여부만 본다.** 같은 날짜 + 슬롯에 기존 `ProductRecord`가 있고 요청에 겹치는
`productId`가 있으면 `force`가 아닌 한 `409 PRODUCT_ALREADY_RECORDED_IN_SLOT`을 던지며, 겹친
`productId` 목록을 `result.duplicatedProductIds`에 싣는다. `force: true`면 기존 기록에 항목을
이어붙인다 — 전체 교체는 PRODUCT-06(`PATCH /product-records/{recordId}`) 몫이라 이 API에서는 다루지 않는다.

**`skinRecordSuggested`는 저장 직후 같은 슬롯의 `SkinRecord` 존재 여부로 판정한다.** (F-PRODUCT-07)

서비스 단위 테스트 7개(빈 목록 1 · 30개 초과 1 · 존재하지 않는 제품 1 · 슬롯 중복 409 1 ·
`force` 병합 1 · `skinRecordSuggested` true/false 2).

**로컬 MySQL 실서버 검증 완료** (2026-08-12). F-ANALYSIS-01 재검증(2.7절)과 함께 진행했다.

| 시나리오 | 기대 | 결과 |
| --- | --- | --- |
| 정상 저장 | 201 | 201 · `productCount` · `skinRecordSuggested` 정상 |
| `force` 필드 생략 | 201 (명세상 선택 필드) | **최초 400 → 수정 후 201** (아래 버그 1) |
| 빈 목록 | 422 `PRODUCT_RECORD_EMPTY` | 일치 |
| 31개 요청 | 422 `PRODUCT_RECORD_LIMIT_EXCEEDED` | 일치 |
| 존재하지 않는 제품 | 404 `PRODUCT_NOT_FOUND` | 일치 |
| 같은 슬롯 중복 | 409 `PRODUCT_ALREADY_RECORDED_IN_SLOT` | 일치 · `duplicatedProductIds` 포함 |
| `force: true` 재요청 | 201 · 항목 이어붙이기 | **최초 500 → 수정 후 201** (아래 버그 2) |
| `X-User-Id` 누락 | 401 `COMMON_UNAUTHORIZED` | 일치 |
| 정의되지 않은 `timeSlot` | 400 `RECORD_INVALID_TIME_SLOT` | 일치 |

위 9건은 **2026-08-12에 신규 사용자로 한 번 더 재현했다**(전 항목 동일). 이때 경계 5건을 추가로
확인했고, 모두 수정 없이 통과했다.

| 추가 시나리오 | 결과 |
| --- | --- |
| 한 요청에 같은 `productId` 2회 | 201 · 항목 1건만 생성(유니크 제약 위반 없음) · `productCount` 1 |
| `productIds` 필드 자체를 생략 | 422 `PRODUCT_RECORD_EMPTY` (`null`도 빈 목록과 같게 본다) |
| `productIds`에 `null` 요소 | 404 `PRODUCT_NOT_FOUND` |
| `timeSlot` 소문자(`"morning"`) | 201 — `toTimeSlot()`이 대문자로 정규화한다 |
| 존재하지 않는 `X-User-Id` | 404 `USER_NOT_FOUND` · `product_records`·`user_products`에 부작용 행 없음 |

**실서버 검증에서만 드러난 버그 2건을 찾아 고쳤다.** 둘 다 서비스 단위 테스트가 구조적으로 잡을 수
없는 경로였다 — 단위 테스트는 `create(...)`를 직접 부르므로 Jackson 역직렬화를 건너뛰고,
리포지토리가 목이라 DB 제약도 없다.

1. **`force` 생략 시 400** — `ProductRecordCreateRequest.force`가 원시 `boolean`이라, 필드를 생략한
   JSON에서 Jackson이 레코드 생성자를 호출하지 못했다. `HttpMessageNotReadableException`이
   나서 컨트롤러에 닿기도 전에 `COMMON_BAD_REQUEST`(400)로 떨어졌다. 명세는 이 필드를
   **선택(기본 `false`)**으로 규정하므로(api_명세서 PRODUCT-05 요청 표) 명백한 위반이었고,
   프론트가 `force`를 안 보내면 정상 저장이 전부 실패했을 것이다.
   → `Boolean`으로 바꾸고 접근자에서 null을 `false`로 접었다.
   회귀 테스트 `ProductRecordCreateRequestTest` 2개.

2. **`force: true` 재요청 시 500** — `ProductRecordWriter.save`가 기존 항목을 확인하지 않고
   그대로 INSERT해 `product_record_items`의 `(product_record_id, product_id)` 유니크 제약을
   위반했다(`DataIntegrityViolationException` → 500). 주석은 "항목을 이어붙인다"였지만 실제
   동작은 중복 삽입이었다 — 같은 클래스의 `upsertUserProduct`는 이미 존재 확인을 하고 있어
   항목 쪽만 빠져 있던 셈이다.
   → 기존 항목의 `productId` 집합을 먼저 읽고 없는 것만 저장한다. 한 요청 안의 중복도 함께 막힌다.
   회귀 테스트 `ProductRecordWriterTest` 2개.

두 수정 모두 되돌려 테스트가 실제로 실패하는 것을 확인한 뒤 반영했다(수정 없이는 각각
`MismatchedInputException` · `Wanted but not invoked`로 실패한다).

**이 API가 붙어 F-ANALYSIS-01·04·05·REPORT-01·02의 "제품 기록이 시드로만 존재한다"는 제약이
실입력 경로 검증까지 마치고 해소됐다.** 2.7절 "실입력 경로 검증" 절이 그 결과다.

---

### 2.14 CHECK-02 · CHECK-03 구현 · 검증 내역

`POST /api/v1/checks` · `GET /api/v1/checks/{checkId}` — F-ANALYSIS-04가 만든 개인 성분 프로파일이
실제 구매 판단에 쓰이는 첫 소비처다. 등급 산출 기준은 [ADR 0015](decisions/0015-위험도-등급-산출-기준.md).

| 클래스 | 역할 |
| --- | --- |
| `RiskLevelCalculator`(`domain/check`) | 등급 산식 전부. DB를 모른다 |
| `CheckService` | 검증 · 성분 분류 · 오케스트레이션. 클래스 레벨 `@Transactional` 없음 |
| `CheckWriter` | DB 반영 전담(`ProductRiskAssessment`/`ProductRiskIngredient` 저장) — SKIN-01의
  `SkinRecordWriter`와 같은 이유로 분리했다: 같은 클래스 안에서 부르면 프록시를 안 거쳐 `@Transactional`이 무시된다 |
| `CheckController` | `POST /api/v1/checks` · `GET /api/v1/checks/{checkId}` |

**분모를 판정된 성분(SUITABLE+CAUTION)만으로 좁힌 것이 이 작업의 핵심이다.** 전체 성분 수를
분모로 두면 판정되지 않은 성분이 늘수록 비중이 낮아져, "INSUFFICIENT는 위험도를 높이지도 낮추지도
않는다"(BR 3)를 어긴다. ADR 0015가 이 문제와 임계값(3건·0.40·5종 게이트)을 정한다.

**명세와 달라진 점 두 가지.**

1. **응답 `message`가 다르다.** 명세 예시는 `"분석이 완료되었어요."`지만 공용 `SuccessCode`에
   엔드포인트별 문구가 없어 `"생성에 성공했습니다."`가 나간다. 문구 하나 때문에 공용 envelope를
   바꾸지 않고 명세 예시 쪽을 고쳤다.
2. **`Idempotency-Key`가 미구현이다**(블로커 #8). 재요청은 새 평가를 추가한다(append-only) —
   `ProductRiskAssessment`에 수정 메서드도 `(user_id, product_id)` 유니크 제약도 없어 애초에
   append-only로 설계돼 있었다.

**`RiskLevel.INSUFFICIENT`와 `CHECK_CALCULATION_FAILED`(500)는 정의만 되어 있고 실제 경로가 없다.**
판정 성분이 0건이면 등급을 매기지 않고 `CHECK_PROFILE_NOT_READY`(409)를 던지며 행을 저장하지
않는다 — 값과 오류가 동시에 답일 수 없어 오류를 택했다. 위험도 계산은 정수 셋의 산술이라 실패할
수 없어 500을 던지는 코드 경로를 만들지 않았다(CLAUDE.md §2).

**두 409 모두 평가를 저장하지 않는다.** `CHECK_INGREDIENT_DATA_INSUFFICIENT`는 제품 성분 행이
0건일 때, `CHECK_PROFILE_NOT_READY`는 이 제품 성분 중 판정된 것이 하나도 없을 때다 — "프로파일
테이블이 비었는가"가 아니라 "이 제품 기준으로 판정된 것이 있는가"로 좁혔다(ADR 0015 근거 7).

자동 테스트 32개 추가 — `RiskLevelCalculatorTest` 12개(등급 경계 9 · 게이트 1 · 예외 1 · BR 3
설계 근거 1), `CheckServiceTest` 18개(404/409 발동 조건 5 · 근거 비우기 3 · 정렬 1 · summary
일치 1 · 문구 파생 1 · 쿼리 고정 1 · BR 3 흐름 1 · 소유권 404 2 · POST/GET 일치 1 · 계산 진행 1 ·
409 시 미저장 1), `CheckWriterTest` 2개. 이후 PRODUCT-05 회귀 테스트 4개 · SKIN-02 회귀 테스트
1개가 더해져 백엔드 전체는 **179개**다 — 로컬 MySQL 기동 상태에서 전부 통과한다(2026-08-13 재확인).
`BackendApplicationTests`는 MySQL 미기동 시에만 실패하는 기존 블로커 #9로, 이번 변경과 무관하다.

**쿼리 수** — CHECK-02는 6개 고정 조회(제품 1 · 제품성분 1 · 프로파일 1 · 사용자 1 · 평가 INSERT
1 · 성분평가 INSERT는 성분 수만큼) + 성분 수만큼의 자식 INSERT다. `hibernate.jdbc.batch_size`가
설정돼 있지 않아 자식 INSERT는 배치되지 않는다 — 실측(성분 3종 제품)으로 SELECT 6 + INSERT 4 =
총 10 statement를 확인했다.

CHECK-03은 설계상 2개(평가 조회 · 성분평가 조회)를 기대했으나 **실측 3개**였다(2026-08-12).
`where a.user.id = :userId` 조건의 JPQL이 `product`는 fetch join하면서 `user`는 하지 않아,
`ProductRiskAssessment.user`가 `@ManyToOne` 기본값(EAGER)으로 매 조회마다 `users`를 별도
SELECT로 즉시 로드하고 있었다. **2026-08-14 원인 규명 및 수정 완료** — 응답 조립(`CheckResponse.of`)이
`user`를 전혀 참조하지 않는 것을 코드로 확인한 뒤 `user` 필드를 `FetchType.LAZY`로 바꿨다. 로컬
MySQL 실서버에서 SQL 로그로 쿼리 수가 3개 → **2개**로 줄어드는 것을 재확인했다(`ProductRiskAssessment.java`).

**로컬 MySQL 실서버 검증** (2026-08-12). 기존 시드(`f-analysis-01-mockup.sql`, 사용자 9001)로
SKIN-01을 한 번 더 트리거해 프로파일을 채운 뒤(레티놀·히알루론산 CAUTION, 판테놀 INSUFFICIENT),
등급 분기 전체를 보려고 신규 시드 `seed/check-02-risk-levels.sql`(제품 9003~9009, 사용자 9002)을
추가로 적재했다. `backend/README.md`에 재현 절차를 남겼다.

| 시나리오 | 기대 | 결과 |
| --- | --- | --- |
| 레티놀 세럼(9001, CAUTION 2종, judged 2 — 게이트 미달) | 개수 축만 적용 → MEDIUM | `MEDIUM` · `보통이에요` |
| 같은 성분 + INSUFFICIENT 다수(9004) | 9001과 등급·riskScore 동일 (BR 3 회귀) | `MEDIUM` — **완전히 일치** |
| 판정 성분 0건(9003, 판테놀만) | 409 `CHECK_PROFILE_NOT_READY` | 일치 · 평가 0건 저장 |
| 성분 행 0건(9005) | 409 `CHECK_INGREDIENT_DATA_INSUFFICIENT` | 일치 · 평가 0건 저장 |
| 존재하지 않는 제품 | 404 `CHECK_PRODUCT_NOT_FOUND` | 일치 |
| `productId` 누락 | 422 `COMMON_VALIDATION_FAILED` | 일치 |
| `X-User-Id` 누락 | 401 `COMMON_UNAUTHORIZED` | 일치 |
| CAUTION 0종(9006, judged 3) | LOW | `LOW` · `잘 맞아요` |
| CAUTION 1종(9007, judged 4, ratio 0.20) | 게이트 미달 → 개수 축 MEDIUM | `MEDIUM` |
| CAUTION 2종(9008, judged 5, ratio 0.40) | 게이트 통과 · 비중 축 HIGH | `HIGH` · `주의가 필요해요` |
| CAUTION 3종(9009, judged 20, ratio 0.15) | 개수 축이 비중 축보다 심각 → HIGH | `HIGH` |
| GET `/checks/{checkId}` | POST 응답과 완전 일치 | `checkId` 제외 나머지 필드 **완전 일치** 확인(`jq`형 비교) |
| GET을 타 사용자로 조회 | 404 `CHECK_NOT_FOUND` (403 아님) | 일치 |
| GET 존재하지 않는 `checkId` | 404 `CHECK_NOT_FOUND` | 일치 |
| 같은 (사용자, 제품) 재분석 | 행 추가(append-only) | 3회 POST 후 `COUNT(*) = 3` 확인 |

DB 직접 확인 — `summary` · `contribution_score`가 모든 행에서 `NULL`, `risk_score`가 0.00·15.00·
25.00·40.00 등 실제 산식값으로 채워진 것을 확인했다.

**아직 하지 않은 것** — 프론트 연동. `EXPO_PUBLIC_USE_MOCK=true`라 S-21·S-22는 아직 목업을 본다.
CHECK-01(쇼핑 홈)은 구현 완료했으나(2.15절) 실서버 검증은 아직이다.

---

### 2.15 USER-01 · CHECK-01 구현 내역 — F-ANALYSIS-05 값 일치(BR 4) 검증

`GET /api/v1/users/me`(F-MY-01·F-MY-02) · `GET /api/v1/checks/home`(F-CHECK-01) 구현.
`ProfileCompletionCalculator`(F-ANALYSIS-05)의 소비처 3곳(USER-01·USER-02·CHECK-01) 중
USER-02만 붙어 있던 상태(2.9·2.10절)를 마저 채워 BR 4("세 API가 같은 값을 쓴다")를 검증할 수
있게 했다.

| 클래스 | 역할 |
| --- | --- |
| `MyPageService`(`api/user/service`) | USER-01. `topIngredients` 정렬은 USER-02의
  `UserIngredientProfileService.DISPLAY_ORDER`(GOOD → CAUTION → INSUFFICIENT, 그룹 내 노출 일수
  내림차순)와 동일 기준을 재사용 — 새 정렬 기준을 만들지 않았다 |
| `CheckHomeService`(`api/check/service`) | CHECK-01. `CheckService`(CHECK-02·03)와는 응집도가
  달라 별도 서비스로 분리 |

**세 서비스 모두 `completionRate`/`profileCompletion`을 `ProfileCompletionCalculator.calculate(userId)`
호출로만 얻는다 — 자체 계산 코드는 어디에도 없다.**

**`totalRecordCount` 산식.** `SkinRecord`는 애초에 "모닝 1건·나이트 1건" 구조로 설계돼
있어(`@UniqueConstraint(user_id, record_date, time_period)`), 행 하나가 곧 기록 1회다.
`SkinRecordRepository.countByUserId`(신규)를 단순 카운트로 추가했다 — F-ANALYSIS-05 A축이 쓰는
`countDistinctRecordDatesByUserId`(날짜 기준 distinct)와는 다른 질문에 답하는 카운트라 헷갈리지
않게 나눠 두었다.

**CHECK-01 추천 로직.** 명세서엔 "근거 있는 추천만 노출"까지만 정의돼 있고 구체적 매칭 규칙은
없었다. 사용자 `ingredient_profiles`의 `GOOD`(SUITABLE) 성분을 `key_ingredient=true`로 가진
제품을 후보로 삼고, **제품 ID로 그룹핑해 제품 단위로 중복을 제거**한다 — 한 제품에 GOOD 성분이
여러 개 걸려도 추천 목록엔 1건만 나오고 `reason`엔 매칭된 성분명을 모두 담는다
(`"판테놀·마데카소사이드가 잘 맞는 성분이에요"` 형태). GOOD 성분이 없으면 `recommendations: []`
(BR 2, 오류 아님). 이 매칭 규칙은 [ADR 0016](decisions/0016-쇼핑-홈-추천-매칭-기준.md)에 근거
없는 초기값으로 기록했다 — 실사용 데이터가 쌓이면 재검토 대상이다.

**`failedSections`는 항상 빈 배열이다.** 1.8절 정의상 이 필드는 BFF가 **외부 API** 부분 실패를
알리는 공용 봉투(HOME-01의 날씨 API 사례)인데, CHECK-01의 추천 판단(무엇을 추천할지·순서)은
전부 내부 DB 조회라 실패할 섹션이 구조적으로 없다. 2026-08-16에 추가된 `aiComment`(ADR 0025)는
ai-server 호출이라는 외부 의존이 생겼지만, 실패해도 추천 자체를 막지 않는 부가 정보라
`failedSections`에는 반영하지 않기로 했다 — 자세한 내용은 2.17절.

자동 테스트 12개 추가 — `MyPageServiceTest` 8개(completionRate 위임 1 · topIngredients 8건
제한·정렬 2 · 상태별 카운트 1 · totalRecordCount 1 · notificationEnabled 분기 2 · skinTypes 1),
`CheckHomeServiceTest` 4개(GOOD 없으면 조기 반환 1 · 제품 단위 dedup 1 · completionRate 위임 1 ·
failedSections 1). 백엔드 전체 **191개 통과**(로컬 MySQL 기동 상태, 2026-08-13). 로컬 MySQL로
세 API를 동일 사용자로 직접 호출해 값을 대조하는 실서버 검증은 아직 하지 않았다 — 다음 작업으로
남긴다.

### 2.16 F-ANALYSIS-02 환경 요인 보정 구현 내역 (B-16, ADR 0021)

호르몬 요인 보정(F-ANALYSIS-03, ADR 0019)과 정확히 같은 개입 지점에 자외선 급변일 보정을 추가했다.
전일 대비 `uv_index_max` 변화폭이 3 이상인 날을 급변일로 본다.

| 클래스 | 역할 |
| --- | --- |
| `IngredientLagAnalysisService.loadUvVolatileDates` | 분석 기간의 `DailyEnvironment`를 조회해 급변일 집합을 만든다. `loadMenstrualDates`와 대칭 구조 |
| `LagCorrelationAnalyzer` | 관측 쌍의 급변일 걸침 비율이 50% 이상이면 확정 임계값을 67%→80%로 상향(`COVARIATE_AFFECTED_*`, 호르몬 보정과 상수 공유) |
| `LagInsightWriter` | 같은 조건에서 신뢰도를 20% 감쇄. 호르몬 보정과 동시에 걸리면 곱셈으로 합성(0.8 × 0.8 = 36% 감쇄) |

**`daily_environments`에 쓰는 프로덕션 코드가 아직 없다.** `DailyEnvironment` 엔티티·저장소는
이미 존재하지만, F-HOME-03의 `HomeService`는 현재 환경 응답을 고정값(`SUNNY, 24, 5, MODERATE, 55`)
으로 내려줄 뿐 DB에 쓰지 않는다. 따라서 실사용 데이터에서는 `loadUvVolatileDates`가 항상 빈
집합을 내고 보정은 미적용 경로로만 흐른다 — BR 3이 요구하는 정상 동작이며, F-HOME-03이 실제로
적재를 시작하면 이 코드는 변경 없이 동작한다. 검증은 목업 데이터로 했다(단위 테스트).

자동 테스트 6개 추가 — `LagCorrelationAnalyzerTest` 2개(급변일 걸침 50% 이상 시 미확정 ·
정보 없으면 기존 임계값), `LagInsightWriterTest` 2개(환경 단독 감쇄 · 호르몬과 곱셈 합성),
`IngredientLagAnalysisServiceTest` 1개(급변일 조회 연동), `IngredientProfileWriterTest`는
생성자 시그니처만 갱신. 백엔드 전체 테스트 통과 확인(2026-08-14).

---

### 2.17 CHECK-01 제품 추천 AI 코멘트 구현 내역 (ADR 0025)

추천 여부·순서·`reason`은 그대로 ADR 0016의 규칙 기반 로직으로 정하고, 그 결과에 AI가 생성한
자연스러운 한 줄 코멘트(`aiComment`)를 덧붙였다. AI는 판단에 관여하지 않고 문구만 다듬는다.

| 컴포넌트 | 역할 |
| --- | --- |
| `ai-server/app/product_comment.py` | `vision.py`와 같은 패턴으로 OpenAI 클라이언트 재사용. 추천 목록 전체를 한 번의 배치 프롬프트로 보내 제품별 코멘트를 받음 |
| `ai-server` `POST /product-comments` | 신규 엔드포인트. 성공 시 코멘트 목록, OpenAI 실패 시 502 + `{"code":"COMMENT_UNAVAILABLE"}` |
| `backend` `ProductCommentClient`(`domain/product/client`) | 기존 `LOCAL_VISION_BASE_URL`을 그대로 재사용해 ai-server를 호출. 실패는 예외로 전파하지 않고 빈 맵으로 흡수 |
| `CheckHomeService.buildRecommendations` | 추천 목록 조립 후 배치로 `ProductCommentClient`를 호출해 `productId`별 `aiComment`를 매핑 |

**실패 폴백이 핵심 설계다.** `LocalVisionSkinAnalysisClient`(피부 분석)와 달리 AI 코멘트 생성
실패는 추천 응답 자체를 막지 않는다 — 추천은 AI 없이도 성립하는 핵심 기능이기 때문이다.
ai-server가 502를 반환하거나 타임아웃되면 `ProductCommentClient`가 빈 맵을 반환하고, 모든
`aiComment`가 `null`인 채로 200 응답이 그대로 나간다. 이 실패는 `failedSections`에도 반영하지
않는다(BR 5는 "추천 여부를 좌우하는 내부 DB 조회"만 대상으로 하고, AI 코멘트는 그 밖의 부가
정보이기 때문).

**호출 횟수를 1회로 고정했다.** 제품 수만큼 개별 호출하면 지연·비용이 배로 늘어나므로, 추천
목록 전체를 한 번의 OpenAI 호출(`response_format: json_object`)로 묶어 보낸다.

자동 테스트 추가 — 백엔드는 `CheckHomeServiceTest`에 `ProductCommentClient` mock을 추가(4개
기존 테스트 모두 통과, Mockito 기본 응답값인 빈 `Map`으로 `aiComment=null` 경로 자동 검증).
ai-server는 `tests/test_product_comment.py` 4개(정상 생성·키 미설정·JSON 파싱 실패·타임아웃)와
`tests/test_api.py`에 `/product-comments` 3개(빈 목록·정상 생성·502 폴백) 추가. 백엔드
전체·ai-server 전체(66개) 테스트 통과 확인(2026-08-16). **실 OpenAI API 키로 코멘트 품질을
확인하는 E2E 검증은 아직 하지 않았다** — 다음 작업으로 남긴다.

---

### 2.18 프론트 요청 대응 — REPORT-02 · CHECK-01 필드 추가 (ADR 0027 · 0028, 2026-08-17)

프론트엔드(boyeon)가 Figma 최종본으로 S-20·SHOP-01을 구현하며 보낸 두 건의 요청
(`backend-request-report02-detail-fields.md`, `backend-request-shop01-tag-chips.md`)에 대응했다.
공통 문제는 **서버가 문장만 주고 그 문장을 만든 구조화된 근거는 버려서, 클라이언트가 문장을
되파싱하고 있었다**는 것이다.

| 필드 | 위치 | 출처 | AI |
| --- | --- | --- | --- |
| `events[].delta` | REPORT-02 | `AnalysisInsight.averageDelta` (ADR 0013이 이미 보존) | X |
| `events[].eventKind` | REPORT-02 | 도출 분기 자체(`INGREDIENT_USAGE`/`UV_SPIKE`) | X |
| `summary` | REPORT-02 | `AnalysisInsight.description` (기존 컬럼) | X |
| `tip` | REPORT-02 | ai-server `POST /insight-tips` 신규 | **O** |
| `tags` | CHECK-01 | `category` + 사용자 CAUTION 성분 유무 | X |

**`tip` 하나만 AI다.** 나머지 넷은 전부 이미 있는 값의 노출이거나 규칙 도출이라 분석 로직이
바뀌지 않았다. 특히 `tags`는 ADR 0025(AI 코멘트)와 달리 규칙으로 만들었다 — "주의 성분 미포함"
같은 짧은 단정문이라 AI가 틀리면 사실오류가 그대로 노출된다.

**`delta`와 `impact`는 한 판정을 공유한다.** `ReportService.firstUsageDelta()`가 폴백 여부를
판정하고 `firstUsageImpact()`가 그 결과를 받는다. 문구가 "확인 중"인데 `delta`에 숫자가 실리는
상태가 구조적으로 불가능하다 — 어긋나면 단정하지 않기로 한 자리(BR 2)에 수치 배지가 뜬다.

**요청 중 거절한 것**(ADR 0027 "만들지 않기로 한 것" 참고):

- 기간 변화·평균·현재값 — 클라이언트가 `graph`로 이미 정확히 계산 중이고, 서버가 재계산하면
  모닝/나이트 2계열(ADR 0012)을 접는 방식 차이로 화면 수치와 어긋난다. 정본은 `graph` 하나.
- `eventKind`의 `ABSTINENCE` — ADR 0013이 판정 불가로 닫은 유형이다.
- "향료 미포함"·"과거 이력 없음" 칩 — 향료 여부 데이터가 스키마에 없다.

**신규 ai-server 엔드포인트**: `POST /insight-tips`(단건). ADR 0025가 배치인 이유는 추천이
제품 N개이기 때문이고, 요인 상세는 화면당 인사이트 하나다. `InsightTipClient`
(`domain/analysis/client`)가 기존 `app.skin.analysis.local-vision.base-url`을 재사용하고,
실패를 `Optional.empty()`로 흡수해 `tip=null`인 채 200을 유지한다.

자동 테스트 추가 — 백엔드 `ReportServiceTest` 5개(delta 양수·음수 부호 보존, OBSERVING 시
`delta=null`, `summary`/`subtitle` 분리, 팁 성공·실패 폴백)·`CheckHomeServiceTest` 2개(CAUTION
프로파일 없을 때 조회 생략 + 칩 2개, CAUTION 있을 때 칩 1개). ai-server
`tests/test_insight_tip.py` 6개·`tests/test_api.py` `/insight-tips` 2개. **백엔드 전체 통과**,
ai-server는 신규·영향 범위 16개 통과 확인(2026-08-17).

**실 OpenAI 키 E2E 확인 완료(2026-08-17)** — 아래 2.19절. **프롬프트 결함 1건을 발견해
고쳤다.** ai-server `test_consistency.py`·`test_metrics.py`의 실패 4~5건은 이 작업 이전부터
있던 것으로, 합성 이미지 임계값과 OpenAI 429에 따른 flaky 실패다 — 깨끗한 트리에서 동일 실패를
확인했고 이번 변경과 무관하다.

**실서버 왕복 검증 완료(2026-08-17)** — 아래 2.20절. **여기서 결함 1건을 더 발견해 고쳤다.**

---

### 2.19 관리 팁 실 OpenAI 키 E2E 검증 (ADR 0028, 2026-08-17)

시나리오 3종(OBSERVED · OBSERVING · 환경 인사이트) × 5회를 실 키로 호출해 사람이 읽고
판단했다. 자동 테스트로 고정할 수 없는 종류라(LLM 출력은 실행마다 다름) 기계적으로 거를 수
있는 것만 플래그를 달고 문장은 직접 읽었다.

**발견한 결함 — 근거 없는 인과 방향 단정 (수정함).**

변화량이 없는 OBSERVING 인사이트에서 **8회 중 8회 전부** "판테놀 제품을 사용해 보세요"라고
권했고, 5회 중 4회는 "**트러블 개선에 도움이 될 수 있다**"고 방향까지 단정했다. 근거에 없는
주장이다.

원인은 프롬프트가 요인·지표를 **단어로만 나열**한 것이었다(`- 요인: 판테놀` / `- 지표: 트러블`).
인사이트가 "이 요인이 이 지표에 영향을 주는지 관찰 중"인 **관계**라는 게 전달되지 않아, 모델이
성분 일반 지식(판테놀=진정 성분)으로 빈칸을 채웠다. 실제로는 판테놀이 트러블을 악화시키는
중일 수도 있는데 권하는 셈이었다. 수치는 지어내지 않았지만 **방향을 지어냈으므로** BR 2 위반이다.

수정 내용:

- `_build_user_prompt`가 근거를 관계 문장으로 서술한다 — `'판테놀'이(가) 트러블 지표에 영향을
  주는지 관찰 중`.
- **변화량 부호의 의미를 풀어 준다.** 지표값은 높을수록 증상이 심하므로 양수=악화, 음수=완화다.
  이 설명이 없으면 모델이 방향을 뒤집어 읽을 수 있다.
- 변화량이 없으면 `방향을 추정하지 말고 기록을 더 쌓도록 안내해라`를 명시한다.
- 시스템 프롬프트에 "성분 일반 지식으로 좋고 나쁨을 추정하지 마라" 추가.

수정 후 재검증: 15회 전부 방향 단정이 사라졌다. OBSERVING은 "관찰해 보라 / 기록을 더 쌓아라"로,
OBSERVED는 부호를 읽어 "악화되는 경향"으로 정확히 서술한다. 분량은 53~88자로 요구(100자 내외)
안에 들었고, 의학적 진단·치료 표현과 근거 밖 수치는 0건, 호출 실패도 0건이다.

회귀 방지로 단위 테스트 2개를 추가했다(`test_insight_tip.py`) — 부호에 따라 프롬프트가
"악화"/"완화"를 싣는지, 변화량이 없으면 "아직 알 수 없다"를 싣는지. **프롬프트 문구가 아니라
BR 2가 프롬프트 층에서 지켜지는지를 고정하는 테스트다.**

⚠️ 사용한 모델은 `.env`의 `OPENAI_MODEL=gpt-4o-mini`다(코드 기본값 `gpt-4o`가 아님). 모델을
바꾸면 이 검증을 다시 해야 한다 — 프롬프트 준수도는 모델마다 다르다.

---

### 2.20 실서버 왕복 검증 — MySQL → Spring → ai-server → OpenAI (2026-08-17)

로컬 MySQL(`ildangbaek-mysql`) · Spring(:8080) · ai-server(:8000)를 모두 띄우고, 서명된 목업
토큰으로 REPORT-02와 CHECK-01을 실제 호출해 응답 JSON을 확인했다. 2.19절이 ai-server 단독
검증이었다면, 여기서는 **DB에 저장된 실제 인사이트가 Spring을 거쳐 팁까지 도달하는지**를 봤다.

**발견 1 — 앱이 아예 기동하지 않았다 (기존 결함, 고침).**

`LocalVisionSkinAnalysisClient`에 생성자가 둘인데 어느 쪽에도 `@Autowired`가 없어 Spring이
주입 대상을 고르지 못하고 기본 생성자를 찾다 실패했다(`NoSuchMethodException: <init>()`).
**이 작업과 무관한 기존 결함이다** — `git stash`로 작업 내용을 걷어낸 깨끗한 `yunjin` HEAD에서
동일 실패를 재현해 확인했다. 커밋 `b061302`(타임아웃 추가)에서 테스트용 생성자가 추가되며
깨졌고, 단위 테스트는 목을 쓰기 때문에 컨텍스트 로딩을 검증하지 않아 잡히지 않았다. 운영
생성자에 `@Autowired`를 명시해 고쳤다.

**발견 2 — OBSERVING 인사이트인데 팁이 "악화됐다"고 단정 (이번 작업 결함, 고침).**

인사이트 119(판테놀, `confidence_score` 33.33 → OBSERVING, 그러나 `average_delta`는 5.00으로
존재)를 조회하니 팁이 `판테놀 사용 후 트러블이 악화된 것으로 보입니다`로 나왔다. 화면의
`impact`는 BR 2에 따라 "확인 중"인데 **팁만 단정하는 모순**이다.

2.19절에서 고친 것은 "변화량이 **없을** 때"였고, 이번 건은 "변화량이 **있지만 확정되지 않았을**
때"다 — 실 데이터에만 있던 조합이라 목 테스트로는 드러나지 않았다. 원인은 `loadTip`이
`insight.getAverageDelta()`를 무조건 AI에 넘긴 것이고, `ReportService`가 `impact`에는 이미
같은 값을 거르고 있었으므로 **거르는 기준을 한 곳(`firstUsageDelta`)으로 통일**해 고쳤다.
회귀 테스트 2개를 `ReportServiceTest`에 추가했다(확정 안 된 근거는 안 넘김 / 확정된 근거는 넘김).

**수정 후 최종 확인 결과** (각 2회):

| 인사이트 | 상태 | 팁 |
| --- | --- | --- |
| 117 레티놀 (conf 100, +15) | OBSERVED | `레티놀 사용 후 트러블이 증가하는 경향이 관찰되었습니다. 추가 기록을 통해…` |
| 119 판테놀 (conf 33.33, +5) | OBSERVING | `판테놀 사용 후 트러블 변화에 대한 기록을 계속 쌓아보세요…` (단정 사라짐) |
| 120 레티놀/홍조 (conf 0) | OBSERVING | `레티놀 사용 후 홍조의 변화를 계속 관찰해 보세요…` |

`summary`는 DB `description`에서, `graph`는 30일 창(값 있는 날 20일)으로 정상 반환됐다.
ai-server 로그에서 `POST /insight-tips 200` · 실제 OpenAI 호출을 확인했다.

**CHECK-01 `tags` 확인** — 기존 시드는 제품 성분(영문명 9152~9167)과 프로파일 성분(한글명
9010~)이 서로 다른 집합이라 매칭이 0건이었다(코드 문제가 아닌 시드 데이터 공백). 검증을 위해
프로파일 3건을 임시로 넣고 확인한 뒤 **원상 복구했다**.

| 제품 | 조건 | `tags` |
| --- | --- | --- |
| 1025 Dokdo Toner | TONER + 트러블 64(≥50) → `TODAY_NEEDED`, CAUTION 성분 없음 | `["트러블 진정 성분", "주의 성분 미포함"]` |
| Retinol Cica Ampoule | `MATCHED_INGREDIENT`, 같은 제품에 CAUTION(Squalane) 있음 | `["잘 맞는 성분"]` — 둘째 칩 정상 억제 |

`aiComment`도 함께 채워져(ADR 0025) 같은 ai-server 경로가 정상 동작함을 확인했다.

⚠️ **남은 한계**: 프론트엔드 화면에서의 렌더링은 확인하지 않았다(API 응답까지만 검증). CHECK-01
매칭은 임시 시드로만 확인했으므로, 제품·성분 시드를 정합적으로 채우는 작업은 별도로 필요하다.

---

### 2.21 프론트 요청 대응 — B 담당 항목 3건 (2026-08-19, `backend-request-2026-08-19.md`)

프론트가 `origin/main` 코드 대조로 발견한 항목 7건 중 B(분석 흐름) 담당 3건을 처리했다.
나머지(P0-1 루틴, P0-2 `UserProduct` 미생성, P1-1 영문 하드코딩)는 A 담당 API(routine·product
등록·record 허브)라 이 세션에서 다루지 않았다.

**P0-4 — `LagCorrelationAnalyzer` 증감 방향이 실제로 반대였다 (버그, 고침).**

`LagCorrelationAnalyzer.java:180-184`가 `delta > 0`(지표 점수 상승)을 `WORSENED`로 세고 있었다.
그런데 지표는 "점수가 높을수록 좋은 상태"다(ADR 0002, `ai-server/app/metrics.py:11` —
"모든 지표는 점수가 높을수록 좋은 상태다"). 즉 점수가 **오르면 개선, 내리면 악화**인데 코드는
정반대로 세고 있었다 — 사용자에게는 "이 성분 쓰니 트러블이 나아졌는데 앱이 '악화 반복, 줄이세요'
라고 권고"하는 형태로 나타난다. `delta < 0`(점수 하락)을 `WORSENED`로 뒤집어 고쳤다.

기존 `LagCorrelationAnalyzerTest.confirmsRepeatedWorsening`이 "트러블 +15 반복"을 WORSENED로
기대하고 있었다 — 이 테스트 자체가 버그와 같은 가정(점수 상승=악화)으로 작성되어 있어 버그를
못 잡았다. 부호를 뒤집어 "트러블 −15 반복"으로 고치고 `averageDelta` 기대값도 함께 수정했다.
수정 후 백엔드 전체 테스트(244개, 30개 클래스) 통과 확인.

> ⚠️ F-ANALYSIS-02(환경 요인 보정)·F-ANALYSIS-03(호르몬 요인 보정)은 `LagCorrelationAnalyzer`의
> `direction` 값을 그대로 재사용하므로 이번 수정의 영향을 받는다 — 로직 자체(임계값·비율 계산)는
> 손대지 않았고 방향 정의만 바로잡았으므로 별도 재검증은 필요 없다고 판단했으나, 실사용 데이터가
> 쌓이면 인사이트 문구("증가/감소", "줄여보세요/잘 맞는 편")가 이전과 반대로 나오는 것이 정상
> 동작임을 팀에 공유해야 한다.

**P1-2 — 저장 제품 목록 조회 2곳의 필터 불일치 (버그, 고침).**

`ProductRecordService.getHome()`(PRODUCT-01)이 `usageStatus` 필터 없이
`findAllByUserIdOrderByLastUsedAtDesc`를 썼다. 반면 `GET /users/me/products`는
`findAllByUserIdAndUsageStatusOrderByLastUsedAtDesc(userId, USING)`로 `USING`만 걸렀다.
`DELETE /products/{id}/save`가 `usageStatus`를 `STOPPED`로만 바꾸고 행을 지우지 않아서,
제품을 "찜 해제"해도 기록 화면(PRODUCT-01)의 저장 목록에는 계속 남아 있었다.

`getHome()`도 같은 `USING` 필터 메서드로 바꿔 두 조회가 일치하도록 고쳤다(기존에 이미 존재하는
리포지토리 메서드를 재사용, 신규 쿼리 없음). 로컬 MySQL 실서버로 재현·검증
완료(2026-08-19) — 제품 저장 → `getHome`에 노출 → `DELETE /save`로 사용중단 → `getHome`에서
즉시 사라짐, `GET /users/me/products`와 결과 일치.

**P0-3 — `skinComment`가 항상 null이라는 보고는 이 환경에서 재현되지 않았다 (조사만, 코드 변경 없음).**

프론트가 요청한 두 가지를 확인했다:
1. ai-server `.env`에 `OPENAI_API_KEY` 설정 확인 — 164자 값 로드됨, `_client()`로 실제
   `chat.completions.create` 호출 성공(`Pong!` 응답 수신).
2. `vision.refine()`을 실제 이미지로 직접 호출 — `skin_comment` 정상 반환.
3. 실서버 왕복 재현: mock 로그인 → `POST /api/v1/skin-records`(실제 업로드된 얼굴 사진 사용) →
   응답 `skinComment` 필드에 실제 OpenAI 생성 문구가 채워짐(`"현재 홍조가 다소 눈에 띄며,
   모공 관리가 필요해요…"`).

즉 이 저장소 상태에서는 AI 서버·백엔드·OpenAI 연동 경로 전체가 정상 동작한다. `8dfd340 feat: ai
활용 skinComment 구현`(2026-08-18) 커밋이 이미 이 문제를 해결한 것으로 보인다. 프론트가 본 문제는
(a) 프론트가 실제로 붙는 배포/다른 환경에서 `OPENAI_API_KEY`가 비어 있거나, (b) 프론트 보고
시점이 `8dfd340` 병합 이전 코드 기준이었거나, (c) 얼굴 미검출 등 다른 사유로 폴백된 것을
`skinComment` null로 오인했을 가능성 중 하나로 추정된다. **코드 변경 없음** — 재현되지 않는
버그를 임의로 고치지 않았다. 프론트가 실제로 붙는 환경에서 재현되면 그 환경의 `OPENAI_API_KEY`
설정 여부와 로그의 `OpenAI 확정 실패, 1차 규칙 기반 점수로 폴백` 경고 유무를 다시 확인해야 한다.

---

## 3. 프론트엔드

| 항목 | 상태 | 비고 |
| --- | --- | --- |
| Expo 프로젝트 부팅 · 폴더 구조 | ✅ | `14915dd` |
| 기반 레이어 (테마 · 스케일 · API · 네비게이션) | ✅ | `abc043a` |
| 공통 컴포넌트 9종 + 개발용 카탈로그 | ✅ | `f1d1c6a` |
| S-00~S-24 전 화면 (S-03 결번) | ✅ | 화면 파일 존재 · 네비게이션 등록 · UI 로직 구현 완료. **이전 버전은 이 항목을 "S-00/S-01만 완료"로 잘못 표기했었다** — 실제로는 온보딩·홈·기록·피부분석·리포트·쇼핑·마이페이지 전 화면이 이미 만들어져 있었다. 아래 "백엔드 실연동" 항목과 혼동하지 말 것: 화면 존재 여부와 실 API 연동 검증 여부는 별개 축이다 |
| `GraphPoint` 모닝·나이트 정렬 | ✅ | ADR 0012의 미이행 후속을 REPORT-02 작업에서 처리(2026-08-11). `types/report.ts` · `TrendGraph` · 목업 · 카탈로그. **`TrendGraph`는 당분간 `nightScore ?? morningScore`로 한 계열만 그린다** — 두 계열 동시 렌더는 별도 작업 |
| 백엔드 실연동 | ⬜ | `EXPO_PUBLIC_USE_MOCK=true`(기본값) — **화면은 다 있지만 전부 목업 데이터로 렌더링 중.** `frontend/src/api/mock/*.ts`(auth·onboarding·home·product·record·report·skin·check·user) + `mockPersistence.ts`가 실 백엔드 대신 응답. 일부(PRODUCT-01~04 등 제품 검색)는 백엔드 자체가 아직 없어 목업을 꺼도 붙일 데가 없음 |

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
| `docs/decisions/` | 🟡 | ADR 0001~0015 작성. **0009~0011·0015는 `제안` 상태** (0012·0013·0014는 `수락`) |
| `docs/STATUS.md` | ✅ | 이 문서 |
| `README.md` | ✅ | ADR 0002 반영 완료 (지표 소개 문구) |
| `backend/README.md` | ✅ | 임시 인증 · 스토리지 · 분석 provider 설정 반영 |

---

## 5. 미해결 · 블로커

우선순위 순.

| # | 항목 | 영향 | 담당 |
| --- | --- | --- | --- |
| 1 | **인증 인프라 부재** | 임시 방편(ADR 0006)으로 우회 중. **배포 불가 상태** | A |
| 2 | ~~ADR 0005 `제안` 상태~~ | A 합의 완료로 **확정**. `RecordDateResolver` 머지 가능 | — |
| 3 | ~~이미지 스토리지 미결정~~ | ADR 0007로 해소 (로컬 저장 · 배포 시 외부 스토리지 전환) | — |
| 4 | ~~리포트 일자별 대표값 규칙 (TBD-12)~~ | ADR 0012로 해소 — 대표값을 쓰지 않고 모닝·나이트를 각각 반환 | — |
| 5 | ~~리포트 요인 상세의 `metric` 전환 지원 여부 (TBD-11)~~ | ADR 0013으로 해소 — 지원하지 않고 인사이트의 지표를 그대로 반환 | — |
| 6 | `MORNING` 슬롯 시각 불일치 요청 처리 | SKIN-01 · PRODUCT-05 | ADR 0005 미해결 항목 · **현재는 수용** |
| 7 | ~~제품 직접 등록 (F-PRODUCT-08, TBD-07)~~ | ADR 0023으로 해소 — `ProductManualRegisterScreen` 정본 확정, `POST /products`(PRODUCT-10) 구현 | — |
| 7b | ~~REPORT-03에 대응하는 기능 ID가 없다~~ | **F-REPORT-04 신설로 해소.** 다만 이 기능을 쓰는 **화면은 여전히 미정**이라 12장 매핑표에 항목이 없다 | 화면 확정 시 B |
| 8 | `Idempotency-Key` 미구현 | 저장 API 5개 공통(SKIN-01·PRODUCT-05 등 + CHECK-02) | A·B 공통 인프라로 분리 |
| 9 | ~~`BackendApplicationTests`가 MySQL 없이 실패~~ | **2026-08-15 해소** — `src/test/resources/application.yml`에서 H2로 테스트 프로파일 분리 | — |
| 10 | ~~F-ONBOARD-03(생리·호르몬 정보 입력) 저장 API 없음~~ | **코드상 해소로 보임(2026-08-15 재확인)** — `OnboardingController.saveHormone()`(`PATCH /api/v1/onboarding/hormone`)이 존재한다. 다만 이 세션은 코드 확인만 했고 DB 직접 수정 우회 없이 이 API로 실제 F-ANALYSIS-03 경로가 동작하는지 실서버 재검증은 아직이다 | A(구현) → B(재검증 필요) |

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
