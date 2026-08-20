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
// ⚠️ 배럴('@/theme')이 아니라 tokens를 직접 봅니다. 배럴은 typography → fontFamily까지
// 끌고 오는데, 그 모듈은 부팅 게이트보다 먼저 평가되면 안 됩니다(typography.ts 주석 참고).
import { color } from '@/theme/tokens';

type AppTextInputProps = Omit<TextInputProps, 'style'> & {
  style?: StyleProp<TextStyle>;
};

/**
 * 2026-08-20(관리자 지시) — 커서·선택 영역 색을 브랜드 퍼플로 통일합니다.
 * 예전에는 제품 기록 검색창만 지정돼 있어서 화면마다 기본 파랑과 섞였습니다.
 *
 * 플랫폼별로 담당하는 prop이 다릅니다:
 *   · cursorColor    — 안드로이드 전용. 깜빡이는 커서 막대 색.
 *   · selectionColor — iOS는 커서와 드래그 선택 영역을 **함께** 이 색으로 칠하고,
 *                      안드로이드는 선택 영역(하이라이트)만 담당합니다.
 * 둘 다 줘야 양쪽에서 같은 색으로 보입니다.
 *
 * 아래 두 분기 모두 `{...rest}`보다 **앞에** 두므로, 특정 입력창에서 다른 색이
 * 필요하면 호출부에서 prop으로 그냥 덮어쓰면 됩니다.
 */
const CARET_COLOR = color.brand500;

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
        cursorColor={CARET_COLOR}
        selectionColor={CARET_COLOR}
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
        style={[
          style,
          styles.fill,
          // 2026-08-20(관리자 제보) — 커서가 placeholder 첫 글자를 파고들던 문제의 수정.
          //
          // 안드로이드 TextInput은 **가로 패딩을 아무것도 지정하지 않으면** EditText 기본
          // 배경에서 오는 내부 패딩(약 4dp)을 그대로 씁니다. 그런데 아래 오버레이는
          // 네이티브 hint가 아니라 우리가 얹은 <Text>라 그 4dp를 모르고 x=0에서 시작합니다.
          // 결과적으로 **커서(=글자 원점)만 오른쪽으로 밀려** 글씨 위에 겹쳤습니다.
          //
          // 그래서 오버레이가 쓰는 것과 **똑같은 값**을 TextInput에도 명시합니다. 스타일에
          // 이미 가로 패딩이 있으면 같은 값이라 아무것도 안 바뀌고, 없으면 0으로 못박혀
          // 플랫폼 기본값이 사라집니다 — 두 경우 모두 원점이 일치합니다.
          //
          // 부수 효과로, 빈 상태에서 타이핑을 시작할 때 글자가 4dp 왼쪽으로 튀던 것도
          // 사라집니다(placeholder 원점 ≠ 입력 원점이었기 때문).
          //
          // ⚠️ 세로 패딩은 건드리지 않습니다. 고정 높이 박스 안의 세로 쏠림은 화면별로
          // `paddingVertical: 0`을 이미 넣어 해결해뒀고(성분 목록·위치 설정), 여기서
          // 일괄로 0을 강제하면 그 처리를 안 한 입력창들의 글자 위치가 함께 움직입니다.
          { paddingLeft: Number(padLeft), paddingRight: Number(padRight) },
        ]}
        // 네이티브 hint는 쓰지 않습니다 — 아래 Text가 대신 그립니다.
        placeholder={undefined}
        value={value}
        multiline={multiline}
        cursorColor={CARET_COLOR}
        selectionColor={CARET_COLOR}
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