// src/screens/product/RoutineEditScreen.tsx — PROD-07 (Figma node 193:6228)
//
// Phase 11-B. Figma 구조 기준 별도 화면으로 분리했습니다(관리자 결정, 2026-08-13).
// 기존 S-11의 RoutineQuickRecordCard 인라인 ▲▼ 편집은 이 화면이 대체합니다.
//
// 2026-08-15 재구성(관리자님 지시, 업로드 이미지 기준) — 예전엔 routineId 하나만 받아
// 그 루틴만 보여줬는데, 이제 화면 안에 "모닝루틴"/"나이트루틴" 탭을 두고 화면을 나가지
// 않고 서로 오갈 수 있게 바꿨습니다. route.params.routineId는 "처음에 어느 탭을 열지"만
// 정하고, 진입 후에는 activeRoutineId 로컬 상태가 탭 전환을 담당합니다. 각 루틴의 편집
// 내용(순서·삭제)은 ordersByRoutineId에 루틴별로 따로 쌓아둬서, 탭을 오가도 서로 안
// 섞이고 유지됩니다.
//
// 배경은 옅은 라벤더(surfaceLavenderPale)로 바꿨고(관리자님 지시), 제품 행은
// DraggableRoutineRow가 카드 스타일(번호 뱃지 + 원형 X)로 그립니다. "+ 제품 추가하기"는
// 이번에 새로 추가한 자리 표시자 버튼입니다 — 실제로 제품을 추가하는 API/흐름이 아직
// 없어서(백엔드에 루틴 제품 추가 엔드포인트가 없음) 탭해도 아무 동작이 없습니다. 목적지가
// 정해지면(예: 검색 화면으로 이동 후 이 루틴에 담기) 연결하겠습니다.
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
import { IconAdd, IconBack } from '@/components/icons';
import { DraggableRoutineRow, ROW_HEIGHT } from '@/components/domain/DraggableRoutineRow';
import { useRoutines } from '@/api/queries/product';
import { DetailStackParamList } from '@/app/routes';
import { color, radius, space, typography } from '@/theme';
import { weightFamily } from '@/theme/typography';
import type { RoutineProductItem } from '@/types/product';

type NavProp = NativeStackNavigationProp<DetailStackParamList, 'RoutineEdit'>;

