// src/store/reportUiStore.ts
//
// S-19 리포트 화면 전용 UI 상태. REPORT_DATA_INSUFFICIENT(409) 안내 팝업을 세션 중
// 한 번만 보여주기 위한 상태입니다. 기간(7/30)·지표(4종) 조합별로 따로 기억하면
// 탭을 바꿀 때마다 다시 떠서(관리자 확인, 2026-08-10 — 데이터 부족은 지표와 무관하게
// 전체적인 상태이므로), 화면 전역으로 한 번만 기억합니다.
// zustand persist 미적용 — 앱을 껐다 켜면 다시 볼 수 있게 초기화됩니다.
import { create } from 'zustand';

interface ReportUiState {
  insufficientPopupSeen: boolean;
  markInsufficientPopupSeen: () => void;
  resetInsufficientPopupSeen: () => void;
}

export const useReportUiStore = create<ReportUiState>((set) => ({
  insufficientPopupSeen: false,
  markInsufficientPopupSeen: () => set({ insufficientPopupSeen: true }),
  resetInsufficientPopupSeen: () => set({ insufficientPopupSeen: false }),
}));
