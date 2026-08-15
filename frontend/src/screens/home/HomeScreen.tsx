import React, { useEffect } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DayHomeScreen } from '@/screens/home/DayHomeScreen';
import { NightHomeScreen } from '@/screens/home/NightHomeScreen';
import { useHome } from '@/api/queries/home';
import { useDayNightStore } from '@/store/dayNightStore';
import { LoadingState } from '@/components/state/LoadingState';
import { ErrorState } from '@/components/state/ErrorState';
import { SegmentToggle } from '@/components/base/SegmentToggle';
import { MainTabRoutes, MainTabParamList } from '@/app/routes';
import { space } from '@/theme/tokens';
import type { HomeType } from '@/types/home';

/**
 * S-07/08 홈 컨테이너.
 *
 * - dayNightStore.mode로 요청할 homeType을 정합니다. 'auto'면 파라미터 없이 요청해서
 *   서버(목업에서는 getFixedHomeType())가 현재 시각으로 판정하게 둡니다. 'day'/'night'면
 *   그 값을 그대로 강제합니다 — 명세서 HOME-01 "토글이 자동 판정을 덮어씀" 규칙과 동일합니다.
 * - 낮/밤 토글(F-HOME-02)은 여기서 렌더링합니다. 낮 화면이 뜨든 밤 화면이 뜨든 항상 같은
 *   위치(화면 상단 중앙, 절대 위치)에 떠서 "S-07·S-08이 공유하는 유일한 요소, 같은 위치"
 *   규칙(BR2)을 만족합니다.
 * - 자동 모드일 때만 앱이 포그라운드로 복귀하면 재조회합니다(로드맵 4-3 확정 결정). 수동
 *   모드면 포그라운드 복귀 시에도 재판정을 건너뜁니다 — 그래서 리스너 안에서 mode를 체크합니다.
 */
export function HomeScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const insets = useSafeAreaInsets();
  const mode = useDayNightStore((s) => s.mode);
  const setManual = useDayNightStore((s) => s.setManual);

  const requestedHomeType: HomeType | undefined =
    mode === 'auto' ? undefined : mode === 'day' ? 'DAY' : 'NIGHT';
  const { data, isLoading, isError, refetch } = useHome(requestedHomeType);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && mode === 'auto') {
        refetch();
      }
    });
    return () => subscription.remove();
  }, [mode, refetch]);

  if (isLoading) {
    return <LoadingState variant="spinner" />;
  }

  if (isError || !data) {
    return <ErrorState variant="network" onRetry={() => refetch()} />;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.toggleWrap, { top: insets.top + space[3] }]}>
        <SegmentToggle
          options={[
            { value: 'DAY', label: '낮' },
            { value: 'NIGHT', label: '밤' },
          ]}
          value={data.homeType}
          onChange={(value) => setManual(value === 'DAY' ? 'day' : 'night')}
        />
      </View>

      {data.homeType === 'DAY' ? (
        <DayHomeScreen
          data={data}
          onPressRecordCta={() =>
            navigation.navigate(MainTabRoutes.RecordHub, { timeSlot: 'MORNING' })
          }
        />
      ) : (
        <NightHomeScreen
          data={data}
          onPressRecordCta={() =>
            navigation.navigate(MainTabRoutes.RecordHub, { timeSlot: 'NIGHT' })
          }
          onPressReportCta={() => navigation.navigate(MainTabRoutes.Report)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toggleWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
});
