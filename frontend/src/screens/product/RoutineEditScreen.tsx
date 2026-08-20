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
//
// ─────────────────────────────────────────────────────────────────────────────
// 2026-08-20(세션 21) — **제품 기록 수정 모드** 추가 (2번 항목, 관리자 결정)
//
// `route.params.recordEdit`가 있으면 이 화면은 루틴이 아니라 **특정 날짜·슬롯의 제품
// 기록**을 편집합니다. 별도 화면(ProductRecordEditScreen)을 만들었다가 폐기하고 이쪽으로
// 합쳤습니다 — 필요한 UI가 이미 여기 다 있고(목록·X 삭제·드래그·추가·저장/취소), 무엇보다
// **순서 변경이 기록에서도 실제 의미가 있습니다**: `ProductRecordService.update()`가 받은
// productIds 순서대로 `usageOrder`를 1부터 다시 매깁니다(158~167행).
//
// 두 모드의 차이는 세 곳뿐입니다.
//   1. 초기 목록   — 루틴: 스토어 / 기록: route.params.recordEdit.items
//   2. 탭          — 루틴: 모닝·나이트 전환 / 기록: 감춤(대상이 슬롯 하나로 고정)
//   3. 「저장」     — 루틴: routineStore.reorder() / 기록: PATCH /product-records/{id}
//
// ⚠️ 기록 모드에서 목록을 **route params로 받는 이유**: 저장 제품 목록
// (`GET /product-records/home`)은 `USING`만 주므로, 기록 당시엔 썼지만 나중에 찜 해제한
// 제품은 거기 없습니다. 그 제품을 목록에 못 그리면 사용자가 모르는 채로 저장 시 기록에서
// 사라집니다(PATCH는 전체 교체). 시트가 이미 productId+이름을 갖고 있으니 그대로 받습니다.
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
import { InlineErrorBanner } from '@/components/state/InlineErrorBanner';
import { IconAdd, IconBack } from '@/components/icons';
import { DraggableRoutineRow, ROW_HEIGHT } from '@/components/domain/DraggableRoutineRow';
import { useProductRecordHome, useRoutines, useUpdateProductRecord } from '@/api/queries/product';
import { ApiError } from '@/api/unwrap';
import { timeSlotOfLocalRoutine, useRoutineStore } from '@/store/routineStore';
import { DetailRoutes, DetailStackParamList } from '@/app/routes';
import { color, radius, space, typography } from '@/theme';
import { weightFamily } from '@/theme/typography';
import type { RoutineProductItem } from '@/types/product';

type NavProp = NativeStackNavigationProp<DetailStackParamList, 'RoutineEdit'>;

const SLOT_LABEL = { MORNING: '모닝', NIGHT: '나이트' } as const;

/** '2026-08-05' → '8월 5일'. 월간 기록 시트 타이틀과 같은 표기입니다. */
function formatDayTitle(date: string): string {
  const [, month, day] = date.split('-');
  return `${Number(month)}월 ${Number(day)}일`;
}

