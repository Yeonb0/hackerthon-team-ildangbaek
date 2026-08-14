// 개발/검증용 플래그 모음. USE_MOCK(src/api/useMock.ts)과 동일한 패턴 —
// .env 값만 바꾸면 되고 코드 수정은 필요 없습니다.

/**
 * true면 RootNavigator가 로그인/온보딩 분기를 건너뛰고
 * CatalogScreen을 바로 띄웁니다. Phase마다 컴포넌트 검증할 때 재사용합니다.
 * 검증 끝나면 .env에서 false로 돌려두세요 (커밋 전 확인 필수).
 */
export const SHOW_CATALOG = process.env.EXPO_PUBLIC_SHOW_CATALOG === 'true';

/**
 * ⚠️ 임시 (백엔드 ADR 0006 — 임시 인증)
 * 백엔드에 아직 JWT가 없어서 서버는 `X-User-Id` 헤더로 사용자를 식별합니다.
 * 값이 있을 때만 client.ts가 헤더를 붙이므로, JWT가 들어오면 .env에서 비우면 됩니다.
 */
export const DEV_USER_ID = process.env.EXPO_PUBLIC_DEV_USER_ID ?? '';