import React, { useState } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { IconChevronDown, IconChevronRight, IconChevronUp, IconTrash } from '@/components/icons';
import { Card } from '@/components/base/Card';
import { Button } from '@/components/base/Button';
import { color, space, typography } from '@/theme';
import type { TimeSlot } from '@/app/routes';
import type { RoutineProductItem } from '@/types/product';

const TIME_SLOT_LABEL: Record<TimeSlot, string> = { MORNING: '모닝', NIGHT: '나이트' };

type RoutineQuickRecordCardProps = {
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
 *
 * ⚠️ 구현 방식 변천사(2026-08-10) — 순서 변경 UI를 ▲▼ 버튼 → PanResponder 드래그 →
 * react-native-draggable-flatlist(+ reanimated) → 다시 ▲▼ 버튼 순으로 오갔습니다.
 * react-native-reanimated/react-native-worklets는 훨씬 부드러웠지만 네이티브 코드가
 * 필요해서 Expo Go에서 "undefined is not a function"으로 죽었고(Development Build
 * 필요), 대안으로 만든 순수 PanResponder 버전은 Expo Go에선 동작했지만 JS 스레드에서
 * 매 프레임 값을 계산해 넘기는 구조라 관리자님 실기기에서 버벅임이 심했습니다
 * ("있느니만 못하다" 피드백, 2026-08-10). 그래서 확실하게 동작하는 ▲▼ 버튼으로
 * 최종 복귀했습니다. 팀이 Development Build로 전환하면(expo-notifications 재활성화
 * 때도 필요한 전환) react-native-draggable-flatlist로 다시 바꿀 수 있습니다 — 이 컴포넌트
 * 바깥(ProductRecordScreen 등)은 products/삭제 콜백만 주고받아서, 순서 변경 UI 내부
 * 구현만 통째로 교체하면 됩니다.
 *
 * ⚠️ 순서 변경·삭제는 화면 전용 데모입니다 — 관리자님 확인(2026-08-10): 루틴 구성을 바꾸는
 * API(PATCH/DELETE류)가 api_명세서.md에 없어서(PRODUCT-07은 조회만 가능), 백엔드 API가
 * 생기기 전까지는 "이 화면에서만 바뀌고 새로고침하면 원래대로 돌아가는" 형태로 만들어뒀습니다.
 * 실제로 저장하려면 백엔드에 루틴 수정 API를 요청하고, 여기 로컬 상태를
 * 뮤테이션 호출로 바꿔야 합니다.
 */
export function RoutineQuickRecordCard({
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
  const [expanded, setExpanded] = useState(false);
  // 서버 데이터의 로컬 편집 사본 — 데모용 순서 변경·삭제는 이 상태만 바꿉니다(위 주석 참고).
  // ⚠️ useEffect로 동기화하지 않습니다 — "커밋 이후"에 setState를 또 하면 렌더가 한 번 더
  // 발생해서(react-hooks/set-state-in-effect 규칙이 에러로 잡음) 화면이 잠깐 깜빡일 수
  // 있습니다. 대신 React 공식 문서가 권장하는 "렌더링 중 조정" 패턴을 씁니다 — products
  // prop이 바뀐 걸 렌더 중에 감지해서 그 자리에서 바로 재설정합니다.
  const [localProducts, setLocalProducts] = useState<RoutineProductItem[] | undefined>(products);
  const [syncedProducts, setSyncedProducts] = useState<RoutineProductItem[] | undefined>(products);
  if (products !== syncedProducts) {
    setSyncedProducts(products);
    setLocalProducts(products);
  }

  const moveProduct = (index: number, direction: -1 | 1) => {
    setLocalProducts((prev) => {
      if (!prev) return prev;
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const removeProduct = (productId: number) => {
    setLocalProducts((prev) => prev?.filter((p) => p.productId !== productId));
  };

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
          ) : localProducts === undefined ? (
            <Text style={styles.loadingText}>불러오는 중…</Text>
          ) : (
            <>
              {localProducts.map((product, index) => (
                <View key={product.productId} style={styles.productRow}>
                  <Text style={styles.productIndex}>{index + 1}</Text>
                  <Text style={styles.productName} numberOfLines={1}>
                    {product.name}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="위로 이동"
                    disabled={index === 0}
                    onPress={() => moveProduct(index, -1)}
                    hitSlop={6}
                    style={styles.iconButton}
                  >
                    <IconChevronUp size={16} color={index === 0 ? color.ink300 : color.ink600} />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="아래로 이동"
                    disabled={index === localProducts.length - 1}
                    onPress={() => moveProduct(index, 1)}
                    hitSlop={6}
                    style={styles.iconButton}
                  >
                    <IconChevronDown
                      size={16}
                      color={index === localProducts.length - 1 ? color.ink300 : color.ink600}
                    />
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="루틴에서 삭제"
                    onPress={() => removeProduct(product.productId)}
                    hitSlop={6}
                    style={styles.iconButton}
                  >
                    <IconTrash size={16} color={color.statusCaution} />
                  </Pressable>
                </View>
              ))}
              <Text style={styles.demoNote}>
                순서·삭제는 이 화면에서만 적용돼요. 새로고침하면 원래대로 돌아가요.
              </Text>
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
    fontWeight: '700',
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
  iconButton: {
    padding: space[1],
  },
  demoNote: {
    ...typography.micro,
    color: color.ink300,
    marginTop: space[1],
  },
});