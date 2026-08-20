# 버그 리포트: 로그인할 때마다 새 계정이 생성되어 데모 데이터가 안 보임

- 작성일: 2026-08-19
- 증상: `backend/src/test/resources/seed/demo-full-9101.sql`로 userId=9101에 데모 데이터(제품 7·루틴 2·기록 50·피부기록 46·성분 프로파일 10·인사이트 3 등)를 넣고 프론트에서 로그인해도 화면에 아무것도 안 보임.

## 결론

**데이터 문제가 아니라 로그인 문제입니다.** DB의 9101 계정과 그 데이터는 정상이지만,
로그인할 때마다 `POST /api/v1/auth/login`이 9101 계정을 찾지 못하고 **매번 새 빈 계정을 생성**하고
있습니다. 그 새 계정으로 로그인되기 때문에 시드 데이터가 안 보입니다.

## 근거

### 1. DB의 9101 계정과 데이터는 정상

```sql
SELECT id, email, provider, provider_user_id, account_status, onboarding_completed
FROM users WHERE id = 9101;
```

```
id    email                     provider  provider_user_id  account_status  onboarding_completed
9101  slot-case-a@example.com  EMAIL     slot-case-a       ACTIVE          1
```

- `skin_records` 46건, `analysis_insights` 3건 등 시드 데이터가 정상 저장돼 있음(직접 카운트 확인).
- 참고: 시드 SQL의 `INSERT ... ON DUPLICATE KEY UPDATE`는 `email`을 갱신하지 않으므로, 실제 email은
  시드 파일 주석에 적힌 `demo@skinteller.app`이 아니라 이 계정이 원래 갖고 있던 `slot-case-a@example.com`으로 남아 있음(데이터 자체엔 영향 없음, user_id 기준으로 다 연결돼 있음).

### 2. `/auth/login`은 `provider_user_id`가 일치하는 계정이 없으면 새로 만든다

