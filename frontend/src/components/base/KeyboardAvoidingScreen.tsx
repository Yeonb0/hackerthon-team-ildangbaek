// src/components/base/KeyboardAvoidingScreen.tsx
//
// 2026-08-19(세션 19, 관리자님 5번 항목 "입력 시 화면 올리기") — 입력창을 누르면
// 키보드가 버튼과 입력창을 덮어버리던 문제.
//
// ─────────────────────────────────────────────────────────────────────────────
// 왜 화면마다 따로 안 하고 공용 컴포넌트로 만들었나
//
// 키보드 대응은 **플랫폼별로 정답이 다르고**, 화면마다 손으로 넣으면 하나씩 빠집니다.
// 실제로 이 프로젝트도 온보딩 2개(BasicInfo/Hormone)에만 들어가 있고 나머지 화면은
// 전부 빠져 있었습니다. 한 군데로 모아두면 나중에 방식을 바꿀 때도 여기만 고칩니다.
//
// ─────────────────────────────────────────────────────────────────────────────
// 왜 새 라이브러리를 안 썼나
//
// `react-native-keyboard-controller`가 더 매끄럽지만 **네이티브 모듈이라 EAS 빌드를
// 다시 돌려야 합니다**(30~50분). 해커톤 일정에서 그 비용이 커서, 우선 RN 기본
// `KeyboardAvoidingView`로 처리합니다. 만약 안드로이드에서 여전히 가려지면 그때
// 도입을 검토하면 되고, 교체 지점은 이 파일 하나입니다.
//
// ⚠️ Expo SDK 57(RN 0.86) 안드로이드는 **edge-to-edge가 강제**라 예전처럼
// `adjustResize`가 창을 줄여주지 않습니다. 그래서 안드로이드에서도 `padding`을 씁니다
// (RN 0.77+ KeyboardAvoidingView가 IME 인셋을 직접 읽습니다). 혹시 두 번 적용돼
// 여백이 남더라도 내용은 ScrollView 안이라 스크롤로 닿을 수 있습니다 — 아예 가려져
// 못 누르는 것보다 훨씬 낫습니다.
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from 'react-native';

type KeyboardAvoidingScreenProps = {
  children: React.ReactNode;
  /** 바깥 컨테이너 스타일. 보통 배경색만 넘깁니다. */
  style?: StyleProp<ViewStyle>;
  /**
   * 스크롤 내용 스타일. **`flex: 1` 대신 `flexGrow: 1`을 쓰세요** — ScrollView의
   * contentContainer에 `flex: 1`을 주면 내용이 화면 높이에 고정돼 스크롤이 죽습니다.
   * 세로 가운데 정렬이 필요하면 `flexGrow: 1` + `justifyContent: 'center'` 조합입니다.
   */
  contentContainerStyle?: StyleProp<ViewStyle>;
  /**
   * false면 ScrollView를 만들지 않고 자식을 그대로 감쌉니다.
   * 이미 화면이 자기 ScrollView를 갖고 있을 때 씁니다(ScrollView 중첩 금지).
   */
  scrollable?: boolean;
  /**
   * 화면 위에 네이티브 헤더가 있을 때만 그 높이를 넘깁니다. 이 프로젝트 화면들은
   * 대부분 헤더를 직접 그리므로(headerShown: false) 기본값 0이 맞습니다.
   */
  keyboardVerticalOffset?: number;
};

export function KeyboardAvoidingScreen({
  children,
  style,
  contentContainerStyle,
  scrollable = true,
  keyboardVerticalOffset = 0,
}: KeyboardAvoidingScreenProps) {
  return (
    <KeyboardAvoidingView
      style={[styles.flex, style]}
      behavior="padding"
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      {scrollable ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={contentContainerStyle}
          // 키보드가 떠 있을 때 버튼을 누르면 첫 탭이 "키보드 닫기"로 먹히던 문제를
          // 막습니다. 이게 없으면 사용자는 버튼을 두 번 눌러야 합니다.
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
