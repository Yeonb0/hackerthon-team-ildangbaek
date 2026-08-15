# 0024. `CurrentUserResolver` 제거 — `CurrentUserIdArgumentResolver` 단일화

- 상태: **수락**
- 날짜: 2026-08-15
- 관련: [ADR 0006](0006-임시-인증-방편.md), [ADR 0017](0017-임시-인증-토큰-통합.md), STATUS.md 2.3절

## 맥락

ADR 0017로 `CurrentUserResolver`(auth/onboard 도메인)와 `CurrentUserIdArgumentResolver`(B
도메인)가 같은 파서(`MockAccessToken`)에 위임하도록 통합됐지만, 두 진입점 자체는 그대로 남아
있었다. 컨트롤러가 여전히 두 스타일로 갈렸다:

- `@CurrentUserId Long userId` — 파라미터 리졸버가 헤더를 해석해 주입
- `@RequestHeader("Authorization") String authorization` 을 받아 메서드 본문에서
  `currentUserResolver.resolve(authorization)`을 직접 호출

코드리뷰 중 `ProductController`의 `match` · `scan` · `scanMultipart` 세 핸들러가 이 두 번째
스타일에서 `currentUserResolver.resolve(authorization);`의 반환값을 버리고 **인증 부수효과만
노리는 코드**가 된 것을 발견했다. 이 형태는 인가 검사가 메서드 본문 한 줄에 의존한다는 뜻이고,
그 줄을 빠뜨리면 인증 없이 뚫린다. 실제 실행에 문제가 있었던 것은 아니지만, 인증 미들웨어가
아직 없는 지금 이 패턴이 늘어나면 위험이 누적된다.

## 결정

**`CurrentUserResolver`를 제거하고 `CurrentUserIdArgumentResolver` 하나로 합친다.** 리졸버가
`Long`뿐 아니라 `User` 엔티티 파라미터도 해석하도록 넓혔다:

```java
public ApiResponse<Foo> get(@CurrentUserId Long userId) { ... }   // 기존과 동일
public ApiResponse<Foo> get(@CurrentUserId User user) { ... }     // 신규 — 엔티티가 필요할 때
```

`User`를 요청하면 리졸버가 토큰의 `userId`로 `UserRepository.findById`를 조회해 주입하고,
찾지 못하면 `AUTH_USER_NOT_FOUND`(404)를 던진다. 컨트롤러 21개 호출부를 모두 옮기고
`CurrentUserResolver`와 `@RequestHeader("Authorization")` 파라미터를 제거했다.

## 근거

1. **인가 검사가 프레임워크 계층으로 올라간다.** 컨트롤러 메서드 본문에 인증 호출이 없으므로
   "한 줄 빠뜨림"으로 뚫리는 경로 자체가 사라진다.
2. **ADR 0017이 이미 파싱 로직을 통합해 뒀다.** 남은 차이는 "Long을 주입하나 User를 주입하나"뿐이라,
   같은 리졸버가 반환 타입만 분기하면 된다.
3. **컨트롤러가 짧아진다.** `authorization` 헤더 파라미터와 `currentUserResolver.resolve(...)`
   호출이 모든 핸들러에서 사라졌다.
4. **여전히 인증이 아니다.** 토큰 서명 검증은 없다 — ADR 0006 · 0017의 경고가 그대로 적용된다.
   배포 전 실제 인증(JWT 등) 도입 시 교체 지점은 `MockAccessToken`과
   `CurrentUserIdArgumentResolver` 내부로 더 좁아졌다.

## 검증

`./gradlew test` 220개 → 222개(신규 테스트 2개 포함) 전부 통과. `@WebMvcTest` 슬라이스로
`CurrentUserIdArgumentResolver`의 `Long`/`User` 해석과 401/404 분기를 고정했고,
`@SpringBootTest` + `MockMvc`로 토큰 없는 요청이 컨트롤러 진입 전에 401로 막히는 것을
`ProductController`에서 실제 HTTP 경로로 확인했다.

## 결과

- `api/auth/service/CurrentUserResolver.java` 삭제.
- `global/auth/CurrentUserIdArgumentResolver`가 `UserRepository`를 의존성으로 갖는다.
- 새 컨트롤러를 작성할 때 `@RequestHeader("Authorization")` 파라미터를 다시 추가하지 않는다 —
  항상 `@CurrentUserId`를 쓴다.

## 갱신할 문서

- `docs/STATUS.md` — 인증 리졸버 통합 상태를 이 ADR 기준으로 갱신.