export function RoutineEditScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProp<DetailStackParamList, 'RoutineEdit'>>();
  const insets = useSafeAreaInsets();

  const routinesQuery = useRoutines();

  // ── 제품 기록 수정 모드 (2026-08-20, 세션 21) ────────────────────────────────
  const recordEdit = route.params.recordEdit;
  const isRecordMode = recordEdit !== undefined;
  const updateRecordMutation = useUpdateProductRecord();
  // 기록 모드에서 "제품 추가하기"로 담은 제품의 **이름**을 찾을 목록입니다.
  // 기록 모드가 아니면 조회하지 않습니다(enabled).
  const savedForRecord = useProductRecordHome(recordEdit?.timeSlot ?? 'MORNING', isRecordMode);
  const [recordOrder, setRecordOrder] = useState<RoutineProductItem[]>(() => recordEdit?.items ?? []);
  const [recordError, setRecordError] = useState<string | null>(null);
  // RoutineAddProductScreen이 navigate로 돌려준 productId를 한 번만 병합합니다.
  // 렌더 중 조정(bail-out) 패턴은 아래 루틴 모드 병합 블록과 같은 이유로 씁니다.
  const addedProductIds = route.params.addedProductIds;
  if (isRecordMode && addedProductIds && addedProductIds.length > 0) {
    const existing = new Set(recordOrder.map((p) => p.productId));
    const saved = savedForRecord.data?.savedProducts ?? [];
    const appended = addedProductIds
      .filter((id) => !existing.has(id))
      .map((id) => ({
        productId: id,
        // 이름을 못 찾는 경우는 사실상 없습니다(방금 그 목록에서 고른 제품이라).
        // 그래도 항목을 버리지는 않습니다 — routineStore 유령 제품 건과 같은 방침.
        name: saved.find((p) => p.productId === id)?.name ?? '알 수 없는 제품',
      }));
    if (appended.length > 0) {
      setRecordOrder((prev) => [...prev, ...appended]);
    }
    // 같은 값이 다음 렌더에서 또 병합되지 않도록 파라미터를 비웁니다.
    navigation.setParams({ addedProductIds: undefined });
  }

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
    if (isRecordMode) {
      setRecordOrder((current) => {
        const fromIndex = current.findIndex((p) => p.productId === productId);
        if (fromIndex === -1 || fromIndex === toIndex) return current;
        const next = [...current];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex, 0, moved);
        return next;
      });
      return;
    }
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
    if (isRecordMode) {
      setRecordError(null);
      setRecordOrder((current) => current.filter((p) => p.productId !== productId));
      return;
    }
    if (!activeRoutine) return;
    const id = activeRoutine.routineId;
    setOrdersByRoutineId((prev) => ({
      ...prev,
      [id]: (prev[id] ?? []).filter((p) => p.productId !== productId),
    }));
  };

  const handleAddProduct = () => {
    if (isRecordMode && recordEdit) {
      // 루틴을 건드리면 안 되므로 고른 제품을 돌려받기만 합니다(returnSelection).
      navigation.navigate(DetailRoutes.RoutineAddProduct, {
        routineId: route.params.routineId,
        timeSlot: recordEdit.timeSlot,
        returnSelection: true,
      });
      return;
    }
    if (!activeRoutine) return;
    navigation.navigate(DetailRoutes.RoutineAddProduct, {
      routineId: activeRoutine.routineId,
      timeSlot: activeRoutine.timeSlot,
    });
  };

  const handleSave = () => {
    if (isRecordMode && recordEdit) {
      if (updateRecordMutation.isPending) return;
      // 서버가 @NotEmpty로 막는 조건입니다. 400을 받고 나서 알리는 대신 미리 안내합니다 —
      // 기록 자체를 지우는 API가 없어서 "전부 빼기"는 어차피 불가능합니다.
      if (recordOrder.length === 0) {
        setRecordError('제품을 하나는 남겨주세요. 기록에서 제품을 전부 뺄 수는 없어요.');
        return;
      }
      setRecordError(null);
      updateRecordMutation.mutate(
        // 배열 순서가 그대로 usageOrder가 됩니다 — 드래그로 바꾼 순서가 서버에 반영됩니다.
        { recordId: recordEdit.recordId, productIds: recordOrder.map((p) => p.productId) },
        {
          onSuccess: () => setToastVisible(true),
          onError: (error) =>
            setRecordError(
              error instanceof ApiError
                ? error.message
                : '기록을 수정하지 못했어요. 다시 시도해 주세요.'
            ),
        }
      );
      return;
    }
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

  // 기록 모드는 루틴 조회 결과에 의존하지 않습니다 — 목록을 route params로 이미 받았고,
  // 저장 목록(savedForRecord)은 "추가한 제품 이름 찾기"에만 쓰여서 없어도 화면이 섭니다.
  if (!isRecordMode && routinesQuery.isLoading) {
    return <LoadingState variant="spinner" />;
  }

  if (!isRecordMode && (routinesQuery.isError || !routinesQuery.data || !activeRoutine || !order)) {
    return <ErrorState variant="network" onRetry={() => routinesQuery.refetch()} />;
  }

  // 화면이 실제로 그리는 목록. 두 모드의 차이를 여기서 한 번만 흡수합니다.
  const visibleOrder: RoutineProductItem[] = isRecordMode ? recordOrder : order ?? [];

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
          <Text style={styles.title}>
            {recordEdit ? `${formatDayTitle(recordEdit.date)} ${SLOT_LABEL[recordEdit.timeSlot]} 기록 수정` : '루틴 수정'}
          </Text>
        </View>

        {/* 기록 모드에선 탭을 감춥니다 — 편집 대상이 그 날짜의 한 슬롯으로 고정돼 있어서
            다른 루틴으로 건너뛸 수 없습니다. */}
        {!isRecordMode && (
        <View style={styles.tabRow}>
          {(routinesQuery.data ?? []).map((routine) => {
            const active = routine.routineId === activeRoutine?.routineId;
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
        )}
      </View>

      <View style={styles.listArea}>
        {visibleOrder.length === 0 ? (
          <Text style={styles.emptyText}>
            {isRecordMode ? '이 기록에 남은 제품이 없어요.' : '루틴에 남은 제품이 없어요.'}
          </Text>
        ) : (
          <View style={[styles.listContainer, { height: visibleOrder.length * ROW_HEIGHT }]}>
            {visibleOrder.map((product, index) => (
              <DraggableRoutineRow
                key={product.productId}
                product={product}
                index={index}
                itemCount={visibleOrder.length}
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
        <Text style={styles.demoNote}>
          {isRecordMode
            ? '순서와 삭제는 아래 「저장」을 눌러야 이 날 기록에 반영돼요.'
            : '순서와 삭제는 아래 「저장」을 눌러야 반영돼요.'}
        </Text>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + space[4] }]}>
        {recordError ? <InlineErrorBanner message={recordError} style={styles.errorBanner} /> : null}
        <View style={styles.footerRow}>
          <Button
            label="취소"
            variant="ghost"
            onPress={() => navigation.goBack()}
            style={styles.footerButton}
          />
          <Button
            label="저장"
            variant="primary"
            loading={isRecordMode && updateRecordMutation.isPending}
            onPress={handleSave}
            style={styles.footerButton}
          />
        </View>
      </View>

      <Toast
        visible={toastVisible}
        message={isRecordMode ? '기록이 수정됐어요' : '루틴이 업데이트됐어요'}
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
  // 2026-08-20(세션 21) — 기록 수정 모드의 에러 배너를 버튼 위에 놓으려고 footer를
  // 세로 컨테이너로 바꾸고, 기존 가로 배치는 footerRow로 내렸습니다. 루틴 모드는
  // 배너가 없어 보이는 결과가 예전과 같습니다.
  footer: {
    paddingHorizontal: space[5],
    paddingTop: space[3],
  },
  footerRow: {
    flexDirection: 'row',
    gap: space[3],
  },
  errorBanner: {
    marginBottom: space[2],
  },
  footerButton: {
    flex: 1,
  },
});
