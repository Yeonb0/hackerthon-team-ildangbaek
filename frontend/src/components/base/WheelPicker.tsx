// src/components/base/WheelPicker.tsx
//
// @react-native-picker/picker 같은 네이티브 라이브러리 대신 ScrollView의 snap 기능으로
// 직접 구현했습니다 (다른 컴포넌트들과 같은 이유 — 웹/Expo Go 호환성).
//
// ⚠️ 컴퓨터(웹)에서 마우스 휠로 스크롤하면 onScrollBeginDrag/onMomentumScrollEnd가
// 안정적으로 안 잡힙니다(터치 드래그 전용 이벤트라서). 그래서 두 가지를 같이 씁니다.
// 1) onScroll + 디바운스로 "스크롤이 멈췄을 때"를 직접 감지 (휠/터치 둘 다 커버)
// 2) 숫자를 직접 눌러서 바로 선택 — 스크롤 자체가 잘 안 되는 환경에서도 항상 동작하는 안전장치
//
// orientation="horizontal"이면 가로 스크롤(좌우)로 동작합니다 (예: S-04 평균 주기).
import React, { useEffect, useRef } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { color } from '@/theme/tokens';

const ITEM_SIZE = 48;
const VISIBLE_ITEMS = 5; // 홀수 — 가운데 1개가 선택 항목
const PADDING_ITEMS = Math.floor(VISIBLE_ITEMS / 2);
const SCROLL_IDLE_MS = 120; // 이 시간 동안 추가 스크롤 이벤트가 없으면 "멈췄다"고 판단

type WheelPickerProps = {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  formatLabel?: (value: number) => string;
  /** 기본 세로(vertical). 'horizontal'이면 좌우 스크롤 (예: 평균 주기) */
  orientation?: 'vertical' | 'horizontal';
};

export function WheelPicker({
  value,
  onChange,
  min,
  max,
  step = 1,
  formatLabel,
  orientation = 'vertical',
}: WheelPickerProps) {
  const isHorizontal = orientation === 'horizontal';
  const scrollRef = useRef<ScrollView>(null);
  const isUserInteracting = useRef(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const values: number[] = [];
  for (let v = min; v <= max; v += step) values.push(v);

  const indexOf = (v: number) => Math.max(0, values.indexOf(v));

  const scrollToValue = (v: number, animated: boolean) => {
    const offset = indexOf(v) * ITEM_SIZE;
    scrollRef.current?.scrollTo(isHorizontal ? { x: offset, animated } : { y: offset, animated });
  };

  // 바깥에서 value가 바뀌면(예: 다른 화면에서 초기값을 다시 세팅) 그 위치로 이동합니다.
  // 사용자가 지금 스크롤/탭 중이면 건드리지 않습니다.
  useEffect(() => {
    if (isUserInteracting.current) return;
    scrollToValue(value, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const commitFromOffset = (offset: number) => {
    const index = Math.round(offset / ITEM_SIZE);
    const clamped = Math.max(0, Math.min(values.length - 1, index));
    if (values[clamped] !== value) {
      onChange(values[clamped]);
    }
    return clamped;
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    isUserInteracting.current = true;
    const offset = isHorizontal ? e.nativeEvent.contentOffset.x : e.nativeEvent.contentOffset.y;

    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      isUserInteracting.current = false;
      const clamped = commitFromOffset(offset);
      scrollToValue(values[clamped], true);
    }, SCROLL_IDLE_MS);
  };

  const handlePressItem = (v: number) => {
    isUserInteracting.current = false;
    if (idleTimer.current) clearTimeout(idleTimer.current);
    onChange(v);
    scrollToValue(v, true);
  };

  return (
    <View style={isHorizontal ? styles.containerHorizontal : styles.containerVertical}>
      <View
        pointerEvents="none"
        style={isHorizontal ? styles.selectionIndicatorHorizontal : styles.selectionIndicatorVertical}
      />
      <ScrollView
        ref={scrollRef}
        horizontal={isHorizontal}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        snapToInterval={ITEM_SIZE}
        decelerationRate="fast"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentOffset={
          isHorizontal ? { x: indexOf(value) * ITEM_SIZE, y: 0 } : { x: 0, y: indexOf(value) * ITEM_SIZE }
        }
        contentContainerStyle={
          isHorizontal
            ? { paddingHorizontal: ITEM_SIZE * PADDING_ITEMS }
            : { paddingVertical: ITEM_SIZE * PADDING_ITEMS }
        }
      >
        {values.map((v) => (
          <Pressable
            key={v}
            onPress={() => handlePressItem(v)}
            style={isHorizontal ? styles.itemHorizontal : styles.itemVertical}
          >
            <Text style={[styles.itemText, v === value && styles.itemTextSelected]}>
              {formatLabel ? formatLabel(v) : v}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  containerVertical: {
    height: ITEM_SIZE * VISIBLE_ITEMS,
    overflow: 'hidden',
  },
  containerHorizontal: {
    width: ITEM_SIZE * VISIBLE_ITEMS,
    height: ITEM_SIZE,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  selectionIndicatorVertical: {
    position: 'absolute',
    top: ITEM_SIZE * PADDING_ITEMS,
    left: 0,
    right: 0,
    height: ITEM_SIZE,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: color.ink300,
  },
  selectionIndicatorHorizontal: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: ITEM_SIZE,
    marginLeft: -ITEM_SIZE / 2,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: color.ink300,
  },
  itemVertical: {
    height: ITEM_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemHorizontal: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    fontSize: 16,
    color: color.ink300,
  },
  itemTextSelected: {
    fontSize: 20,
    fontWeight: '700',
    color: color.ink900,
  },
});