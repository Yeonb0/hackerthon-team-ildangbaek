// src/hooks/useDebouncedValue.ts
//
// 값이 delay(ms) 동안 더 안 바뀌면 그 값을 반환합니다. 검색창처럼 타이핑마다
// 요청을 보내면 안 되는 곳에 씁니다 (F-PRODUCT-02 BR: 300ms 디바운스).
// Phase 7에서 제품 검색(S-12)에 처음 쓰지만, 화면에 종속되지 않게 훅으로
// 분리해뒀습니다 — Phase 7-2 구매 전 확인(S-21) 검색에서도 재사용할 수 있습니다.
import { useEffect, useState } from 'react';

export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
