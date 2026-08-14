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
import { DayNightToggle } from '@/components/domain/DayNightToggle';
import { MainTabRoutes, MainTabParamList } from '@/app/routes';
import { space } from '@/theme/tokens';
import type { HomeType } from '@/types/home';

/**
 * S-07/08 홈 컨테이너.
 *
 * - dayNightStore.mode로 요청할 homeType을 정합니다. 'auto'면 파라미터 없이 요청해서
 *   서버(목업에서는 getFixedHomeType())가 현재 시각으로 판정하게 둡니다. 'day'/'night'면
 *   그 값을 그대로 강제합니다 — 명세서 HOME-01 "토글이 자동 판정을 덮어씀" 규칙과 동일합니다.
 * - 낮/밤 토글(F-HOME-02)은 여기서 만들어서 자식 화면에 내려줍니다. Phase 12(Figma HOME-01/02
 *   구조 대조) 결과 낮 화면은 위치 텍스트와 같은 줄에 인라인으로 넣었고, 밤 화면은 아직 기존
 *   방식(화면 상단 절대 위치, 오른쪽 정렬)입니다 — "S-07·S-08이 공유하는 유일한 요소"
 *   규칙(BR2)은 두 화면 모두 헤더 최상단 행 오른쪽에 위치한다는 점에서 유지되지만, 정확히
 *   같은 좌표는 아닙니다. 절대 위치가 처음엔 가운데 정렬이었는데, 낮 화면과 위치가 안 맞아서
 *   오른쪽 정렬로 고쳤습니다(관리자님 확인, 2026-08-14). S-08 구조 대조를 마치면 밤 화면도
 *   인라인 방식으로 완전히 통일할 예정입니다.
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

  const toggleElement = (
    <DayNightToggle
      value={data.homeType}
      onChange={(value) => setManual(value === 'DAY' ? 'day' : 'night')}
    />
  );

  return (
    <View style={styles.container}>
      {data.homeType === 'DAY' ? (
        // Phase 12 — Figma HOME-01 기준으로 토글이 위치 텍스트와 같은 줄에 있어서, 낮 화면에서는
        // DayHomeScreen 헤더 행 안에서 인라인으로 그립니다 (관리자님 확인, 2026-08-13).
        <DayHomeScreen
          data={data}
          toggle={toggleElement}
          onPressRecordCta={() =>
            navigation.navigate(MainTabRoutes.RecordHub, { timeSlot: 'MORNING' })
          }
        />
      ) : (
        <>
          {/* 밤 화면은 아직 기존 방식(화면 상단 절대 위치, 오른쪽 정렬)을 유지합니다 — S-08 구조 대조
              때 HOME-02 기준으로 같이 정리할 예정입니다. */}
          <View style={[styles.toggleWrap, { top: insets.top + space[3] }]}>
            {toggleElement}
          </View>
          <NightHomeScreen
            data={data}
            onPressRecordCta={() =>
              navigation.navigate(MainTabRoutes.RecordHub, { timeSlot: 'NIGHT' })
            }
            onPressReportCta={() => navigation.navigate(MainTabRoutes.Report)}
          />
        </>
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
    alignItems: 'flex-end',
    paddingRight: space[5],
    zIndex: 10,
  },
});