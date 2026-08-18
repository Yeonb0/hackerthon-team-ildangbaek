import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { RecordDot } from '@/components/domain/RecordDot';
import {
  getCurrentWeekDates,
  getTodayDateString,
  getWeekdayLabels,
  isFutureDateString,
} from '@/lib/date';
import type { WeekStart } from '@/lib/date';
import { color, space, typography } from '@/theme';
import type { WeeklyCalendarDay } from '@/types/home';
import { weightFamily } from '@/theme/typography';

type WeeklyRecordStripProps = {
  /**
   * 서버(GET /home)가 내려주는 이번 주 기록 상태. 명세는 "월~일 고정 7칸"이지만,
   * ⚠️ 2026-08-18 실서버 연동 확인 결과 백엔드가 **월~오늘까지만** 내려주고 있습니다
   * (화요일에 접속하면 2칸만 옴 — 관리자님 제보). 그래서 이 컴포넌트는 더 이상 이
   * 배열의 길이를 그대로 믿지 않습니다: 프론트가 `weekStart` 기준으로 이번 주 7일을
   * 직접 계산하고, 이 배열은 날짜(key) 매칭으로 점 상태만 채워 넣는 용도로 씁니다.
   * 매칭되는 날짜가 없는 과거 날짜는 NONE(미기록)으로 그립니다.
   *
   * 백엔드가 7칸을 다 내려주도록 고쳐도 이 로직은 그대로 동작하므로 되돌릴 필요 없습니다.
   */
  days: WeeklyCalendarDay[];
  /** 주 시작 요일. RecordWeekStrip / RecordCalendar와 동일하게 weekStartStore 값을
   * 호출부에서 넘깁니다(기본 월요일). */
  weekStart?: WeekStart;
  style?: StyleProp<ViewStyle>;
};

/**
 * F-HOME-06 주간 기록 현황. 밤 홈(S-08) 전용입니다.
 * 점 규칙은 F-RECORD-01(월간 캘린더)과 동일해서 RecordDot을 그대로 재사용합니다.
 *
 * 2026-08-18 — 관리자님 제보("캘린더에 날짜 표시 오류") 대응 2건:
 * 1) 서버 응답 길이에 의존하던 렌더링을 프론트 계산 7칸 고정으로 바꿨습니다(위 주석).
 * 2) 요일 라벨만 있고 며칠인지 알 수 없던 문제 — 기록 허브 주간 스트립
 *    (RecordWeekStrip)과 동일하게 날짜 숫자를 함께 표시합니다.
 */
export function WeeklyRecordStrip({
  days,
  weekStart = 'MONDAY',
  style,
}: WeeklyRecordStripProps) {
  const today = getTodayDateString();
  const dayMap = new Map(days.map((d) => [d.date, d]));
  const weekDates = getCurrentWeekDates(weekStart);
  const weekdayLabels = getWeekdayLabels(weekStart);

  return (
    <View style={[styles.row, style]}>
      {weekDates.map((date, index) => {
        const data = dayMap.get(date);
        const isToday = date === today;
        const isFuture = isFutureDateString(date);
        const dayNumber = Number(date.slice(-2));
        const label = weekdayLabels[index];

        return (
          <View key={date} style={styles.column}>
            <Text
              style={[
                styles.weekday,
                isToday && styles.weekdayToday,
                isFuture && styles.weekdayMuted,
              ]}
            >
              {label}
            </Text>
            <Text
              style={[
                styles.dayNumber,
                isToday && styles.dayNumberToday,
                isFuture && styles.weekdayMuted,
              ]}
            >
              {dayNumber}
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
                  <RecordDot slot="morning" status={data?.morning ?? 'NONE'} />
                  <RecordDot slot="night" status={data?.night ?? 'NONE'} />
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
  },
  // space-between 대신 flex:1 균등 분할 — 칸 수가 7개로 고정되면서, 데이터가 덜 와도
  // 남은 칸이 양 끝으로 벌어지지 않게 합니다.
  column: {
    flex: 1,
    alignItems: 'center',
    gap: space[1],
  },
  weekday: {
    ...typography.caption,
    color: color.ink600,
  },
  weekdayToday: {
    color: color.brand700,
    ...weightFamily('bold'),
  },
  weekdayMuted: {
    color: color.ink300,
  },
  dayNumber: {
    ...typography.caption,
    color: color.ink900,
  },
  dayNumberToday: {
    color: color.brand700,
    ...weightFamily('bold'),
  },
  dots: {
    flexDirection: 'row',
    gap: 4,
    marginTop: space[1],
  },
  // RecordDot과 같은 8px — RecordDot.tsx의 SIZE 상수와 값만 맞춰둠(export되어 있지
  // 않아 직접 참조는 못 함).
  dotPlaceholder: {
    width: 8,
    height: 8,
  },
});
