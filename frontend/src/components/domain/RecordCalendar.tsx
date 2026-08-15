import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { IconBack, IconChevronRight } from '@/components/icons';
import { RecordDot } from '@/components/domain/RecordDot';
import { getMonthGridCells, isFutureDateString } from '@/lib/date';
import type { WeekStart } from '@/lib/date';
import { color, space, typography } from '@/theme';
import type { RecordCalendarDay } from '@/types/record';

type RecordCalendarProps = {
  year: number;
  month: number; // 0-indexed
  /** 서버가 조회 월의 모든 날짜를 이미 채워서 줍니다(RECORD-01 BR1) — 여기서 빈 날짜를 만들지 않습니다 */
  days: RecordCalendarDay[];
  onPrevMonth: () => void;
  onNextMonth: () => void;
  /** 주 시작 요일. 기본값을 월요일로 바꿨습니다(관리자님 요청, 2026-08-10). 나중에
   * 설정 화면에서 사용자가 고를 수 있게 할 계획이라 prop으로 열어뒀습니다. */
  weekStart?: WeekStart;
  style?: StyleProp<ViewStyle>;
};

const WEEKDAY_LABELS_SUNDAY_FIRST = ['일', '월', '화', '수', '목', '금', '토'];
const WEEKDAY_LABELS_MONDAY_FIRST = ['월', '화', '수', '목', '금', '토', '일'];
const CELL_SIZE = 44;

/**
 * 월간 기록 캘린더. 라이브러리 없이 42칸 그리드를 직접 그립니다(로드맵 4-6 결정).
 * 그리드 계산(이전/다음 달 여백 포함)은 lib/date.ts의 getMonthGridCells()를 씁니다 —
 * components/base/Calendar.tsx(S-04 날짜 선택)와 같은 로직을 재사용한 것입니다.
 *
 * 미래 날짜는 점을 그리지 않고 숫자만 흐리게 처리합니다 — "선택 불가"(BR6)를 이 컴포넌트가
 * 읽기 전용이라는 점에 맞춰 "아직 일어나지 않은 날"로 표현한 것입니다. 서버가 미래 날짜도
 * NONE으로 채워서 주지만(BR3), 그걸 그대로 점으로 그리면 "기록을 안 한 날"처럼 보여서
 * 아직 안 지난 날과 구분이 안 되는 문제를 피하려는 의도입니다.
 */
export function RecordCalendar({
  year,
  month,
  days,
  onPrevMonth,
  onNextMonth,
  weekStart = 'MONDAY',
  style,
}: RecordCalendarProps) {
  const cells = getMonthGridCells(year, month, weekStart);
  const weekdayLabels = weekStart === 'MONDAY' ? WEEKDAY_LABELS_MONDAY_FIRST : WEEKDAY_LABELS_SUNDAY_FIRST;
  const dayMap = new Map(days.map((d) => [d.date, d]));

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.headerLabel}>
          {year}년 {month + 1}월
        </Text>
        <View style={styles.headerNav}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="이전 달"
            onPress={onPrevMonth}
            hitSlop={8}
            style={styles.navButton}
          >
            <IconBack size={20} color={color.ink600} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="다음 달"
            onPress={onNextMonth}
            hitSlop={8}
            style={styles.navButton}
          >
            <IconChevronRight size={20} color={color.ink600} />
          </Pressable>
        </View>
      </View>

      <View style={styles.weekdayRow}>
        {weekdayLabels.map((label) => (
          <Text key={label} style={styles.weekdayLabel}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell) => {
          const data = dayMap.get(cell.date);
          const isFuture = isFutureDateString(cell.date);
          const showDots = cell.inCurrentMonth && data && !isFuture;

          return (
            <View key={cell.date} style={styles.cell}>
              <Text
                style={[
                  styles.dayText,
                  (!cell.inCurrentMonth || isFuture) && styles.dayTextMuted,
                  data?.today && styles.dayTextToday,
                ]}
              >
                {cell.day}
              </Text>
              {showDots && data && (
                <View style={styles.dots}>
                  <RecordDot status={data.morning} />
                  <RecordDot status={data.night} />
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space[3],
  },
  headerLabel: {
    ...typography.bodyStrong,
    color: color.ink900,
  },
  headerNav: {
    flexDirection: 'row',
    gap: space[2],
  },
  navButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayRow: {
    flexDirection: 'row',
  },
  weekdayLabel: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    ...typography.caption,
    color: color.ink600,
    marginBottom: space[1],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  dayText: {
    ...typography.caption,
    color: color.ink900,
  },
  dayTextMuted: {
    color: color.ink300,
  },
  dayTextToday: {
    color: color.brand700,
    fontWeight: '700',
  },
  dots: {
    flexDirection: 'row',
    gap: 4,
  },
});
