import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RecordDot } from '@/components/domain/RecordDot';
import { getCurrentWeekDates, isFutureDateString } from '@/lib/date';
import { color, gradient, gradientDirection, space, weightFamily } from '@/theme';
import type { RecordCalendarDay } from '@/types/record';

type RecordWeekStripProps = {
  /** 조회 중인 달의 날짜 목록(useRecordCalendar 응답) — 이번 주가 달 경계를 걸치면
   * 걸친 쪽 날짜는 데이터가 없어 점 없이 표시됩니다(알려진 제약, 다음 체크포인트에서
   * 필요시 주 단위 API로 보완). */
  days: RecordCalendarDay[];
};

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']; // Figma 실측: 일요일 시작

/**
 * 기록 홈 상단 주간 스트립. F-RECORD-02(Frame 10, 210:697) — 기존엔 이 자리에 전체
 * 월 캘린더(RecordCalendar)를 바로 넣었는데, Figma는 홈엔 이번 주 7칸만 보여주고
 * 전체 월은 캘린더 아이콘을 눌러 별도 화면(월간 기록)에서 봅니다. RecordCalendar
 * 컴포넌트 자체는 그 화면에서 계속 쓸 예정이라 건드리지 않았습니다.
 */
export function RecordWeekStrip({ days }: RecordWeekStripProps) {
  const dayMap = new Map(days.map((d) => [d.date, d]));
  const weekDates = getCurrentWeekDates('SUNDAY');

  return (
    <View style={styles.row}>
      {weekDates.map((date, index) => {
        const data = dayMap.get(date);
        const isToday = data?.today ?? false;
        const isFuture = isFutureDateString(date);
        const day = Number(date.slice(-2));
        const isSaturday = index === 6;

        return (
          <View key={date} style={styles.cell}>
            <Text style={[styles.weekdayLabel, index === 0 && styles.weekdayLabelSun, isSaturday && styles.weekdayLabelSat]}>
              {WEEKDAY_LABELS[index]}
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
