import React, { useEffect, useState } from 'react';
import { Animated, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { color, radius, space, typography } from '@/theme';

type ToastProps = {
  visible: boolean;
  message: string;
  /** 메시지 앞에 붙일 아이콘. 미지정 시 아이콘 없음 — 성공 안내에는 'checkmark-circle'을 씁니다. */
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  /** 있으면 자동으로 닫히기 전까지 탭할 수 있는 보조 액션을 함께 보여줍니다 (예: "피부도 기록하기"). */
  actionLabel?: string;
  onActionPress?: () => void;
  onDismiss: () => void;
  /** 자동으로 닫히기까지 걸리는 시간(ms). 기본 2600 — 액션이 있으면 읽고 누를 시간이 필요해 3400으로 늘립니다. */
  duration?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * 확인 버튼 없이 스스로 사라지는 알림형 토스트(Popup과 달리 화면을 막지 않습니다).
 * 관리자님 요청(2026-08-10) — "기록 완료!" 같은 성공 안내는 사용자가 직접 닫지 않아도
 * 되게 해달라는 피드백으로 추가했습니다. 확인이 꼭 필요한 안내(빈 상태, 확인 후 진행)는
 * 계속 Popup을 씁니다 — Toast는 "정보 전달"용, Popup은 "결정이 필요한 안내"용으로 구분합니다.
 */
export function Toast({
  visible,
  message,
  icon,
  iconColor = color.statusGood,
  actionLabel,
  onActionPress,
  onDismiss,
  duration,
  style,
}: ToastProps) {
  const insets = useSafeAreaInsets();
  // useRef(new Animated.Value(0)).current는 이 코드베이스에서 react-hooks/refs 위반으로
  // 막혀 있습니다(DayHomeScreen과 동일한 이유) — lazy useState로 초기화합니다.
  const [opacity] = useState(() => new Animated.Value(0));
  const effectiveDuration = duration ?? (actionLabel ? 3400 : 2600);

  useEffect(() => {
    if (!visible) return;
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
        onDismiss();
      });
    }, effectiveDuration);
    return () => clearTimeout(timer);
    // visible 전환 시점에만 타이머를 새로 잡습니다. opacity/onDismiss까지 의존성에 넣으면
    // 부모 리렌더마다(예: 다른 상태 변화) 타이머가 계속 리셋되어 토스트가 안 사라집니다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, effectiveDuration]);

  if (!visible) return null;

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        // DevResetButton(개발용 🧪 초기화 버튼)도 화면 우하단에 떠 있어서, Toast를 화면
        // 맨 밑에 붙이면 둘이 겹칩니다(관리자님 스크린샷 확인, 2026-08-10) — 그만큼 더
        // 띄워서 겹치지 않게 합니다. __DEV__가 아닐 때도 이 여백은 자연스러워서 조건 분기는
        // 따로 두지 않았습니다.
        { bottom: insets.bottom + space[6] + 64, opacity },
        style,
      ]}
    >
      <View style={styles.toast}>
        <View style={styles.messageRow}>
          {icon ? <Ionicons name={icon} size={18} color={iconColor} style={styles.icon} /> : null}
          <Text style={styles.message}>{message}</Text>
        </View>
        {actionLabel && onActionPress ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              onActionPress();
              onDismiss();
            }}
            hitSlop={8}
            style={styles.actionButton}
          >
            <Text style={styles.actionLabel}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: space[5],
    right: space[5],
    alignItems: 'center',
  },
  toast: {
    // 메시지 + 액션 버튼을 한 줄에 나란히 두면(가로 배치) 긴 한글 문구에서 서로 밀어내며
    // 줄바꿈이 지저분하게 꼬였습니다(관리자님 스크린샷 확인, 2026-08-10) — 메시지를 먼저
    // 온전히 보여주고, 액션 버튼은 그 아래 오른쪽에 배치합니다.
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: space[2],
    maxWidth: 420,
    width: '100%',
    backgroundColor: color.ink900,
    borderRadius: radius.md,
    paddingVertical: space[3],
    paddingHorizontal: space[4],
    shadowColor: color.ink900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  message: {
    ...typography.body,
    color: color.white,
    flex: 1,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[2],
    alignSelf: 'stretch',
  },
  icon: {
    marginTop: 2, // 본문 첫 줄 텍스트와 눈높이를 맞추기 위한 미세 보정
  },
  actionButton: {
    alignSelf: 'flex-end',
    paddingVertical: space[1],
  },
  actionLabel: {
    ...typography.bodyStrong,
    color: color.brand100,
  },
});
