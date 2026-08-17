// src/store/cartStore.ts
//
// 2026-08-17(세션 12) — 쇼핑 장바구니. 관리자 결정: 재시작 후에도 유지되어야 해서
// fontStore와 같은 패턴으로 platformStorage(SecureStore / 웹 localStorage)에 저장합니다.
// (dayNightStore·weekStartStore는 메모리 전용이라 이 패턴과 다릅니다.)
//
// ⚠️ 백엔드 API가 없습니다. api_명세서.md에 장바구니 엔드포인트가 전혀 없어서 완전히
// 클라이언트 전용입니다 — 기기를 바꾸면 목록이 따라오지 않습니다. 서버 연동이 필요하면
// docs/design-request-cart.md에 적어둔 요청 내용을 참고해서 add/remove 안에 mutation을
// 끼워 넣으면 됩니다.
//
// ⚠️ SecureStore는 값 하나당 2048바이트 제한이 있습니다(안드로이드). 제품 하나가 대략
// 80~120바이트라 MAX_ITEMS를 30으로 잡아 여유를 뒀습니다. 가득 찬 상태에서 담으면
// 가장 오래된 항목이 밀려나갑니다 — 조용히 사라지면 혼란스러우니 호출부에서 결과를
// 보고 안내할 수 있게 add()가 밀려난 개수를 반환합니다.
import { create } from 'zustand';
import { getItem, setItem } from '@/lib/platformStorage';

const CART_STORAGE_KEY = 'skinteller.cart.items';
const MAX_ITEMS = 30;

export interface CartItem {
  productId: number;
  name: string;
  brand: string;
  /** 담은 시각(ms). 목록을 최근 담은 순으로 보여주는 데 씁니다. */
  addedAt: number;
}

interface CartState {
  items: CartItem[];
  /** 저장소에서 값을 읽어왔는지. false면 아직 빈 배열일 수 있습니다(로딩 표시용). */
  hydrated: boolean;
  /** @returns 용량 초과로 밀려난 항목 수(0이면 정상) */
  add: (item: Omit<CartItem, 'addedAt'>) => number;
  remove: (productId: number) => void;
  clear: () => void;
  hydrate: () => Promise<void>;
}

/** 저장은 실패해도 화면 동작을 막지 않습니다 — 다음 변경 때 다시 시도됩니다. */
function persist(items: CartItem[]): void {
  setItem(CART_STORAGE_KEY, JSON.stringify(items)).catch((error) => {
    if (__DEV__) console.warn('[cartStore] 저장 실패', error);
  });
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  hydrated: false,

  add: (item) => {
    const current = get().items;
    // 이미 담긴 제품은 중복으로 넣지 않습니다(담기 버튼이 토글이라 여기 오지 않는 게
    // 정상이지만, 여러 화면에서 호출될 수 있어 방어적으로 둡니다).
    if (current.some((i) => i.productId === item.productId)) return 0;

    const next = [{ ...item, addedAt: Date.now() }, ...current];
    const overflow = Math.max(0, next.length - MAX_ITEMS);
    const trimmed = overflow > 0 ? next.slice(0, MAX_ITEMS) : next;
    set({ items: trimmed });
    persist(trimmed);
    return overflow;
  },

  remove: (productId) => {
    const next = get().items.filter((i) => i.productId !== productId);
    set({ items: next });
    persist(next);
  },

  clear: () => {
    set({ items: [] });
    persist([]);
  },

  hydrate: async () => {
    try {
      const raw = await getItem(CART_STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // 저장 포맷이 바뀌었거나 값이 깨진 경우를 걸러냅니다 — 파싱만 통과하고
          // 필드가 없는 객체가 화면까지 흘러가면 렌더에서 터집니다.
          const items = (parsed as CartItem[]).filter(
            (i) => typeof i?.productId === 'number' && typeof i?.name === 'string'
          );
          set({ items });
        }
      }
    } catch (error) {
      if (__DEV__) console.warn('[cartStore] 불러오기 실패', error);
    } finally {
      set({ hydrated: true });
    }
  },
}));

// 모듈이 처음 import될 때 한 번만 읽습니다. fontStore처럼 부팅 게이트를 따로 두지 않은
// 이유는, 장바구니는 글꼴과 달리 "화면이 그려지기 전에 확정돼야 하는 값"이 아니라
// 조금 늦게 채워져도 문제가 없기 때문입니다(개수 배지가 0 → 실제 값으로 갱신될 뿐).
void useCartStore.getState().hydrate();

/** 특정 제품이 장바구니에 있는지. 셀렉터로 구독해서 그 제품 카드만 리렌더됩니다. */
export function useIsInCart(productId: number): boolean {
  return useCartStore((s) => s.items.some((i) => i.productId === productId));
}

/** 장바구니 담긴 개수 (아이콘 배지용). */
export function useCartCount(): number {
  return useCartStore((s) => s.items.length);
}
