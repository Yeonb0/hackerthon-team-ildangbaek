// src/store/routineStore.ts
//
// 2026-08-19(세션 18, 관리자님 A안 결정) — **루틴을 클라이언트가 소유합니다.**
//
// ─────────────────────────────────────────────────────────────────────────────
// 왜 이렇게 됐나
//
// 백엔드 `origin/main` 전수 확인 결과, **루틴을 만드는 코드 경로가 존재하지 않습니다.**
//   · `routineRepository.save(...)` — 0건
//   · `Routine.builder()` — 0건
//   · 루틴 생성/수정 엔드포인트 — 없음 (`RoutineController`는 조회와 바로기록 둘뿐)
//   · 운영 시드 SQL — 없음 (`.sql`은 전부 `src/test/resources`)
// `RoutineService.getRoutines()`는 결과가 비면 그냥 `List.of()`를 돌려주고 자동 생성
// 분기가 없습니다. 즉 실서버 계정은 **루틴이 0개이고 만들 방법도 없습니다.**
//
// 그동안 목업에 「모닝루틴」/「나이트루틴」이 하드코딩돼 있어서 이 사실이 가려져 있었고,
// 실서버에 붙자마자 루틴 UI가 전부(제품 등록 칩·자주 쓰는 루틴 섹션·홈 추천) 사라졌습니다.
//
// ─────────────────────────────────────────────────────────────────────────────
// 설계
//
// **루틴 2개(모닝·나이트)는 항상 존재합니다.** 제품이 0개여도 루틴 자체는 있고, 사용자는
// 그 안에서 제품을 넣고 뺄 뿐입니다(관리자님 확정). 그래서 이 스토어는 "루틴 목록"이
// 아니라 **루틴별 productId 배열**만 들고 있습니다 — 생성·삭제 개념이 없습니다.
//
// `routineId`는 서버가 준 값이 아니라 아래 고정 상수입니다. 나중에 백엔드에 루틴 API가
// 생기면 `useRoutines`가 서버 응답을 우선 쓰도록 바꾸고 이 스토어는 폴백으로 남기거나
// 지우면 됩니다 — 화면 코드는 `RoutineListItem`만 보므로 손댈 필요가 없습니다.
//
// ⚠️ **제품 메타데이터(이름·브랜드)는 여기 저장하지 않습니다.** productId만 들고,
// 이름은 서버의 저장 제품 목록에서 조회해 붙입니다. 이름을 복사해 두면 제품 정보가
// 바뀌었을 때 루틴 안에서만 옛 이름이 남습니다.
//
// ⚠️ SecureStore는 값 하나당 2048바이트 제한이 있습니다(안드로이드). 여기 들어가는 건
// 숫자 배열 둘뿐이라(제품 하나에 5~7바이트) 수백 개까지 여유가 있습니다.
import { create } from 'zustand';
import { getItem, setItem } from '@/lib/platformStorage';
import type { TimeSlot } from '@/app/routes';

/** SecureStore 키에는 콜론을 쓰지 않습니다(프로젝트 규약). */
const ROUTINE_STORAGE_KEY = 'skinteller.routines.products';

/**
 * 고정 루틴 식별자. 서버 값이 아니라 클라이언트 상수입니다.
 * 실서버 루틴이 생기면 ID가 충돌할 수 있어 일반적인 서버 시퀀스와 겹치지 않는
 * 큰 값을 씁니다 — 화면에서 "이건 로컬 루틴"임을 구분할 수 있는 표식이기도 합니다.
 */
export const LOCAL_ROUTINE_ID = {
  MORNING: 900001,
  NIGHT: 900002,
} as const;

export const LOCAL_ROUTINE_NAME: Record<TimeSlot, string> = {
  MORNING: '모닝루틴',
  NIGHT: '나이트루틴',
};

export function isLocalRoutineId(routineId: number): boolean {
  return routineId === LOCAL_ROUTINE_ID.MORNING || routineId === LOCAL_ROUTINE_ID.NIGHT;
}

