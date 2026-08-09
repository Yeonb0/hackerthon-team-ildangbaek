# api 명세서 (최종)

# 1. API Convention

## 1.1 목적

프론트엔드(React Native) · 백엔드(Spring Boot) · AI 서버 간 일관된 인터페이스를 제공하기 위한 설계 규칙과 전체 API 명세를 정의한다.

## 1.2 Base URL

```
/api/v1
```

모든 API는 버전 경로 하위에 정의한다. 버전 변경 시 `/api/v2`로 확장한다.

## 1.3 REST URI 규칙

**Resource는 복수형**

| O | X |
| --- | --- |
| `/products` | `/product` |
| `/skin-records` | `/skinRecord` |
| `/routines` | `/routine` |

**URI에 동사를 쓰지 않는다**

| O | X |
| --- | --- |
| `POST /product-records` | `POST /saveProduct` |
| `PATCH /users/me/profile` | `POST /updateProfile` |

**로그인 사용자는 `/me`**

```
GET   /users/me
PATCH /users/me/profile
PATCH /users/me/location
```

**단어 구분은 하이픈(kebab-case)**

```
/product-records
/skin-records
/ingredient-profile
```

## 1.4 HTTP Method

| Method | 용도 |
| --- | --- |
| `GET` | 조회. 데이터를 변경하지 않는다 |
| `POST` | 생성 |
| `PATCH` | 부분 수정 |
| `DELETE` | 삭제 |

`PUT`은 사용하지 않는다. 전체 교체가 필요한 경우도 `PATCH`로 처리하고 Business Rule에 교체 범위를 명시한다.

## 1.5 Authentication

```
Authorization: Bearer {accessToken}
```

**인증 불필요 API**

| API | 비고 |
| --- | --- |
| `POST /auth/login` |  |
| `POST /auth/refresh` | `Refresh-Token` 헤더 사용 |

**온보딩 미완료 사용자 처리 `신규`**

인증은 되었으나 `onboardingCompleted = false`인 사용자가 본 서비스 API(`/home`, `/records/*`, `/reports` 등)를 호출하면 `403 ONBOARD_NOT_COMPLETED`를 반환한다.

접근 허용 API는 다음과 같다.

```
GET   /users/me/onboarding
PATCH /users/me/onboarding/*
POST  /users/me/onboarding/complete
POST  /auth/logout
```

## 1.6 Request 규칙

| 구분 | 사용 |
| --- | --- |
| Query Parameter | 조회 조건 · 필터 (`?keyword=토너`, `?timeSlot=MORNING`) |
| Path Variable | 리소스 식별 (`/products/{productId}`) |
| Request Body | 생성 · 수정 (JSON) |
| multipart/form-data | 이미지 업로드 |

## 1.7 멱등성 규칙 `신규`

저장 API는 네트워크 지연 중 재전송으로 중복 저장이 발생할 수 있다. 기능명세서 F-SYSTEM-02(중복 요청 방지)의 서버측 방어선으로 다음을 적용한다.

**적용 대상**

```
POST /product-records
POST /routines/{routineId}/records
POST /skin-records
POST /checks
```

**요청 헤더**

```
Idempotency-Key: {클라이언트 생성 UUID}
```

**동작**

1. 동일 키로 이미 처리 완료된 요청이면 **저장하지 않고 최초 응답을 그대로 반환**한다.
2. 동일 키로 아직 처리 중이면 `409 COMMON_DUPLICATE_REQUEST`를 반환한다.
3. 키 보관 기간은 24시간으로 한다.
4. 키가 없는 요청도 허용하되, 클라이언트는 위 4개 API에 반드시 포함한다.

## 1.8 Response 규칙

모든 API가 동일한 봉투를 사용한다. 자세한 규칙은 **공통 응답 포맷 + 예외코드 v2** 문서를 따른다.

json

```json
{
  "isSuccess": true,
  "code": "COMMON_SUCCESS",
  "message": "조회에 성공했습니다.",
  "result": {}
}
```

**부분 실패** — BFF 응답에서 일부 외부 API가 실패해도 전체를 실패로 만들지 않는다. 실패 영역은 `null`로 내리고 `failedSections`에 등록한다.

## 1.9 데이터 규칙

| 항목 | 규칙 |
| --- | --- |
| 날짜/시간 | ISO-8601 · `2026-08-07T14:30:00+09:00` |
| 날짜 | `2026-08-07` |
| 시각 | `23:00` |
| 연월 | `2026-08` |
| ID | 모두 `Long` |
| Enum | 문자열. 숫자 Enum 금지 |
| 필드명 | camelCase |
| 빈 목록 | `[]` (null 금지) |

## 1.10 Pagination

MVP에서는 사용하지 않는다. 대신 조회 API마다 **최대 반환 건수**를 명시한다.

| API | 최대 건수 |
| --- | --- |
| `GET /products` | 20 |
| `GET /locations` | 30 |
| `GET /product-records/home` (저장 제품) | 50 |

확장 시 `?page=0&size=20` 형태를 사용한다.

---

# 2. 도메인 구성

```
Auth ─────── 인증 · 토큰
Onboard ──── 온보딩 단계별 저장          [신규]
User ─────── 프로필 · 설정 · 마이페이지
Home ─────── 홈 BFF (낮/밤)
Record ───── 기록 허브 · 캘린더 · 슬롯   [신규]
Product ──── 제품 · 성분 · 제품 기록 · 루틴 · 스캔
Skin ─────── 피부 기록 · AI 분석
Check ────── 구매 전 확인
Report ───── 리포트 · 인사이트
```

**Resource 관계**

```
User
 ├─ UserProfile        (이름 · 성별 · 나이 · 피부타입 · 호르몬)
 ├─ UserLocation       (위치 설정)
 ├─ UserProduct        (저장 제품)
 ├─ Routine            (MORNING / NIGHT)
 ├─ ProductRecord      (날짜 + timeSlot)
 ├─ SkinRecord         (날짜 + timeSlot)
 ├─ IngredientProfile  (성분별 GOOD/CAUTION/INSUFFICIENT)
 └─ CheckHistory

Product ─ Ingredient   (N:M)
```

---

# 3. Auth API

## AUTH-01 · 로그인

| 항목 | 내용 |
| --- | --- |
| Method | `POST` |
| URI | `/api/v1/auth/login` |
| 인증 | 불필요 |
| 관련 화면 | S-00 |
| 관련 기능 | F-AUTH-01 |

**Request Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `provider` | Enum | O | `KAKAO` / `GOOGLE` / `EMAIL` |
| `oauthAccessToken` | String | O | 제공자가 반환한 토큰 |

**Success Response — 200**

json

```json
{
  "isSuccess": true,
  "code": "COMMON_SUCCESS",
  "message": "로그인에 성공했습니다.",
  "result": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi...",
    "isNewUser": true,
    "onboardingCompleted": false,
    "nextStep": "BASIC_INFO"
  }
}
```

**`nextStep` 값** `신규`

| 값 | 이동 화면 |
| --- | --- |
| `BASIC_INFO` | S-01 |
| `SKIN_TYPE` | S-02 |
| `HORMONE` | S-04 |
| `COMPLETE` | S-05 |
| `NONE` | 메인 탭 (온보딩 완료) |

> 기능명세서 F-AUTH-01 BR 6 — "온보딩 미완료 사용자는 마지막 미완료 단계부터 재개한다"를 구현하기 위한 필드입니다. 클라이언트가 저장된 프로필을 역산해 단계를 판단하지 않도록 **서버가 다음 단계를 알려줍니다.**
> 

**Error**

| HTTP | Code |
| --- | --- |
| 400 | `AUTH_UNSUPPORTED_PROVIDER` |
| 401 | `AUTH_LOGIN_FAILED` |
| 500 | `COMMON_SERVER_ERROR` |

**Business Rule**

1. OAuth 토큰을 검증한다.
2. 사용자를 조회하고 없으면 생성한다.
3. JWT Access Token · Refresh Token을 발급한다.
4. 온보딩 진행 상태를 계산해 `nextStep`을 반환한다.

> **TBD-01** — `EMAIL` provider의 MVP 포함 여부가 미정입니다. 범위에서 빠지면 `400 AUTH_UNSUPPORTED_PROVIDER`를 반환하고 S-00의 이메일 버튼을 비활성화합니다.
> 

---

## AUTH-02 · Access Token 재발급

| 항목 | 내용 |
| --- | --- |
| Method | `POST` |
| URI | `/api/v1/auth/refresh` |
| 인증 | 불필요 (`Refresh-Token` 헤더 필요) |
| 관련 기능 | F-AUTH-02 |

**Request Header**

| Header | Required |
| --- | --- |
| `Refresh-Token` | O |

**Success Response — 200**

json

```json
{
  "isSuccess": true,
  "code": "COMMON_SUCCESS",
  "message": "토큰이 재발급되었습니다.",
  "result": {
    "accessToken": "eyJhbGciOi..."
  }
}
```

**Error**

| HTTP | Code |
| --- | --- |
| 401 | `AUTH_INVALID_TOKEN` |
| 401 | `AUTH_REFRESH_TOKEN_EXPIRED` |

---

## AUTH-03 · 로그아웃

| 항목 | 내용 |
| --- | --- |
| Method | `POST` |
| URI | `/api/v1/auth/logout` |
| 인증 | 필요 |
| 관련 화면 | S-23 |
| 관련 기능 | F-AUTH-03 |

**Success Response — 200**

json

```json
{
  "isSuccess": true,
  "code": "COMMON_SUCCESS",
  "message": "로그아웃되었습니다.",
  "result": null
}
```

**Business Rule**

1. 서버에 저장된 Refresh Token을 폐기한다.
2. 기록 데이터는 삭제하지 않는다.
3. 온보딩 미완료 사용자도 호출할 수 있다.

---

# 4. Onboarding API `신규`

> **설계 근거**
> 
> 
> 온보딩을 하나의 `PATCH /users/me/profile`로 처리하지 않고 **화면 단위로 분리**했습니다. 세 가지 이유입니다.
> 
> 1. **단계별 검증 규칙이 다르다.** 피부 타입의 배타 규칙(`ONBOARD_SKIN_TYPE_CONFLICT`)과 호르몬 정보의 성별 조건(`ONBOARD_HORMONE_NOT_APPLICABLE`)은 서로 다른 화면에서만 의미가 있습니다.
> 2. **단계 재개가 필요하다.** 중간 이탈 후 재로그인 시 마지막 미완료 단계부터 시작해야 하는데(F-AUTH-01 BR 6), 통합 API로는 어디까지 입력했는지 서버가 판단하기 어렵습니다.
> 3. **성별에 따라 단계 수가 다르다.** S-04는 조건부 화면이라 단계 개념 없이는 진행률(F-ONBOARD-04)을 계산할 수 없습니다.
> 
> 온보딩 완료 후의 **프로필 수정은 `PATCH /users/me/profile`을 재사용**합니다.
> 

## ONBOARD-01 · 온보딩 상태 조회

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URI | `/api/v1/users/me/onboarding` |
| 인증 | 필요 |
| 관련 기능 | F-AUTH-01, F-ONBOARD-04 |

**Success Response — 200**

json

```json
{
  "isSuccess": true,
  "code": "COMMON_SUCCESS",
  "message": "조회에 성공했습니다.",
  "result": {
    "onboardingCompleted": false,
    "nextStep": "SKIN_TYPE",
    "currentStepIndex": 2,
    "totalStepCount": 3,
    "steps": {
      "basicInfo": { "completed": true, "required": true },
      "skinType":  { "completed": false, "required": true },
      "hormone":   { "completed": false, "required": false }
    }
  }
}
```

