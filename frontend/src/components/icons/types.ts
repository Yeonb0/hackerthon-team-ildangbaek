// src/components/icons/types.ts
import type { StyleProp, ViewStyle } from 'react-native';

/**
 * 아이콘 42종(nav 5 + ui/state/section 20 + 2026-08-12 추가분 17) 공용 props.
 * 원본 SVG는 24×24 viewBox, stroke="currentColor" 기준으로 통일되어 있어서
 * (icon-barcode / icon-celebrate / icon-cloud-error / icon-product-bottle / icon-wifi-off
 * 5개는 원래 고정 검정 + 불규칙 두께였던 것을 Checkpoint 9-A에서 currentColor + 1.8px로
 * 정규화했습니다 — 관리자님 확인 2026-08-11) size/color만 넘기면 그대로 반영됩니다.
 * 2026-08-12 추가분 17종 중 icon-trash/help-circle/image-placeholder/info/location-pin/
 * person-circle 6개도 원본이 stroke="#000" 고정이었던 걸 같은 방식으로 currentColor 처리했습니다.
 */
export type IconProps = {
  /** 정사각형 한 변 길이(px). 기본 24 */
  size?: number;
  /** stroke(일부 아이콘은 fill)에 적용될 색상. 기본은 검정 */
  color?: string;
  style?: StyleProp<ViewStyle>;
};

export const ICON_DEFAULT_SIZE = 24;
export const ICON_DEFAULT_COLOR = '#000000';
