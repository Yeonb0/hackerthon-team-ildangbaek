import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
  /**
   * 2026-08-20(세션 22) — 지금 선택된 날짜('YYYY-MM-DD'). 오늘이면 오늘 칸이 선택
   * 상태입니다. `onSelectDate`와 함께 주지 않으면 기존처럼 읽기 전용으로 동작합니다.
   */
  selectedDate?: string;
  /** 지나간 날짜를 탭했을 때. 미래 날짜는 애초에 눌리지 않습니다(F-RECORD-01 BR6). */
  onSelectDate?: (date: string) => void;
};

/**
 * 기록 홈 상단 주간 스트립. F-RECORD-02(Frame 10, 210:697) — 기존엔 이 자리에 전체
 * 월 캘린더(RecordCalendar)를 바로 넣었는데, Figma는 홈엔 이번 주 7칸만 보여주고
 * 전체 월은 캘린더 아이콘을 눌러 별도 화면(월간 기록)에서 봅니다. RecordCalendar
 * 컴포넌트 자체는 그 화면에서 계속 쓸 예정이라 건드리지 않았습니다.
 *
 * 2026-08-17(세션 12) — 아직 오지 않은 날짜에 흐린 회색 점(NONE)이 찍히던 것을
 * 고쳤습니다(관리자 제보). 밤 홈 주간 스트립(WeeklyRecordStrip)·월간 캘린더
 * (RecordCalendar)와 동일하게, 미래 날짜는 점을 그리지 않고 같은 크기의 빈 자리만
 * 둬서 세로 정렬을 유지합니다 — "기록 안 함(NONE)"과 "아직 안 지난 날"을 구분하기
 * 위한 규칙입니다.
 *
 * 달 경계를 걸쳐 `days`에 데이터가 없는 과거 날짜는 기존대로 NONE(미기록)으로
 * 그립니다(관리자 결정 — 이번 수정 범위는 미래 날짜만).
 */
export function RecordWeekStrip({
  days,
  weekStart = 'SUNDAY',
  selectedDate,
  onSelectDate,
}: RecordWeekStripProps) {
  const dayMap = new Map(days.map((d) => [d.date, d]));
  const weekDates = getCurrentWeekDates(weekStart);
  const weekdayLabels = getWeekdayLabels(weekStart);

  return (
    <View style={styles.row}>
      {weekDates.map((date, index) => {
        const data = dayMap.get(date);
        const isToday = data?.today ?? false;
        const isFuture = isFutureDateString(date);
        const isSelected = selectedDate === date;
        const day = Number(date.slice(-2));
        const label = weekdayLabels[index];
        // 요일 라벨 색 구분은 index가 아니라 라벨 문자 기준입니다 — weekStart가
        // 바뀌면 일/토가 몇 번째 칸에 오는지 자체가 달라지기 때문입니다
        // (RecordCalendar.tsx와 동일한 방식, 2026-08-15).
        const isSunday = label === '일';
        const isSaturday = label === '토';

        // 미래 날짜는 선택 불가(F-RECORD-01 BR6). onSelectDate를 안 넘긴 호출부에서는
        // 전체가 읽기 전용으로 남습니다 — 기존 동작 그대로입니다.
        const selectable = onSelectDate !== undefined && !isFuture;
        // selectedDate를 안 넘긴 호출부(읽기 전용)에서는 예전처럼 오늘 칸이 강조됩니다.
        const highlighted = selectedDate !== undefined ? isSelected : isToday;

        return (
          <Pressable
            key={date}
            style={styles.cell}
            disabled={!selectable}
            onPress={() => onSelectDate?.(date)}
            accessibilityRole={selectable ? 'button' : undefined}
            accessibilityLabel={selectable ? `${day}일 기록 보기` : undefined}
            accessibilityState={selectable ? { selected: isSelected } : undefined}
          >
            <Text style={[styles.weekdayLabel, isSunday && styles.weekdayLabelSun, isSaturday && styles.weekdayLabelSat]}>
              {label}
            </Text>
            {/* 그라데이션 원 = **지금 보고 있는 날짜**입니다(관리자 결정, 2026-08-20).
                기본 선택이 오늘이라 첫 진입 화면은 예전과 똑같고, 지난 날짜를 고르면
                그 칸으로 원이 옮겨 갑니다. 테두리를 따로 두지 않는 이유는 강조 수단이
                둘이면 어느 쪽이 "지금 보는 날"인지 읽히지 않기 때문입니다.
                원을 잃은 오늘 칸은 숫자만 브랜드 색으로 남겨 위치를 알 수 있게 합니다. */}
            {highlighted ? (
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
                <Text
                  style={[
                    styles.dayText,
                    isToday && styles.dayTextTodayMuted,
                    isFuture && styles.dayTextFuture,
                  ]}
                >
                  {day}
                </Text>
              </View>
            )}
            <View style={styles.dots}>
              {isFuture ? (
                // 미래 날짜 — 점을 그리지 않고 자리만 비워 정렬을 맞춥니다
                // (밤 홈 WeeklyRecordStrip / 월간 RecordCalendar와 동일 규칙).
                <>
                  <View style={styles.dotPlaceholder} />
                  <View style={styles.dotPlaceholder} />
                </>
              ) : (
                <>
                  <RecordDot slot="morning" status={data ? data.morning : 'NONE'} />
                  <RecordDot slot="night" status={data ? data.night : 'NONE'} />
                </>
              )}
            </View>
          </Pressable>
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
  // 지난 날짜를 보는 동안 오늘 칸이 어디였는지 잃지 않게 하는 표식입니다.
  dayTextTodayMuted: {
    color: color.brand500,
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
  // RecordDot과 같은 8px — RecordDot.tsx의 SIZE 상수와 값만 맞춰둠(export되어 있지
  // 않아 직접 참조는 못 함). WeeklyRecordStrip.tsx의 dotPlaceholder와 동일합니다.
  dotPlaceholder: {
    width: 8,
    height: 8,
  },
});