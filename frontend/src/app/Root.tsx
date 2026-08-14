// src/app/Root.tsx
//
// 2026-08-15 — 글꼴 기능 A안의 핵심. 저장된 글꼴 선택값을 먼저 확정한 뒤에야
// App(그리고 그 아래 모든 화면 모듈)을 평가하기 위한 "부팅 게이트"입니다.
//
// 왜 index.ts에서 await 하지 않는가:
// registerRootComponent(=AppRegistry.registerComponent)는 반드시 번들 실행과 같은
// 흐름에서 동기로 호출돼야 합니다. 저장소를 await 한 뒤에 등록하면 네이티브
// runApplication이 먼저 돌아 "Application main has not been registered"로 부팅이
// 깨집니다. 그래서 Root는 즉시 등록하고, 비동기 대기는 Root '안에서' 겁니다.
//
// ⚠️ 이 파일에서 static import 하는 모듈은 글꼴 확정 전에 평가됩니다.
// 그래서 @/theme 배럴, 화면, 네비게이터, LoadingState 같은 공용 컴포넌트를 여기서
// import하면 안 됩니다 (색상 토큰조차 배럴을 타면 typography가 딸려옵니다).
// 아래 스플래시가 색상값을 리터럴로 쓰는 이유가 이것입니다.
import React, { Suspense, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { bootstrapFontChoice } from '@/theme/bootstrapFont';

// 동적 import라 이 시점이 아니라 <App /> 이 처음 렌더될 때 평가됩니다.
const App = React.lazy(() => import('../../App'));

function BootSplash() {
  return (
    <View style={styles.splash}>
      <ActivityIndicator size="large" color="#9B8CF5" />
    </View>
  );
}

export function Root() {
  const [fontReady, setFontReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    bootstrapFontChoice()
  .then((c) => { if (__DEV__) console.log('[게이트 확정]', c); })
  .finally(() => { if (!cancelled) setFontReady(true); });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!fontReady) {
    return <BootSplash />;
  }

  return (
    <Suspense fallback={<BootSplash />}>
      <App />
    </Suspense>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    // @/theme를 import할 수 없는 자리라 리터럴입니다 (tokens.color.bg와 동기화 필요).
    backgroundColor: '#FFFFFF',
  },
});
