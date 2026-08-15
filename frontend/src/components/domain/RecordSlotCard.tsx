import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconCamera, IconCheck, IconChevronRight, IconProductBottle } from '@/components/icons';
import { Card } from '@/components/base/Card';
import { color, gradient, gradientDirection, radius, space, typography, weightFamily } from '@/theme';

type RecordSlotVariant = 'product' | 'skin';
type RecordSlotTimeSlot = 'morning' | 'night';

type RecordSlotCardProps = {
  variant: RecordSlotVariant;
  /** 완료 뱃지 색 구분용(RecordDot과 동일 규칙) — 모닝은 핑크, 나이트는 기존 보라.
   * 관리자 결정 2026-08-15, F-RECORD-02. */
  timeSlot: RecordSlotTimeSlot;
  label: string; // '제품 기록' | '피부 기록'
  completed: boolean;
  summary: string | null;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

const VARIANT_ICON: Record<RecordSlotVariant, React.ComponentType<{ size?: number; color?: string }>> = {
  product: IconProductBottle,
  skin: IconCamera,
};

/**
 * 기록 슬롯 카드. 제품 기록·피부 기록 공용입니다 (F-RECORD-02).
 *
 * 2026-08-15 — Figma Frame 10(210:763/210:781) 실측 레이아웃으로 재작성. 기존엔 좌측
 * 원(초록 채움/빈 테두리)으로 완료 상태를 표시했는데, Figma는 좌측에 항상 같은 톤의
 * 그라데이션 아이콘 박스(제품/카메라)를 두고, 완료 여부는 우측 보라색 원형 체크
 * 뱃지로 분리해서 보여줍니다. 완료/미완료 둘 다 형태 자체가 다르다는 접근성 원칙
 * (Phase 2 로드맵)은 유지 — 뱃지가 없으면(미완료) 빈 원 테두리만 남아 형태가 달라집니다.
 * 텍스트 위계도 뒤집었습니다: 제목(17px bold)이 위, 설명(12px gray)이 아래 —
 * 기존엔 라벨(작게)이 위, 요약(굵게)이 아래라 Figma와 반대였습니다.
 *
 * 2026-08-15 — 완료 뱃지 색을 timeSlot에 따라 모닝(핑크)/나이트(보라)로 분리
 * (관리자 결정). RecordDot의 모닝/나이트 색 분리와 같은 규칙(calendarMorningDot).
 */
export function RecordSlotCard({
  variant,
  timeSlot,
  label,
  completed,
  summary,
  onPress,
  style,
}: RecordSlotCardProps) {
  const Icon = VARIANT_ICON[variant];
  const badgeTint = timeSlot === 'morning' ? color.calendarMorningDot : color.brand500;

  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <Card style={[styles.card, style]}>
        <View style={styles.row}>
          <LinearGradient
            colors={gradient.iconBoxSoft}
            start={gradientDirection.iconBox.start}
            end={gradientDirection.iconBox.end}
            style={styles.iconBox}
          >
            <Icon size={22} color={color.brand700} />
          </LinearGradient>
          <View style={styles.textArea}>
            <Text style={styles.title}>{label}</Text>
            <Text style={styles.summary} numberOfLines={1}>
              {completed && summary ? summary : '기록하러 가기'}
            </Text>
          </View>
          <View style={styles.trailing}>
            {completed ? (
              <View style={[styles.checkBadge, { backgroundColor: badgeTint }]}>
                <IconCheck size={10} color={color.bg} />
              </View>
            ) : (
              <View style={styles.checkBadgeEmpty} />
            )}
            <IconChevronRight size={14} color={color.textSub} />
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 0,
    borderWidth: 0.79,
    borderColor: color.borderDivider,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    paddingVertical: space[4],
    paddingHorizontal: space[5],
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textArea: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...weightFamily('bold'),
    fontSize: 17,
    lineHeight: 25.5,
    color: color.textInk,
  },
  summary: {
    ...typography.caption,
    color: color.textSub,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  checkBadge: {
    width: 25,
    height: 25,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadgeEmpty: {
    width: 25,
    height: 25,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: color.border,
  },
});
