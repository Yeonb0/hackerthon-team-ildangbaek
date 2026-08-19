// src/screens/record/RecordCalendarScreen.tsx
// F-RECORD-02 월간 기록 (Frame 10, 210:835/210:1241)
//
// 2번 체크포인트(관리자 승인 순서 1→2→3 중 2번). 기록 홈(RecordHubScreen)의 캘린더
// 아이콘 버튼에서 진입하는 별도 화면입니다 — 1번 체크포인트에서 홈을 주간 스트립으로
// 바꾸면서 여기로 옮겨둔 전체 월 그리드(RecordCalendar)를 그대로 재사용합니다.
//
// Figma 실측: 뒤로가기 헤더("월간 기록") + 월 이동 캘린더 + 하단 범례(모닝완료/
// 나이트완료/부분완료/미기록) + 날짜 탭 시 바텀시트(그 날 기록 요약). 범례 4개는
// RecordDot의 상태·슬롯 조합을 그대로 재사용해서 그렸습니다(모닝완료=핑크 채움,
// 나이트완료=보라 채움, 부분완료=외곽선, 미기록=흐린 회색).
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '@/components/base/Card';
import { ProgressBar } from '@/components/base/ProgressBar';
import { RecordCalendar } from '@/components/domain/RecordCalendar';
import { RecordDayDetailSheet } from '@/components/domain/RecordDayDetailSheet';
import { RecordDot } from '@/components/domain/RecordDot';
import { IconBack } from '@/components/icons';
import { LoadingState } from '@/components/state/LoadingState';
import { ErrorState } from '@/components/state/ErrorState';
import { useRecordCalendar, useRecordDayDetail } from '@/api/queries/record';
import { formatYearMonthString, isFutureDateString } from '@/lib/date';
import { useWeekStartStore } from '@/store/weekStartStore';
import { DetailRoutes, DetailStackParamList } from '@/app/routes';
import { color, space, weightFamily } from '@/theme';

type NavProp = NativeStackNavigationProp<DetailStackParamList>;

const LEGEND_ITEMS = [
  { key: 'morning', label: '모닝 완료' },
  { key: 'night', label: '나이트 완료' },
  { key: 'partial', label: '부분완료' },
  { key: 'none', label: '미기록' },
] as const;

