// src/store/dayNightStore.ts
//
// 낮/밤 수동 토글 상태. 로드맵 4-3 확정 결정 그대로 구현합니다.
// - mode: 'auto'면 GET /home에 homeType 파라미터를 안 보내서 서버가 현재 시각으로 판정합니다.
//   'day'/'night'면 토글이 그 값을 강제합니다(서버 자동 판정을 덮어씀 — HOME-01 BR).
// - manualSetAt: 수동으로 전환한 시각(ms). 지금 로직에서 직접 쓰이진 않지만, 나중에
//   "수동 전환 후 N시간 지나면 자동으로 복귀" 같은 정책이 추가될 걸 대비해 남겨둡니다
//   (로드맵 dayNightStore 예시에 있던 필드 그대로 유지).
//
// TBD-03(명세서) — 이 상태를 서버에 저장할지 미정이라 지금은 클라이언트 메모리에만 둡니다.
// 앱을 껐다 켜면 항상 'auto'로 돌아갑니다. 서버 저장이 필요해지면 PATCH /users/me/home-preference
// 연동을 이 스토어의 setManual/setAuto 안에 추가하면 됩니다.
import { create } from 'zustand';

export type DayNightMode = 'auto' | 'day' | 'night';

interface DayNightState {
  mode: DayNightMode;
  manualSetAt: number | null;
  setAuto: () => void;
  setManual: (mode: 'day' | 'night') => void;
}

export const useDayNightStore = create<DayNightState>((set) => ({
  mode: 'auto',
  manualSetAt: null,
  setAuto: () => set({ mode: 'auto', manualSetAt: null }),
  setManual: (mode) => set({ mode, manualSetAt: Date.now() }),
}));
