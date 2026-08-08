import { Dimensions, Platform } from 'react-native';

const { width } = Dimensions.get('window');

// Figma 디자인 프레임 기준 폭 (플랫폼별)
// iOS: iPhone 16 Pro 논리 해상도 (402 x 874)
// Android: Galaxy S23/S24 표준 dp 폭
const BASE_WIDTH = Platform.select({
  ios: 402,
  android: 360,
  default: 402,
}) as number;

// 웹은 "브라우저 창 폭"이 "기기 폭"이 아닙니다. 데스크톱처럼 넓은 창(예: 1200px)에서
// 그대로 비율을 곱하면 s(150)이 150px가 아니라 448px로 튀는 식으로 여백이 실제보다
// 훨씬 커집니다. 그래서 웹에서는 창 폭이 기준폭보다 넓을 때 배율을 1로 고정합니다
// (좁은 모바일 폭으로 브라우저를 줄여서 테스트하는 경우는 그대로 비율이 적용됩니다).
// 네이티브(iOS/Android)는 기존 동작 그대로 둡니다.
const effectiveWidth = Platform.OS === 'web' ? Math.min(width, BASE_WIDTH) : width;

/**
 * 여백 · 아이콘 · 일러스트 크기 스케일링 전용.
 * 폰트 크기에는 절대 사용하지 않는다 (typography.ts에서 별도 관리 예정).
 */
export const s = (n: number) => Math.round((effectiveWidth / BASE_WIDTH) * n);