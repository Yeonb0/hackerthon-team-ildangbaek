import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SegmentToggle } from '@/components/base/SegmentToggle';
import { RecordSlotCard } from '@/components/domain/RecordSlotCard';
import { RecordWeekStrip } from '@/components/domain/RecordWeekStrip';
import { IconCalendar } from '@/components/icons';
import { LoadingState } from '@/components/state/LoadingState';
import { ErrorState } from '@/components/state/ErrorState';
import { useRecordCalendar, useRecordDayDetail, useRecordToday } from '@/api/queries/record';
import {
  formatYearMonthString,
  getCurrentWeekDates,
  getTodayDateString,
  isFutureDateString,
} from '@/lib/date';
import { LOCAL_ROUTINE_ID } from '@/store/routineStore';
import { useWeekStartStore } from '@/store/weekStartStore';
import { DetailRoutes, DetailStackParamList, MainTabParamList, TimeSlot } from '@/app/routes';
import { color, space, weightFamily } from '@/theme';

// RecordHubScreen은 Tabs(하단 탭 Navigator) 안에 있지만, 슬롯을 탭하면 그 밖의(부모)
// Stack에 있는 S-11/S-15로 이동해야 합니다. 그래서 탭 레벨 navigation과 부모 스택
// navigation을 합친 타입이 필요합니다 — HomeScreen처럼 탭 내부만 오갈 때는 필요 없었습니다.
type RecordHubNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'RecordHub'>,
  NativeStackNavigationProp<DetailStackParamList>
>;

const TAB_LABEL: Record<TimeSlot, string> = { MORNING: '모닝', NIGHT: '나이트' };

