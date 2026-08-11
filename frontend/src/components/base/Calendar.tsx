// src/components/base/Calendar.tsx
//
// 네이티브 날짜 피커 라이브러리(@react-native-community/datetimepicker) 대신 직접 만든
// 월간 캘린더 그리드입니다. 이유는 두 가지입니다.
// 1) 웹(Expo web)에서 네이티브 모듈이 잘 동작하지 않는 경우가 많고,
// 2) 나중에 기록 허브(S-09/S-10)의 월간 기록 캘린더(F-RECORD-01)에서도 비슷한 그리드가
//    필요해서, 이번에 만드는 그리드 계산 로직을 그대로 재사용할 수 있게 base 컴포넌트로 뺐습니다.
import React, { useState } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { IconBack, IconChevronRight } from '@/components/icons';
import { color, radius, space } from '@/theme/tokens';
import { formatDateString, getTodayDateString } from '@/lib/date';

type CalendarProps = {
  /** 선택된 날짜 'YYYY-MM-DD'. 없으면 미선택 */
  value: string | null;
  onSelect: (date: string) => void;
  /** 이 날짜 이후는 선택 불가 (예: 오늘 이후 불가 규칙) */
  maxDate?: string;
  /** 이 날짜 이전은 선택 불가 */
  minDate?: string;
  style?: StyleProp<ViewStyle>;
};

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
const TOTAL_CELLS = 42; // 6주 고정 — 달마다 그리드 높이가 바뀌지 않게

function getInitialYearMonth(value: string | null): { year: number; month: number } {
  const base = value ? new Date(`${value}T00:00:00`) : new Date();
  return { year: base.getFullYear(), month: base.getMonth() };
}

export function Calendar({ value, onSelect, maxDate, minDate, style }: CalendarProps) {
  const initial = getInitialYearMonth(value);
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month); // 0-indexed

  const today = getTodayDateString();

  const goPrevMonth = () => {
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const startWeekday = new Date(year, month, 1).getDay(); // 0 = 일요일
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const leadingCount = startWeekday;
  const trailingCount = TOTAL_CELLS - leadingCount - daysInMonth;

  const prevMonthTarget = month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
  const nextMonthTarget = month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };

  const cells: { year: number; month: number; day: number; inCurrentMonth: boolean }[] = [];

  for (let i = 0; i < leadingCount; i++) {
    cells.push({
      year: prevMonthTarget.year,
      month: prevMonthTarget.month,
      day: daysInPrevMonth - leadingCount + 1 + i,
      inCurrentMonth: false,
    });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ year, month, day, inCurrentMonth: true });
  }
  for (let day = 1; day <= trailingCount; day++) {
    cells.push({ year: nextMonthTarget.year, month: nextMonthTarget.month, day, inCurrentMonth: false });
  }

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
            onPress={goPrevMonth}
            hitSlop={8}
            style={styles.navButton}
          >
            <IconBack size={20} color={color.ink600} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="다음 달"
            onPress={goNextMonth}
            hitSlop={8}
            style={styles.navButton}
          >
            <IconChevronRight size={20} color={color.ink600} />
          </Pressable>
        </View>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label) => (
          <Text key={label} style={styles.weekdayLabel}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell, index) => {
          const dateString = formatDateString(cell.year, cell.month, cell.day);
          const isToday = dateString === today;
          const isSelected = value === dateString;
          const isOutOfRange = Boolean(
            (maxDate && dateString > maxDate) || (minDate && dateString < minDate)
          );
          const disabled = !cell.inCurrentMonth || isOutOfRange;

          return (
            <Pressable
              key={`${dateString}-${index}`}
              disabled={disabled}
              onPress={() => onSelect(dateString)}
              style={styles.cell}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected, disabled }}
            >
              <View
                style={[
                  styles.dayCircle,
                  isSelected && styles.dayCircleSelected,
                  isToday && !isSelected && styles.dayCircleToday,
                ]}
              >
                <Text
                  style={[
                    styles.dayText,
                    !cell.inCurrentMonth && styles.dayTextMuted,
                    isOutOfRange && cell.inCurrentMonth && styles.dayTextDisabled,
                    isSelected && styles.dayTextSelected,
                  ]}
                >
                  {cell.day}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const CELL_SIZE = 40;

const styles = StyleSheet.create({
  container: {
    width: CELL_SIZE * 7,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space[3],
  },
  headerLabel: {
    fontSize: 16,
    fontWeight: '700',
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
    width: CELL_SIZE,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: color.ink600,
    marginBottom: space[1],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleSelected: {
    backgroundColor: color.brand500,
  },
  dayCircleToday: {
    borderWidth: 1,
    borderColor: color.brand500,
  },
  dayText: {
    fontSize: 14,
    color: color.ink900,
  },
  dayTextMuted: {
    color: color.ink300,
  },
  dayTextDisabled: {
    color: color.ink300,
  },
  dayTextSelected: {
    color: color.bg,
    fontWeight: '700',
  },
});