export function RecordCalendarScreen() {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const weekStart = useWeekStartStore((s) => s.weekStart);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const calendar = useRecordCalendar(formatYearMonthString(year, month));

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const dayDetail = useRecordDayDetail(selectedDate);

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

  /**
   * 바텀시트 "자세히 보기" → 그 날짜의 피부 결과(S-18).
   *
   * 시트를 **먼저 닫습니다.** 안 닫으면 뒤로 돌아왔을 때 시트가 열린 채로 남아 있어,
   * 사용자가 닫기를 두 번 눌러야 캘린더가 보입니다. selectedDate를 비우면 시트의
   * visible이 false가 되면서 자연스럽게 정리됩니다.
   *
   * S-18은 date가 있으면 REPORT-03으로 그 날짜를 읽고 하단 CTA도 "닫기"로 바뀝니다.
   * timeSlot은 넘기지 않습니다 — 시트가 종합 점수 하나만 보여주는 구조라 슬롯을
   * 고르는 UI가 없고, 서버가 모닝 → 나이트 순으로 주므로 첫 원소(모닝 우선)를 씁니다.
   */
  const handleViewSkinDetail = () => {
    const date = selectedDate;
    if (!date) return;
    setSelectedDate(null);
    navigation.navigate(DetailRoutes.SkinResult, { date });
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.nav}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="뒤로가기"
          hitSlop={8}
          style={styles.navBackButton}
        >
          <IconBack size={20} color={color.textInk} />
        </Pressable>
        <Text style={styles.navTitle}>월간 기록</Text>
      </View>

      {calendar.isLoading && <LoadingState variant="spinner" style={styles.centerFill} />}

      {calendar.isError && (
        <ErrorState variant="network" onRetry={() => calendar.refetch()} style={styles.centerFill} />
      )}

      {calendar.data && (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          // 관리자 버그 리포트(2026-08-15) — 이 화면이 View라 화면보다 콘텐츠(범례+
          // 이 달 기록 현황 카드)가 길어지면 아래쪽이 스크롤 안 되고 그냥 잘려서
          // "아래 부분이 비어있음"으로 보였습니다. ScrollView로 교체.
        >
          {/* 관리자 요청(2026-08-15) — 캘린더는 카드(흰 배경+그림자) 없이 화면 배경에
              바로 그립니다. */}
          <RecordCalendar
            year={year}
            month={month}
            days={calendar.data.days}
            onPrevMonth={goPrevMonth}
            onNextMonth={goNextMonth}
            onPressDay={setSelectedDate}
            weekStart={weekStart}
          />

          <View style={styles.legendRow}>
            {LEGEND_ITEMS.map((item) => (
              <View key={item.key} style={styles.legendItem}>
                {item.key === 'morning' && <RecordDot slot="morning" status="FULL" />}
                {item.key === 'night' && <RecordDot slot="night" status="FULL" />}
                {item.key === 'partial' && <RecordDot slot="night" status="PARTIAL" />}
                {item.key === 'none' && <RecordDot slot="night" status="NONE" />}
                <Text style={styles.legendLabel}>{item.label}</Text>
              </View>
            ))}
          </View>

          {/* 프로세스 바 — 관리자 요청(2026-08-15). "기록한 날짜"는 그 슬롯이 NONE이
              아닌 날(FULL+PARTIAL 합산)로 정의했습니다 — "완료"(FULL만)보다 넓은
              개념이라 판단했습니다, 다른 정의가 맞으면 알려주세요. 분모는 표시 중인
              달에서 오늘까지 지난 날짜 수(미래 날짜 제외)입니다. */}
          <Card style={styles.progressCard}>
            <Text style={styles.progressTitle}>이 달 기록 현황</Text>
            {(() => {
              const elapsedDays = calendar.data.days.filter((d) => !isFutureDateString(d.date));
              const totalDays = elapsedDays.length;
              const morningRecorded = elapsedDays.filter((d) => d.morning !== 'NONE').length;
              const nightRecorded = elapsedDays.filter((d) => d.night !== 'NONE').length;

              return (
                <>
                  <View style={styles.progressRow}>
                    <Text style={styles.progressLabel}>모닝</Text>
                    <ProgressBar
                      progress={totalDays ? morningRecorded / totalDays : 0}
                      current={morningRecorded}
                      total={totalDays}
                      fillColor={color.calendarMorningDot}
                      style={styles.progressBar}
                    />
                  </View>
                  <View style={styles.progressRow}>
                    <Text style={styles.progressLabel}>나이트</Text>
                    <ProgressBar
                      progress={totalDays ? nightRecorded / totalDays : 0}
                      current={nightRecorded}
                      total={totalDays}
                      style={styles.progressBar}
                    />
                  </View>
                </>
              );
            })()}
          </Card>
        </ScrollView>
      )}

      <RecordDayDetailSheet
        key={selectedDate ?? 'none'}
        visible={selectedDate !== null}
        detail={dayDetail.data ?? null}
        // 2026-08-19(세션 20) — 실 API(`GET /records/daily`) 연결에 따라 조회 상태를
        // 함께 넘깁니다. 목업일 땐 즉시 반환이라 필요 없었지만, 실서버에선 응답 전까지
        // detail이 null이라 시트가 아예 안 뜨는 것처럼 보입니다.
        date={selectedDate}
        isLoading={dayDetail.isLoading}
        isError={dayDetail.isError}
        onRetry={() => dayDetail.refetch()}
        dayStatus={
          selectedDate
            ? calendar.data?.days.find((d) => d.date === selectedDate)
            : undefined
        }
        onRequestClose={() => setSelectedDate(null)}
        onViewSkinDetail={handleViewSkinDetail}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.bg,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[3],
    paddingVertical: space[3],
  },
  navBackButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    ...weightFamily('bold'),
    fontSize: 17,
    color: color.textInk,
  },
  centerFill: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: space[5],
    gap: space[4],
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: space[2],
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendLabel: {
    ...weightFamily('medium'),
    fontSize: 10,
    color: color.textSub,
  },
  progressCard: {
    gap: space[3],
  },
  progressTitle: {
    ...weightFamily('bold'),
    fontSize: 14,
    color: color.textInk,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
  progressLabel: {
    ...weightFamily('semibold'),
    fontSize: 12,
    color: color.textSub,
    width: 40,
  },
  progressBar: {
    flex: 1,
  },
});