/** '2026-08-15' → '8월 15일'. 화면 안에서만 쓰는 표기라 여기 둡니다(RoutineEditScreen과 동일 형식). */
function formatMonthDay(date: string): string {
  const [, month, day] = date.split('-');
  return `${Number(month)}월 ${Number(day)}일`;
}

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
  const weekStart = useWeekStartStore((s) => s.weekStart);

  const [activeTab, setActiveTab] = useState<TimeSlot | null>(route.params?.timeSlot ?? null);

  // 주간 스트립에서 고른 날짜. 기본은 오늘이고, 지난 날짜를 고르면 아래 슬롯 카드가
  // 그 날짜의 기록을 **읽기 전용**으로 보여줍니다(관리자 요청, 2026-08-20).
  const todayDate = getTodayDateString();
  const [selectedDate, setSelectedDate] = useState(todayDate);
  const isToday = selectedDate === todayDate;

  const today = useRecordToday();
  // 오늘일 땐 아예 조회하지 않습니다(enabled: date !== null) — 오늘 슬롯은 이미
  // useRecordToday가 갖고 있고, 두 출처가 갈리면 기록 직후 값이 어긋납니다.
  const dayDetail = useRecordDayDetail(isToday ? null : selectedDate);

  // activeTab이 null이면(=route.params도 없고 아직 사용자가 탭을 누르지도 않은 상태)
  // 서버가 계산한 defaultTab(현재 시각 기준)을 씁니다. 한 번이라도 사용자가 탭을 누르면
  // activeTab이 값을 갖게 되고, 그 뒤로는 today가 다시 fetch돼도 이 값이 우선합니다.
  // useEffect로 state에 동기화하지 않고 렌더링 중 파생값으로 계산합니다 — effect 안에서
  // setState를 하면 리렌더가 한 번 더 발생해서 불필요합니다.
  const currentTab: TimeSlot = activeTab ?? today.data?.defaultTab ?? 'MORNING';

  // 월 이동(goPrevMonth/goNextMonth)은 이번 체크포인트(1번: 홈 주간 스트립)에서 뺐습니다 —
  // 전체 월 이동 UI는 2번(월간 기록 신규 화면)에서 다시 들어갑니다. year/month state와
  // calendar 쿼리 자체는 이번 주 점 데이터 출처로 계속 필요해서 남겨뒀습니다.
  const now = new Date();
  const [calendarYear] = useState(now.getFullYear());
  const [calendarMonth] = useState(now.getMonth());
  const calendar = useRecordCalendar(formatYearMonthString(calendarYear, calendarMonth));

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

  // 오늘이면 useRecordToday, 지난 날짜면 useRecordDayDetail — 어느 쪽이든 구조가 같아서
  // 아래 카드 렌더링은 하나로 유지됩니다(그래서 백엔드에 P0-1을 같은 구조로 요청했습니다).
  const slots = isToday
    ? currentTab === 'MORNING'
      ? today.data.morning
      : today.data.night
    : dayDetail.data
      ? currentTab === 'MORNING'
        ? dayDetail.data.morning
        : dayDetail.data.night
      : null;

  // 지난 날짜 제품 기록의 "수정" 진입 조건 — 월간 기록 시트(RecordDayDetailSheet의
  // canEditSlot)와 **같은 규칙**입니다. PATCH /product-records/{recordId}가 productIds
  // 전체 교체라, 기존 구성을 복원할 productId가 하나라도 비면 저장 시 나머지가 지워집니다.
  // 실서버는 아직 productId를 안 내려주므로(요청서 P0-2) 당분간 항상 false입니다 —
  // 그동안 카드는 제품 목록만 보여주는 읽기 전용으로 남습니다.
  const dayProducts = dayDetail.data
    ? currentTab === 'MORNING'
      ? dayDetail.data.morningProducts
      : dayDetail.data.nightProducts
    : null;
  const editableItems =
    dayProducts?.items.flatMap((item) =>
      typeof item.productId === 'number' ? [{ productId: item.productId, name: item.name }] : [],
    ) ?? [];
  const canEditDayProducts =
    dayProducts !== null &&
    dayProducts.recordId !== null &&
    dayProducts.items.length > 0 &&
    editableItems.length === dayProducts.items.length;

  // 이번 주(설정된 시작 요일 기준 7일) 중 "완료"로 셀 날짜 수 — 헤더 "이번 주 N일 완료"에
  // 씀. 모닝·나이트가 둘 다 FULL인 날만 완료로 셉니다(오늘 이후 날짜는 아직 지나지
  // 않았으니 제외). 서버가 이 수치를 직접 내려주진 않아 클라이언트에서 계산했습니다 —
  // 정의(둘 다 FULL)가 맞는지는 실기기 확인 때 같이 봐주세요. weekStart는
  // weekStartStore에서 가져와 RecordWeekStrip과 항상 같은 7일을 보게 맞춰뒀습니다
  // (관리자님 요청 — 주 시작 요일 설정, 2026-08-15).
  const weekDates = getCurrentWeekDates(weekStart);
  const dayMap = new Map(calendar.data.days.map((d) => [d.date, d]));
  const weekCompletedCount = weekDates.filter((date) => {
    if (isFutureDateString(date)) return false;
    const data = dayMap.get(date);
    return data ? data.morning === 'FULL' && data.night === 'FULL' : false;
  }).length;

  return (
    <ScrollView
      contentContainerStyle={[styles.contentContainer, { paddingTop: insets.top }]}
      style={styles.screen}
    >
      {/* 상단(제목+주간 스트립) 영역은 흰 배경 — Figma 210:677 실측. */}
      <View style={styles.topSection}>
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>기록</Text>
            <Text style={styles.pageSubtitle}>
              이번 주 <Text style={styles.pageSubtitleAccent}>{weekCompletedCount}일</Text> 완료
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="월간 기록 보기"
            onPress={() => navigation.navigate(DetailRoutes.RecordCalendar)}
            style={styles.calendarButton}
          >
            <IconCalendar size={18} color={color.brand500} />
          </Pressable>
        </View>

        <RecordWeekStrip
          days={calendar.data.days}
          weekStart={weekStart}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />
      </View>

      {/* 칩 전환 + 슬롯 카드 영역은 라벤더 배경 — Figma 210:755/210:760 실측(#f5f2ff). */}
      <View style={styles.bottomSection}>
        {/* 지난 날짜를 보고 있다는 표시 + 오늘로 되돌아오는 길. 화면을 나갔다 돌아와도
            선택이 유지되므로(탭 전환 포함) 되돌리는 버튼이 반드시 보여야 합니다. */}
        {!isToday && (
          <View style={styles.dateBanner}>
            <Text style={styles.dateBannerText}>{formatMonthDay(selectedDate)} 기록</Text>
            <Pressable
              onPress={() => setSelectedDate(todayDate)}
              accessibilityRole="button"
              accessibilityLabel="오늘 기록으로 돌아가기"
              hitSlop={8}
            >
              <Text style={styles.dateBannerAction}>오늘로</Text>
            </Pressable>
          </View>
        )}

        <SegmentToggle
          options={[
            { value: 'MORNING', label: TAB_LABEL.MORNING, icon: 'sunny' },
            { value: 'NIGHT', label: TAB_LABEL.NIGHT, icon: 'moon' },
          ]}
          value={currentTab}
          onChange={setActiveTab}
        />

        <View style={styles.slots}>
          {!isToday && dayDetail.isLoading && <LoadingState variant="spinner" />}

          {!isToday && dayDetail.isError && (
            <ErrorState variant="network" onRetry={() => dayDetail.refetch()} />
          )}

          {slots && (
            <>
              <RecordSlotCard
                variant="product"
                timeSlot={currentTab === 'MORNING' ? 'morning' : 'night'}
                label="제품 기록"
                completed={slots.product.completed}
                summary={slots.product.summary}
                // 지난 날짜엔 그 날짜로 새 기록을 만들 수 없습니다 — POST /product-records는
                // 서버에서 오늘로 저장됩니다. 그래서 문구를 '기록하러 가기'로 두면 거짓말입니다.
                emptyText={isToday ? undefined : '기록 없음'}
                disabled={!isToday && !canEditDayProducts}
                onPress={() => {
                  if (isToday) {
                    navigation.navigate(DetailRoutes.ProductRecord, { timeSlot: currentTab });
                    return;
                  }
                  if (!canEditDayProducts || dayProducts?.recordId == null) return;
                  // 월간 기록 시트의 "수정"과 같은 목적지·같은 파라미터입니다
                  // (RecordCalendarScreen.handleEditProduct 참고).
                  navigation.navigate(DetailRoutes.RoutineEdit, {
                    routineId: LOCAL_ROUTINE_ID[currentTab],
                    recordEdit: {
                      recordId: dayProducts.recordId,
                      date: selectedDate,
                      timeSlot: currentTab,
                      items: editableItems,
                    },
                  });
                }}
              />
              <RecordSlotCard
                variant="skin"
                timeSlot={currentTab === 'MORNING' ? 'morning' : 'night'}
                label="피부 기록"
                completed={slots.skin.completed}
                summary={slots.skin.summary}
                emptyText={isToday ? undefined : '기록 없음'}
                // 지난 날짜는 이미 있는 결과를 보는 것만 됩니다. 촬영(S-15)은 오늘 슬롯에만
                // 저장되므로 진입 자체를 막습니다.
                disabled={!isToday && !slots.skin.completed}
                // 이미 오늘 이 시간대 피부 기록이 있으면(체크 표시) 촬영 화면(S-15)이 아니라
                // 그 결과를 보여주는 S-18로 보냅니다. 서버도 같은 슬롯 재촬영을 409
                // SKIN_ALREADY_RECORDED_IN_SLOT으로 막기 때문에, 프론트에서 애초에 촬영
                // 진입 자체를 막는 게 자연스럽습니다.
                onPress={() => {
                  if (!isToday) {
                    if (slots.skin.completed) {
                      navigation.navigate(DetailRoutes.SkinResult, {
                        date: selectedDate,
                        timeSlot: currentTab,
                      });
                    }
                    return;
                  }
                  if (slots.skin.completed) {
                    navigation.navigate(DetailRoutes.SkinResult, { timeSlot: currentTab });
                  } else {
                    navigation.navigate(DetailRoutes.PhotoGuide, { timeSlot: currentTab });
                  }
                }}
              />
            </>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: color.bg,
  },
  contentContainer: {
    flexGrow: 1,
  },
  topSection: {
    backgroundColor: color.bg,
    paddingBottom: space[3],
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: space[5],
    paddingTop: space[6],
    paddingBottom: space[4],
  },
  pageTitle: {
    ...weightFamily('bold'),
    fontSize: 20,
    lineHeight: 30,
    color: color.textInk,
  },
  pageSubtitle: {
    ...weightFamily('medium'),
    fontSize: 12,
    lineHeight: 18,
    color: color.textSub,
    marginTop: 2,
  },
  pageSubtitleAccent: {
    ...weightFamily('bold'),
    color: color.brand500,
  },
  calendarButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surfaceLavenderPale,
  },
  bottomSection: {
    flex: 1,
    backgroundColor: color.surfaceLavenderPale,
    paddingHorizontal: space[5],
    paddingTop: space[5],
    paddingBottom: space[8],
    gap: space[5],
  },
  slots: {
    gap: space[3],
  },
  dateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateBannerText: {
    ...weightFamily('bold'),
    fontSize: 15,
    lineHeight: 22.5,
    color: color.textInk,
  },
  dateBannerAction: {
    ...weightFamily('medium'),
    fontSize: 13,
    lineHeight: 19.5,
    color: color.brand500,
  },
});