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

/**
 * 여백 · 아이콘 · 일러스트 크기 스케일링 전용.
 * 폰트 크기에는 절대 사용하지 않는다 (typography.ts에서 별도 관리 예정).
 */
export const s = (n: number) => Math.round((width / BASE_WIDTH) * n);