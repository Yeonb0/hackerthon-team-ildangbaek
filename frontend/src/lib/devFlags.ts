// 개발/검증용 플래그 모음. USE_MOCK(src/api/useMock.ts)과 동일한 패턴 —
// .env 값만 바꾸면 되고 코드 수정은 필요 없습니다.

/**
 * true면 RootNavigator가 로그인/온보딩 분기를 건너뛰고
 * CatalogScreen을 바로 띄웁니다. Phase마다 컴포넌트 검증할 때 재사용합니다.
 * 검증 끝나면 .env에서 false로 돌려두세요 (커밋 전 확인 필수).
 */
export const SHOW_CATALOG = process.env.EXPO_PUBLIC_SHOW_CATALOG === 'true';

/**
 * 화면 우하단 개발용 🧪 버튼(DevResetButton) 표시 여부입니다.
 *
 * ⚠️ 다른 플래그와 달리 **기본값이 꺼짐(false)** 입니다. 시연 영상 촬영 때 dev 빌드
 * 화면에 개발용 버튼이 그대로 찍히는 문제가 있어서(관리자님 요청, 2026-08-20),
 * 명시적으로 켠 경우에만 뜨도록 뒤집었습니다.
 *
 * 개발 중 다시 쓰려면 .env에 아래 한 줄을 넣고 dev 서버를 재시작하세요.
 *   EXPO_PUBLIC_SHOW_DEV_TOOLS=true
 *
 * 프로덕션 빌드에서는 이 값과 무관하게 __DEV__ 가드로 항상 숨겨집니다.
 */
export const SHOW_DEV_TOOLS = process.env.EXPO_PUBLIC_SHOW_DEV_TOOLS === 'true';

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