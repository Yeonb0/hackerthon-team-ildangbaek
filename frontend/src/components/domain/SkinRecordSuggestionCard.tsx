import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/base/Button';
import { Card } from '@/components/base/Card';
import { color, space, typography } from '@/theme';

type SkinRecordSuggestionCardProps = {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * F-PRODUCT-07 — 제품 기록 완료 후, 같은 시간대 피부 기록이 아직 없으면 S-14 하단에
 * 표시합니다(BR1). skinRecordSuggested 조건 판단은 호출부(IngredientCheckScreen)가
 * PRODUCT-05 응답을 보고 하고, 이 컴포넌트는 카드 UI만 담당합니다.
 * BR3: 안 눌러도 제품 기록 자체는 이미 정상 완료된 상태 — 그래서 닫기/무시 버튼은
 * 따로 두지 않았습니다(카드를 그냥 지나쳐도 됨).
 */
export function SkinRecordSuggestionCard({ onPress, style }: SkinRecordSuggestionCardProps) {
  return (
    <Card padding={4} style={[styles.card, style]}>
      <Ionicons name="camera-outline" size={24} color={color.brand700} />
      <View style={styles.textArea}>
        <Text style={styles.title}>피부 기록도 남겨보세요</Text>
        <Text style={styles.description}>지금 촬영하면 이 제품 효과를 더 정확히 볼 수 있어요.</Text>
      </View>
      <Button label="촬영하러 가기" variant="secondary" onPress={onPress} style={styles.button} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    gap: space[2],
  },
  textArea: {
    alignItems: 'center',
    gap: 2,
  },
  title: {
    ...typography.bodyStrong,
    color: color.ink900,
  },
  description: {
    ...typography.caption,
    color: color.ink600,
    textAlign: 'center',
  },
  button: {
    marginTop: space[2],
    alignSelf: 'stretch',
  },
});
