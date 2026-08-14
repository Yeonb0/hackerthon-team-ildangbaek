import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoadingState } from './src/components/state/LoadingState';
import { RootNavigator } from './src/app/RootNavigator';

const queryClient = new QueryClient();

// 2026-08-15 — 글꼴 기능 A안 완료. 이 파일은 이제 index.ts가 직접 등록하지 않고,
// 부팅 게이트(src/app/Root.tsx)가 글꼴 선택값을 확정한 뒤 동적 import 합니다.
// 그래서 아래 화면 모듈들의 StyleSheet.create()가 올바른 fontFamily로 굳습니다.
//
// ⚠️ 키 이름은 src/theme/fontFamily.ts의 FONT_FAMILIES / DISPLAY_FONT_FAMILIES와
// 1:1로 일치해야 합니다. 한쪽만 바꾸면 안드로이드는 조용히 기본 글꼴로 폴백해서
// 원인 찾기가 어렵습니다.
const FONT_ASSETS = {
  'Pretendard-Regular': require('./assets/fonts/Pretendard-Regular.ttf'),
  'Pretendard-Medium': require('./assets/fonts/Pretendard-Medium.ttf'),
  'Pretendard-SemiBold': require('./assets/fonts/Pretendard-SemiBold.ttf'),
  'Pretendard-Bold': require('./assets/fonts/Pretendard-Bold.ttf'),
  'NanumSquareNeo-Regular': require('./assets/fonts/NanumSquareNeo-Regular.ttf'),
  'NanumSquareNeo-Medium': require('./assets/fonts/NanumSquareNeo-Medium.ttf'),
  'NanumSquareNeo-SemiBold': require('./assets/fonts/NanumSquareNeo-SemiBold.ttf'),
  'NanumSquareNeo-Bold': require('./assets/fonts/NanumSquareNeo-Bold.ttf'),
  // 배달의민족 주아체 — 홈(S-07) 기온 표시 전용 고정 글꼴. Regular 단일 weight라
  // 사용자 선택 글꼴(FontChoice)에는 넣지 않습니다.
  BMJUA: require('./assets/fonts/BMJUA_ttf.ttf'),
};

export default function App() {
  // 로드에 실패해도(폰트 파일 누락 등) 앱은 떠야 합니다 — 시스템 기본 글꼴로 폴백되고
  // 레이아웃만 조금 달라집니다. 이 처리가 없으면 스피너에서 영영 못 빠져나옵니다.
  const [fontsLoaded, fontError] = useFonts(FONT_ASSETS);
  const fontsSettled = fontsLoaded || fontError !== null;

  return (
    // Phase 11-B — RoutineEditScreen의 드래그 정렬(Gesture.Pan)이 안드로이드에서 안정적으로
    // 동작하려면 앱 최상단이 GestureHandlerRootView로 감싸져 있어야 합니다 (gesture-handler
    // 공식 권장 사항, 관리자 결정 2026-08-13 Development Build 전환과 함께 추가).
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          {fontsSettled ? <RootNavigator /> : <LoadingState variant="spinner" />}
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
