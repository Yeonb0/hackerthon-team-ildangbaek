// Phase 11-B — react-native-reanimated는 반드시 엔트리 파일 최상단에서 import해야 합니다
// (내부 워클릿 런타임 초기화가 다른 모듈보다 먼저 실행돼야 함). Development Build 전환과
// 함께 추가 (관리자 결정, 2026-08-13).
import 'react-native-reanimated';

import { registerRootComponent } from 'expo';

// 2026-08-15 — 글꼴 기능 A안. App을 직접 등록하지 않고 부팅 게이트(Root)를 등록합니다.
// Root가 저장된 글꼴 선택값을 확정한 뒤에 App을 동적 import 하므로, 화면들의
// StyleSheet.create()가 올바른 fontFamily로 굳습니다. 자세한 이유는 Root.tsx 주석 참고.
//
// ⚠️ 여기서 App이나 화면을 static import로 되돌리면 글꼴 설정이 다시 무력화됩니다.
import { Root } from './src/app/Root';

// registerRootComponent calls AppRegistry.registerComponent('main', () => Root);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(Root);
