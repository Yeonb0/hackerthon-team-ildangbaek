// src/components/base/AppTextInput.tsx
//
// TextInput의 placeholder가 앱 글꼴을 따르게 만드는 공용 래퍼입니다.
//
// ── 왜 필요한가 ────────────────────────────────────────────────────────────
// 안드로이드에서는 TextInput에 `fontFamily`를 줘도 **placeholder(안드로이드의 hint)만**
// 기기 기본 글꼴로 그려집니다. 입력한 글씨는 정상인데 placeholder만 다른 글꼴로 남는
// 증상입니다(관리자 제보, 2026-08-17). React Native 쪽 공개 이슈로, 특정 버전 문제가
// 아니라 전 버전이 영향을 받는다고 보고돼 있습니다(facebook/react-native#50137,
// #45853). 우리 코드의 스타일 지정은 이미 맞게 돼 있어서 화면 쪽에서 고칠 수 없습니다.
//
// ── 왜 이 방식인가 ────────────────────────────────────────────────────────
// 이슈에 올라온 우회법은 두 가지입니다.
//   (1) ref가 붙는 시점에 setNativeProps로 스타일을 다시 적용
//       → New Architecture(Fabric)에서 setNativeProps는 지원되지 않습니다. 이 앱은
//         Expo SDK 57 + 뉴아키텍처라 쓸 수 없습니다.
//   (2) autoCapitalize="none"을 주면 증상이 사라진다는 보고
//       → 재현 조건이 불명확하고, 비밀번호 입력(secureTextEntry)에서는 듣지 않는다는
//         후속 보고가 있습니다.
// 그래서 네이티브 hint를 아예 쓰지 않고, **값이 비었을 때 우리가 <Text>로 직접
// 그립니다.** 우리 Text는 당연히 앱 글꼴을 따르므로 플랫폼 동작에 기대지 않습니다.
//
// iOS는 네이티브 placeholder가 정상 동작하므로 건드리지 않습니다 — 문제가 있는
// 플랫폼에서만 대체 경로를 타게 해서 영향 범위를 좁혔습니다.
import React, { forwardRef } from 'react';
import {
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

type AppTextInputProps = Omit<TextInputProps, 'style'> & {
  style?: StyleProp<TextStyle>;
};

/**
 * 래퍼 View가 부모 레이아웃에서 원래 TextInput과 똑같이 자리잡도록, 크기·배치에
 * 관여하는 속성만 골라 옮깁니다. 테두리·패딩·글꼴 등 나머지는 TextInput에 그대로
 * 남겨둬야 겉모습이 바뀌지 않습니다.
 */
function extractLayout(flat: TextStyle): ViewStyle {
  const layout: ViewStyle = {};
  if (flat.flex !== undefined) layout.flex = flat.flex;
  if (flat.flexGrow !== undefined) layout.flexGrow = flat.flexGrow;
  if (flat.flexShrink !== undefined) layout.flexShrink = flat.flexShrink;
  if (flat.flexBasis !== undefined) layout.flexBasis = flat.flexBasis;
  if (flat.alignSelf !== undefined) layout.alignSelf = flat.alignSelf;
  if (flat.width !== undefined) layout.width = flat.width;
  if (flat.height !== undefined) layout.height = flat.height;
  return layout;
}

export const AppTextInput = forwardRef<TextInput, AppTextInputProps>(function AppTextInput(
  { style, placeholder, placeholderTextColor, value, multiline, ...rest },
  ref
) {
  const useOverlay = Platform.OS === 'android' && !!placeholder;

  if (!useOverlay) {
    return (
      <TextInput
        ref={ref}
        style={style}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor}
        value={value}
        multiline={multiline}
        {...rest}
      />
    );
  }

  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  const isEmpty = !value;

  // 테두리 안쪽에 맞추려면 패딩에 테두리 두께를 더해야 합니다 — 오버레이는 테두리를
  // 포함한 영역 전체를 덮기 때문입니다.
  const border = flat.borderWidth ?? 0;
  const padLeft = flat.paddingLeft ?? flat.paddingHorizontal ?? flat.padding ?? 0;
  const padRight = flat.paddingRight ?? flat.paddingHorizontal ?? flat.padding ?? 0;
  const padTop = flat.paddingTop ?? flat.paddingVertical ?? flat.padding ?? 0;

  return (
    <View style={[styles.wrapper, extractLayout(flat)]}>
      <TextInput
        ref={ref}
        style={[style, styles.fill]}
        // 네이티브 hint는 쓰지 않습니다 — 아래 Text가 대신 그립니다.
        placeholder={undefined}
        value={value}
        multiline={multiline}
        {...rest}
      />
      {isEmpty ? (
        <View
          // 탭이 오버레이에 막히면 입력창을 못 누릅니다. 반드시 통과시켜야 합니다.
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              paddingLeft: Number(padLeft) + Number(border),
              paddingRight: Number(padRight) + Number(border),
              // 여러 줄 입력은 위에서부터, 한 줄 입력은 세로 가운데에 맞춥니다.
              paddingTop: multiline ? Number(padTop) + Number(border) : 0,
              justifyContent: multiline ? 'flex-start' : 'center',
            },
          ]}
        >
          <Text
            numberOfLines={multiline ? undefined : 1}
            style={{
              fontFamily: flat.fontFamily,
              fontSize: flat.fontSize,
              letterSpacing: flat.letterSpacing,
              textAlign: flat.textAlign,
              color: (placeholderTextColor as string | undefined) ?? undefined,
            }}
          >
            {placeholder}
          </Text>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  // 래퍼가 크기를 가져간 경우(flex/height를 옮겼을 때) 입력창이 그 안을 채우게 합니다.
  fill: {
    flex: 1,
  },
});
