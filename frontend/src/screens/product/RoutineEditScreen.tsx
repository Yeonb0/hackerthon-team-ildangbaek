// src/screens/product/RoutineEditScreen.tsx — PROD-07 (Figma node 193:6228)
//
// Phase 11-B. Figma 구조 기준 별도 화면으로 분리했습니다(관리자 결정, 2026-08-13).
// 기존 S-11의 RoutineQuickRecordCard 인라인 ▲▼ 편집은 이 화면이 대체합니다 — 카드는
// 이제 미리보기(읽기 전용)만 보여주고, "수정" 진입점을 눌러야 이 화면으로 들어옵니다.
//
// ⚠️ 순서 변경·삭제는 여전히 화면 전용 데모입니다. 루틴 구성을 바꾸는 API(PATCH/DELETE류)가
// api_명세서.md에 없어서(PRODUCT-07은 조회만 가능) 로컬 상태로만 동작하고, 화면을 나가면
// 원래대로 돌아갑니다. 실제로 저장하려면 백엔드에 루틴 수정 API가 필요합니다
// (RoutineQuickRecordCard.tsx의 기존 데모 노트와 동일한 제약 — 새로 생긴 문제가 아닙니다).
//
// ⚠️ Development Build 전용 화면입니다 (react-native-reanimated 네이티브 모듈 필요).
// Expo Go에서 이 화면에 진입하면 크래시납니다.
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/base/Button';
import { Toast } from '@/components/base/Toast';
import { LoadingState } from '@/components/state/LoadingState';
import { ErrorState } from '@/components/state/ErrorState';
import { IconClose } from '@/components/icons';
import { DraggableRoutineRow, ROW_HEIGHT } from '@/components/domain/DraggableRoutineRow';
import { useRoutines } from '@/api/queries/product';
import { DetailStackParamList, TimeSlot } from '@/app/routes';
import { color, space, typography } from '@/theme';
import type { RoutineProductItem } from '@/types/product';

const TIME_SLOT_LABEL: Record<TimeSlot, string> = { MORNING: '모닝', NIGHT: '나이트' };

type NavProp = NativeStackNavigationProp<DetailStackParamList, 'RoutineEdit'>;

export function RoutineEditScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProp<DetailStackParamList, 'RoutineEdit'>>();
  const insets = useSafeAreaInsets();
  const { routineId } = route.params;

  const routinesQuery = useRoutines();
  const routine = routinesQuery.data?.find((r) => r.routineId === routineId);

  // 서버 데이터의 로컬 편집 사본(데모 전용) — RoutineQuickRecordCard와 동일한 이유로
  // useEffect 동기화 대신 "렌더링 중 조정" 패턴을 씁니다.
  const [order, setOrder] = useState<RoutineProductItem[] | null>(null);
  const [syncedRoutineId, setSyncedRoutineId] = useState<number | null>(null);
  if (routine && syncedRoutineId !== routine.routineId) {
    setSyncedRoutineId(routine.routineId);
    setOrder(routine.products);
  }

  const [toastVisible, setToastVisible] = useState(false);

  const handleReorder = (productId: number, toIndex: number) => {
    setOrder((prev) => {
      if (!prev) return prev;
      const fromIndex = prev.findIndex((p) => p.productId === productId);
      if (fromIndex === -1 || fromIndex === toIndex) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const handleDelete = (productId: number) => {
    setOrder((prev) => prev?.filter((p) => p.productId !== productId) ?? prev);
  };

  const handleSave = () => {
    // 저장 API가 없어 실제 서버 반영은 없습니다 — 데모용 완료 안내만 보여주고 나갑니다.
    setToastVisible(true);
  };

  if (routinesQuery.isLoading) {
    return <LoadingState variant="spinner" />;
  }

  if (routinesQuery.isError || !routine || !order) {
    return (
      <ErrorState
        variant="network"
        onRetry={() => routinesQuery.refetch()}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + space[4] }]}>
        <View style={styles.headerRow}>
          <View style={styles.titleGroup}>
            <Text style={styles.title}>{routine.name} 수정</Text>
            <View style={styles.slotBadge}>
              <Text style={styles.slotBadgeText}>{TIME_SLOT_LABEL[routine.timeSlot]}</Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="닫기"
            onPress={() => navigation.goBack()}
            hitSlop={8}
          >
            <IconClose size={20} color={color.ink600} />
          </Pressable>
        </View>
        <Text style={styles.hint}>손잡이를 눌러 드래그하면 순서를 바꿀 수 있어요</Text>
      </View>

      <View style={styles.listArea}>
        {order.length === 0 ? (
          <Text style={styles.emptyText}>루틴에 남은 제품이 없어요.</Text>
        ) : (
          <View style={[styles.listContainer, { height: order.length * ROW_HEIGHT }]}>
            {order.map((product, index) => (
              <DraggableRoutineRow
                key={product.productId}
                product={product}
                index={index}
                itemCount={order.length}
                onReorder={handleReorder}
                onDelete={handleDelete}
              />
            ))}
          </View>
        )}
        <Text style={styles.demoNote}>
          순서·삭제는 이 화면에서만 적용돼요. 나가면 원래대로 돌아가요.
        </Text>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space[4] }]}>
        <Button label="저장" variant="primary" onPress={handleSave} />
      </View>

      <Toast
        visible={toastVisible}
        message="루틴이 업데이트됐어요"
        icon="check"
        onDismiss={() => {
          setToastVisible(false);
          navigation.goBack();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.bg,
  },
  header: {
    paddingHorizontal: space[5],
    paddingBottom: space[4],
    borderBottomWidth: 1,
    borderBottomColor: color.brand50,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
  },
  title: {
    ...typography.h1,
    color: color.ink900,
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
  hint: {
    ...typography.caption,
    color: color.ink600,
    marginTop: space[2],
  },
  listArea: {
    flex: 1,
    paddingHorizontal: space[5],
    paddingTop: space[4],
  },
  listContainer: {
    position: 'relative',
  },
  emptyText: {
    ...typography.body,
    color: color.ink600,
    textAlign: 'center',
    marginTop: space[8],
  },
  demoNote: {
    ...typography.micro,
    color: color.ink300,
    marginTop: space[3],
  },
  footer: {
    paddingHorizontal: space[5],
    paddingTop: space[3],
    borderTopWidth: 1,
    borderTopColor: color.brand50,
  },
});