**Business Rule**

1. `totalStepCount`는 성별에 따라 달라진다. `FEMALE`이면 3, 그 외는 2다.
2. 성별이 아직 입력되지 않았다면 `totalStepCount`는 2로 반환하고, 성별 입력 후 재계산한다.
3. `hormone.required`는 항상 `false`다. 건너뛸 수 있는 단계이기 때문이다. 단 성별이 `FEMALE`이 아니면 `steps`에서 아예 제외한다.

> **TBD-02** — 성별에 따라 분모가 달라지는 진행률 표시 방식이 미정입니다. 위 응답은 (a) 분모 재계산 안을 전제로 설계했습니다. (b) 항상 3단계 고정으로 결정되면 `totalStepCount`를 상수로 내리고 비여성 사용자의 hormone 단계를 `completed: true`로 처리하면 됩니다. **필드 구조는 두 안 모두 수용 가능합니다.**
> 

---

## ONBOARD-02 · 기본 정보 저장

| 항목 | 내용 |
| --- | --- |
| Method | `PATCH` |
| URI | `/api/v1/users/me/onboarding/basic-info` |
| 인증 | 필요 |
| 관련 화면 | S-01 |
| 관련 기능 | F-ONBOARD-01 |

**Request Body**

| Field | Type | Required | Validation |
| --- | --- | --- | --- |
| `name` | String | O | 1~10자 · 공백만 불가 |
| `gender` | Enum | O | `FEMALE` / `MALE` / `UNSPECIFIED` |
| `age` | Integer | O | 10~100 |

json

```json
{
  "name": "김민지",
  "gender": "FEMALE",
  "age": 26
}
```

**Success Response — 200**

json

```json
{
  "isSuccess": true,
  "code": "COMMON_SUCCESS",
  "message": "저장되었습니다.",
  "result": {
    "nextStep": "SKIN_TYPE",
    "totalStepCount": 3
  }
}
```

**Error**

| HTTP | Code | 조건 |
| --- | --- | --- |
| 422 | `COMMON_VALIDATION_FAILED` | 이름·나이 범위 위반 |
| 409 | `ONBOARD_ALREADY_COMPLETED` | 이미 온보딩 완료 |

**Business Rule**

1. 세 필드를 한 번에 저장한다. 순차 노출은 클라이언트 UI 동작이며 서버는 완성된 상태만 받는다.
2. **`gender` 값은 S-04 진입 여부와 진행률 계산의 기준이므로 반드시 저장한다.**
3. 응답의 `totalStepCount`로 클라이언트가 진행 바 분모를 갱신한다.

---

## ONBOARD-03 · 피부 타입 저장

| 항목 | 내용 |
| --- | --- |
| Method | `PATCH` |
| URI | `/api/v1/users/me/onboarding/skin-types` |
| 인증 | 필요 |
| 관련 화면 | S-02 |
| 관련 기능 | F-ONBOARD-02 |

**Request Body**

| Field | Type | Required | Validation |
| --- | --- | --- | --- |
| `skinTypes` | Array<Enum> | O | 1개 이상 · `UNKNOWN`은 단독만 |

json

```json
{
  "skinTypes": ["OILY", "SENSITIVE"]
}
```

**Success Response — 200**

json

```json
{
  "isSuccess": true,
  "code": "COMMON_SUCCESS",
  "message": "저장되었습니다.",
  "result": {
    "nextStep": "HORMONE"
  }
}
```

**Error**

| HTTP | Code | 조건 |
| --- | --- | --- |
| 422 | `ONBOARD_SKIN_TYPE_REQUIRED` | 빈 배열 |
| 422 | `ONBOARD_SKIN_TYPE_CONFLICT` | `UNKNOWN` + 다른 값 |
| 403 | `ONBOARD_STEP_NOT_ALLOWED` | 기본 정보 미입력 상태 |

**Business Rule**

1. 배열 전체를 교체 저장한다.
2. 성별이 `FEMALE`이면 `nextStep`은 `HORMONE`, 그 외는 `COMPLETE`다.
3. 저장된 피부 타입은 F-ANALYSIS-04에서 **성분 반응 해석의 초기 기준**으로 사용된다.

---

## ONBOARD-04 · 생리 · 호르몬 정보 저장

| 항목 | 내용 |
| --- | --- |
| Method | `PATCH` |
| URI | `/api/v1/users/me/onboarding/hormone` |
| 인증 | 필요 |
| 관련 화면 | S-04 |
| 관련 기능 | F-ONBOARD-03 |

**Request Body**

| Field | Type | Required | Validation |
| --- | --- | --- | --- |
| `hormoneStatus` | Enum | O | `MENSTRUATING` / `HORMONE_PILL` / `HORMONE_INJECTION` / `MENOPAUSE` |
| `lastPeriodStartDate` | Date | X | 오늘 이후 불가 |
| `averageCycleDays` | Integer | X | 20~45 |

json

```json
{
  "hormoneStatus": "MENSTRUATING",
  "lastPeriodStartDate": "2026-07-20",
  "averageCycleDays": 28
}
```

**Success Response — 200**

json

```json
{
  "isSuccess": true,
  "code": "COMMON_SUCCESS",
  "message": "저장되었습니다.",
  "result": {
    "nextStep": "COMPLETE"
  }
}
```

**Error**

| HTTP | Code | 조건 |
| --- | --- | --- |
| 403 | `ONBOARD_HORMONE_NOT_APPLICABLE` | 성별이 `FEMALE`이 아님 |
| 422 | `COMMON_VALIDATION_FAILED` | 주기·날짜 범위 위반 |

**Business Rule**

1. **성별이 `FEMALE`인 사용자만 호출할 수 있다.** 클라이언트도 진입을 막지만 서버에서도 차단한다.
2. `hormoneStatus`가 `MENOPAUSE`면 `lastPeriodStartDate` · `averageCycleDays`를 무시한다.
3. 이 API를 호출하지 않고 `POST /users/me/onboarding/complete`를 호출하면 건너뛴 것으로 처리한다. 별도의 skip API를 두지 않는다.
4. 정보가 없어도 F-SKIN · F-ANALYSIS는 정상 동작해야 한다.

---

## ONBOARD-05 · 온보딩 완료

| 항목 | 내용 |
| --- | --- |
| Method | `POST` |
| URI | `/api/v1/users/me/onboarding/complete` |
| 인증 | 필요 |
| 관련 화면 | S-05 |
| 관련 기능 | F-ONBOARD-05 |

**Success Response — 200**

json

```json
{
  "isSuccess": true,
  "code": "COMMON_SUCCESS",
  "message": "프로파일이 완성되었어요.",
  "result": {
    "onboardingCompleted": true,
    "summary": [
      { "label": "이름",       "value": "김민지" },
      { "label": "성별 · 나이", "value": "여성 · 26세" },
      { "label": "피부 타입",   "value": "지성 · 민감성" },
      { "label": "생리 주기",   "value": "28일 · 생리" }
    ]
  }
}
```

**Business Rule**

1. 필수 단계(기본 정보 · 피부 타입)가 모두 저장되었는지 검증한다.
2. `onboardingCompleted`를 `true`로 전환한다.
3. `summary`는 **입력 여부에 따라 3행 또는 4행**을 반환한다. S-04를 건너뛴 여성 사용자에게는 생리 주기 행을 포함하지 않는다.
4. 요약 행의 라벨·값 조합을 서버가 완성해 내려준다. 클라이언트가 Enum을 한글로 변환하는 로직을 중복 구현하지 않게 하기 위함이다.

**Error**

| HTTP | Code | 조건 |
| --- | --- | --- |
| 403 | `ONBOARD_STEP_NOT_ALLOWED` | 필수 단계 미완료 |
| 409 | `ONBOARD_ALREADY_COMPLETED` | 이미 완료 |

---

# 5. User API

## USER-01 · 마이페이지 조회

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URI | `/api/v1/users/me` |
| 인증 | 필요 |
| 관련 화면 | S-23 |
| 관련 기능 | F-MY-01, F-MY-02 |

**Success Response — 200**

json

```json
{
  "isSuccess": true,
  "code": "COMMON_SUCCESS",
  "message": "조회에 성공했습니다.",
  "result": {
    "name": "김민지",
    "joinedDays": 30,
    "totalRecordCount": 22,
    "skinTypes": ["OILY", "SENSITIVE"],

    "ingredientProfile": {
      "completionRate": 65,
      "goodCount": 5,
      "cautionCount": 3,
      "insufficientCount": 12,
      "topIngredients": [
        { "ingredientId": 3,  "name": "나이아신아마이드", "status": "GOOD" },
        { "ingredientId": 8,  "name": "히알루론산",       "status": "GOOD" },
        { "ingredientId": 21, "name": "레티놀",           "status": "CAUTION" },
        { "ingredientId": 27, "name": "향료",             "status": "CAUTION" }
      ]
    },

    "location": "서울 강남구",
    "notificationEnabled": true
  }
}
```

**Business Rule**

1. **보유 코인 필드는 제거되었다.** (F-MY-01 BR 4 · 코인 시스템 설계 미완)
2. `joinedDays`는 가입일 기준으로 계산한다.
3. `totalRecordCount`는 실제 저장된 기록 수다. 하루 2회 구조이므로 모닝·나이트를 각각 1회로 센다.
4. `topIngredients`는 마이페이지 요약 노출용으로 최대 8건을 반환한다. 전체 목록은 USER-02를 사용한다.
5. `completionRate`는 F-ANALYSIS-05 값을 그대로 사용하며, 구매 전 확인 화면과 동일한 값이어야 한다.

---

## USER-02 · 성분 프로파일 전체 조회

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URI | `/api/v1/users/me/ingredient-profile` |
| 인증 | 필요 |
| 관련 화면 | 성분 전체 보기 (신규 화면) |
| 관련 기능 | F-MY-03 |

**Query Parameter**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `status` | Enum | X | `GOOD` / `CAUTION` / `INSUFFICIENT` · 미지정 시 전체 |

**Success Response — 200**

json

```json
{
  "isSuccess": true,
  "code": "COMMON_SUCCESS",
  "message": "조회에 성공했습니다.",
  "result": {
    "completionRate": 65,
    "ingredients": [
      {
        "ingredientId": 3,
        "name": "나이아신아마이드",
        "status": "GOOD",
        "reason": "피부 톤 개선 이력",
        "recordCount": 12
      },
      {
        "ingredientId": 27,
        "name": "향료",
        "status": "CAUTION",
        "reason": "과거 홍조 반응 있음",
        "recordCount": 7
      },
      {
        "ingredientId": 44,
        "name": "스쿠알란",
        "status": "INSUFFICIENT",
        "reason": null,
        "recordCount": 1
      }
    ]
  }
}
```

**Business Rule**

1. `status`가 `INSUFFICIENT`인 성분의 `reason`은 `null`이다. **데이터가 부족한 성분에 판단 근거를 지어내지 않는다.**
2. `recordCount`는 해당 성분이 포함된 제품의 기록 횟수다. 사용자가 왜 아직 데이터 부족인지 이해할 수 있게 한다.
3. 정렬은 `GOOD` → `CAUTION` → `INSUFFICIENT` 순, 그룹 내에서는 `recordCount` 내림차순이다.

> 대상 화면이 디자인 담당에게 제작 요청된 상태입니다. 화면 확정 후 필드가 추가될 수 있습니다.
> 

---

## USER-03 · 프로필 조회

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URI | `/api/v1/users/me/profile` |
| 인증 | 필요 |

**Success Response — 200**

json

