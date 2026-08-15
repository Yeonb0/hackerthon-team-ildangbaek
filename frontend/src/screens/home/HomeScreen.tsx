import React, { useEffect } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { DayHomeScreen } from '@/screens/home/DayHomeScreen';
import { NightHomeScreen } from '@/screens/home/NightHomeScreen';
import { useHome } from '@/api/queries/home';
import { useMyPage } from '@/api/queries/user';
import { useDayNightStore } from '@/store/dayNightStore';
import { LoadingState } from '@/components/state/LoadingState';
import { ErrorState } from '@/components/state/ErrorState';
import { DayNightToggle } from '@/components/domain/DayNightToggle';
import { MainTabRoutes, MainTabParamList } from '@/app/routes';
import type { HomeType } from '@/types/home';

/**
 * S-07/08 홈 컨테이너.
 *
 * - dayNightStore.mode로 요청할 homeType을 정합니다. 'auto'면 파라미터 없이 요청해서
 *   서버(목업에서는 getFixedHomeType())가 현재 시각으로 판정하게 둡니다. 'day'/'night'면
 *   그 값을 그대로 강제합니다 — 명세서 HOME-01 "토글이 자동 판정을 덮어씀" 규칙과 동일합니다.
 * - 낮/밤 토글(F-HOME-02)은 여기서 만들어서 자식 화면에 내려줍니다. Phase 12(Figma
 *   HOME-01/02 구조 대조) 결과 낮·밤 모두 위치 텍스트와 같은 줄에 인라인으로 넣는 방식으로
 *   통일했습니다 — "S-07·S-08이 공유하는 유일한 요소"(BR2)가 두 화면에서 정확히 같은
 *   자리에 오게 됩니다. 밤 화면이 쓰던 절대 위치 래퍼는 NightHomeScreen이 headerRow에서
 *   직접 그리게 되면서 제거했습니다(2026-08-15).
 * - 위치 텍스트: HomeResponse.environment가 밤엔 null이라 밤 화면에는 위치 정보가 없습니다.
 *   그래서 마이페이지 API(USER-01)의 location을 여기서 조회해 prop으로 내려줍니다.
 *   낮 화면은 environment 안에 위치가 들어 있어 DayHomeScreen이 자체적으로 씁니다.
 *   ⚠️ 이 조회가 실패하거나 로딩 중이어도 홈은 정상 렌더돼야 합니다(F-HOME-03 부분 실패
 *   규칙과 같은 취지) — 그래서 로딩/에러를 분기하지 않고 null로 넘깁니다.
 * - 자동 모드일 때만 앱이 포그라운드로 복귀하면 재조회합니다(로드맵 4-3 확정 결정). 수동
 *   모드면 포그라운드 복귀 시에도 재판정을 건너뜁니다 — 그래서 리스너 안에서 mode를 체크합니다.
 */
export function HomeScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const mode = useDayNightStore((s) => s.mode);
  const setManual = useDayNightStore((s) => s.setManual);

  const requestedHomeType: HomeType | undefined =
    mode === 'auto' ? undefined : mode === 'day' ? 'DAY' : 'NIGHT';
  const { data, isLoading, isError, refetch } = useHome(requestedHomeType);
  const { data: myPage } = useMyPage();

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
        <NightHomeScreen
          data={data}
          toggle={toggleElement}
          location={myPage?.location ?? null}
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
});