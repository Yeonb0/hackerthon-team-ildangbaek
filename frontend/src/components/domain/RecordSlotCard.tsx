import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/base/Card';
import { color, space, typography } from '@/theme';

type RecordSlotCardProps = {
  label: string; // '제품 기록' | '피부 기록'
  completed: boolean;
  summary: string | null;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * 기록 슬롯 카드. 제품 기록·피부 기록 공용입니다 (F-RECORD-02).
 *
 * BR4: 완료 상태는 색만으로 구분하지 않습니다 — 완료 = 초록 + 체크, 미완료 = 빨강 + 빈 원을
 * 병행합니다. Tag.tsx(Phase 2)의 "색 + 심볼" 원칙과 동일합니다.
 * BR3: 미완료 슬롯은 탭하면 기록 화면(S-11/S-15)으로, 완료 슬롯은 요약을 보여줍니다 —
 * 다만 완료된 기록을 다시 열어볼 수 있어야 하므로 완료 상태도 계속 탭 가능하게 뒀습니다.
 */
export function RecordSlotCard({ label, completed, summary, onPress, style }: RecordSlotCardProps) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card style={[styles.card, style]}>
        <Ionicons
          name={completed ? 'checkmark-circle' : 'ellipse-outline'}
          size={28}
          color={completed ? color.statusGood : color.statusCaution}
        />
        <View style={styles.textArea}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.summary} numberOfLines={1}>
            {completed && summary ? summary : '기록하러 가기'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={color.ink300} />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
  textArea: {
    flex: 1,
    gap: 2,
  },
  label: {
    ...typography.caption,
    color: color.ink600,
  },
  summary: {
    ...typography.bodyStrong,
    color: color.ink900,
  },
});
