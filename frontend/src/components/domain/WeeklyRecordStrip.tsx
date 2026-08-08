import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { RecordDot } from '@/components/domain/RecordDot';
import { getTodayDateString } from '@/lib/date';
import { color, space, typography } from '@/theme';
import type { WeeklyCalendarDay } from '@/types/home';

type WeeklyRecordStripProps = {
  /** 이번 주(월~오늘)만 옵니다 — 명세서 HOME-01 규칙, 이번 달 전체는 기록 허브(F-RECORD-01) 담당 */
  days: WeeklyCalendarDay[];
  style?: StyleProp<ViewStyle>;
};

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

function getWeekdayLabel(dateString: string): string {
  // 로컬 시간 기준 — lib/date.ts와 동일 원칙(UTC 변환 금지)
  const [year, month, day] = dateString.split('-').map(Number);
  return WEEKDAY_LABELS[new Date(year, month - 1, day).getDay()];
}

/**
 * F-HOME-06 주간 기록 현황. 밤 홈(S-08) 전용입니다.
 * 점 규칙은 F-RECORD-01(월간 캘린더)과 동일해서 RecordDot을 그대로 재사용합니다 —
 * 기록 허브 캘린더(체크포인트 D)에서도 같은 컴포넌트를 씁니다.
 */
export function WeeklyRecordStrip({ days, style }: WeeklyRecordStripProps) {
  const today = getTodayDateString();

  return (
    <View style={[styles.row, style]}>
      {days.map((day) => {
        const isToday = day.date === today;
        return (
          <View key={day.date} style={styles.column}>
            <Text style={[styles.weekday, isToday && styles.weekdayToday]}>
              {getWeekdayLabel(day.date)}
            </Text>
            <View style={styles.dots}>
              <RecordDot status={day.morning} />
              <RecordDot status={day.night} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  column: {
    alignItems: 'center',
    gap: space[2],
  },
  weekday: {
    ...typography.caption,
    color: color.ink600,
  },
  weekdayToday: {
    color: color.brand700,
    fontWeight: '700',
  },
  dots: {
    flexDirection: 'row',
    gap: 4,
  },
});
