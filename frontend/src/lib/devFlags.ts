// 개발/검증용 플래그 모음. USE_MOCK(src/api/useMock.ts)과 동일한 패턴 —
// .env 값만 바꾸면 되고 코드 수정은 필요 없습니다.

/**
 * true면 RootNavigator가 로그인/온보딩 분기를 건너뛰고
 * CatalogScreen을 바로 띄웁니다. Phase마다 컴포넌트 검증할 때 재사용합니다.
 * 검증 끝나면 .env에서 false로 돌려두세요 (커밋 전 확인 필수).
 */
export const SHOW_CATALOG = process.env.EXPO_PUBLIC_SHOW_CATALOG === 'true';

/**
 * ⚠️ 임시 (백엔드 ADR 0006 · 0017 — 임시 인증)
 *
 * POST /auth/login에 보낼 OAuth 토큰 자리의 값입니다. 카카오/구글 실제 SDK가 붙기 전까지
 * api/auth.ts의 getOAuthToken()이 이 값을 그대로 씁니다.
 *
 * **계정을 가르는 값입니다.** 백엔드 AuthService는 `{provider}-{oauthAccessToken}`으로
 * 사용자를 식별하므로(mockProviderUserId), 이 값이 같으면 로그아웃해도 항상 같은 계정으로
 * 다시 붙습니다. 온보딩을 처음부터 다시 타려면 .env에서 이 값만 바꾸면 새 계정이 생깁니다.
 *
 * 비워두면 기존과 동일하게 'MOCK_OAUTH_TOKEN' 고정값을 씁니다.
 * 실제 OAuth SDK가 붙으면 getOAuthToken() 내부만 교체하면 되고 이 상수는 사라집니다.
 */
export const DEV_OAUTH_TOKEN = process.env.EXPO_PUBLIC_DEV_OAUTH_TOKEN ?? '';