export function RoutineEditScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProp<DetailStackParamList, 'RoutineEdit'>>();
  const insets = useSafeAreaInsets();

  const routinesQuery = useRoutines();

  // 처음 진입할 탭 — route.params.routineId가 가리키는 루틴. 그 뒤로는 순수 로컬 상태.
  const [activeRoutineId, setActiveRoutineId] = useState(route.params.routineId);
  const activeRoutine = routinesQuery.data?.find((r) => r.routineId === activeRoutineId);

  // 루틴별 편집 사본(데모 전용) — 탭을 오가도 서로 다른 루틴의 편집 내용이 섞이지 않게
  // routineId를 키로 따로 보관합니다. 렌더링 중 조정 패턴(useEffect 대신)은
  // RoutineQuickRecordCard.tsx와 같은 이유로 여기서도 씁니다.
  const [ordersByRoutineId, setOrdersByRoutineId] = useState<Record<number, RoutineProductItem[]>>(
    {}
  );
  if (activeRoutine && ordersByRoutineId[activeRoutine.routineId] === undefined) {
    setOrdersByRoutineId((prev) => ({ ...prev, [activeRoutine.routineId]: activeRoutine.products }));
  }
  const order = activeRoutine ? ordersByRoutineId[activeRoutine.routineId] : undefined;

  const [toastVisible, setToastVisible] = useState(false);

  const handleReorder = (productId: number, toIndex: number) => {
    if (!activeRoutine) return;
    const id = activeRoutine.routineId;
    setOrdersByRoutineId((prev) => {
      const current = prev[id];
      if (!current) return prev;
      const fromIndex = current.findIndex((p) => p.productId === productId);
      if (fromIndex === -1 || fromIndex === toIndex) return prev;
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return { ...prev, [id]: next };
    });
  };

  const handleDelete = (productId: number) => {
    if (!activeRoutine) return;
    const id = activeRoutine.routineId;
    setOrdersByRoutineId((prev) => ({
      ...prev,
      [id]: (prev[id] ?? []).filter((p) => p.productId !== productId),
    }));
  };

  const handleSave = () => {
    // 저장 API가 없어 실제 서버 반영은 없습니다 — 데모용 완료 안내만 보여주고 나갑니다.
    setToastVisible(true);
  };

  if (routinesQuery.isLoading) {
    return <LoadingState variant="spinner" />;
  }

  if (routinesQuery.isError || !routinesQuery.data || !activeRoutine || !order) {
    return <ErrorState variant="network" onRetry={() => routinesQuery.refetch()} />;
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + space[4] }]}>
        <View style={styles.headerRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="뒤로가기"
            onPress={() => navigation.goBack()}
            hitSlop={8}
          >
            <IconBack size={22} color={color.ink900} />
          </Pressable>
          <Text style={styles.title}>루틴 수정</Text>
        </View>

        <View style={styles.tabRow}>
          {routinesQuery.data.map((routine) => {
            const active = routine.routineId === activeRoutine.routineId;
            return (
              <Pressable
                key={routine.routineId}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => setActiveRoutineId(routine.routineId)}
                style={[styles.tabChip, active && styles.tabChipActive]}
              >
                <Text style={[styles.tabChipText, active && styles.tabChipTextActive]}>
                  {routine.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
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

        {/* "+ 제품 추가하기" — 자리만 있고 아직 동작은 없습니다(파일 상단 주석 참고). */}
        <Pressable accessibilityRole="button" accessibilityLabel="제품 추가하기" style={styles.addButton}>
          <IconAdd size={16} color={color.brand700} />
          <Text style={styles.addButtonText}>제품 추가하기</Text>
        </Pressable>

        <Text style={styles.demoNote}>
          순서·삭제는 이 화면에서만 적용돼요. 나가면 원래대로 돌아가요.
        </Text>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space[4] }]}>
        <Button
          label="취소"
          variant="ghost"
          onPress={() => navigation.goBack()}
          style={styles.footerButton}
        />
        <Button label="저장" variant="primary" onPress={handleSave} style={styles.footerButton} />
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
    backgroundColor: color.surfaceLavenderPale,
  },
  header: {
    paddingHorizontal: space[5],
    paddingBottom: space[4],
    gap: space[3],
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
  title: {
    ...typography.h1,
    color: color.ink900,
  },
  tabRow: {
    flexDirection: 'row',
    gap: space[2],
  },
  tabChip: {
    paddingHorizontal: space[4],
    paddingVertical: space[2],
    borderRadius: radius.pill,
    backgroundColor: color.bg,
  },
  tabChipActive: {
    backgroundColor: color.brand500,
  },
  tabChipText: {
    ...typography.caption,
    ...weightFamily('semibold'),
    color: color.ink600,
  },
  tabChipTextActive: {
    color: color.white,
  },
  listArea: {
    flex: 1,
    paddingHorizontal: space[5],
    paddingTop: space[2],
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[2],
    marginTop: space[2],
    paddingVertical: space[4],
    borderRadius: radius.md,
    backgroundColor: color.bg,
  },
  addButtonText: {
    ...typography.body,
    ...weightFamily('semibold'),
    color: color.brand700,
  },
  demoNote: {
    ...typography.micro,
    color: color.ink300,
    marginTop: space[3],
  },
  footer: {
    flexDirection: 'row',
    gap: space[3],
    paddingHorizontal: space[5],
    paddingTop: space[3],
  },
  footerButton: {
    flex: 1,
  },
});
