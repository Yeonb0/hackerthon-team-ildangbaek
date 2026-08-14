import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { RecordDot } from '@/components/domain/RecordDot';
import { getTodayDateString, isFutureDateString } from '@/lib/date';
import { color, space, typography } from '@/theme';
import type { WeeklyCalendarDay } from '@/types/home';

type WeeklyRecordStripProps = {
  /**
   * 명세 원안(HOME-01 BR1)은 "이번 주(월~오늘)"만이라 월요일엔 1칸만 나오는 문제가
   * 있었고, 이를 "최근 7일 롤링"으로 바꿨다가(관리자님 요청, 2026-08-10) 다시
   * "월~일 고정 7칸"으로 되돌렸습니다(관리자님 결정, 2026-08-14 — 캘린더 주 개념과
   * 어긋나는 롤링 방식보다 고정 주가 더 명확하다는 판단). 항상 월~일 7칸이 오고,
   * 오늘 이후 날짜는 이 컴포넌트가 RecordCalendar.tsx와 동일한 규칙으로 점을 그리지
   * 않고 흐리게 처리합니다 — "기록 안 함(NONE)"과 "아직 안 지난 날"을 구분하기 위함.
   * (백엔드 요청 문서는 request-weekly-calendar-rolling-7days.md → 고정 주 버전으로
   * 교체 필요, 관리자님께 전달 예정)
   */
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
        const isFuture = isFutureDateString(day.date);
        return (
          <View key={day.date} style={styles.column}>
            <Text
              style={[
                styles.weekday,
                isToday && styles.weekdayToday,
                isFuture && styles.weekdayMuted,
              ]}
            >
              {getWeekdayLabel(day.date)}
            </Text>
            <View style={styles.dots}>
              {isFuture ? (
                // 미래 요일 — 점을 그리지 않고 자리만 비워 정렬을 맞춥니다
                // (RecordCalendar.tsx와 동일한 "아직 안 지난 날" 처리 규칙).
                <>
                  <View style={styles.dotPlaceholder} />
                  <View style={styles.dotPlaceholder} />
                </>
              ) : (
                <>
                  <RecordDot status={day.morning} />
                  <RecordDot status={day.night} />
                </>
              )}
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
  weekdayMuted: {
    color: color.ink300,
  },
  dots: {
    flexDirection: 'row',
    gap: 4,
  },
  // RecordDot과 같은 8px — RecordDot.tsx의 SIZE 상수와 값만 맞춰둠(export되어 있지
  // 않아 직접 참조는 못 함).
  dotPlaceholder: {
    width: 8,
    height: 8,
  },
});
