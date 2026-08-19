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
// DraggableRoutineRow가 카드 스타일(번호 뱃지 + 원형 X)로 그립니다.
//
// 2026-08-15(세션5) — "+ 제품 추가하기" 목적지를 검색창 연결에서 전용 화면으로 변경
// (관리자님 지시). RoutineAddProductScreen(체크박스 다중 선택, 저장된 제품 한정)으로
// 이동해 여러 개를 한 번에 루틴에 담습니다. 그 화면에서 돌아오면(useFocusEffect) 서버
// 쪽 루틴 구성이 이미 바뀌어 있으니 routinesQuery를 다시 불러와서 새로 추가된 제품만
// 로컬 편집 상태(ordersByRoutineId)에 병합합니다 — 사용자가 그사이 다른 탭에서 만든
// 순서 변경·삭제는 그대로 유지합니다.
//
// 2026-08-19(세션 18) — 순서 변경·삭제가 **실제로 저장됩니다.** 백엔드에 루틴 수정 API가
// 없는 건 그대로지만, 루틴을 클라이언트가 소유하게 되면서(store/routineStore.ts) 「저장」이
// 스토어에 커밋되고 앱을 재시작해도 유지됩니다. 예전의 "화면 전용 데모" 제약은 끝났습니다.
//
// 2026-08-19(세션 19) 버그 수정 — 삭제가 동작하지 않던 문제. 렌더 중 병합 조건이 로컬에서
// 지운 제품을 곧바로 "새로 추가된 제품"으로 되살리고 있었습니다. 아래 storeSnapshotByRoutineId
// 주석 참고.
//
// ⚠️ Development Build 전용 화면입니다 (react-native-reanimated 네이티브 모듈 필요).
// Expo Go에서 이 화면에 진입하면 크래시납니다.
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
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
import { timeSlotOfLocalRoutine, useRoutineStore } from '@/store/routineStore';
import { DetailRoutes, DetailStackParamList } from '@/app/routes';
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
  // RoutineQuickRecordCard.tsx와 같은 이유로 여기서도 씁니다(React 19 lint 규칙 —
  // set-state-in-effect 금지, 렌더 중 조건부 setState는 허용되는 "bail-out" 패턴).
  const [ordersByRoutineId, setOrdersByRoutineId] = useState<Record<number, RoutineProductItem[]>>(
    {}
  );
  /**
   * 루틴별로 **직전에 본 스토어 구성**(productId 배열)을 기억합니다.
   *
   * 2026-08-19(세션 19) 버그 수정 — 관리자님 리포트 "루틴 수정 화면에서 제품 삭제 안 됨".
   *
   * 예전 병합 조건은 "지금 편집 목록에 없으면 새로 추가된 것"이었습니다:
   *
   *     const newlyAdded = activeRoutine.products.filter((p) => !currentIds.has(p.productId));
   *
   * 그런데 X를 눌러 로컬 목록에서 뺀 제품은 **저장 전이라 스토어에는 그대로 남아 있습니다.**
   * 그래서 바로 다음 렌더에서 이 조건에 걸려 "새 제품"으로 되살아났습니다 — 삭제를 눌러도
   * 아무 일도 안 일어나는 것처럼 보인 원인입니다(맨 뒤로 다시 붙습니다).
   *
   * 이제 "지금 편집 목록"이 아니라 **"직전에 본 스토어 구성"**과 비교합니다.
   *   · 로컬에서 지운 제품 → 스냅샷에 이미 있음 → 새 제품 아님 → 안 돌아옵니다
   *   · 제품 추가 화면에서 담은 제품 → 스냅샷에 없음 → 정상 반영됩니다
   *   · 지웠다가 추가 화면에서 다시 담은 제품 → 스토어가 한 번 바뀌므로 새 제품으로 잡힙니다
   */
  const [storeSnapshotByRoutineId, setStoreSnapshotByRoutineId] = useState<Record<number, number[]>>(
    {}
  );
  if (activeRoutine) {
    const routineId = activeRoutine.routineId;
    const storeIds = activeRoutine.products.map((p) => p.productId);
    const current = ordersByRoutineId[routineId];
    // 렌더 중 조정 패턴(useEffect 대신)은 RoutineQuickRecordCard.tsx와 같은 이유로 씁니다
    // (React 19 lint 규칙 — set-state-in-effect 금지, 렌더 중 조건부 setState는 허용되는
    // "bail-out" 패턴). 아래 조건은 setState 후 반드시 거짓이 되므로 루프를 돌지 않습니다.
    if (current === undefined) {
      // 처음 이 루틴을 여는 경우 — 스토어 구성 그대로 초기화.
      setOrdersByRoutineId((prev) => ({ ...prev, [routineId]: activeRoutine.products }));
      setStoreSnapshotByRoutineId((prev) => ({ ...prev, [routineId]: storeIds }));
    } else {
      // 2026-08-15(세션5) — RoutineAddProductScreen에서 돌아오면(포커스 재획득 →
      // routinesQuery 재조회) 새로 담긴 제품만 병합합니다. 사용자가 로컬에서 바꿔둔
      // 순서·삭제는 그대로 둡니다. useEffect 안에서 refetch().then(...)으로 처리했던 첫
      // 버전은 addProductToRoutine의 자동 무효화-재조회와 타이밍이 겹쳐 반영 전 데이터로
      // 덮어써지는 경우가 있어서, 렌더마다 최신 데이터를 그대로 비교하는 방식입니다.
      const snapshot = storeSnapshotByRoutineId[routineId] ?? [];
      const snapshotIds = new Set(snapshot);
      const currentIds = new Set(current.map((p) => p.productId));
      const newlyAdded = activeRoutine.products.filter(
        (p) => !snapshotIds.has(p.productId) && !currentIds.has(p.productId)
      );
      if (newlyAdded.length > 0) {
        setOrdersByRoutineId((prev) => ({
          ...prev,
          [routineId]: [...(prev[routineId] ?? current), ...newlyAdded],
        }));
      }
      const snapshotStale =
        snapshot.length !== storeIds.length || storeIds.some((id) => !snapshotIds.has(id));
      if (snapshotStale) {
        setStoreSnapshotByRoutineId((prev) => ({ ...prev, [routineId]: storeIds }));
      }
    }
  }
  const order = activeRoutine ? ordersByRoutineId[activeRoutine.routineId] : undefined;

  // RoutineAddProductScreen 등에서 돌아왔을 때 서버 쪽 최신 루틴 구성을 다시 불러옵니다.
  // 실제 병합은 위 렌더 중 조정 블록이 담당합니다 — 여기서는 refetch만 트리거합니다.
  useFocusEffect(
    useCallback(() => {
      routinesQuery.refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeRoutineId])
  );

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

  const handleAddProduct = () => {
    if (!activeRoutine) return;
    navigation.navigate(DetailRoutes.RoutineAddProduct, {
      routineId: activeRoutine.routineId,
      timeSlot: activeRoutine.timeSlot,
    });
  };

  const handleSave = () => {
    // 2026-08-19(세션 18) — 예전엔 "저장 API가 없어 실제 반영 없음"이라 토스트만
    // 띄우고 편집 내용이 화면을 나가면 사라졌습니다. 루틴을 클라이언트가 소유하게
    // 되면서(store/routineStore.ts) 이제 실제로 반영됩니다.
    //
    // 활성 탭만이 아니라 **편집한 모든 루틴**을 커밋합니다 — 탭을 오가며 양쪽을
    // 고친 뒤 저장을 누르면 둘 다 반영돼야 합니다.
    const { reorder } = useRoutineStore.getState();
    Object.entries(ordersByRoutineId).forEach(([routineIdText, items]) => {
      const slot = timeSlotOfLocalRoutine(Number(routineIdText));
      if (!slot) return;
      reorder(
        slot,
        items.map((p) => p.productId)
      );
    });
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

        {/* "+ 제품 추가하기" — RoutineAddProductScreen(체크박스 다중 선택)으로 이동합니다
            (관리자님 지시, 2026-08-15 세션5). */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="제품 추가하기"
          onPress={handleAddProduct}
          style={styles.addButton}
        >
          <IconAdd size={16} color={color.brand700} />
          <Text style={styles.addButtonText}>제품 추가하기</Text>
        </Pressable>

        {/* 2026-08-19(세션 19) — 예전 문구는 "순서·삭제는 이 화면에서만 적용돼요.
            나가면 원래대로 돌아가요."였습니다. 세션 18에서 루틴을 클라이언트가 소유하게
            되면서 저장이 실제로 반영되기 시작했는데 문구가 그대로 남아 있었습니다.
            "어차피 안 되는 화면"으로 읽혀서 삭제가 정말 안 되는지 확인하기도 어려웠습니다. */}
        <Text style={styles.demoNote}>순서와 삭제는 아래 「저장」을 눌러야 반영돼요.</Text>
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