export function timeSlotOfLocalRoutine(routineId: number): TimeSlot | null {
  if (routineId === LOCAL_ROUTINE_ID.MORNING) return 'MORNING';
  if (routineId === LOCAL_ROUTINE_ID.NIGHT) return 'NIGHT';
  return null;
}

type RoutineProducts = Record<TimeSlot, number[]>;

interface RoutineState {
  products: RoutineProducts;
  /** 저장소에서 값을 읽어왔는지. false면 아직 빈 배열일 수 있습니다. */
  hydrated: boolean;
  /** 이미 들어있으면 무시합니다(중복 추가 방지). */
  addProduct: (timeSlot: TimeSlot, productId: number) => void;
  removeProduct: (timeSlot: TimeSlot, productId: number) => void;
  /** 두 루틴 모두에서 제거 — 제품 자체를 삭제할 때 씁니다. */
  removeProductEverywhere: (productId: number) => void;
  /** 드래그 정렬 결과 반영(RoutineEditScreen). 순서가 곧 루틴 순서입니다. */
  reorder: (timeSlot: TimeSlot, productIds: number[]) => void;
  reset: () => void;
  hydrate: () => Promise<void>;
}

const EMPTY: RoutineProducts = { MORNING: [], NIGHT: [] };

/** 저장 실패는 화면 동작을 막지 않습니다 — 다음 변경 때 다시 시도됩니다. */
function persist(products: RoutineProducts): void {
  setItem(ROUTINE_STORAGE_KEY, JSON.stringify(products)).catch((error) => {
    if (__DEV__) console.warn('[routineStore] 저장 실패', error);
  });
}

export const useRoutineStore = create<RoutineState>((set, get) => ({
  products: EMPTY,
  hydrated: false,

  addProduct: (timeSlot, productId) => {
    const current = get().products;
    if (current[timeSlot].includes(productId)) return;
    const next = { ...current, [timeSlot]: [...current[timeSlot], productId] };
    set({ products: next });
    persist(next);
  },

  removeProduct: (timeSlot, productId) => {
    const current = get().products;
    const next = { ...current, [timeSlot]: current[timeSlot].filter((id) => id !== productId) };
    set({ products: next });
    persist(next);
  },

  removeProductEverywhere: (productId) => {
    const current = get().products;
    const next: RoutineProducts = {
      MORNING: current.MORNING.filter((id) => id !== productId),
      NIGHT: current.NIGHT.filter((id) => id !== productId),
    };
    set({ products: next });
    persist(next);
  },

  reorder: (timeSlot, productIds) => {
    const next = { ...get().products, [timeSlot]: [...productIds] };
    set({ products: next });
    persist(next);
  },

  reset: () => {
    set({ products: EMPTY });
    persist(EMPTY);
  },

  hydrate: async () => {
    try {
      const raw = await getItem(ROUTINE_STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        // 저장 포맷이 바뀌었거나 값이 깨진 경우를 걸러냅니다 — 파싱만 통과하고 형태가
        // 다른 값이 화면까지 흘러가면 렌더에서 터집니다(wishlistStore와 같은 방어).
        if (parsed && typeof parsed === 'object') {
          const candidate = parsed as Partial<RoutineProducts>;
          const pick = (v: unknown): number[] =>
            Array.isArray(v) ? v.filter((n): n is number => typeof n === 'number') : [];
          set({
            products: { MORNING: pick(candidate.MORNING), NIGHT: pick(candidate.NIGHT) },
          });
        }
      }
    } catch (error) {
      if (__DEV__) console.warn('[routineStore] 불러오기 실패', error);
    } finally {
      set({ hydrated: true });
    }
  },
}));

// 모듈이 처음 import될 때 한 번만 읽습니다(wishlistStore와 같은 이유 — 화면이 그려지기
// 전에 확정돼야 하는 값이 아니라, 조금 늦게 채워져도 목록이 갱신될 뿐입니다).
void useRoutineStore.getState().hydrate();

/** 특정 시간대 루틴의 productId 목록. 셀렉터로 구독해 그 화면만 리렌더됩니다. */
export function useRoutineProductIds(timeSlot: TimeSlot): number[] {
  return useRoutineStore((s) => s.products[timeSlot]);
}
