import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SegmentToggle } from '@/components/base/SegmentToggle';
import { Card } from '@/components/base/Card';
import { RecordSlotCard } from '@/components/domain/RecordSlotCard';
import { RecordCalendar } from '@/components/domain/RecordCalendar';
import { LoadingState } from '@/components/state/LoadingState';
import { ErrorState } from '@/components/state/ErrorState';
import { useRecordCalendar, useRecordToday } from '@/api/queries/record';
import { formatYearMonthString } from '@/lib/date';
import { DetailRoutes, DetailStackParamList, MainTabParamList, TimeSlot } from '@/app/routes';
import { color, space, typography } from '@/theme';

// RecordHubScreen은 Tabs(하단 탭 Navigator) 안에 있지만, 슬롯을 탭하면 그 밖의(부모)
// Stack에 있는 S-11/S-15로 이동해야 합니다. 그래서 탭 레벨 navigation과 부모 스택
// navigation을 합친 타입이 필요합니다 — HomeScreen처럼 탭 내부만 오갈 때는 필요 없었습니다.
type RecordHubNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'RecordHub'>,
  NativeStackNavigationProp<DetailStackParamList>
>;

const TAB_LABEL: Record<TimeSlot, string> = { MORNING: '모닝', NIGHT: '나이트' };

/**
 * S-09/10 기록 허브. 모닝/나이트는 별도 화면이 아니라 내부 탭 전환입니다 (F-RECORD-02 BR1).
 *
 * - 홈 CTA로 진입한 경우 route.params.timeSlot을 그대로 기본 탭으로 씁니다(BR2). 탭 아이콘으로
 *   직접 들어온 경우(params 없음)엔 GET /records/today의 defaultTab(현재 시각 기준)을 씁니다.
 * - 한 번 사용자가 직접 탭을 누르면 그 뒤로는 데이터가 다시 로드돼도 덮어쓰지 않습니다.
 */
export function RecordHubScreen() {
  const navigation = useNavigation<RecordHubNavigationProp>();
  const route = useRoute<RouteProp<MainTabParamList, 'RecordHub'>>();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<TimeSlot | null>(route.params?.timeSlot ?? null);

  const today = useRecordToday();

  // activeTab이 null이면(=route.params도 없고 아직 사용자가 탭을 누르지도 않은 상태)
  // 서버가 계산한 defaultTab(현재 시각 기준)을 씁니다. 한 번이라도 사용자가 탭을 누르면
  // activeTab이 값을 갖게 되고, 그 뒤로는 today가 다시 fetch돼도 이 값이 우선합니다.
  // useEffect로 state에 동기화하지 않고 렌더링 중 파생값으로 계산합니다 — effect 안에서
  // setState를 하면 리렌더가 한 번 더 발생해서 불필요합니다.
  const currentTab: TimeSlot = activeTab ?? today.data?.defaultTab ?? 'MORNING';

  const now = new Date();
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth());
  const calendar = useRecordCalendar(formatYearMonthString(calendarYear, calendarMonth));

  const goPrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarYear((y) => y - 1);
      setCalendarMonth(11);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarYear((y) => y + 1);
      setCalendarMonth(0);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  if (today.isLoading || calendar.isLoading) {
    return <LoadingState variant="spinner" />;
  }

  if (today.isError || calendar.isError || !today.data || !calendar.data) {
    return (
      <ErrorState
        variant="network"
        onRetry={() => {
          today.refetch();
          calendar.refetch();
        }}
      />
    );
  }

  const slots = currentTab === 'MORNING' ? today.data.morning : today.data.night;

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + space[5] }]}>
      <Card style={styles.calendarCard}>
        <RecordCalendar
          year={calendarYear}
          month={calendarMonth}
          days={calendar.data.days}
          onPrevMonth={goPrevMonth}
          onNextMonth={goNextMonth}
        />
        <Text style={styles.summary}>
          이번 달 제품 기록 {calendar.data.monthlySummary.productRecordCount}회 · 피부 기록{' '}
          {calendar.data.monthlySummary.skinRecordCount}회
        </Text>
      </Card>

      <SegmentToggle
        options={[
          { value: 'MORNING', label: TAB_LABEL.MORNING },
          { value: 'NIGHT', label: TAB_LABEL.NIGHT },
        ]}
        value={currentTab}
        onChange={setActiveTab}
      />

      <View style={styles.slots}>
        <RecordSlotCard
          label="제품 기록"
          completed={slots.product.completed}
          summary={slots.product.summary}
          onPress={() => navigation.navigate(DetailRoutes.ProductRecord, { timeSlot: currentTab })}
        />
        <RecordSlotCard
          label="피부 기록"
          completed={slots.skin.completed}
          summary={slots.skin.summary}
          // 이미 오늘 이 시간대 피부 기록이 있으면(체크 표시) 촬영 화면(S-15)이 아니라
          // 그 결과를 보여주는 S-18로 보냅니다. 서버도 같은 슬롯 재촬영을 409
          // SKIN_ALREADY_RECORDED_IN_SLOT으로 막기 때문에, 프론트에서 애초에 촬영
          // 진입 자체를 막는 게 자연스럽습니다.
          onPress={() =>
            slots.skin.completed
              ? navigation.navigate(DetailRoutes.SkinResult, { timeSlot: currentTab })
              : navigation.navigate(DetailRoutes.PhotoGuide, { timeSlot: currentTab })
          }
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: space[5],
    paddingBottom: space[8],
    gap: space[5],
    backgroundColor: color.bg,
  },
  slots: {
    gap: space[3],
  },
  calendarCard: {
    gap: space[3],
  },
  summary: {
    ...typography.caption,
    color: color.ink600,
    textAlign: 'center',
  },
});