```json
{
  "isSuccess": true,
  "code": "COMMON_SUCCESS",
  "message": "조회에 성공했습니다.",
  "result": {
    "name": "김민지",
    "gender": "FEMALE",
    "age": 26,
    "skinTypes": ["OILY", "SENSITIVE"],
    "hormoneStatus": "MENSTRUATING",
    "lastPeriodStartDate": "2026-07-20",
    "averageCycleDays": 28,
    "location": "서울 강남구",
    "notificationEnabled": true
  }
}
```

> `sleepTime` · `wakeTime` 필드는 **삭제되었습니다.** 온보딩에서 수면 시간 입력이 제거되고 낮/밤 판정이 고정 시각으로 바뀌었기 때문입니다. (v1 USER-04에 존재하던 필드)
> 

---

## USER-04 · 프로필 수정

| 항목 | 내용 |
| --- | --- |
| Method | `PATCH` |
| URI | `/api/v1/users/me/profile` |
| 인증 | 필요 |
| 관련 화면 | S-23 |

**Request Body** — 모든 필드 선택. 전달된 필드만 수정한다.

| Field | Type | Validation |
| --- | --- | --- |
| `name` | String | 1~10자 |
| `gender` | Enum | `Gender` |
| `age` | Integer | 10~100 |
| `skinTypes` | Array<Enum> | 1개 이상 · `UNKNOWN` 단독 |
| `hormoneStatus` | Enum | `HormoneStatus` |
| `lastPeriodStartDate` | Date | 오늘 이후 불가 |
| `averageCycleDays` | Integer | 20~45 |

**Business Rule**

1. 온보딩 완료 후의 프로필 수정에 사용한다. 온보딩 중에는 ONBOARD-02~04를 사용한다.
2. 전달하지 않은 필드는 기존 값을 유지한다.
3. `gender`를 `FEMALE`이 아닌 값으로 변경하면 호르몬 관련 필드를 함께 비운다.
4. `skinTypes`는 배열 전체 교체다. 부분 추가·삭제를 지원하지 않는다.

---

## USER-05 · 지역 목록 조회

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URI | `/api/v1/locations` |
| 인증 | 필요 |
| 관련 화면 | S-24 |
| 관련 기능 | F-MY-04 |

**Query Parameter**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `keyword` | String | X | 지역명 부분 검색 · 미지정 시 기본 목록 |

**Success Response — 200**

json

```json
{
  "isSuccess": true,
  "code": "COMMON_SUCCESS",
  "message": "조회에 성공했습니다.",
  "result": [
    { "locationId": 1, "name": "서울 강남구", "current": true  },
    { "locationId": 2, "name": "서울 마포구", "current": false },
    { "locationId": 6, "name": "인천 연수구", "current": false }
  ]
}
```

**Business Rule**

1. 최대 30건을 반환한다.
2. `current`는 사용자가 현재 설정한 지역이다. S-24에서 `현재 설정` 배지로 표시된다.
3. 검색 결과가 없으면 빈 배열을 반환한다. 오류가 아니다.

> **개발 판단 필요** — 현재 지역 데이터가 샘플 6개입니다. 전국 시/구 목록 확보가 선행되어야 합니다.
> 

---

## USER-06 · 위치 설정

| 항목 | 내용 |
| --- | --- |
| Method | `PATCH` |
| URI | `/api/v1/users/me/location` |
| 인증 | 필요 |
| 관련 화면 | S-24 |
| 관련 기능 | F-MY-04 |

**Request Body** — 둘 중 하나를 사용한다.

**(a) 지역 선택 (S-24)**

json

```json
{ "locationId": 1 }
```

**(b) GPS 좌표 (권한 허용 시 자동 갱신)**

json

```json
{ "latitude": 37.4979, "longitude": 127.0276 }
```

**Business Rule**

1. `locationId`와 좌표가 동시에 전달되면 `locationId`를 우선한다. 사용자의 명시적 선택이 자동 감지보다 우선이다.
2. 저장 후 다음 환경 조회부터 이 위치를 기준으로 동작한다.
3. 좌표로 저장한 경우 서버가 역지오코딩해 표시용 지역명을 함께 저장한다.

**Error**

| HTTP | Code |
| --- | --- |
| 404 | `USER_LOCATION_NOT_FOUND` |

---

## USER-07 · 알림 설정

| 항목 | 내용 |
| --- | --- |
| Method | `PATCH` |
| URI | `/api/v1/users/me/notification` |
| 인증 | 필요 |
| 관련 화면 | S-06, S-23 |
| 관련 기능 | F-ONBOARD-06, F-MY-05 |

**Request Body**

json

```json
{ "enabled": true }
```

**Business Rule**

1. 앱 내부 알림 설정만 변경한다. **OS 권한과는 별도로 관리한다.**
2. OS 권한이 거부된 상태에서도 이 값은 저장할 수 있다. 클라이언트가 권한 재요청 안내를 띄운다.

---

# 6. Home API

> 홈은 **BFF(Backend For Frontend)** 구조다. 낮/밤 판정, 환경 정보, 루틴 추천, 주간 캘린더, 리포트 요약을 하나의 API로 제공해 네트워크 호출 수를 최소화한다.
> 

## HOME-01 · 홈 조회

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URI | `/api/v1/home` |
| 인증 | 필요 |
| 관련 화면 | S-07, S-08 |
| 관련 기능 | F-HOME-01 ~ F-HOME-07 |

**Query Parameter**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `homeType` | Enum | X | `DAY` / `NIGHT` · 사용자가 토글로 강제 지정한 경우 |

**Business Rule — 낮/밤 판정** `변경`

```
homeType 파라미터 있음?
  ├─ 예 → 그 값을 사용 (토글이 자동 판정을 덮어씀)
  └─ 아니오 → 현재 시각으로 판정
                06:00 ~ 17:59 → DAY
                18:00 ~ 05:59 → NIGHT
```

**전 사용자 동일한 고정 시각 기준이다.** 사용자별 수면 시간을 사용하지 않는다. 온보딩에서 수면 시간 입력이 제거되었기 때문이다.

> 판정 로직은 서비스 계층의 단일 지점에 격리한다. 이후 루틴 기록 데이터가 쌓이면 이 부분만 개인화 로직으로 교체할 수 있어야 한다. (F-HOME-01 BR 5)
> 

---

### Success Response — 낮 (S-07)

json

```json
{
  "isSuccess": true,
  "code": "COMMON_SUCCESS",
  "message": "조회에 성공했습니다.",
  "result": {
    "homeType": "DAY",
    "greeting": "좋은 아침이에요",

    "environment": {
      "location": "서울 강남구",
      "weather": "SUNNY",
      "temperature": 28,
      "uvIndex": 7,
      "uvGrade": "HIGH",
      "humidity": 55,
      "humidityGrade": "NORMAL"
    },

    "routineRecommendation": {
      "timeSlot": "MORNING",
      "items": [
        { "rank": 1, "productId": 21, "name": "자외선 차단제",  "reason": "자외선 지수 높음" },
        { "rank": 2, "productId": 15, "name": "히알루론산 세럼", "reason": "실내 건조 주의" }
      ]
    },

    "todayRecord": {
      "morning": { "productCompleted": false, "skinCompleted": false },
      "night":   { "productCompleted": false, "skinCompleted": false }
    },

    "weeklyCalendar": null,
    "todayReport": null,
    "failedSections": []
  }
}
```

### Success Response — 밤 (S-08)

json

```json
{
  "isSuccess": true,
  "code": "COMMON_SUCCESS",
  "message": "조회에 성공했습니다.",
  "result": {
    "homeType": "NIGHT",
    "greeting": "오늘도 수고했어요",
    "recordPrompt": "지금 기록을 남기면 내일 분석이 더 정확해져요",

    "environment": null,

    "routineRecommendation": {
      "timeSlot": "NIGHT",
      "items": [
        { "rank": 1, "productId": 33, "name": "레티놀 크림", "reason": "야간 루틴 권장" }
      ]
    },

    "todayRecord": {
      "morning": { "productCompleted": true,  "skinCompleted": true  },
      "night":   { "productCompleted": false, "skinCompleted": false }
    },

    "weeklyCalendar": [
      { "date": "2026-08-03", "morning": "FULL",    "night": "FULL"    },
      { "date": "2026-08-04", "morning": "FULL",    "night": "PARTIAL" },
      { "date": "2026-08-05", "morning": "PARTIAL", "night": "NONE"    },
      { "date": "2026-08-06", "morning": "FULL",    "night": "FULL"    },
      { "date": "2026-08-07", "morning": "FULL",    "night": "NONE"    }
    ],

    "todayReport": {
      "skinRecordId": 31,
      "totalScore": 78,
      "previousScore": 72,
      "change": 6,
      "comparedTo": "2026-08-06 MORNING",
      "summary": "어제보다 좋아졌어요"
    },

    "failedSections": []
  }
}
```

---

**Business Rule — 영역별 규칙**

| 영역 | 규칙 |
| --- | --- |
| `environment` | **낮에만** 조회한다. 밤에는 `null`. S-08에 날씨 영역이 없기 때문 |
| `routineRecommendation` | 낮은 `MORNING`, 밤은 `NIGHT` 루틴 대상. 각 항목에 `reason` 필수 |
| `todayRecord` | 4개 슬롯 전체 상태. 낮/밤 무관하게 항상 반환 |
| `weeklyCalendar` | **밤에만** 반환. 이번 주(월~오늘)만. 이번 달 전체는 RECORD-01 담당 |
| `todayReport` | **밤 + 오늘 피부 기록 존재** 시에만. 조건 미충족 시 `null` |

**`weeklyCalendar` 점 상태**

| 값 | 의미 | 표기 |
| --- | --- | --- |
| `FULL` | 해당 시간대 제품·피부 둘 다 완료 | 채움 |
| `PARTIAL` | 하나만 완료 | 외곽선 |
| `NONE` | 기록 없음 | 흐림 |

**`todayReport` 조건** (F-HOME-07)

1. 오늘 피부 기록이 있어야 한다. **제품 기록은 선택이다.** 리포트 최소 요건이 "피부 사진 필수 · 제품 선택"이기 때문이다.
2. 비교 대상(전일 동일 시간대)이 없으면 `previousScore` · `change`를 `null`로 내리고 `summary`에서 비교 문구를 뺀다.

> **TBD-04** — 리포트를 만들 데이터가 부족할 때의 안내 방식이 미정입니다. 현재는 `todayReport: null`로 카드를 숨기는 안으로 설계했습니다. 안내 카드로 대체하기로 결정되면 `todayReport.status: "INSUFFICIENT"` 형태로 확장합니다.
> 
> 
> **TBD-03** — 낮/밤 토글 상태의 유지 범위가 미정입니다. 현재 설계는 **클라이언트 상태**로 보고 쿼리 파라미터로만 전달합니다. 서버 저장이 필요해지면 `PATCH /users/me/home-preference`를 추가합니다.
> 

---

**부분 실패 예시** — 날씨 API 장애

json

```json
{
  "isSuccess": true,
  "code": "COMMON_SUCCESS",
  "message": "조회에 성공했습니다.",
  "result": {
    "homeType": "DAY",
    "environment": null,
    "routineRecommendation": { "...": "..." },
    "todayRecord": { "...": "..." },
    "failedSections": [
      {
        "section": "environment",
        "code": "WEATHER_API_FAILED",
        "message": "날씨 정보를 불러오지 못했어요."
      }
    ]
  }
}
```

이때 루틴 추천은 개인화 순위 계산을 생략하고 저장된 루틴 순서를 그대로 반환한다. (F-HOME-04 BR 4)

**Error**

