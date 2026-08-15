import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Svg, { Ellipse } from 'react-native-svg';
import { color } from '@/theme/tokens';
import { s } from '@/lib/scale';

type FaceGuideOverlayProps = {
  /** 렌더 너비/높이. 기본값은 세로형 카메라 미리보기 대부분을 덮는 비율이며, s()로
   * 기기 폭에 맞춰 스케일링됩니다 (lib/scale.ts 규칙 준수). */
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * S-16 얼굴 촬영 가이드 오버레이 (F-SKIN-02 BR2).
 *
 * 카메라 미리보기 위에 겹쳐 그리는 타원형 윤곽선입니다. 실제 얼굴 검출·판정은
 * 서버(SKIN-01, 422 SKIN_FACE_NOT_DETECTED)가 담당하고, 이 컴포넌트는 사용자가
 * 스스로 프레임 안에 얼굴을 맞추도록 돕는 순수 시각 안내일 뿐입니다 —
 * 얼굴 인식/좌표 계산 로직을 갖지 않습니다.
 *
 * ⚠️ 선 색·두께·비율은 디자인 확정 전 placeholder입니다. Figma 토큰 확정 시
 * theme/tokens.ts만 교체하면 되도록 색상은 전부 토큰 참조로 뺐습니다.
 */
export function FaceGuideOverlay({
  width = s(260),
  height = s(340),
  style,
}: FaceGuideOverlayProps) {
  return (
    <Svg width={width} height={height} viewBox="0 0 260 340" style={style}>
      <Ellipse
        cx={130}
        cy={170}
        rx={105}
        ry={145}
        fill="none"
        stroke={color.white}
        strokeWidth={3}
        strokeDasharray="10 8"
        opacity={0.9}
      />
    </Svg>
  );
}