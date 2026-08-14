// src/components/dev/DevResetButton.tsx
//
// 폰(Expo Go 등)에는 브라우저 콘솔이 없어서 localStorage를 못 지웁니다.
// 이 버튼은 __DEV__ 빌드에서만 항상 화면 위에 떠 있습니다. 누르면 메뉴가 펼쳐져서
// 로그인 / 온보딩 / 피부 기록 목업 상태를 각각 따로 초기화할 수 있습니다.
// ⚠️ 전에는 눌렀을 때 전부 한 번에(+로그아웃까지) 지웠는데, 피부 기록만 다시
// 테스트하고 싶을 때마다 로그인·온보딩을 매번 다시 거쳐야 해서 관리자님 요청으로
// 개별 초기화로 나눴습니다.
//
// - 로그인 초기화: authStore 초기화(accessToken/refreshToken 등 SecureStore까지 삭제).
//   RootNavigator가 감지해서 즉시 로그인 화면(S-00)으로 전환됩니다.
// - 온보딩 초기화: 온보딩 진행률 스토어 + 목업 완료 플래그 초기화. 로그인 상태는
//   그대로 유지되고, 다음에 홈에 진입하면 온보딩부터 다시 시작합니다.
// - 피부 기록 초기화: 오늘 새로 완료한 피부 기록의 목업 세션만 지웁니다. 기록 허브가
//   다시 "미완료"로 보이게 됩니다. 로그인/온보딩 상태는 그대로입니다.
// - 리포트 목업 전환: S-19가 GET /reports 목업으로부터 "기록 있음"(정상 데이터) 또는
//   "기록 부족"(REPORT_DATA_INSUFFICIENT 409) 중 어떤 응답을 받을지 즉시 바꿉니다.
//   예전엔 .env의 EXPO_PUBLIC_MOCK_REPORT_INSUFFICIENT + 앱 재시작으로 전환했는데,
//   매번 재시작해야 해서 여기서 바로 전환하도록 옮겼습니다(관리자님 요청). 전환할 때마다
//   해당 리포트 쿼리를 무효화하고, S-19의 "아직 리포트를 만들 수 없어요" 팝업을 다시 볼 수
//   있도록 1회 노출 상태(reportUiStore)도 같이 초기화합니다.
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { setMockOnboardingCompleted } from '@/api/mock/mockPersistence';
import { resetMockSession } from '@/api/mock/onboarding';
import { resetMockRecordSession, resetMockProductCompletion } from '@/api/mock/record';
import { resetMockProductSession, setMockScanScenario } from '@/api/mock/product';
import { setMockReportScenario } from '@/api/mock/report';
import { setMockCheckScenario } from '@/api/mock/check';
import { resetMockUserSession } from '@/api/mock/user';
import { useReportUiStore } from '@/store/reportUiStore';
import { color, radius, space } from '@/theme/tokens';
import { weightFamily } from '@/theme/typography';

