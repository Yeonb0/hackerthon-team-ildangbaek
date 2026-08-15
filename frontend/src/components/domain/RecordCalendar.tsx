import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconBack, IconChevronRight } from '@/components/icons';
import { RecordDot } from '@/components/domain/RecordDot';
import { getMonthGridCells, getWeekdayLabels, isFutureDateString } from '@/lib/date';
import type { WeekStart } from '@/lib/date';
import { color, gradient, gradientDirection, space, typography } from '@/theme';
import type { RecordCalendarDay } from '@/types/record';
import { weightFamily } from '@/theme/typography';

type RecordCalendarProps = {
  year: number;
  month: number; // 0-indexed
  /** 서버가 조회 월의 모든 날짜를 이미 채워서 줍니다(RECORD-01 BR1) — 여기서 빈 날짜를 만들지 않습니다 */
  days: RecordCalendarDay[];
  onPrevMonth: () => void;
  onNextMonth: () => void;
  /** 날짜 탭 콜백(선택) — F-RECORD-02 월간 기록 화면에서 날짜 탭 시 그 날 기록
   * 바텀시트를 엽니다(2026-08-15 신규). 기존 기록 허브에서 요약용으로만 쓰던
   * 곳들은 안 넘기면 그대로 탭 불가(읽기 전용)로 동작합니다. */
  onPressDay?: (date: string) => void;
  /** 주 시작 요일. 기본값을 월요일로 바꿨습니다(관리자님 요청, 2026-08-10). 나중에
   * 설정 화면에서 사용자가 고를 수 있게 할 계획이라 prop으로 열어뒀습니다. */
  weekStart?: WeekStart;
  style?: StyleProp<ViewStyle>;
};

const CELL_SIZE = 44;

/** 42칸을 7개씩 6주로 나눕니다 — 그리드를 flexWrap 대신 "주 단위 row" 배열로 그리기
 * 위해서입니다(아래 함수 사용처 주석 참고). */
function chunkIntoWeeks<T>(cells: T[]): T[][] {
  const weeks: T[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

/**
 * 월간 기록 캘린더. 라이브러리 없이 42칸 그리드를 직접 그립니다(로드맵 4-6 결정).
 * 그리드 계산(이전/다음 달 여백 포함)은 lib/date.ts의 getMonthGridCells()를 씁니다 —
 * components/base/Calendar.tsx(S-04 날짜 선택)와 같은 로직을 재사용한 것입니다.
 *
 * 미래 날짜는 점을 그리지 않고 숫자만 흐리게 처리합니다 — "선택 불가"(BR6)를 이 컴포넌트가
 * 읽기 전용이라는 점에 맞춰 "아직 일어나지 않은 날"로 표현한 것입니다. 서버가 미래 날짜도
 * NONE으로 채워서 주지만(BR3), 그걸 그대로 점으로 그리면 "기록을 안 한 날"처럼 보여서
 * 아직 안 지난 날과 구분이 안 되는 문제를 피하려는 의도입니다.
 *
 * ⚠️ 버그 수정(2026-08-15, 관리자님 실기기 확인 — "토요일이 안 나옴") — 그리드를
 * `flexWrap: 'wrap'` + 셀 `width: 100/7%`로 그렸었는데, 퍼센트 폭 반올림 오차가 누적되면
 * 일곱 번째 칸이 한 줄에 못 들어가고 다음 줄로 밀려서 토요일 칸 전체가 사라진 것처럼
 * 보였습니다(요일 라벨 줄은 7개가 다 보여서 더 헷갈렸음 — 그쪽은 우연히 안 밀렸던 것).
 * 6주×7일을 명시적으로 나눠서(chunkIntoWeeks) 한 줄에 정확히 7개(`flex: 1`)만 넣는
 * 방식으로 바꿔 반올림에 안전하게 만들었습니다.
 */
export function RecordCalendar({
  year,
  month,
  days,
  onPrevMonth,
  onNextMonth,
  onPressDay,
  weekStart = 'MONDAY',
  style,
}: RecordCalendarProps) {
  const cells = getMonthGridCells(year, month, weekStart);
  const weekdayLabels = getWeekdayLabels(weekStart);
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
          <Text
            key={label}
            style={[
              styles.weekdayLabel,
              label === '일' && styles.weekdayLabelSun,
              label === '토' && styles.weekdayLabelSat,
            ]}
          >
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {chunkIntoWeeks(cells).map((week, weekIndex) => (
          <View key={weekIndex} style={styles.weekRow}>
            {week.map((cell) => {
              const data = dayMap.get(cell.date);
              const isFuture = isFutureDateString(cell.date);
              const showDots = cell.inCurrentMonth && data && !isFuture;
              const isPressable = cell.inCurrentMonth && !isFuture && onPressDay;

              const cellContent = (
                <>
                  {data?.today ? (
                    <LinearGradient
                      colors={gradient.brand}
                      start={gradientDirection.iconBox.start}
                      end={gradientDirection.iconBox.end}
                      style={styles.todayCircle}
                    >
                      <Text style={styles.dayTextTodayInner}>{cell.day}</Text>
                    </LinearGradient>
                  ) : (
                    <Text style={[styles.dayText, (!cell.inCurrentMonth || isFuture) && styles.dayTextMuted]}>
                      {cell.day}
                    </Text>
                  )}
                  {showDots && data && (
                    <View style={styles.dots}>
                      <RecordDot slot="morning" status={data.morning} />
                      <RecordDot slot="night" status={data.night} />
                    </View>
                  )}
                </>
              );

              return isPressable ? (
                <Pressable
                  key={cell.date}
                  accessibilityRole="button"
                  accessibilityLabel={`${cell.date} 기록 보기`}
                  onPress={() => onPressDay(cell.date)}
                  style={styles.cell}
                >
                  {cellContent}
                </Pressable>
              ) : (
                <View key={cell.date} style={styles.cell}>
                  {cellContent}
                </View>
              );
            })}
          </View>
        ))}
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
    flex: 1,
    textAlign: 'center',
    ...typography.caption,
    color: color.ink600,
    marginBottom: space[1],
  },
  weekdayLabelSun: {
    color: color.calendarSunday,
  },
  weekdayLabelSat: {
    color: color.brand500,
  },
  grid: {
    gap: 0,
  },
  weekRow: {
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
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
  todayCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayTextTodayInner: {
    ...typography.caption,
    ...weightFamily('bold'),
    color: color.bg,
  },
  dots: {
    flexDirection: 'row',
    gap: 4,
  },
});
