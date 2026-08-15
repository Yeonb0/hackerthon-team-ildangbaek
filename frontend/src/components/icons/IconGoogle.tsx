// src/components/icons/IconGoogle.tsx
import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { IconProps, ICON_DEFAULT_SIZE } from './types';

/**
 * 구글 로그인 버튼 전용 브랜드 아이콘 (표준 4색 "G" 마크).
 *
 * ⚠️ 카카오 아이콘과 같은 이유로 `color` prop이 없습니다 — 구글 브랜드 가이드가
 * 4색 고정을 요구합니다.
 */
export function IconGoogle({ size = ICON_DEFAULT_SIZE, style }: Omit<IconProps, 'color'>) {
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20" fill="none" style={style}>
      <Path
        d="M19.6 10.23c0-.68-.06-1.36-.18-2.02H10v3.83h5.4a4.62 4.62 0 0 1-2 3.03v2.5h3.24c1.9-1.75 2.96-4.33 2.96-7.34Z"
        fill="#4285F4"
      />
      <Path
        d="M10 20c2.7 0 4.96-.9 6.62-2.43l-3.24-2.5c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H1.06v2.58A10 10 0 0 0 10 20Z"
        fill="#34A853"
      />
      <Path
        d="M4.41 11.9a5.99 5.99 0 0 1 0-3.82V5.5H1.06a10 10 0 0 0 0 9l3.35-2.6Z"
        fill="#FBBC05"
      />
      <Path
        d="M10 3.98c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.6 9.6 0 0 0 10 0 10 10 0 0 0 1.06 5.5l3.35 2.6c.79-2.36 2.99-4.12 5.59-4.12Z"
        fill="#EA4335"
      />
    </Svg>
  );
}