| HTTP | Code |
| --- | --- |
| 401 | `AUTH_INVALID_TOKEN` |
| 403 | `ONBOARD_NOT_COMPLETED` |
| 400 | `WEATHER_LOCATION_REQUIRED` |

> `WEATHER_LOCATION_REQUIRED`는 위치 권한도 없고 설정 지역도 없는 경우에만 반환한다. 클라이언트는 이 코드를 받으면 S-24로 유도한다.
> 

---

# 7. Record API `신규`

## RECORD-01 · 월간 기록 캘린더 조회

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URI | `/api/v1/records/calendar` |
| 인증 | 필요 |
| 관련 화면 | S-09, S-10 |
| 관련 기능 | F-RECORD-01, F-RECORD-03 |

**Query Parameter**

| Field | Type | Required | Validation |
| --- | --- | --- | --- |
| `yearMonth` | String | X | `yyyy-MM` · 미지정 시 현재 월 |

**Success Response — 200**

json

```json
{
  "isSuccess": true,
  "code": "COMMON_SUCCESS",
  "message": "조회에 성공했습니다.",
  "result": {
    "yearMonth": "2026-08",
    "days": [
      { "date": "2026-08-01", "morning": "FULL",    "night": "PARTIAL", "today": false },
      { "date": "2026-08-02", "morning": "NONE",    "night": "NONE",    "today": false },
      { "date": "2026-08-07", "morning": "FULL",    "night": "NONE",    "today": true  }
    ],
    "monthlySummary": {
      "productRecordCount": 15,
      "skinRecordCount": 12
    }
  }
}
```

**Business Rule**

1. 조회 대상 월의 **모든 날짜**를 반환한다. 기록이 없는 날도 `NONE`으로 포함한다. 클라이언트가 날짜를 채워 넣지 않게 하기 위함이다.
2. 가입 이전 날짜는 `NONE`으로 반환한다.
3. 미래 날짜도 `NONE`으로 포함하되 클라이언트는 선택 불가 처리한다.
4. `monthlySummary`는 **이번 달** 기준이다. 제품 기록과 피부 기록을 구분해 집계하며, 하루 2회 구조이므로 모닝·나이트를 각각 1회로 센다. 동일 슬롯 재기록은 중복 집계하지 않는다.

**Error**

| HTTP | Code |
| --- | --- |
| 422 | `RECORD_INVALID_MONTH` |

---

## RECORD-02 · 오늘 기록 슬롯 상태 조회

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URI | `/api/v1/records/today` |
| 인증 | 필요 |
| 관련 화면 | S-09, S-10 |
| 관련 기능 | F-RECORD-02 |

**Success Response — 200**

json

```json
{
  "isSuccess": true,
  "code": "COMMON_SUCCESS",
  "message": "조회에 성공했습니다.",
  "result": {
    "date": "2026-08-07",
    "defaultTab": "NIGHT",

    "morning": {
      "product": {
        "completed": true,
        "recordId": 41,
        "summary": "라운드랩 토너 외 2개"
      },
      "skin": {
        "completed": true,
        "skinRecordId": 31,
        "summary": "분석 점수 78점"
      }
    },

    "night": {
      "product": { "completed": false, "recordId": null, "summary": null },
      "skin":    { "completed": false, "skinRecordId": null, "summary": null }
    }
  }
}
```

**Business Rule**

1. **4개 슬롯 전체**를 항상 반환한다. 탭 전환 시 재요청하지 않도록 한다.
2. `defaultTab`은 현재 시각 기준 시간대다. 홈 CTA로 진입한 경우 클라이언트가 이 값을 무시하고 진입 경로의 시간대를 사용할 수 있다.
3. 미완료 슬롯의 `summary`는 `null`이다. 빈 문자열을 쓰지 않는다.
4. 완료 슬롯의 `recordId` · `skinRecordId`로 상세 조회나 수정에 연결한다.

---

# 8. Product API

```
제품 기록 화면 진입 (S-11)
  ↓ GET /product-records/home?timeSlot=MORNING
검색                              스캔
  ↓ GET /products?keyword=          ↓ POST /products/scan
제품 선택 (S-12)                     ↓
  ↓                                 ↓
성분 확인 (S-14) ← GET /products/{productId}
  ↓
기록 완료 → POST /product-records   ★ 저장 지점
```

---

## PRODUCT-01 · 제품 기록 화면 조회

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URI | `/api/v1/product-records/home` |
| 인증 | 필요 |
| 관련 화면 | S-11 |
| 관련 기능 | F-PRODUCT-01, F-PRODUCT-05 |

**Query Parameter**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `timeSlot` | Enum | O | `MORNING` / `NIGHT` |

**Success Response — 200**

json

```json
{
  "isSuccess": true,
  "code": "COMMON_SUCCESS",
  "message": "조회에 성공했습니다.",
  "result": {
    "timeSlot": "MORNING",
    "alreadyRecorded": false,

    "routines": [
      {
        "routineId": 1,
        "name": "모닝루틴",
        "timeSlot": "MORNING",
        "productCount": 3,
        "productSummary": "토너 · 세럼 · 선크림"
      }
    ],

    "savedProducts": [
      {
        "productId": 11,
        "name": "라운드랩 자작나무 수분 토너",
        "brand": "라운드랩",
        "category": "TONER",
        "lastUsedAt": "2026-08-06T08:12:00+09:00"
      },
      {
        "productId": 15,
        "name": "이니스프리 어성초 세럼",
        "brand": "이니스프리",
        "category": "SERUM",
        "lastUsedAt": "2026-08-05T08:30:00+09:00"
      }
    ]
  }
}
```

**Business Rule**

1. **`timeSlot`은 필수다.** 이 값이 저장 시점까지 화면에서 유지되어 어느 슬롯에 기록할지를 결정한다.
2. `routines`는 요청한 `timeSlot`의 루틴을 먼저 정렬한다. 다른 시간대 루틴도 반환하되 클라이언트가 구분할 수 있도록 `timeSlot` 필드를 포함한다.
3. `savedProducts`는 `lastUsedAt` 내림차순, 최대 50건이다.
4. 저장 제품이 없으면 빈 배열을 반환한다. 오류가 아니다.
5. `alreadyRecorded`는 해당 슬롯의 제품 기록 존재 여부다.

---

## PRODUCT-02 · 제품 검색

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URI | `/api/v1/products` |
| 인증 | 필요 |
| 관련 화면 | S-12, S-21 |
| 관련 기능 | F-PRODUCT-02, F-CHECK-02 |

**Query Parameter**

| Field | Type | Required | Validation |
| --- | --- | --- | --- |
| `keyword` | String | O | 1~50자 |

**Success Response — 200**

json

```json
{
  "isSuccess": true,
  "code": "COMMON_SUCCESS",
  "message": "조회에 성공했습니다.",
  "result": {
    "keyword": "라운드랩",
    "totalCount": 3,
    "products": [
      {
        "productId": 11,
        "name": "라운드랩 자작나무 수분 토너",
        "brand": "라운드랩",
        "category": "TONER",
        "saved": true
      },
      {
        "productId": 12,
        "name": "라운드랩 1025 독도 토너",
        "brand": "라운드랩",
        "category": "TONER",
        "saved": false
      }
    ]
  }
}
```

**Business Rule**

1. 부분 일치 검색이며 최대 20건을 반환한다.
2. `totalCount`는 S-12 상단의 "검색 결과 N개" 표시에 사용한다.
3. `saved`는 이미 저장한 제품 여부다. `저장됨` 배지에 사용한다.
4. 동일 제품이 중복 노출되지 않는다.
5. 결과 0건은 빈 배열 + `totalCount: 0`이며 **오류가 아니다.**

**Error**

| HTTP | Code |
| --- | --- |
| 422 | `PRODUCT_INVALID_KEYWORD` |

---

## PRODUCT-03 · 제품 상세 · 성분 조회

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URI | `/api/v1/products/{productId}` |
| 인증 | 필요 |
| 관련 화면 | S-14 |
| 관련 기능 | F-PRODUCT-04 |

**Success Response — 200**

json

```json
{
  "isSuccess": true,
  "code": "COMMON_SUCCESS",
  "message": "조회에 성공했습니다.",
  "result": {
    "productId": 11,
    "name": "라운드랩 자작나무 수분 토너",
    "brand": "라운드랩",
    "category": "TONER",
    "saved": true,
    "ingredientCount": 32,

    "keyIngredients": [
      { "ingredientId": 1,  "name": "정제수",           "status": "INSUFFICIENT" },
      { "ingredientId": 5,  "name": "자작나무수액",     "status": "GOOD",   "note": "50%" },
      { "ingredientId": 3,  "name": "나이아신아마이드", "status": "GOOD" },
      { "ingredientId": 27, "name": "향료",             "status": "CAUTION" }
    ],

    "ingredients": [
      { "ingredientId": 1, "name": "정제수" },
      { "ingredientId": 5, "name": "자작나무수액" }
    ]
  }
}
```

**Business Rule**

1. `keyIngredients`는 주요 성분 섹션용이며 최대 10건이다. 각 성분에 **사용자 개인 프로파일 기준 상태**를 함께 내려준다.
2. `ingredients`는 전체 성분 목록이다.
3. `ingredientCount`는 전체 개수이며 S-14의 "총 N개 성분" 표시에 사용한다.
4. 성분 데이터가 없는 제품은 `ingredientCount: 0` + 빈 배열로 반환한다. 오류가 아니며 클라이언트가 "성분 데이터 부족" 안내를 표시한다.

**Error**

| HTTP | Code |
| --- | --- |
| 404 | `PRODUCT_NOT_FOUND` |

---

## PRODUCT-04 · 제품 스캔

| 항목 | 내용 |
| --- | --- |
| Method | `POST` |
| URI | `/api/v1/products/scan` |
| 인증 | 필요 |
| Content-Type | `multipart/form-data` |
| 관련 화면 | S-13 |
| 관련 기능 | F-PRODUCT-03 |

**Request**

| Field | Type | Required | Validation |
| --- | --- | --- | --- |
| `image` | File | O | jpg / jpeg / png · 10MB 이하 |
| `scanMode` | Enum | O | `BARCODE` / `PRODUCT_IMAGE` |

**Success Response — 200**

json

```json
{
  "isSuccess": true,
  "code": "COMMON_SUCCESS",
  "message": "제품을 인식했어요.",
  "result": {
    "productId": 15,
    "name": "라운드랩 1025 독도 토너",
    "brand": "라운드랩",
    "confidence": 0.94
  }
}
```

**Business Rule**

1. 인식 성공 시 `productId`를 반환하고 클라이언트는 PRODUCT-03으로 상세를 조회한다.
2. `confidence`는 `PRODUCT_IMAGE` 모드에서만 유효하다. `BARCODE`는 항상 `1.0`이다.
3. 인식 실패 시 클라이언트는 재스캔과 함께 **검색 전환 경로를 반드시 제공**한다.

**Error**

| HTTP | Code | 상황 |
| --- | --- | --- |
| 400 | `SCAN_UNSUPPORTED_MODE` | 허용되지 않은 `scanMode` |
| 404 | `SCAN_PRODUCT_NOT_DETECTED` | 인식 실패 |
| 404 | `PRODUCT_NOT_FOUND` | 인식했으나 DB에 없음 |
| 422 | `SCAN_LOW_IMAGE_QUALITY` | 화질 부족 |
| 503 | `SCAN_SERVICE_UNAVAILABLE` | 스캔 서비스 장애 |

> **TBD-05** — 스캔 인식 대상이 확정되지 않았습니다. 성분표 OCR이 추가되면 `scanMode`에 `INGREDIENT_LABEL`이 들어가고, 이 경우 응답이 `productId`가 아니라 **성분 목록**이 되므로 **응답 구조가 달라집니다.** 결정 전까지 이 API는 제품 식별 전용으로 봅니다.
> 

