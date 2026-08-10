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
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { setMockOnboardingCompleted } from '@/api/mock/mockPersistence';
import { resetMockSession } from '@/api/mock/onboarding';
import { resetMockRecordSession } from '@/api/mock/record';
import { color, radius, space } from '@/theme/tokens';

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
    fontWeight: '600',
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
    fontWeight: '600',
  },
});