import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { IconCheck, IconChevronRight } from '@/components/icons';
import { Card } from '@/components/base/Card';
import { color, radius, space, typography } from '@/theme';

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
 * BR4: 완료 상태는 색만으로 구분하지 않습니다 — 완료 = 초록 원 안에 흰 체크, 미완료 = 테두리만
 * 있는 빈 원. 둘 다 같은 크기의 원형 틀 안에서 "채움 vs 빈 원"으로만 갈리게 만들어서
 * 하나의 상태 표시가 두 상태를 오가는 것처럼 보이게 했습니다 — 이전엔 완료가 원 없이
 * 체크 글자만 떠 있고 미완료만 원이 있어서 서로 다른 모양처럼 보였는데, 그게 어색하다는
 * 피드백을 받아 통일했습니다. "X" 같은 부정적 기호 대신 빈 원을 그대로 쓴 이유는, 아직
 * 기록 안 함은 "실패/오류"가 아니라 "할 일이 남음"이라 X가 주는 부정적 뉘앙스가 안
 * 맞아서입니다 (관리자 질문에 대한 제안 반영, 2026-08-11).
 * BR3: 미완료 슬롯은 탭하면 기록 화면(S-11/S-15)으로, 완료 슬롯은 요약을 보여줍니다 —
 * 다만 완료된 기록을 다시 열어볼 수 있어야 하므로 완료 상태도 계속 탭 가능하게 뒀습니다.
 */
export function RecordSlotCard({ label, completed, summary, onPress, style }: RecordSlotCardProps) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card style={[styles.card, style]}>
        {completed ? (
          <View style={[styles.statusCircle, styles.statusCircleDone]}>
            <IconCheck size={16} color={color.bg} />
          </View>
        ) : (
          <View style={[styles.statusCircle, styles.statusCircleEmpty]} />
        )}
        <View style={styles.textArea}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.summary} numberOfLines={1}>
            {completed && summary ? summary : '기록하러 가기'}
          </Text>
        </View>
        <IconChevronRight size={18} color={color.ink300} />
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
  statusCircle: {
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCircleDone: {
    backgroundColor: color.statusGood,
  },
  statusCircleEmpty: {
    borderWidth: 2,
    borderColor: color.ink300,
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