[`AuthService.java:44-70`](../backend/src/main/java/com/ildangbaek/backend/api/auth/service/AuthService.java#L44-L70)

```java
@Transactional
public LoginResponse login(LoginRequest request) {
    String providerUserId = mockProviderUserId(request);
    User user = userRepository.findByProviderAndProviderUserId(request.provider(), providerUserId)
            .orElse(null);
    boolean isNewUser = user == null;

    if (isNewUser) {
        user = userRepository.save(User.builder()
                .provider(request.provider())
                .providerUserId(providerUserId)
                .email(mockEmail(request, providerUserId))
                .build());
    }
    ...
}

private String mockProviderUserId(LoginRequest request) {
    return request.provider().name().toLowerCase() + "-" + request.oauthAccessToken();
}
```

`LoginRequest`는 `{ provider, oauthAccessToken }` 두 필드만 받는 목업 로그인이며([`LoginRequest.java`](../backend/src/main/java/com/ildangbaek/backend/api/auth/dto/request/LoginRequest.java)),
`oauthAccessToken`에 아무 문자열이나 넣으면 `provider_user_id = "{provider}-{oauthAccessToken}"`로
계정을 조회한다. **9101 계정의 `provider_user_id`는 정확히 `slot-case-a`이므로, `provider=EMAIL`,
`oauthAccessToken=slot-case-a`로 로그인해야만 9101 계정과 매칭된다.** 그 외의 값(테스트용 임의
문자열, 이메일 주소 등)을 넣으면 항상 새 계정이 생성된다.

### 3. 실제로 로그인 시도마다 새 계정이 계속 쌓이고 있음

```sql
SELECT id, provider, provider_user_id, email, created_at
FROM users ORDER BY created_at DESC LIMIT 8;
```

```
id     provider  provider_user_id                    email                                created_at
9313   KAKAO     kakao-claude-repro-p1-2             kakao-claude-repro-p1-2@mock...     2026-08-19 15:06:53
9312   KAKAO     kakao-claude-repro-test-token        kakao-claude-repro-test-token@...   2026-08-19 15:04:21
9311   EMAIL     email-demo-1787058471@test.com       demo-1787058471@test.com            2026-08-18 22:07:52
9310   EMAIL     email-demo-1787058467@test.com       demo-1787058467@test.com            2026-08-18 22:07:47
...
```

전부 `provider_user_id`가 9101(`slot-case-a`)과 다른, 매번 새로 생성된 빈 계정. 로그인 시도할 때마다
새 계정이 하나씩 늘어나고 있고(총 20개), 그 계정들에는 당연히 시드 데이터가 없다.

### 4. (별개 이슈, 참고용) `password_hash` 컬럼이 실제 DB에 없음

이메일 로그인(`/auth/email/login`)으로 9101에 접근하는 경로도 확인했으나, 이쪽은 별도 문제가 있다:

```sql
DESCRIBE users;
-- password_hash 컬럼이 존재하지 않음 (ERROR 1054: Unknown column 'password_hash')
```

그런데 엔티티에는 필드가 정의돼 있다: [`User.java:44-45`](../backend/src/main/java/com/ildangbaek/backend/domain/user/entity/User.java#L44-L45)

```java
@Column(name = "password_hash", length = 255)
private String passwordHash;
```

`application-local.yml`은 `ddl-auto: update`로 Hibernate가 스키마를 자동 갱신하도록 되어 있는데
([`application-local.yml:10`](../backend/src/main/resources/application-local.yml#L10)), 로컬 DB에는
이 컬럼이 실제로 생성돼 있지 않다. `git log`상 `passwordHash` 필드는 `4940098 feat: 이메일 회원가입
API 추가` 커밋에서 들어왔는데, 로컬 MySQL 컨테이너가 그 이후로 스키마 업데이트를 못 받은 것으로 보인다
(서버 재기동 누락 또는 다른 원인 — 정확한 원인은 미확인).

→ 이 상태로는 `/auth/email/login`, `/auth/email/signup` 모두 `password_hash` 컬럼을 참조하다가 SQL
에러가 나거나 최소한 비밀번호 검증이 정상 동작하지 않을 가능성이 높다. 9101으로 로그인하려면
`/auth/login`(1번 방법) 사용을 권장.

## 재현 방법

1. `docker exec -i ildangbaek-mysql mysql ... < backend/src/test/resources/seed/demo-full-9101.sql` 실행 (9101 계정·데이터 시딩됨).
2. 프론트에서 임의의 값으로 로그인(예: 카카오 mock 로그인, 또는 이메일 회원가입 플로우).
3. 홈/리포트 화면에 데이터가 안 뜸.
4. DB에서 `SELECT * FROM users ORDER BY created_at DESC LIMIT 1;` 확인 → 방금 로그인한 계정이 새로 생성된 빈 계정(9101이 아님)임을 확인.

## 제안하는 해결 방향 (우선순위)

1. **당장 데모를 봐야 한다면**: 프론트/Postman에서 `POST /api/v1/auth/login`에
   `{"provider": "EMAIL", "oauthAccessToken": "slot-case-a"}`로 요청 → 9101 계정과 매칭되는
   access token을 받아서 그 토큰으로 접속.
2. **근본 원인 판단 필요**: 이 목업 로그인 설계(`provider_user_id = provider-oauthAccessToken`,
   없으면 자동 생성)가 의도된 동작인지 확인 필요.
   - 의도된 동작이라면 → 데모/QA용 시드 스크립트나 문서에 "9101로 로그인하려면 oauthAccessToken을
     정확히 `slot-case-a`로 넣어야 한다"는 안내가 빠져 있는 문서 문제로 정리.
   - 프론트가 실제로는 소셜 로그인 SDK가 반환한 실제 OAuth 토큰을 그대로 넘기는 구조라면, 시드
     계정을 아예 프론트에서 재현 불가능한 값(`slot-case-a`)으로 심어둔 시드 스크립트 자체가 잘못된
     것 — 시드가 실제 로그인 플로우로 만들어질 수 있는 `provider_user_id`를 쓰도록 고쳐야 함.
3. **`password_hash` 컬럼 누락**은 별도로 로컬 DB 스키마를 다시 맞추거나(`ddl-auto: update` 재적용),
   Flyway/Liquibase 도입 여부를 결정할 필요가 있음(현재 이 저장소엔 마이그레이션 파일이 없고
   `ddl-auto`에만 의존하는 상태).

## 확인해준 사람 / 담당

- 조사자: (yunjin) — 코드 수정 없이 원인만 확인. 실제 수정은 백엔드 담당자 판단 필요.
