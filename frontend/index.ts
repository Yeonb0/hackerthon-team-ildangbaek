// Phase 11-B — react-native-reanimated는 반드시 엔트리 파일 최상단에서 import해야 합니다
// (내부 워클릿 런타임 초기화가 다른 모듈보다 먼저 실행돼야 함). Development Build 전환과
// 함께 추가 (관리자 결정, 2026-08-13).
import 'react-native-reanimated';

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
