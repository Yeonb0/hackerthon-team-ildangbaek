import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { color, radius } from '@/theme/tokens';
import type { RecordDotStatus } from '@/types/home';

type RecordDotSlot = 'morning' | 'night';

type RecordDotProps = {
  status: RecordDotStatus;
  /** 모닝/나이트 색 구분용(관리자 결정 2026-08-15) — 생략하면 기존처럼 보라(night)로
   * 그립니다. 기존 호출부(RecordCalendar, WeeklyRecordStrip, CatalogScreen)는 안
   * 건드렸고, RecordWeekStrip에서만 명시적으로 넘깁니다. */
  slot?: RecordDotSlot;
  style?: StyleProp<ViewStyle>;
};

const SIZE = 8;

// 접근성 규칙(Phase 2 로드맵): 완료 상태를 색만으로 구분하지 않습니다.
// FULL/PARTIAL/NONE은 색뿐 아니라 채움(solid) vs 외곽선(outline) vs 흐림(dim)으로
// 형태 자체가 다르기 때문에, 별도 아이콘 없이도 색약 사용자가 구분할 수 있습니다.
//
// 2026-08-15 — 모닝 점은 핑크, 나이트 점은 기존 보라를 유지하도록 분리했습니다
// (F-RECORD-02 관리자 결정). NONE(미기록)은 낮/밤 구분 없이 동일합니다.
function statusStyle(status: RecordDotStatus, slot: RecordDotSlot): ViewStyle {
  const tint = slot === 'morning' ? color.calendarMorningDot : color.brand500;
  switch (status) {
    case 'FULL':
      return { backgroundColor: tint };
    case 'PARTIAL':
      return { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: tint };
    case 'NONE':
    default:
      return { backgroundColor: color.ink300, opacity: 0.4 };
  }
}

/**
 * 기록 상태 점 하나. F-HOME-06(밤 홈 주간 현황) / F-RECORD-01(월간 캘린더) 공용 원자 컴포넌트입니다.
 */
export function RecordDot({ status, slot = 'night', style }: RecordDotProps) {
  return <View style={[styles.base, statusStyle(status, slot), style]} />;
}

const styles = StyleSheet.create({
  base: {
    width: SIZE,
    height: SIZE,
    borderRadius: radius.pill,
  },
});
