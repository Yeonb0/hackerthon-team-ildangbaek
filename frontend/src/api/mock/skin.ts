// src/api/mock/skin.ts
//
// 목업 원본 데이터. 지표 4개(trouble/redness/pores/pigmentation)는 관리자 확인
// (2026-08-09, 프로젝트 지식 문서 기준) — 실제 값이 다르게 확정되면 이 파일만
// 고치면 됩니다 (types/skin.ts 코멘트 참고).
import type { SkinRecordResult } from '@/types/skin';
import type { TimeSlot } from '@/app/routes';

/**
 * 첫 기록(comparison === null) 여부 전환용 목업 시나리오.
 *
 * S-18은 `comparison`이 null이면 FirstSkinResult(첫 기록 축하) 화면으로, 있으면
 * TodaySkin으로 갈라집니다. 목업은 항상 comparison을 채우기 때문에 첫 기록 화면을
 * 실기기에서 볼 방법이 없었습니다 — 실제로 첫 기록을 보려면 계정을 새로 만들어야 하고,
 * 목업 환경에는 그런 경로 자체가 없습니다. DevResetButton에서 전환합니다.
 */
export type MockSkinScenario = 'COMPARED' | 'FIRST';

let skinScenario: MockSkinScenario = 'COMPARED';

export function setMockSkinScenario(scenario: MockSkinScenario): void {
  skinScenario = scenario;
}

export function buildMockSkinRecordResult(timeSlot: TimeSlot): SkinRecordResult {
  return {
    skinRecordId: Math.floor(Math.random() * 1000),
    timeSlot,
    capturedAt: new Date().toISOString(),
    // 2026-08-18 — 점수 방향이 "높을수록 좋음"으로 확정되면서(관리자 확정 + 백엔드
    // ai-server/app/metrics.py 일치) Figma 실측값을 그대로 쓰면 등급이 뒤집혀
    // 데모가 나쁜 피부로 보입니다. 그래서 세션 13의 값을 100에서 뺀 대칭값으로
    // 옮겼습니다 — 어느 지표가 가장 나쁜지(홍조)는 그대로 유지됩니다.
    //   세션 13 값: 트러블 38 · 홍조 62 · 모공 44 · 색소잡티 55 (낮을수록 좋음 기준)
    //   현재   값: 트러블 62 · 홍조 38 · 모공 56 · 색소잡티 45 (높을수록 좋음 기준)
    // totalScore는 4지표 단순 평균(ADR 0008) — (62+38+56+45)/4 = 50.25 ≈ 50입니다.
    // ⚠️ Figma TodaySkin(118:9423)과 숫자를 직접 대조하면 어긋납니다. 그 화면이
    //    반대 방향을 전제로 그려졌기 때문이고, 배치·레이아웃 대조에는 문제없습니다.
    totalScore: 50,
    scores: {
      trouble: 62,
      redness: 38,
      pores: 56,
      pigmentation: 45,
    },
    // SKIN-01 BR3 — 첫 기록이거나 비교 대상이 없으면 null입니다(오류가 아닙니다).
    comparison:
      skinScenario === 'FIRST'
        ? null
        : {
            comparedTo: `어제 ${timeSlot === 'MORNING' ? '모닝' : '나이트'}`,
            previousTotalScore: 46,
            // 지표는 높을수록 좋으므로 양수가 개선입니다(2026-08-18 확정).
            // 세션 13의 증감(트러블 -6 개선 · 홍조 +3 악화 등)과 같은 이야기를
            // 유지하려고 부호만 뒤집었습니다.
            changes: {
              trouble: 6,
              redness: -3,
              pores: 2,
              pigmentation: -1,
            },
          },
  };
}

/**
 * REPORT-03 목업 — 월간 기록 바텀시트 "자세히 보기"로 지난 날짜를 열었을 때.
 *
 * ⚠️ **바텀시트가 보여주는 총점과 반드시 같아야 합니다.** 시트에 "종합 점수 72"라고
 * 적혀 있는데 자세히 보기를 눌렀더니 50이 뜨면 데모에서 바로 티가 납니다. 그래서
 * `mock/record.ts`의 `buildMockRecordDayDetail`이 쓰는 것과 **같은 식**(`68 + 일자 % 20`)으로
 * 총점을 만들고, 지표 4종은 그 총점을 중심으로 흩뿌립니다.
 *
 * 지표 편차는 `buildMockSkinRecordResult`의 상대 관계(홍조가 가장 나쁘고 트러블이 가장
 * 좋음)를 그대로 유지합니다 — 오늘 것과 지난 날짜가 서로 다른 이야기를 하면 안 됩니다.
 * 4지표 평균이 총점과 맞도록 편차 합이 0입니다(ADR 0008 단순 평균).
 *
 * 기록이 없는 날은 `null`입니다(실서버의 빈 배열에 대응) — 시트가 `skinScore: null`인
 * 날은 "자세히 보기" 자체를 안 그리므로 정상 흐름에선 도달하지 않지만, 방어적으로 둡니다.
 */
export function buildMockSkinRecordResultForDate(
  date: string,
  timeSlot: TimeSlot,
): SkinRecordResult | null {
  const day = Number(date.slice(-2));
  if (Number.isNaN(day)) return null;

  const totalScore = 68 + (day % 20);
  // 합이 0인 편차 — 평균이 totalScore와 정확히 일치합니다.
  const OFFSETS: Record<string, number> = {
    trouble: 12,
    redness: -12,
    pores: 6,
    pigmentation: -6,
  };
  const clamp = (n: number) => Math.max(0, Math.min(100, n));

  return {
    skinRecordId: day,
    timeSlot,
    capturedAt: `${date}T${timeSlot === 'MORNING' ? '08:20' : '22:40'}:00.000Z`,
    totalScore,
    scores: {
      trouble: clamp(totalScore + OFFSETS.trouble),
      redness: clamp(totalScore + OFFSETS.redness),
      pores: clamp(totalScore + OFFSETS.pores),
      pigmentation: clamp(totalScore + OFFSETS.pigmentation),
    },
    comparison: {
      comparedTo: `이전 ${timeSlot === 'MORNING' ? '모닝' : '나이트'}`,
      previousTotalScore: totalScore - 2,
      // 지표는 높을수록 좋으므로 양수가 개선입니다(2026-08-18 확정).
      changes: { trouble: 3, redness: -1, pores: 2, pigmentation: 0 },
    },
  };
}

/** 지연 시뮬레이션 — S-17의 단계 문구 순환이 데모에서도 실제로 보이도록 살짝 기다립니다. */
export function mockSkinAnalysisDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 1800));
}