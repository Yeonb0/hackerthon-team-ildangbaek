import React, { useState } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { IconChevronDown, IconChevronRight } from '@/components/icons';
import { Card } from '@/components/base/Card';
import { Button } from '@/components/base/Button';
import { color, space, typography } from '@/theme';
import { DetailRoutes, DetailStackParamList } from '@/app/routes';
import type { TimeSlot } from '@/app/routes';
import type { RoutineProductItem } from '@/types/product';
import { weightFamily } from '@/theme/typography';

const TIME_SLOT_LABEL: Record<TimeSlot, string> = { MORNING: '모닝', NIGHT: '나이트' };

type RoutineQuickRecordCardProps = {
  routineId: number;
  name: string;
  timeSlot: TimeSlot;
  productCount: number;
  productSummary: string;
  onQuickRecord: () => void;
  loading?: boolean;
  /**
   * 펼쳤을 때 보여줄 실제 제품 목록(PRODUCT-07). 아직 로딩 중이면 undefined —
   * 그 경우 펼쳐도 로딩 표시만 뜹니다. 관리자님 요청(2026-08-10)으로 추가했습니다.
   */
  products?: RoutineProductItem[];
  /**
   * PRODUCT-07 조회 자체가 실패한 경우. products가 undefined인 것과 구분해야 합니다 —
   * 안 그러면 실패했을 때도 "불러오는 중…"이 영원히 떠 있는 것처럼 보입니다.
   */
  productsError?: boolean;
  onRetryProducts?: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * S-11 "자주 쓰는 루틴" 행. 루틴 이름 + 구성 제품 요약 + 바로 기록 버튼.
 * PRODUCT-08(POST /routines/{id}/records)을 호출하는 진입점입니다. 루틴의 timeSlot과
 * 현재 화면 timeSlot이 다르면 뱃지로 미리 알려서(F-PRODUCT-06 BR4 경고의 예방적 힌트),
 * 실제 확인 팝업은 호출부(ProductRecordScreen)에서 처리합니다.
 *
 * 행을 탭하면 펼쳐져서 구성 제품을 하나씩 보여줍니다(관리자님 요청, 2026-08-10).
 * 여기서는 읽기 전용 미리보기만 보여주고, 순서 변경·삭제는 "수정" 링크로 들어가는
 * 별도 화면(RoutineEditScreen, PROD-07)에서 합니다.
 *
 * ⚠️ 구현 방식 변천사 — 순서 변경 UI를 ▲▼ 버튼 → PanResponder 드래그 →
 * react-native-draggable-flatlist(+ reanimated) → 다시 ▲▼ 버튼(2026-08-10, 이 카드 안에
 * 인라인으로) → **별도 화면 + reanimated 드래그**(Phase 11-B, 2026-08-13, 관리자 결정)로
 * 다시 전환했습니다. 이번엔 Development Build로 정식 전환해서 reanimated 네이티브 모듈
 * 크래시 문제를 해소했습니다 — 자세한 내용은 RoutineEditScreen.tsx, DraggableRoutineRow.tsx
 * 상단 주석 참고. 이 카드는 이제 미리보기(읽기 전용)만 책임지고, 실제 편집 UI는 그쪽에 있습니다.
 *
 * ⚠️ 순서 변경·삭제는 여전히 화면 전용 데모입니다 — 루틴 구성을 바꾸는 API(PATCH/DELETE류)가
 * api_명세서.md에 없어서(PRODUCT-07은 조회만 가능) 백엔드 API가 생기기 전까지는 로컬 상태로만
 * 동작합니다 (RoutineEditScreen.tsx 참고, 새로 생긴 제약이 아니라 기존과 동일).
 */
export function RoutineQuickRecordCard({
  routineId,
  name,
  timeSlot,
  productCount,
  productSummary,
  onQuickRecord,
  loading = false,
  products,
  productsError = false,
  onRetryProducts,
  style,
}: RoutineQuickRecordCardProps) {
  const navigation =
    useNavigation<NativeStackNavigationProp<DetailStackParamList>>();
  const [expanded, setExpanded] = useState(false);

  return (
    <Card padding={4} style={style}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${name} ${expanded ? '접기' : '펼치기'}`}
        onPress={() => setExpanded((v) => !v)}
        style={styles.row}
      >
        {expanded ? (
          <IconChevronDown size={16} color={color.ink600} />
        ) : (
          <IconChevronRight size={16} color={color.ink600} />
        )}
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            <View style={styles.slotBadge}>
              <Text style={styles.slotBadgeText}>{TIME_SLOT_LABEL[timeSlot]}</Text>
            </View>
          </View>
          <Text style={styles.summary} numberOfLines={1}>
            {productCount}개 · {productSummary}
          </Text>
        </View>
        <Button
          label="바로 기록"
          variant="secondary"
          loading={loading}
          onPress={onQuickRecord}
          style={styles.button}
        />
      </Pressable>

      {expanded ? (
        <View style={styles.expandedArea}>
          {productsError ? (
            <View style={styles.errorRow}>
              <Text style={styles.errorText}>제품 목록을 불러오지 못했어요.</Text>
              {onRetryProducts ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="다시 시도"
                  onPress={onRetryProducts}
                  hitSlop={8}
                >
                  <Text style={styles.retryText}>다시 시도</Text>
                </Pressable>
              ) : null}
            </View>
          ) : products === undefined ? (
            <Text style={styles.loadingText}>불러오는 중…</Text>
          ) : (
            <>
              {products.map((product, index) => (
                <View key={product.productId} style={styles.productRow}>
                  <Text style={styles.productIndex}>{index + 1}</Text>
                  <Text style={styles.productName} numberOfLines={1}>
                    {product.name}
                  </Text>
                </View>
              ))}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${name} 순서 수정`}
                onPress={() => navigation.navigate(DetailRoutes.RoutineEdit, { routineId })}
                style={styles.editLink}
                hitSlop={8}
              >
                <Text style={styles.editLinkText}>순서 수정</Text>
                <IconChevronRight size={14} color={color.brand700} />
              </Pressable>
            </>
          )}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
  info: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  name: {
    ...typography.bodyStrong,
    color: color.ink900,
    flexShrink: 1,
  },
  slotBadge: {
    paddingHorizontal: space[2],
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: color.brand50,
  },
  slotBadgeText: {
    ...typography.micro,
    color: color.brand700,
  },
  summary: {
    ...typography.caption,
    color: color.ink600,
  },
  button: {
    minHeight: 40,
    paddingHorizontal: space[4],
  },
  expandedArea: {
    marginTop: space[3],
    paddingTop: space[3],
    borderTopWidth: 1,
    borderTopColor: color.brand50,
    gap: space[2],
  },
  loadingText: {
    ...typography.caption,
    color: color.ink600,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    ...typography.caption,
    color: color.statusCaution,
    flexShrink: 1,
  },
  retryText: {
    ...typography.caption,
    ...weightFamily('bold'),
    color: color.brand700,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  productIndex: {
    ...typography.caption,
    color: color.ink300,
    width: 16,
  },
  productName: {
    ...typography.body,
    color: color.ink900,
    flexShrink: 1,
    flexGrow: 1,
  },
  editLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    marginTop: space[2],
    alignSelf: 'flex-start',
  },
  editLinkText: {
    ...typography.caption,
    ...weightFamily('bold'),
    color: color.brand700,
  },
});