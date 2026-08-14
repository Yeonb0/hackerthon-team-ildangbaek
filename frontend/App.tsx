import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoadingState } from './src/components/state/LoadingState';
import { RootNavigator } from './src/app/RootNavigator';

const queryClient = new QueryClient();

// Phase 12(2026-08-13) — Pretendard / 나눔스퀘어네오 폰트 파일 로딩.
//
// ⚠️ 2026-08-13 되돌림: 처음엔 "저장된 글꼴 선택값을 읽어서 RootNavigator를 지연
// require()하면 모든 화면에 실시간으로 반영되지 않을까" 시도했는데, 그 지연 require()
// 자체가 부팅 크래시("undefined is not a function")를 냈습니다. 이 프로젝트의 모든 화면이
// 파일 로드 시점에 StyleSheet.create()를 한 번만 실행하는 구조라, 화면 모듈이 이미
// 평가된 뒤에 fontFamily 값을 바꿔도 반영이 안 되는 근본 제약은 여전합니다 —
// 이걸 제대로 풀려면 (a) 동기 읽기가 되는 저장소(react-native-mmkv 등, 네이티브 모듈이라
// 재빌드 필요)를 새로 붙이거나 (b) 전체 화면 스타일을 훅 기반으로 다시 짜야 합니다.
// 둘 다 이번 Phase 12 곁가지로 하기엔 범위가 커서, 지금은 폰트 파일 로딩 + 마이페이지
// 설정 저장까지만 하고 실제 화면 반영은 보류합니다. typography.ts 참고.
const FONT_ASSETS = {
  'Pretendard-Regular': require('./assets/fonts/Pretendard-Regular.ttf'),
  'Pretendard-Medium': require('./assets/fonts/Pretendard-Medium.ttf'),
  'Pretendard-SemiBold': require('./assets/fonts/Pretendard-SemiBold.ttf'),
  'Pretendard-Bold': require('./assets/fonts/Pretendard-Bold.ttf'),
  'NanumSquareNeo-Regular': require('./assets/fonts/NanumSquareNeo-Regular.ttf'),
  'NanumSquareNeo-Medium': require('./assets/fonts/NanumSquareNeo-Medium.ttf'),
  'NanumSquareNeo-SemiBold': require('./assets/fonts/NanumSquareNeo-SemiBold.ttf'),
  'NanumSquareNeo-Bold': require('./assets/fonts/NanumSquareNeo-Bold.ttf'),
};

export default function App() {
  const [fontsLoaded] = useFonts(FONT_ASSETS);

  return (
    // Phase 11-B — RoutineEditScreen의 드래그 정렬(Gesture.Pan)이 안드로이드에서 안정적으로
    // 동작하려면 앱 최상단이 GestureHandlerRootView로 감싸져 있어야 합니다 (gesture-handler
    // 공식 권장 사항, 관리자 결정 2026-08-13 Development Build 전환과 함께 추가).
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          {fontsLoaded ? <RootNavigator /> : <LoadingState variant="spinner" />}
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}