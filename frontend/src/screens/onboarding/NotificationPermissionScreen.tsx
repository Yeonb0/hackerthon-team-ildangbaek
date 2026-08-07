import { View, Text, Button, StyleSheet } from 'react-native';
import { useAuthStore } from '@/store/authStore';

// ⚠️ 임시 — Phase 3에서 실제 알림 권한 요청 로직으로 교체
export function NotificationPermissionScreen() {
  const setOnboardingCompleted = useAuthStore((s) => s.setOnboardingCompleted);
  return (
    <View style={styles.container}>
      <Text style={styles.text}>S-06 알림 허용</Text>
      <Button title="[개발용] 온보딩 완료 → 메인으로" onPress={() => setOnboardingCompleted(true)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  text: { fontSize: 18, fontWeight: '600' },
});