export function DevResetButton() {
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const setTotalStepCount = useOnboardingStore((state) => state.setTotalStepCount);
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [resetting, setResetting] = useState(false);

  if (!__DEV__) return null;

  const runReset = async (action: () => void | Promise<void>) => {
    if (resetting) return;
    setResetting(true);
    try {
      await action();
    } finally {
      setResetting(false);
      setExpanded(false);
    }
  };

  const menuItems = [
    { label: '로그인 초기화', onPress: () => runReset(() => clearAuth()) },
    {
      label: '온보딩 초기화',
      onPress: () =>
        runReset(async () => {
          await setMockOnboardingCompleted(false);
          setTotalStepCount(null);
          resetMockSession();
        }),
    },
    {
      label: '피부 기록 초기화',
      onPress: () =>
        runReset(() => {
          resetMockRecordSession();
          // 목업 데이터 자체는 위에서 지워졌지만, 기록 허브가 들고 있는 react-query
          // 캐시는 그대로라 화면에 반영이 안 됐습니다 — 여기서도 무효화해야 합니다
          // (AnalyzingSkinScreen에서 분석 성공 후 하는 것과 같은 이유).
          queryClient.invalidateQueries({ queryKey: ['recordToday'] });
          queryClient.invalidateQueries({ queryKey: ['recordCalendar'] });
          queryClient.invalidateQueries({ queryKey: ['home'] });
        }),
    },
    {
      // Phase 7-A 추가 — savedProducts/routines/alreadyRecorded 세션을 초기값으로 되돌립니다.
      // S-11 루틴 바로 기록의 중복(PRODUCT_ALREADY_RECORDED_IN_SLOT) 케이스를 다시 보고 싶을 때 씁니다.
      // 기록 허브 체크 표시(mockProductCompletions)도 같이 지우고, recordToday·recordCalendar·
      // home 캐시를 무효화해야 기록 허브·밤 홈 캘린더에 즉시 반영됩니다(2026-08-10 버그 수정과 짝).
      label: '제품 기록 초기화',
      onPress: () =>
        runReset(() => {
          resetMockProductSession();
          resetMockProductCompletion();
          queryClient.invalidateQueries({ queryKey: ['productRecordHome'] });
          queryClient.invalidateQueries({ queryKey: ['productSearch'] });
          queryClient.invalidateQueries({ queryKey: ['recordToday'] });
          queryClient.invalidateQueries({ queryKey: ['recordCalendar'] });
          queryClient.invalidateQueries({ queryKey: ['home'] });
        }),
    },
    {
      label: '리포트 목업 → 기록 있음',
      onPress: () =>
        runReset(() => {
          setMockReportScenario('sufficient');
          useReportUiStore.getState().resetInsufficientPopupSeen();
          // queryKey가 ['report', period, metric]이라 ['report']만 넘기면 부분 일치로
          // 모든 기간·지표 조합이 함께 무효화됩니다.
          queryClient.invalidateQueries({ queryKey: ['report'] });
        }),
    },
    {
      label: '리포트 목업 → 기록 부족',
      onPress: () =>
        runReset(() => {
          setMockReportScenario('insufficient');
          useReportUiStore.getState().resetInsufficientPopupSeen();
          queryClient.invalidateQueries({ queryKey: ['report'] });
        }),
    },
    {
      // Phase 7-B 추가 — S-13 스캔(PRODUCT-04)이 실기기에서 정말 인식되는지는 사전에
      // 보장할 수 없는 "데모 최대 리스크" 구간이라(로드맵 명시), 실패 케이스를 일부러
      // 재현해서 재스캔/검색 전환 경로가 제대로 뜨는지 미리 확인할 수 있게 했습니다.
      label: '스캔 목업 → 성공(기본값)',
      onPress: () => runReset(() => setMockScanScenario('SUCCESS')),
    },
    {
      label: '스캔 목업 → 인식 실패',
      onPress: () => runReset(() => setMockScanScenario('NOT_DETECTED')),
    },
    {
      label: '스캔 목업 → 화질 부족',
      onPress: () => runReset(() => setMockScanScenario('LOW_QUALITY')),
    },
    {
      label: '스캔 목업 → 서비스 장애',
      onPress: () => runReset(() => setMockScanScenario('UNAVAILABLE')),
    },
    {
      // Phase 7-2 추가 — S-22의 두 가지 409(빈 상태) 케이스를 재현합니다. 빨간 오류 UI가
      // 아니라 안내 문구로 뜨는지 확인할 때 씁니다.
      label: '구매 전 확인 목업 → 성공(기본값)',
      onPress: () => runReset(() => setMockCheckScenario('SUCCESS')),
    },
    {
      label: '구매 전 확인 목업 → 프로필 부족',
      onPress: () => runReset(() => setMockCheckScenario('PROFILE_NOT_READY')),
    },
    {
      label: '구매 전 확인 목업 → 성분 데이터 부족',
      onPress: () => runReset(() => setMockCheckScenario('INGREDIENT_INSUFFICIENT')),
    },
    {
      // Phase 8 추가 — 위치(GPS/검색 선택)·알림 토글 mock 상태를 초기값(서울 강남구·
      // 알림 켜짐)으로 되돌립니다. 알림은 platformStorage에 저장되므로 앱 재시작으로는
      // 안 지워져서 이 버튼이 유일한 초기화 경로입니다.
      label: '위치 · 알림 초기화',
      onPress: () =>
        runReset(async () => {
          await resetMockUserSession();
          queryClient.invalidateQueries({ queryKey: ['myPage'] });
          queryClient.invalidateQueries({ queryKey: ['locationSearch'] });
          queryClient.invalidateQueries({ queryKey: ['home'] });
        }),
    },
  ];

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      {expanded ? (
        <View style={styles.menu}>
          {menuItems.map((item, index) => (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              onPress={item.onPress}
              disabled={resetting}
              style={[styles.menuItem, index > 0 && styles.menuItemDivider]}
            >
              <Text style={styles.menuItemLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="목업 초기화 메뉴 열기 (개발용)"
        onPress={() => setExpanded((v) => !v)}
        style={styles.button}
      >
        <Text style={styles.label}>{resetting ? '초기화 중…' : expanded ? '🧪 닫기' : '🧪 초기화'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: space[6],
    right: space[4],
    alignItems: 'flex-end',
    zIndex: 999,
    elevation: 999, // Android는 zIndex만으론 안 먹어서 elevation도 같이
  },
  button: {
    backgroundColor: color.ink900,
    paddingVertical: space[2],
    paddingHorizontal: space[3],
    borderRadius: radius.pill,
    opacity: 0.85,
  },
  label: {
    color: color.bg,
    fontSize: 12,
    ...weightFamily('semibold'),
  },
  menu: {
    marginBottom: space[2],
    backgroundColor: color.ink900,
    borderRadius: radius.md,
    overflow: 'hidden',
    opacity: 0.95,
    minWidth: 150,
  },
  menuItem: {
    paddingVertical: space[3],
    paddingHorizontal: space[4],
  },
  menuItemDivider: {
    borderTopWidth: 1,
    borderTopColor: color.ink600,
  },
  menuItemLabel: {
    color: color.bg,
    fontSize: 12,
    ...weightFamily('semibold'),
  },
});