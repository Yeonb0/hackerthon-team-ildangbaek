import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RootNavigator } from './src/app/RootNavigator';

const queryClient = new QueryClient();

export default function App() {
  return (
    // Phase 11-B — RoutineEditScreen의 드래그 정렬(Gesture.Pan)이 안드로이드에서 안정적으로
    // 동작하려면 앱 최상단이 GestureHandlerRootView로 감싸져 있어야 합니다 (gesture-handler
    // 공식 권장 사항, 관리자 결정 2026-08-13 Development Build 전환과 함께 추가).
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}