---

## PRODUCT-05 · 제품 기록 저장 ⭐

| 항목 | 내용 |
| --- | --- |
| Method | `POST` |
| URI | `/api/v1/product-records` |
| 인증 | 필요 |
| 관련 화면 | S-14 (`기록 완료` 버튼) |
| 관련 기능 | F-PRODUCT-04 |
| 멱등성 | `Idempotency-Key` 권장 |

**Request Body**

| Field | Type | Required | Validation |
| --- | --- | --- | --- |
| `timeSlot` | Enum | O | `MORNING` / `NIGHT` |
| `productIds` | Array<Long> | O | 1~30개 |
| `force` | Boolean | X | 기본 `false` · 중복 시 갱신 진행 |

json

```json
{
  "timeSlot": "MORNING",
  "productIds": [11, 15, 18]
}
```

**Success Response — 201**

json

```json
{
  "isSuccess": true,
  "code": "COMMON_CREATED",
  "message": "기록이 저장되었어요.",
  "result": {
    "recordId": 41,
    "timeSlot": "MORNING",
    "recordedAt": "2026-08-07T08:20:00+09:00",
    "productCount": 3,
    "skinRecordSuggested": true
  }
}
```

**`skinRecordSuggested`** — 같은 시간대의 피부 기록이 없으면 `true`. S-14 하단의 피부 기록 유도 카드 노출 여부를 서버가 판단한다. (F-PRODUCT-07)

---

**Transaction**

```
BEGIN
  ↓
Product 조회 · 존재 검증
  ↓
중복 검사 (userId + date + timeSlot + productId)
  ↓
UserProduct INSERT (신규 제품만)
  ↓
ProductRecord INSERT
  ↓
UserProduct.lastUsedAt UPDATE
  ↓
COMMIT
```

**Business Rule**

1. 여러 제품을 한 번에 저장한다.
2. 저장 시 **날짜 + `timeSlot`** 을 함께 기록한다. 같은 날 모닝 토너와 나이트 토너는 별개 기록이다.
3. 신규 제품은 `UserProduct`에 자동 추가한다.
4. 기존 제품은 `lastUsedAt`을 갱신한다.
5. 날짜 귀속은 서버 시간 기준으로 계산하되, **`timeSlot`이 `NIGHT`면 자정을 넘겨도 밤이 시작된 날짜(전날)로 저장한다.** `MORNING`은 기록 시각의 달력 날짜를 그대로 쓴다. (공통 응답 포맷 + 예외코드 8.1 참고)

**중복 처리**

같은 날짜 + 같은 `timeSlot`에 이미 기록된 제품이 포함되면 `409`를 반환한다.

json

```json
{
  "isSuccess": false,
  "code": "PRODUCT_ALREADY_RECORDED_IN_SLOT",
  "message": "이미 오늘 모닝에 기록한 제품이에요. 기존 기록을 갱신할까요?",
  "result": {
    "recordId": 41,
    "timeSlot": "MORNING",
    "duplicatedProductIds": [11]
  }
}
```

클라이언트는 확인 팝업을 띄우고, 사용자가 확인하면 **PRODUCT-06으로 수정**하거나 `force: true`로 재요청한다.

**Error**

| HTTP | Code |
| --- | --- |
| 400 | `RECORD_INVALID_TIME_SLOT` |
| 404 | `PRODUCT_NOT_FOUND` |
| 409 | `PRODUCT_ALREADY_RECORDED_IN_SLOT` |
| 409 | `COMMON_DUPLICATE_REQUEST` |
| 422 | `PRODUCT_RECORD_EMPTY` |
| 422 | `PRODUCT_RECORD_LIMIT_EXCEEDED` |
| 500 | `PRODUCT_RECORD_SAVE_FAILED` |

---

## PRODUCT-06 · 제품 기록 수정

| 항목 | 내용 |
| --- | --- |
| Method | `PATCH` |
| URI | `/api/v1/product-records/{recordId}` |
| 인증 | 필요 |
| 관련 기능 | F-PRODUCT-04 |

**Request Body**

json

```json
{ "productIds": [11, 15] }
```

**Business Rule**

1. **오늘 기록만 수정할 수 있다.** 과거 기록 수정은 지원하지 않는다.
2. `productIds`는 전체 교체다. 부분 추가·삭제를 지원하지 않는다.
3. `timeSlot`은 변경할 수 없다. 시간대를 바꾸려면 삭제 후 재기록해야 한다.
4. 수정 시각을 갱신한다.

**Error**

| HTTP | Code |
| --- | --- |
| 403 | `PRODUCT_RECORD_NOT_EDITABLE` |
| 404 | `PRODUCT_RECORD_NOT_FOUND` |

---

## PRODUCT-07 · 루틴 목록 조회

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URI | `/api/v1/routines` |
| 인증 | 필요 |
| 관련 화면 | S-11 |
| 관련 기능 | F-PRODUCT-05 |

**Query Parameter**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `timeSlot` | Enum | X | 미지정 시 전체 |

**Success Response — 200**

json

```json
{
  "isSuccess": true,
  "code": "COMMON_SUCCESS",
  "message": "조회에 성공했습니다.",
  "result": [
    {
      "routineId": 1,
      "name": "모닝루틴",
      "timeSlot": "MORNING",
      "productCount": 3,
      "products": [
        { "productId": 11, "name": "라운드랩 자작나무 수분 토너" },
        { "productId": 15, "name": "이니스프리 어성초 세럼" },
        { "productId": 21, "name": "닥터지 선베이스" }
      ]
    },
    {
      "routineId": 2,
      "name": "나이트루틴",
      "timeSlot": "NIGHT",
      "productCount": 3,
      "products": [ "..." ]
    }
  ]
}
```

> 루틴은 **모닝 / 나이트로 분리 저장**된다. 시간대별 사용 제품이 다르기 때문이다. (F-PRODUCT-05 BR 4)
> 

---

## PRODUCT-08 · 루틴 바로 기록 ⭐

| 항목 | 내용 |
| --- | --- |
| Method | `POST` |
| URI | `/api/v1/routines/{routineId}/records` |
| 인증 | 필요 |
| 관련 화면 | S-11, S-07/S-08 |
| 관련 기능 | F-PRODUCT-06 |
| 멱등성 | `Idempotency-Key` 권장 |

**Request Body**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `timeSlot` | Enum | O | 기록할 슬롯 |
| `force` | Boolean | X | 시간대 불일치·중복 무시하고 진행 |

json

```json
{ "timeSlot": "MORNING" }
```

**Success Response — 201**

json

```json
{
  "isSuccess": true,
  "code": "COMMON_CREATED",
  "message": "루틴이 기록되었어요.",
  "result": {
    "recordId": 55,
    "timeSlot": "MORNING",
    "productCount": 3,
    "skippedProductIds": [],
    "skinRecordSuggested": true
  }
}
```

**Business Rule**

1. 루틴에 포함된 제품 전체를 해당 슬롯의 기록으로 저장한다. 내부적으로 PRODUCT-05와 동일한 트랜잭션을 사용한다.
2. 중복 제품은 한 번만 기록한다.
3. **루틴의 `timeSlot`과 요청 `timeSlot`이 다르면 `409 ROUTINE_TIME_SLOT_MISMATCH`를 반환한다.** 차단이 아니라 확인이 목적이므로, 클라이언트가 경고 팝업을 띄우고 사용자가 진행하면 `force: true`로 재요청한다.
4. 루틴 제품 중 일부가 삭제되었으면 `409 ROUTINE_PRODUCT_PARTIALLY_MISSING`과 함께 사용 가능한 제품 목록을 반환한다. 남은 제품만으로 진행할 수 있게 한다.

**Error**

| HTTP | Code |
| --- | --- |
| 404 | `ROUTINE_NOT_FOUND` |
| 409 | `ROUTINE_EMPTY` |
| 409 | `ROUTINE_TIME_SLOT_MISMATCH` |
| 409 | `ROUTINE_PRODUCT_PARTIALLY_MISSING` |
| 409 | `PRODUCT_ALREADY_RECORDED_IN_SLOT` |

---

## 정의 보류 · 제품 직접 등록

| 항목 | 내용 |
| --- | --- |
| 예상 URI | `POST /api/v1/products` |
| 관련 기능 | F-PRODUCT-08 |
| 상태 | **TBD-07 결정 대기** |

> S-11 · S-12의 `제품 등록` / `직접 등록하기` 버튼에 **이동할 화면이 없습니다.** 화면 추가 또는 버튼 제거가 결정되기 전까지 이 API는 정의하지 않습니다. 백엔드가 선제 구현하면 프론트가 붙일 화면이 없어 사장됩니다.
> 

---

# 9. Skin API

> Skin Domain은 AI 서버와 통신한다. 사용자는 사진만 업로드하며 분석과 프로파일 갱신은 백엔드 내부에서 수행한다.
> 

```
촬영 가이드 (S-15) → 얼굴 촬영 (S-16)
  ↓
POST /skin-records      ★ 분석 + 저장
  ↓
분석 중 (S-17) → 자동 이동
  ↓
분석 결과 (S-18) ← GET /skin-records/today?timeSlot=
```

---

## SKIN-01 · 피부 기록 생성 및 분석 ⭐

| 항목 | 내용 |
| --- | --- |
| Method | `POST` |
| URI | `/api/v1/skin-records` |
| 인증 | 필요 |
| Content-Type | `multipart/form-data` |
| 관련 화면 | S-16 → S-17 |
| 관련 기능 | F-SKIN-02, F-SKIN-03, F-SKIN-04 |
| 멱등성 | `Idempotency-Key` 권장 |

**Request**

| Field | Type | Required | Validation |
| --- | --- | --- | --- |
| `image` | File | O | jpg / jpeg / png · 10MB 이하 |
| `timeSlot` | Enum | O | `MORNING` / `NIGHT` |

**Success Response — 201**

json

```json
{
  "isSuccess": true,
  "code": "COMMON_CREATED",
  "message": "분석이 완료되었어요.",
  "result": {
    "skinRecordId": 31,
    "timeSlot": "MORNING",
    "capturedAt": "2026-08-07T08:32:00+09:00",

    "totalScore": 78,
    "scores": {
      "trouble": 74,
      "redness": 66,
      "pores": 70,
      "pigmentation": 80
    },

    "comparison": {
      "comparedTo": "2026-08-06 MORNING",
      "previousTotalScore": 72,
      "changes": {
        "trouble": -4,
        "redness": 1,
        "pores": 3,
        "pigmentation": 5
      }
    }
  }
}
```

**비교 대상이 없는 경우**

json

```json
"comparison": null
```

---

**Business Rule**

1. 결과를 **사용자 + 날짜 + `timeSlot`** 으로 저장한다. 하루 2건이 존재할 수 있다. **날짜 귀속 규칙(`NIGHT`는 자정을 넘겨도 전날 날짜)은 공통 응답 포맷 + 예외코드 8.1을 따른다.**
2. **비교 대상은 같은 시간대끼리다.** 모닝은 전일 모닝, 나이트는 전일 나이트와 비교한다.
3. 첫 기록이거나 비교 대상이 없으면 `comparison`을 `null`로 반환한다. 오류가 아니다.
4. 당일 환경 데이터(자외선 등)를 함께 연결해 저장한다. F-ANALYSIS-02의 입력이 된다.
5. 분석 완료 후 개인 성분 프로파일을 갱신한다.

**Transaction**

