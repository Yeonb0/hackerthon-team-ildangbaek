// 개발/검증용 플래그 모음. USE_MOCK(src/api/useMock.ts)과 동일한 패턴 —
// .env 값만 바꾸면 되고 코드 수정은 필요 없습니다.

/**
 * true면 RootNavigator가 로그인/온보딩 분기를 건너뛰고
 * CatalogScreen을 바로 띄웁니다. Phase마다 컴포넌트 검증할 때 재사용합니다.
 * 검증 끝나면 .env에서 false로 돌려두세요 (커밋 전 확인 필수).
 */
export const SHOW_CATALOG = process.env.EXPO_PUBLIC_SHOW_CATALOG === 'true';