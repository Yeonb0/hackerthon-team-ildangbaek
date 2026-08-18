// src/store/metricLabelStore.ts
//
// 지표 라벨 표기 모드. **시안 비교 전용 임시 상태입니다.**
//
// 경위(2026-08-18): 백엔드가 "모든 점수는 높을수록 좋음"으로 방향을 통일하면서,
// 화면 라벨을 「트러블」 대신 「트러블 안정도」처럼 긍정 방향으로 바꾸자고 제안했습니다.
// 프론트는 탭 4개가 한 줄이라 폭이 안 나온다는 이유로 개명 없이 가기로 했다가,
// **회의에서 두 안을 실제 화면으로 비교하기로** 방침이 바뀌었습니다.
//
// 그래서 세 모드를 런타임으로 전환합니다. 회의에서 안이 확정되면 이 스토어와
// lib/metricLabels.ts의 모드 분기를 지우고 확정안 문자열만 남기면 됩니다.
//
//   plain        — 현행. 트러블 / 홍조 / 모공 / 색소침착
//   positiveWide — 넓은 자리만 개명. 탭·레이더는 짧은 이름 유지
//   positiveAll  — 전면 개명. 탭·레이더까지 「트러블 안정도」
//
// persist 미적용 — devUiStore와 같은 이유입니다. 앱을 껐다 켜면 항상 현행(plain)으로
// 돌아와야, 시안 모드가 켜진 걸 실제 화면으로 착각하는 일이 없습니다.
import { create } from 'zustand';

export type MetricLabelMode = 'plain' | 'positiveWide' | 'positiveAll';

/** 토글 UI가 도는 순서. 회의 중 한 버튼으로 순환시키기 위해 배열로 둡니다. */
export const METRIC_LABEL_MODES: MetricLabelMode[] = ['plain', 'positiveWide', 'positiveAll'];

export const METRIC_LABEL_MODE_TITLE: Record<MetricLabelMode, string> = {
  plain: '현행 (트러블)',
  positiveWide: '개명 A — 넓은 자리만',
  positiveAll: '개명 B — 전면',
};

interface MetricLabelState {
  mode: MetricLabelMode;
  setMode: (mode: MetricLabelMode) => void;
  cycleMode: () => void;
}

export const useMetricLabelStore = create<MetricLabelState>((set) => ({
  mode: 'plain',
  setMode: (mode) => set({ mode }),
  cycleMode: () =>
    set((state) => ({
      mode: METRIC_LABEL_MODES[
        (METRIC_LABEL_MODES.indexOf(state.mode) + 1) % METRIC_LABEL_MODES.length
      ],
    })),
}));