**외부 호출은 트랜잭션 밖에서 한다.** 업로드와 AI 분석은 수 초가 걸리며, 이를 트랜잭션 안에 두면
커넥션을 붙든 채 외부 응답을 기다리게 되어 동시 요청 시 커넥션 풀이 마른다. ([ADR 0001](decisions/0001-피부-기록-저장-시점.md))

```
[TX 밖]
이미지 검증 (형식 · 크기)
  ↓
슬롯 중복 확인 ← 업로드·분석 전에 막는다. 뒤에 두면 실패할 요청에 분석 비용을 먼저 치른다
  ↓
이미지 업로드 (Storage)
  ↓
얼굴 검출 → AI 서버 분석 요청
  ↓
종합 점수 계산 · 전일 동일 슬롯 비교 조회
  ↓
[BEGIN]
SkinRecord INSERT (date + timeSlot)
  ↓
SkinMetric INSERT × 4
  ↓
[COMMIT]
  ↓
IngredientProfile 갱신 훅
```

> **환경 데이터 연결에는 별도 쓰기가 없다.** `daily_environments`는 `(user_id, record_date)`,
> `skin_records`도 같은 조합을 가지므로 두 테이블은 이미 조인 가능하다. F-ANALYSIS-02가 필요할 때
> 조회하면 되고, 환경 데이터가 없다고 해서 기록 저장이 실패해서는 안 된다.

**Error**

| HTTP | Code |
| --- | --- |
| 400 | `RECORD_INVALID_TIME_SLOT` |
| 409 | `SKIN_ALREADY_RECORDED_IN_SLOT` |
| 422 | `SKIN_FACE_NOT_DETECTED` |
| 422 | `SKIN_IMAGE_INVALID_FORMAT` |
| 422 | `SKIN_IMAGE_TOO_LARGE` |
| 500 | `SKIN_IMAGE_UPLOAD_FAILED` |
| 500 | `SKIN_ANALYSIS_FAILED` |
| 504 | `SKIN_ANALYSIS_TIMEOUT` |

> 카메라 권한 오류(`CAMERA_PERMISSION_DENIED`)는 **서버 응답이 아니다.** 권한은 요청 발생 이전에 클라이언트에서 판정된다. (v1 명세의 `403 CAMERA_PERMISSION_DENIED` 삭제)
> 

---

### 저장 시점 — 확정 (TBD-10b 해소)

**분석 완료 시점에 저장한다 (A안).** `POST /skin-records` 한 번으로 업로드 · 분석 · 저장이 모두 끝나고,
S-18의 `확인` 버튼은 **화면을 닫는 역할만** 하며 서버 호출을 발생시키지 않는다.
([ADR 0001](decisions/0001-피부-기록-저장-시점.md))

`POST /skin-records/analyze`는 **만들지 않는다.**

사용자가 결과를 보지 않고 이탈해도 기록은 남는다. **이는 의도된 동작이다.** 이미 AI 분석 비용을 치른
뒤이므로 유실이 사용자와 서버 양쪽에 손해이며, 피부 기록은 개인 성분 프로파일(F-ANALYSIS-04)과
리포트(F-REPORT-01)의 유일한 입력이라 한 건의 유실이 분석 품질에 직접 영향을 준다.
기록 취소·삭제는 MVP 범위 밖이며 필요해지면 별도 ADR로 다룬다.

**`totalScore` 산출** — 지표 4종의 단순 평균을 반올림한 0~100 정수다.
가중치를 둘 근거 데이터가 없어 임의 가중을 피한다. ([ADR 0008](decisions/0008-종합-점수-산출식.md))

---

## SKIN-02 · 오늘 피부 결과 조회

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URI | `/api/v1/skin-records/today` |
| 인증 | 필요 |
| 관련 화면 | S-18 |
| 관련 기능 | F-SKIN-05 |

**Query Parameter**

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `timeSlot` | Enum | X | 미지정 시 가장 최근 기록 |

**Success Response — 200** — SKIN-01의 `result`와 동일한 구조

**Error**

| HTTP | Code |
| --- | --- |
| 404 | `SKIN_RECORD_NOT_FOUND` |

---

## SKIN-03 · 피부 기록 상세 조회

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URI | `/api/v1/skin-records/{skinRecordId}` |
| 인증 | 필요 |

특정 기록을 조회한다. 응답 구조는 SKIN-02와 동일하다.

---

# 10. Check API

> 구매 전 확인은 Product Domain의 검색·스캔 API를 재사용한다. **여기서 조회한 제품은 사용 기록으로 저장하지 않는다.**
> 

## CHECK-01 · 쇼핑 홈 조회

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URI | `/api/v1/checks/home` |
| 인증 | 필요 |
| 관련 화면 | S-21 |
| 관련 기능 | F-CHECK-01 |

**Success Response — 200**

json

```json
{
  "isSuccess": true,
  "code": "COMMON_SUCCESS",
  "message": "조회에 성공했습니다.",
  "result": {
    "profileCompletion": 65,
    "recommendations": [
      {
        "productId": 71,
        "name": "라로슈포제 시카플라스트",
        "brand": "라로슈포제",
        "reason": "판테놀·마데카소사이드가 잘 맞는 성분이에요"
      },
      {
        "productId": 82,
        "name": "마누카 히알루론산 토너",
        "brand": "마누카",
        "reason": "히알루론산 반응이 좋았어요"
      }
    ],
    "failedSections": []
  }
}
```

**Business Rule**

1. 추천은 개인 성분 프로파일을 근거로 하며 **`reason` 없는 추천은 노출하지 않는다.**
2. 프로파일 데이터가 부족하면 `recommendations: []`를 반환한다. 클라이언트는 추천 대신 기록 유도 안내를 표시한다. **오류가 아니다.**

---

## CHECK-02 · 위험도 분석 ⭐

| 항목 | 내용 |
| --- | --- |
| Method | `POST` |
| URI | `/api/v1/checks` |
| 인증 | 필요 |
| 관련 화면 | S-21 → S-22 |
| 관련 기능 | F-CHECK-03 |
| 멱등성 | `Idempotency-Key` 권장 |

**Request Body**

json

```json
{ "productId": 71 }
```

**Success Response — 201**

json

```json
{
  "isSuccess": true,
  "code": "COMMON_CREATED",
  "message": "분석이 완료되었어요.",
  "result": {
    "checkId": 13,
    "productId": 71,
    "productName": "닥터지 브라이트닝 업 선베이스",

    "riskLevel": "HIGH",
    "riskTitle": "주의가 필요해요",
    "riskDescription": "내 피부 기준으로 맞지 않는 성분이 포함되어 있어요",

    "ingredients": [
      { "ingredientId": 27, "name": "향료",             "status": "CAUTION",      "reason": "과거 홍조 반응 있음" },
      { "ingredientId": 31, "name": "에탄올",           "status": "CAUTION",      "reason": "건성 피부 자극 가능" },
      { "ingredientId": 9,  "name": "글리세린",         "status": "GOOD",         "reason": "보습 효과 확인됨" },
      { "ingredientId": 3,  "name": "나이아신아마이드", "status": "GOOD",         "reason": "피부 톤 개선 이력" },
      { "ingredientId": 88, "name": "부틸렌글라이콜",   "status": "INSUFFICIENT", "reason": null }
    ],

    "summary": {
      "goodCount": 2,
      "cautionCount": 2,
      "insufficientCount": 1
    }
  }
}
```

**Transaction**

```
BEGIN → Product 조회 → Ingredient 조회 → IngredientProfile 조회
      → Risk 계산 → CheckHistory INSERT → COMMIT
```

**Business Rule**

1. 제품 전체 성분을 개인 프로파일과 대조한다.
2. `CAUTION` 성분의 수와 비중으로 위험도를 산출한다.
3. **`INSUFFICIENT` 성분은 위험도를 높이지도 낮추지도 않는다.**
4. 근거가 있는 성분만 `reason`을 채운다. 데이터가 부족한 성분의 `reason`은 `null`이다.
5. `riskTitle` · `riskDescription`은 서버가 완성해 내려준다. S-22에서 등급이 큰 제목으로 노출되기 때문이다.
6. **위험도만 반환하지 않고 판단 근거를 반드시 함께 반환한다.**

**Error**

| HTTP | Code | 클라이언트 안내 |
| --- | --- | --- |
| 404 | `CHECK_PRODUCT_NOT_FOUND` | 제품 정보를 찾을 수 없어요 |
| 409 | `CHECK_PROFILE_NOT_READY` | 아직 판단할 데이터가 부족해요 |
| 409 | `CHECK_INGREDIENT_DATA_INSUFFICIENT` | 확인할 수 없는 성분이 포함되어 있어요 |
| 500 | `CHECK_CALCULATION_FAILED` | 위험도 계산에 실패했습니다 |

> 두 409 코드 모두 **빈 상태 안내**로 처리한다. 빨간 오류 UI를 쓰지 않는다. 데이터 부족을 안전 또는 위험으로 임의 판단하지 않는다는 원칙이 적용된다.
> 

---

## CHECK-03 · 확인 결과 조회

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URI | `/api/v1/checks/{checkId}` |
| 인증 | 필요 |
| 관련 화면 | S-22 |

응답 구조는 CHECK-02와 동일하다.

**Error**

| HTTP | Code |
| --- | --- |
| 404 | `CHECK_NOT_FOUND` |

---

# 11. Report API

> Report는 Analysis 결과를 **보여주는** API다. 분석 자체를 실행하지 않는다.
> 

## REPORT-01 · 리포트 조회

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URI | `/api/v1/reports` |
| 인증 | 필요 |
| 관련 화면 | S-19 |
| 관련 기능 | F-REPORT-01, F-REPORT-02 |

**Query Parameter**

| Field | Type | Required | Validation |
| --- | --- | --- | --- |
| `period` | Integer | O | `7` 또는 `30` |
| `metric` | Enum | X | `TROUBLE` / `REDNESS` / `PORES` / `PIGMENTATION` · 기본 `TROUBLE` |

**Success Response — 200**

json

```json
{
  "isSuccess": true,
  "code": "COMMON_SUCCESS",
  "message": "조회에 성공했습니다.",
  "result": {
    "period": 7,
    "metric": "TROUBLE",

    "graph": [
      { "date": "2026-08-01", "score": 73 },
      { "date": "2026-08-02", "score": 76 },
      { "date": "2026-08-03", "score": null },
      { "date": "2026-08-04", "score": 71 }
    ],

    "insights": [
      {
        "insightId": 101,
        "type": "INGREDIENT",
        "title": "레티놀",
        "description": "레티놀 세럼 사용 후 2일 뒤 트러블이 반복적으로 증가해요",
        "confidence": "OBSERVED"
      },
      {
        "insightId": 102,
        "type": "ENVIRONMENT",
        "title": "자외선",
        "description": "자외선 높은 날 다음 날 홍조 수치가 높아져요",
        "confidence": "OBSERVED"
      }
    ],

    "failedSections": []
  }
}
```

**Business Rule**

1. **기록이 없는 날짜는 `score: null`이다. 0으로 계산하지 않는다.** 클라이언트는 해당 지점을 결측으로 렌더링한다.
2. 하루 2건이 존재할 수 있으므로 일자별 대표값을 산출한다. **기본 규칙: 나이트 우선, 없으면 모닝.**
3. 리포트 최소 요건은 **피부 사진 필수 · 제품 기록 선택**이다. 제품 기록이 없다는 이유로 `REPORT_DATA_INSUFFICIENT`를 반환하지 않는다.
4. 실제 분석 데이터가 있는 인사이트만 반환한다. 데이터가 부족하면 빈 배열이다.
5. `confidence`가 `OBSERVING`인 인사이트는 단정적 문구를 쓰지 않는다.

