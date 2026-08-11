// src/components/icons/AppIcon.tsx
// Checkpoint 9-B — Tag/Toast/EmptyState/ErrorState/PermissionDenied처럼 "아이콘 이름을
// prop/설정값으로 받는" 곳에서 공용으로 씁니다. name이 신규 세트(ICONS)에 있으면 그걸 쓰고,
// 없으면 계속 Ionicons로 폴백합니다 — 로드맵 9-B 방침(대응 없는 곳은 Ionicons 유지) 그대로.
//
// 주의: 우리 세트 키 중 'search' / 'warning' / 'camera'처럼 Ionicons에도 같은 이름이 존재하는
// 경우가 있는데, 그런 이름은 항상 신규 아이콘이 우선입니다(교체 대상으로 이미 확정된 것들이라
// 의도된 동작입니다).
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ICONS, IconName } from './registry';
import type { IconProps } from './types';

export type AppIconName = IconName | keyof typeof Ionicons.glyphMap;

type AppIconProps = IconProps & { name: AppIconName };

function isCustomIconName(name: AppIconName): name is IconName {
  return Object.prototype.hasOwnProperty.call(ICONS, name);
}

export function AppIcon({ name, size = 24, color = '#000000', style }: AppIconProps) {
  if (isCustomIconName(name)) {
    const Custom = ICONS[name];
    return <Custom size={size} color={color} style={style} />;
  }
  return (
    <Ionicons name={name as keyof typeof Ionicons.glyphMap} size={size} color={color} style={style} />
  );
}
