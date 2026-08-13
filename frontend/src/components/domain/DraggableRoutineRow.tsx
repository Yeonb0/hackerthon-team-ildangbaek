// src/components/domain/DraggableRoutineRow.tsx
//
// Phase 11-B — PROD-07 루틴 수정 화면 전용 드래그 정렬 행.
//
// ⚠️ 이 컴포넌트는 Development Build(react-native-reanimated v4)가 있어야 동작합니다.
// Expo Go에서는 reanimated 네이티브 모듈이 없어 크래시납니다 — 반드시 dev-client 빌드로
// 실행해주세요 (관리자 결정, 2026-08-13. 배경: 이전엔 순수 PanResponder로 시도했다가
// 실기기에서 버벅여서 ▲▼ 버튼으로 되돌렸던 이력이 있습니다 — RoutineQuickRecordCard.tsx
// 상단 주석 참고. 이번엔 그 반성으로 reanimated UI스레드 애니메이션을 씁니다).
//
// 동작 원리(각 행마다 이 컴포넌트가 하나씩 렌더링됨):
// - 평상시엔 `top = withTiming(index * ROW_HEIGHT)`로 자기 순번 자리에 부드럽게 이동.
// - 드래그 중인 행만 `top`이 손가락 위치를 그대로 따라갑니다(애니메이션 없이 raw 추적).
// - 손가락이 다른 행의 절반을 넘어가면(= index 계산이 바뀌면) 부모의 onReorder를 불러
//   순서 배열(React state)을 그 자리에서 즉시 바꿉니다 → 다른 행들이 새 자리로 이동.
// - 손가락을 떼면(onEnd) raw 추적을 멈추고 다시 withTiming(index * ROW_HEIGHT)로 전환 —
//   이미 index가 최종값이라 자연스럽게 그 자리에 "착 붙는" 스냅 애니메이션이 됩니다.
//
// ⚠️ 수정 이력(2026-08-13, 관리자님 실기기 피드백 — "순서 바뀔 때 출렁거림, 안 부드러움"):
// 원인은 onUpdate에서 dragTop 계산식이 `latestIndex.value`(드래그 도중 재정렬로 계속 바뀌는
// 값)를 기준점으로 다시 잡고 있었던 것 — 재정렬이 일어날 때마다 기준점이 ROW_HEIGHT만큼
// 점프하면서 손가락 위치와 어긋나 버벅였습니다. dragStartIndex(제스처 시작 시점에 한 번만
// 고정)로 기준점을 분리해서 손가락을 항상 매끄럽게 따라가도록 고쳤습니다. 또한 정착
// 애니메이션도 스프링(통통 튐) 대신 withTiming+easing으로 바꿔 더 단단한 느낌을 냈습니다.
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { IconDragHandle, IconTrash } from '@/components/icons';
import { color, radius, space, typography } from '@/theme';
import type { RoutineProductItem } from '@/types/product';

export const ROW_HEIGHT = 56;

const SETTLE_ANIMATION = {
  duration: 220,
  easing: Easing.out(Easing.cubic),
};

type DraggableRoutineRowProps = {
  product: RoutineProductItem;
  index: number;
  itemCount: number;
  onReorder: (productId: number, toIndex: number) => void;
  onDelete: (productId: number) => void;
};

export function DraggableRoutineRow({
  product,
  index,
  itemCount,
  onReorder,
  onDelete,
}: DraggableRoutineRowProps) {
  const isDragging = useSharedValue(false);
  const dragTop = useSharedValue(index * ROW_HEIGHT);
  // 부모(order state)가 바뀌어 index가 갱신될 때마다 최신값을 UI스레드로 동기화합니다.
  // 드래그 중엔 onUpdate가 이미 dragTop을 직접 관리하므로 여기서 덮어쓰지 않습니다.
  const latestIndex = useSharedValue(index);
  useEffect(() => {
    latestIndex.value = index;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // 제스처 시작 시점의 index를 "고정"해두는 기준점입니다. dragTop은 항상
  // dragStartIndex를 기준으로만 계산해서, 드래그 도중 재정렬로 latestIndex가 바뀌어도
  // 손가락 위치와의 대응 관계가 절대 끊기지 않습니다(위 수정 이력 참고).
  const dragStartIndex = useSharedValue(index);
  const lastReportedIndex = useSharedValue(index);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      isDragging.value = true;
      dragStartIndex.value = latestIndex.value;
      lastReportedIndex.value = latestIndex.value;
      dragTop.value = latestIndex.value * ROW_HEIGHT;
    })
    .onUpdate((event) => {
      // 기준점이 dragStartIndex로 고정되어 있어 translationY만으로 매끄럽게 따라갑니다.
      dragTop.value = dragStartIndex.value * ROW_HEIGHT + event.translationY;
      const rawIndex = Math.round(dragTop.value / ROW_HEIGHT);
      const clamped = Math.min(Math.max(rawIndex, 0), itemCount - 1);
      if (clamped !== lastReportedIndex.value) {
        lastReportedIndex.value = clamped;
        runOnJS(onReorder)(product.productId, clamped);
      }
    })
    .onEnd(() => {
      isDragging.value = false;
    });

  const animatedStyle = useAnimatedStyle(() => ({
    top: isDragging.value
      ? dragTop.value
      : withTiming(latestIndex.value * ROW_HEIGHT, SETTLE_ANIMATION),
    zIndex: isDragging.value ? 1 : 0,
    shadowOpacity: isDragging.value ? 0.15 : 0,
    elevation: isDragging.value ? 4 : 0,
  }));

  return (
    <Animated.View style={[styles.row, animatedStyle]}>
      <GestureDetector gesture={panGesture}>
        {/* hitSlop 대신 padding으로 손잡이 터치 영역을 넉넉히 둡니다(작은 아이콘이라). */}
        <View style={styles.handle}>
          <IconDragHandle size={18} color={color.ink300} />
        </View>
      </GestureDetector>

      <Text style={styles.name} numberOfLines={1}>
        {product.name}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${product.name} 루틴에서 삭제`}
        onPress={() => onDelete(product.productId)}
        hitSlop={8}
        style={styles.deleteButton}
      >
        <IconTrash size={16} color={color.statusCaution} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingHorizontal: space[4],
    backgroundColor: color.bg,
    borderRadius: radius.md,
    shadowColor: color.ink900,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
  },
  handle: {
    padding: space[2],
  },
  name: {
    ...typography.body,
    color: color.ink900,
    flex: 1,
  },
  deleteButton: {
    padding: space[2],
  },
});