**`confidence` 값**

| 값 | 의미 | 판정 기준 |
| --- | --- | --- |
| `OBSERVED` | 반복 관찰된 패턴 | `confidence_score` 67 이상 |
| `OBSERVING` | 확인 중 · 반복성 미확보 | `confidence_score` 67 미만 또는 `null` |

`confidence_score`는 F-ANALYSIS-01이 산출한 **동일 방향 변화 비율(0~100)**이며, 임계값 67은
패턴 확정 기준과 같은 값이다. 한쪽만 바꾸면 두 판정이 어긋난다. (ADR 0009)

`insights`는 F-ANALYSIS-01이 `analysis_insights`에 남긴 행을 신뢰도 내림차순으로 반환한다.
성분 인사이트는 새 피부 기록마다 재계산되어 이전 회차를 대체하므로 누적되지 않는다.

**Error**

| HTTP | Code |
| --- | --- |
| 422 | `REPORT_INVALID_PERIOD` |
| 409 | `REPORT_DATA_INSUFFICIENT` |

> **TBD-12** — 일자별 대표값 산출 규칙(나이트 우선)은 제안입니다. 백엔드 확인이 필요합니다.
> 
> 
> **개발 판단** — 현재 그래프는 단순 막대입니다. 선 그래프가 필요하면 차트 라이브러리 도입을 검토해야 합니다.
> 

---

## REPORT-02 · 요인 상세 조회

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URI | `/api/v1/reports/insights/{insightId}` |
| 인증 | 필요 |
| 관련 화면 | S-20 |
| 관련 기능 | F-REPORT-03 |

**Success Response — 200**

json

```json
{
  "isSuccess": true,
  "code": "COMMON_SUCCESS",
  "message": "조회에 성공했습니다.",
  "result": {
    "insightId": 101,
    "type": "INGREDIENT",
    "metric": "TROUBLE",
    "title": "트러블 추이",
    "subtitle": "최근 30일 · 이벤트와 상관관계",

    "graph": [
      { "date": "2026-07-08", "score": 68 },
      { "date": "2026-07-15", "score": 74 }
    ],

    "events": [
      {
        "date": "2026-07-10",
        "label": "독도어성초크림 첫 사용",
        "impact": "이후 2일 뒤 트러블 수치 +18",
        "confidence": "OBSERVED"
      },
      {
        "date": "2026-07-22",
        "label": "자외선 지수 9 이상 3일 연속",
        "impact": "이후 홍조 수치 +12",
        "confidence": "OBSERVED"
      },
      {
        "date": "2026-08-01",
        "label": "나이아신아마이드 세럼 재시작",
        "impact": "트러블 개선 추세 확인 중",
        "confidence": "OBSERVING"
      }
    ]
  }
}
```

**Business Rule**

1. `events`는 날짜 오름차순이다.
2. 확정되지 않은 패턴은 `confidence: "OBSERVING"`으로 반환하고 `impact` 문구도 단정하지 않는다.

**Error**

| HTTP | Code |
| --- | --- |
| 404 | `REPORT_INSIGHT_NOT_FOUND` |

> **TBD-11** — S-20의 지표가 현재 트러블로 고정입니다. `metric` 파라미터로 전환을 지원할지 결정이 필요합니다. 응답에는 `metric` 필드를 미리 포함했습니다.
> 

---

## REPORT-03 · 일자별 리포트 조회

| 항목 | 내용 |
| --- | --- |
| Method | `GET` |
| URI | `/api/v1/reports/daily` |
| 인증 | 필요 |

**Query Parameter**

| Field | Type | Required |
| --- | --- | --- |
| `date` | Date | O |
| `timeSlot` | Enum | X |

**Business Rule**

1. `timeSlot` 미지정 시 해당 날짜의 모든 기록을 배열로 반환한다.
2. 미래 날짜는 `422 RECORD_FUTURE_DATE_NOT_ALLOWED`다.

---

# 12. Screen ↔ API Mapping

| Screen | API |
| --- | --- |
| S-00 로그인 | `POST /auth/login` |
| S-01 기본 정보 | `PATCH /users/me/onboarding/basic-info` |
| S-02 피부 타입 | `PATCH /users/me/onboarding/skin-types` |
| S-04 생리 · 호르몬 | `PATCH /users/me/onboarding/hormone` |
| S-05 완료 요약 | `POST /users/me/onboarding/complete` |
| S-06 알림 허용 | `PATCH /users/me/notification` |
| S-07 홈 · 낮 | `GET /home` |
| S-08 홈 · 밤 | `GET /home` |
| S-09 기록 허브 · 모닝 | `GET /records/calendar` + `GET /records/today` |
| S-10 기록 허브 · 나이트 | `GET /records/calendar` + `GET /records/today` |
| S-11 제품 기록 기본 | `GET /product-records/home?timeSlot=` |
| S-12 제품 검색 결과 | `GET /products?keyword=` |
| S-13 제품 스캔 | `POST /products/scan` |
| S-14 성분 확인 | `GET /products/{productId}` → `POST /product-records` |
| S-15 촬영 가이드 | — (정적 화면) |
| S-16 얼굴 촬영 | `POST /skin-records` |
| S-17 분석 중 | — (S-16 응답 대기) |
| S-18 분석 결과 | `GET /skin-records/today?timeSlot=` |
| S-19 리포트 | `GET /reports?period=` |
| S-20 요인 상세 | `GET /reports/insights/{insightId}` |
| S-21 쇼핑 | `GET /checks/home` + `GET /products` + `POST /products/scan` |
| S-22 위험도 결과 | `POST /checks` → `GET /checks/{checkId}` |
| S-23 마이페이지 | `GET /users/me` |
| S-24 위치 설정 | `GET /locations` → `PATCH /users/me/location` |
| 성분 전체 보기 | `GET /users/me/ingredient-profile` |

# 13. Function ↔ API Mapping

| Function ID | API |
| --- | --- |
| F-AUTH-01 | `POST /auth/login` |
| F-AUTH-02 | `POST /auth/refresh` |
| F-AUTH-03 | `POST /auth/logout` |
| F-ONBOARD-01 | `PATCH /users/me/onboarding/basic-info` |
| F-ONBOARD-02 | `PATCH /users/me/onboarding/skin-types` |
| F-ONBOARD-03 | `PATCH /users/me/onboarding/hormone` |
| F-ONBOARD-04 | `GET /users/me/onboarding` |
| F-ONBOARD-05 | `POST /users/me/onboarding/complete` |
| F-ONBOARD-06 | `PATCH /users/me/notification` |
| F-HOME-01 ~ 07 | `GET /home` |
| F-RECORD-01 | `GET /records/calendar` |
| F-RECORD-02 | `GET /records/today` |
| F-RECORD-03 | `GET /records/calendar` (`monthlySummary`) |
| F-PRODUCT-01 | `GET /product-records/home` |
| F-PRODUCT-02 | `GET /products` |
| F-PRODUCT-03 | `POST /products/scan` |
| F-PRODUCT-04 | `GET /products/{id}` + `POST /product-records` |
| F-PRODUCT-05 | `GET /product-records/home` + `GET /routines` |
| F-PRODUCT-06 | `POST /routines/{id}/records` |
| F-PRODUCT-07 | `POST /product-records` (`skinRecordSuggested`) |
| F-PRODUCT-08 | **정의 보류 · TBD-07** |
| F-SKIN-01 | — (정적 화면) |
| F-SKIN-02 ~ 04 | `POST /skin-records` |
| F-SKIN-05 | `GET /skin-records/today` |
| F-ANALYSIS-01 ~ 05 | 내부 서비스 (`POST /skin-records` 내부 호출) |
| F-CHECK-01 | `GET /checks/home` |
| F-CHECK-02 | `GET /products` + `POST /products/scan` |
| F-CHECK-03 | `POST /checks` |
| F-CHECK-04 | `GET /checks/{checkId}` |
| F-REPORT-01 | `GET /reports` |
| F-REPORT-02 | `GET /reports` (`insights`) |
| F-REPORT-03 | `GET /reports/insights/{insightId}` |
| F-MY-01 | `GET /users/me` |
| F-MY-02 | `GET /users/me` (`ingredientProfile`) |
| F-MY-03 | `GET /users/me/ingredient-profile` |
| F-MY-04 | `GET /locations` + `PATCH /users/me/location` |
| F-MY-05 | `PATCH /users/me/notification` |

---

# 14. API Index

| Domain | ID | Method | URI | 인증 |
| --- | --- | --- | --- | --- |
| Auth | AUTH-01 | POST | `/auth/login` | X |
| Auth | AUTH-02 | POST | `/auth/refresh` | X |
| Auth | AUTH-03 | POST | `/auth/logout` | O |
| Onboard | ONBOARD-01 | GET | `/users/me/onboarding` | O |
| Onboard | ONBOARD-02 | PATCH | `/users/me/onboarding/basic-info` | O |
| Onboard | ONBOARD-03 | PATCH | `/users/me/onboarding/skin-types` | O |
| Onboard | ONBOARD-04 | PATCH | `/users/me/onboarding/hormone` | O |
| Onboard | ONBOARD-05 | POST | `/users/me/onboarding/complete` | O |
| User | USER-01 | GET | `/users/me` | O |
| User | USER-02 | GET | `/users/me/ingredient-profile` | O |
| User | USER-03 | GET | `/users/me/profile` | O |
| User | USER-04 | PATCH | `/users/me/profile` | O |
| User | USER-05 | GET | `/locations` | O |
| User | USER-06 | PATCH | `/users/me/location` | O |
| User | USER-07 | PATCH | `/users/me/notification` | O |
| Home | HOME-01 | GET | `/home` | O |
| Record | RECORD-01 | GET | `/records/calendar` | O |
| Record | RECORD-02 | GET | `/records/today` | O |
| Product | PRODUCT-01 | GET | `/product-records/home` | O |
| Product | PRODUCT-02 | GET | `/products` | O |
| Product | PRODUCT-03 | GET | `/products/{productId}` | O |
| Product | PRODUCT-04 | POST | `/products/scan` | O |
| Product | PRODUCT-05 ⭐ | POST | `/product-records` | O |
| Product | PRODUCT-06 | PATCH | `/product-records/{recordId}` | O |
| Product | PRODUCT-07 | GET | `/routines` | O |
| Product | PRODUCT-08 ⭐ | POST | `/routines/{routineId}/records` | O |
| Skin | SKIN-01 ⭐ | POST | `/skin-records` | O |
| Skin | SKIN-02 | GET | `/skin-records/today` | O |
| Skin | SKIN-03 | GET | `/skin-records/{skinRecordId}` | O |
| Check | CHECK-01 | GET | `/checks/home` | O |
| Check | CHECK-02 ⭐ | POST | `/checks` | O |
| Check | CHECK-03 | GET | `/checks/{checkId}` | O |
| Report | REPORT-01 | GET | `/reports` | O |
| Report | REPORT-02 | GET | `/reports/insights/{insightId}` | O |
| Report | REPORT-03 | GET | `/reports/daily` | O |

**총 34개** (⭐ 4개는 트랜잭션 · 멱등성 필수)

---

# 15. Transaction Rule

| API | Transaction | 비고 |
| --- | --- | --- |
| `POST /product-records` | O | UserProduct + ProductRecord 동시 처리 |
| `PATCH /product-records/{id}` | O | 전체 교체 |
| `POST /routines/{id}/records` | O | PRODUCT-05 트랜잭션 재사용 |
| `POST /skin-records` | O | 업로드 + 분석 + 프로파일 갱신 |
| `POST /checks` | O | 계산 + 이력 저장 |
| `PATCH /users/me/onboarding/*` | O | 프로필 부분 갱신 |
| `POST /users/me/onboarding/complete` | O | 완료 상태 전환 |

