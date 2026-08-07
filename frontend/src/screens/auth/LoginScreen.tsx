import { View, Text, Button, StyleSheet } from 'react-native';
import { useAuthStore } from '@/store/authStore';

// ⚠️ 임시 — 실제 로그인은 Phase 3에서 구현됩니다.
// 아래 버튼은 authStore 상태를 직접 바꿔 Root 네비게이터 분기를 테스트하는 용도이며,
// Phase 3에서 실제 로그인 로직이 들어가면 지워야 합니다.
export function LoginScreen() {
  const setTokens = useAuthStore((s) => s.setTokens);
  const setOnboardingCompleted = useAuthStore((s) => s.setOnboardingCompleted);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>S-00 로그인</Text>
      <Button
        title="[개발용] 온보딩으로 이동"
        onPress={() => setTokens('dev-token', 'dev-refresh')}
      />
      <Button
        title="[개발용] 메인으로 바로 이동"
        onPress={() => {
          setTokens('dev-token', 'dev-refresh');
          setOnboardingCompleted(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  text: { fontSize: 18, fontWeight: '600' },
});