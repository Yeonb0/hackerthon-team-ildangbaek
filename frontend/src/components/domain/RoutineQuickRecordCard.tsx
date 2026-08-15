import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Card } from '@/components/base/Card';
import { Button } from '@/components/base/Button';
import { AppIcon } from '@/components/icons/AppIcon';
import { color, space, typography } from '@/theme';
import type { TimeSlot } from '@/app/routes';
import type { IconName } from '@/components/icons/registry';

const TIME_SLOT_ICON: Record<TimeSlot, IconName> = { MORNING: 'sunny', NIGHT: 'moon' };

type RoutineQuickRecordCardProps = {
  name: string;
  timeSlot: TimeSlot;
  productCount: number;
  productSummary: string;
  onQuickRecord: () => void;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * S-11 "자주 쓰는 루틴" 카드. PRODUCT-08(POST /routines/{id}/records)을 호출하는
 * 진입점입니다.
 *
 * Figma 정합(2026-08-15, RecordProduct-Library 59:8263) — 가로 한 줄 행에서 세로 카드로
 * 전면 재구성했습니다(관리자님 지시): 시간대 아이콘(sunny/moon) → 이름 → 요약 → 개수 →
 * "바로 기록" 버튼 순으로 세로 배치. 부모(ProductRecordScreen)가 두 카드를 2열 그리드로
 * 나란히 놓습니다. "바로 기록" 버튼은 primary(그라데이션) — 그라데이션은 "바로 기록"/
 * "기록 완료" 버튼에만 쓰기로 확정(관리자님 지시, 2026-08-15).
 *
 * 2026-08-15(세션4) — 시간대 표시를 이모지(☀️/🌙)에서 커스텀 아이콘 세트(AppIcon
 * 'sunny'/'moon')로 교체(관리자님 지시). 시간대 뱃지("모닝"/"나이트" 알약)는 여전히
 * 안 씁니다(관리자님 확인) — 이 아이콘만으로 시간대를 구분합니다.
 *
 * 카드는 더 이상 펼쳐지지 않습니다(관리자님 지시, 2026-08-15) — 이전엔 탭하면 구성
 * 제품 미리보기 + "순서 수정" 링크가 펼쳐졌는데, Figma에 그 인터랙션이 없어서 통째로
 * 뺐습니다. 순서 수정 진입점은 이제 이 카드가 아니라 "자주 쓰는 루틴" 섹션 헤더의
 * "루틴 수정" 링크(ProductRecordScreen)로 옮겼습니다 — RoutineEditScreen도 그에 맞춰
 * 모닝/나이트 루틴을 화면 안에서 탭으로 전환하도록 같이 고쳤습니다.
 */
export function RoutineQuickRecordCard({
  name,
  timeSlot,
  productCount,
  productSummary,
  onQuickRecord,
  loading = false,
  style,
}: RoutineQuickRecordCardProps) {
  return (
    <Card padding={4} style={style}>
      <View style={styles.top}>
        <AppIcon name={TIME_SLOT_ICON[timeSlot]} size={20} color={color.brand700} style={styles.icon} />
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.summary} numberOfLines={1}>
          {productSummary}
        </Text>
        <Text style={styles.count}>{productCount}개 제품</Text>
      </View>

      <Button
        label="바로 기록"
        variant="primary"
        loading={loading}
        onPress={onQuickRecord}
        style={styles.button}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  top: {
    gap: 2,
  },
  icon: {
    marginBottom: space[1],
  },
  name: {
    ...typography.bodyStrong,
    color: color.ink900,
  },
  summary: {
    ...typography.caption,
    color: color.textSub,
  },
  count: {
    ...typography.micro,
    color: color.ink300,
    marginBottom: space[3],
  },
  button: {
    minHeight: 36,
  },
});
