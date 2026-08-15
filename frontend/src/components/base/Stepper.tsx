// src/components/base/Stepper.tsx
import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { color, radius, space } from '@/theme/tokens';

type StepperProps = {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  style?: StyleProp<ViewStyle>;
};

export function Stepper({ value, onChange, min, max, step = 1, style }: StepperProps) {
  const canDecrease = value - step >= min;
  const canIncrease = value + step <= max;

  return (
    <View style={[styles.container, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="감소"
        disabled={!canDecrease}
        onPress={() => onChange(Math.max(min, value - step))}
        style={[styles.button, !canDecrease && styles.buttonDisabled]}
      >
        <Text style={styles.buttonLabel}>−</Text>
      </Pressable>

      <Text style={styles.value}>{value}</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="증가"
        disabled={!canIncrease}
        onPress={() => onChange(Math.min(max, value + step))}
        style={[styles.button, !canIncrease && styles.buttonDisabled]}
      >
        <Text style={styles.buttonLabel}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[5],
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.brand500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    borderColor: color.ink300,
    opacity: 0.4,
  },
  buttonLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: color.brand700,
  },
  value: {
    minWidth: 48,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: color.ink900,
  },
});
