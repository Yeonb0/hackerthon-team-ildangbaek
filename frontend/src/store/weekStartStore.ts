// src/store/weekStartStore.ts
//
// 캘린더/주간 스트립의 "주 시작 요일" 설정. dayNightStore와 같은 패턴 — 서버로 보내지
// 않고 클라이언트 메모리에만 둡니다(관리자님 결정, 2026-08-15). 앱을 껐다 켜면 항상
// 기본값(월요일)으로 돌아갑니다. 서버 저장이 필요해지면 setWeekStart 안에 PATCH 연동을
// 추가하면 됩니다.
//
// 적용 범위 3곳:
// - RecordCalendar(월간 기록 화면), RecordWeekStrip(기록 홈 주간 스트립) — 둘 다 프론트가
//   날짜를 직접 계산해서 이 스토어 값이 즉시 반영됩니다.
// - WeeklyRecordStrip(밤 홈 주간 스트립) — 실제 날짜 범위를 GET /home이 서버에서 계산해
//   내려주는 구조라, USE_MOCK=true일 때는 이 스토어 값을 그대로 반영하지만 실서버 연동은
//   백엔드가 weekStart 파라미터를 지원해야 정확해집니다
//   (요청서: backend-request-weekly-calendar-week-start.md).
import { create } from 'zustand';
import type { WeekStart } from '@/lib/date';

interface WeekStartState {
  weekStart: WeekStart;
  setWeekStart: (weekStart: WeekStart) => void;
}

export const useWeekStartStore = create<WeekStartState>((set) => ({
  weekStart: 'MONDAY',
  setWeekStart: (weekStart) => set({ weekStart }),
}));
