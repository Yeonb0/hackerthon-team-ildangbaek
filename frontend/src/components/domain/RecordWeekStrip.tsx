import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RecordDot } from '@/components/domain/RecordDot';
import { getCurrentWeekDates, getWeekdayLabels, isFutureDateString } from '@/lib/date';
import type { WeekStart } from '@/lib/date';
import { color, gradient, gradientDirection, space, weightFamily } from '@/theme';
import type { RecordCalendarDay } from '@/types/record';

type RecordWeekStripProps = {
  /** 조회 중인 달의 날짜 목록(useRecordCalendar 응답) — 이번 주가 달 경계를 걸치면
   * 걸친 쪽 날짜는 데이터가 없어 점 없이 표시됩니다(알려진 제약, 다음 체크포인트에서
   * 필요시 주 단위 API로 보완). */
  days: RecordCalendarDay[];
  /** 주 시작 요일. 기본값은 Figma 실측(일요일 시작)이지만, weekStartStore를 통해
   * 사용자가 고른 값을 호출부(RecordHubScreen)에서 넘겨줍니다(관리자님 요청,
   * 2026-08-15). RecordCalendar와 같은 prop 이름·기본값 관례를 따르진 않았는데,
   * 이 화면은 Figma가 명시적으로 일요일 시작이라 기본값을 다르게 뒀습니다. */
  weekStart?: WeekStart;
};

/**
 * 기록 홈 상단 주간 스트립. F-RECORD-02(Frame 10, 210:697) — 기존엔 이 자리에 전체
 * 월 캘린더(RecordCalendar)를 바로 넣었는데, Figma는 홈엔 이번 주 7칸만 보여주고
 * 전체 월은 캘린더 아이콘을 눌러 별도 화면(월간 기록)에서 봅니다. RecordCalendar
 * 컴포넌트 자체는 그 화면에서 계속 쓸 예정이라 건드리지 않았습니다.
 */
export function RecordWeekStrip({ days, weekStart = 'SUNDAY' }: RecordWeekStripProps) {
  const dayMap = new Map(days.map((d) => [d.date, d]));
  const weekDates = getCurrentWeekDates(weekStart);
  const weekdayLabels = getWeekdayLabels(weekStart);

  return (
    <View style={styles.row}>
      {weekDates.map((date, index) => {
        const data = dayMap.get(date);
        const isToday = data?.today ?? false;
        const isFuture = isFutureDateString(date);
        const day = Number(date.slice(-2));
        const label = weekdayLabels[index];
        // 요일 라벨 색 구분은 index가 아니라 라벨 문자 기준입니다 — weekStart가
        // 바뀌면 일/토가 몇 번째 칸에 오는지 자체가 달라지기 때문입니다
        // (RecordCalendar.tsx와 동일한 방식, 2026-08-15).
        const isSunday = label === '일';
        const isSaturday = label === '토';

        return (
          <View key={date} style={styles.cell}>
            <Text style={[styles.weekdayLabel, isSunday && styles.weekdayLabelSun, isSaturday && styles.weekdayLabelSat]}>
              {label}
            </Text>
            {isToday ? (
              <LinearGradient
                colors={gradient.brand}
                start={gradientDirection.iconBox.start}
                end={gradientDirection.iconBox.end}
                style={styles.dayCircle}
              >
                <Text style={styles.dayTextToday}>{day}</Text>
              </LinearGradient>
            ) : (
              <View style={styles.dayCircle}>
                <Text style={[styles.dayText, isFuture && styles.dayTextFuture]}>{day}</Text>
              </View>
            )}
            <View style={styles.dots}>
              <RecordDot slot="morning" status={data && !isFuture ? data.morning : 'NONE'} />
              <RecordDot slot="night" status={data && !isFuture ? data.night : 'NONE'} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const CIRCLE_SIZE = 32;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: space[3],
    paddingVertical: space[4],
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  weekdayLabel: {
    ...weightFamily('medium'),
    fontSize: 11,
    lineHeight: 16.5,
    color: color.textSub,
  },
  weekdayLabelSun: {
    color: color.calendarSunday,
  },
  weekdayLabelSat: {
    color: color.brand500,
  },
  dayCircle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    ...weightFamily('bold'),
    fontSize: 13,
    lineHeight: 19.5,
    color: color.textInk,
  },
  dayTextFuture: {
    color: color.textMuted,
  },
  dayTextToday: {
    ...weightFamily('bold'),
    fontSize: 13,
    lineHeight: 19.5,
    color: color.bg,
  },
  dots: {
    flexDirection: 'row',
    gap: 3,
  },
});