**주의 · 외부 호출과 트랜잭션 경계**

`POST /skin-records`는 AI 서버 호출을 트랜잭션 안에 포함한다. 외부 호출이 길어지면 DB 커넥션을 오래 점유하므로, **AI 호출을 트랜잭션 밖으로 빼고 결과 저장만 트랜잭션으로 묶는 구조를 권장**한다.

```
[트랜잭션 밖] 이미지 업로드 → AI 분석 호출
      ↓
[BEGIN] SkinRecord INSERT → 환경 연결 → Profile UPDATE [COMMIT]
```

---

# 16. External API Integration

| 외부 API | 용도 | 실패 시 |
| --- | --- | --- |
| 기상청 API | 날씨 · 기온 · 습도 | `WEATHER_API_FAILED` · 부분 실패 처리 |
| 자외선 API | 자외선 지수 | `WEATHER_UV_API_FAILED` · **분석 공변량이므로 별도 로깅** |
| AI 분석 서버 | 피부 분석 | `SKIN_ANALYSIS_FAILED` / `SKIN_ANALYSIS_TIMEOUT` |
| 제품 DB | 제품 · 성분 조회 | `PRODUCT_NOT_FOUND` |
| 스캔 서비스 | 바코드 · 이미지 인식 | `SCAN_SERVICE_UNAVAILABLE` |

> **AI 분석 서버는 현재 목업 단계다.** 실제 서버가 확정되지 않아 `SkinAnalysisClient` 인터페이스로
> 추상화하고 목업 구현으로 동작한다. 목업은 `userId + recordDate + timeSlot`에서 유도한 시드로
> **결정적인** 점수를 만들며, 목업으로 생성된 기록은 `analysis_method = MOCK`으로 식별된다.
> 실연동 시 변경 범위는 구현체 1개와 설정값이다. ([ADR 0003](decisions/0003-AI-분석-목업-우선.md))
>
> **이미지 스토리지도 같은 방식이다.** `ImageStorage` 인터페이스 뒤에 로컬 디렉터리 구현이 있고,
> 배포 시 외부 스토리지로 교체한다. ([ADR 0007](decisions/0007-이미지-스토리지.md))

**캐시 정책**

| 대상 | TTL |
| --- | --- |
| 날씨 · 자외선 (동일 위치 · 동일 일자) | 1시간 |
| 제품 성분 정보 | 24시간 |
| 지역 목록 | 무기한 (배포 시 갱신) |

---

# 17. API Sequence

## 로그인 → 온보딩

```
POST /auth/login
  ↓ nextStep = "BASIC_INFO"
PATCH /users/me/onboarding/basic-info   (S-01)
  ↓ nextStep = "SKIN_TYPE", totalStepCount = 3
PATCH /users/me/onboarding/skin-types   (S-02)
  ↓ nextStep = "HORMONE"        ← 성별 FEMALE인 경우만
PATCH /users/me/onboarding/hormone      (S-04)
  ↓ nextStep = "COMPLETE"
POST  /users/me/onboarding/complete     (S-05)
  ↓
PATCH /users/me/notification            (S-06)
  ↓
GET   /home
```

## 제품 기록

```
GET  /records/today                          (S-09/10)
  ↓ 모닝 제품 슬롯 선택
GET  /product-records/home?timeSlot=MORNING  (S-11)
  ↓ 검색 또는 스캔
GET  /products?keyword=라운드랩              (S-12)
GET  /products/{productId}                   (S-14)
  ↓ 기록 완료
POST /product-records                        ★ 저장
  ↓ skinRecordSuggested = true
GET  /records/today                          상태 갱신
```

## 피부 기록

```
S-15 촬영 가이드 → S-16 촬영
  ↓
POST /skin-records (multipart, timeSlot)     ★ 분석 + 저장
  ↓ S-17 진행 표시 → 완료 시 자동 이동
S-18 결과 표시
  ↓ 전체 리포트 보기
GET  /reports?period=7                       (S-19)
```

## 구매 전 확인

```
GET  /checks/home                (S-21)
  ↓ 스캔 또는 검색
POST /products/scan  또는  GET /products?keyword=
  ↓
POST /checks                     ★ 위험도 계산
  ↓
S-22 결과 표시
```

---

# 18. Validation Rule 총괄

## User · Onboarding

| Field | Rule | 실패 코드 |
| --- | --- | --- |
| `name` | 1~10자 · 공백만 불가 | `COMMON_VALIDATION_FAILED` |
| `gender` | `FEMALE` / `MALE` / `UNSPECIFIED` | `COMMON_VALIDATION_FAILED` |
| `age` | 10~100 | `COMMON_VALIDATION_FAILED` |
| `skinTypes` | 1개 이상 | `ONBOARD_SKIN_TYPE_REQUIRED` |
| `skinTypes` | `UNKNOWN` 단독만 | `ONBOARD_SKIN_TYPE_CONFLICT` |
| `hormoneStatus` | 4종 Enum · 여성만 | `ONBOARD_HORMONE_NOT_APPLICABLE` |
| `lastPeriodStartDate` | 오늘 이후 불가 | `COMMON_VALIDATION_FAILED` |
| `averageCycleDays` | 20~45 | `COMMON_VALIDATION_FAILED` |

## Product · Record

| Field | Rule | 실패 코드 |
| --- | --- | --- |
| `keyword` | 1~50자 | `PRODUCT_INVALID_KEYWORD` |
| `productIds` | 1~30개 | `PRODUCT_RECORD_EMPTY` / `PRODUCT_RECORD_LIMIT_EXCEEDED` |
| `timeSlot` | `MORNING` / `NIGHT` | `RECORD_INVALID_TIME_SLOT` |
| `scanMode` | `BARCODE` / `PRODUCT_IMAGE` | `SCAN_UNSUPPORTED_MODE` |

## Image

| Field | Rule | 실패 코드 |
| --- | --- | --- |
| `image` | jpg / jpeg / png | `SKIN_IMAGE_INVALID_FORMAT` |
| `image` | 최대 10MB | `SKIN_IMAGE_TOO_LARGE` |

## Query

| Field | Rule | 실패 코드 |
| --- | --- | --- |
| `period` | 7 또는 30 | `REPORT_INVALID_PERIOD` |
| `yearMonth` | `yyyy-MM` | `RECORD_INVALID_MONTH` |
| `date` | 미래 불가 | `RECORD_FUTURE_DATE_NOT_ALLOWED` |

---

# 19. Spring Boot 디렉터리 구조

```
controller/
├── AuthController
├── OnboardingController        [신규]
├── UserController
├── HomeController
├── RecordController            [신규]
├── ProductController
├── ProductRecordController
├── RoutineController
├── SkinController
├── CheckController
└── ReportController

service/
├── AuthService
├── OnboardingService           [신규]
├── UserService
├── HomeService
├── RecordService               [신규]
├── ProductService
├── ProductRecordService
├── RoutineService
├── SkinService
├── AnalysisService             ← 내부 전용, Controller 없음
├── CheckService
└── ReportService

service/external/
├── WeatherClient
├── UvClient
├── AiAnalysisClient
└── ScanClient
```

**설계 원칙**

1. `AnalysisService`는 Controller를 갖지 않는다. `SkinService`가 내부 호출한다.
2. `HomeService`는 여러 서비스를 조합하는 BFF 계층이다. 자체 도메인 로직을 갖지 않는다.
3. 낮/밤 판정은 `HomeService` 내부 단일 메서드로 격리한다. 개인화로 교체할 때 이 메서드만 바꾼다.
4. 외부 API 클라이언트는 `service/external`에 모아 실패 처리와 캐시 정책을 일관되게 적용한다.

---

# 20. 미정 항목이 API에 미치는 영향

| TBD | 항목 | API 영향 | 영향도 |
| --- | --- | --- | --- |
| ~~TBD-10b~~ | ~~피부 기록 저장 시점~~ | **해소** — 분석 완료 시 저장 · API 1개 유지 ([ADR 0001](decisions/0001-피부-기록-저장-시점.md)) | — |
| TBD-07 | 제품 직접 등록 | `POST /products` 신설 필요 | 높음 |
| TBD-05 | 스캔 인식 대상 | 성분표 OCR 추가 시 `POST /products/scan` **응답 구조 변경** | 높음 |
| TBD-09 | 분석 지연 처리 | 백그라운드 방식 결정 시 `202 Accepted` + 폴링 API 추가 | 중간 |
| TBD-03 | 낮/밤 토글 유지 범위 | 서버 저장 결정 시 `PATCH /users/me/home-preference` 추가 | 낮음 |
| TBD-02 | 온보딩 진행률 | 필드 구조는 두 안 모두 수용 가능 | 낮음 |
| TBD-04 | 리포트 부족 시 안내 | `todayReport` 필드 확장 | 낮음 |
| TBD-11 | S-20 지표 전환 | `metric` 파라미터 이미 반영 | 낮음 |
| TBD-12 | 일자 대표값 | 서버 내부 로직 · 응답 구조 영향 없음 | 낮음 |
| TBD-01 | 이메일 로그인 | `provider` Enum 확장 | 낮음 |

> **영향도 높음 3건은 구현 착수 전 확정을 권합니다.** 나머지는 응답 필드 추가로 흡수 가능하도록 설계했습니다.
> 

---

# 21. v1 → v2 변경 요약

## 신규 API (12개)

```
GET   /users/me/onboarding
PATCH /users/me/onboarding/basic-info
PATCH /users/me/onboarding/skin-types
PATCH /users/me/onboarding/hormone
POST  /users/me/onboarding/complete
GET   /users/me/ingredient-profile
GET   /locations
GET   /records/calendar
GET   /records/today
GET   /routines
GET   /reports/insights/{insightId}
GET   /reports/daily
```

## 변경 API

| API | 변경 내용 |
| --- | --- |
| `POST /auth/login` | `nextStep` 필드 추가 (단계 재개) |
| `GET /home` | `weeklyCalendar` · `todayReport` · `failedSections` 추가 / `homeType` 쿼리 추가 / 판정 기준을 고정 시각으로 변경 |
| `GET /product-records/home` | `timeSlot` 필수 파라미터 추가 |
| `POST /product-records` | `timeSlot` 필수 · `force` 추가 · 중복 판정 기준 변경 |
| `POST /routines/{id}/records` | `timeSlot` 필수 · 시간대 불일치 검증 추가 |
| `POST /skin-records` | `timeSlot` 필수 · 응답에 분석 결과 직접 포함 · 비교 기준 변경 |
| `GET /skin-records/today` | `timeSlot` 파라미터 추가 |
| `GET /users/me` | 코인 필드 제거 · `ingredientProfile` 추가 |
| `GET /users/me/profile` | `sleepTime` · `wakeTime` **삭제** · `skinTypes` · 호르몬 필드 추가 |
| `GET /reports` | `metric` 파라미터 · `insightId` · `confidence` 추가 |
| `POST /checks` | 응답에 `riskTitle` · `reason`별 근거 추가 |

## 삭제

| v1 API | 사유 |
| --- | --- |
| `PATCH /users/me/profile`의 `sleepTime` / `wakeTime` | 온보딩에서 수면 시간 입력 제거 |
| `GET /users/me` (AUTH-04) | `GET /users/me` (MY-01)과 중복이라 통합 |
| `POST /skin-records`의 `403 CAMERA_PERMISSION_DENIED` | 서버가 판정할 수 없는 오류 |