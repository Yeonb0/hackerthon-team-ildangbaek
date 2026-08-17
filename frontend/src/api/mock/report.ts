// src/api/mock/report.ts
import { ApiError } from '@/api/unwrap';
import { ErrorCode } from '@/types/errorCodes';
import type {
  ReportPeriod,
  MetricKey,
  ReportResult,
  InsightDetail,
  InsightSummary,
  GraphPoint,
  ReportSummaryResult,
  MetricScoreSummary,
} from '@/types/report';

export type MockReportScenario = 'sufficient' | 'insufficient';

// 목업 세션 상태 — DevResetButton "리포트 목업" 메뉴에서 눌러 바꿉니다.
// record.ts의 mockSkinCompletions와 같은 방식(세션 한정 메모리, 앱 재시작 시 초기화).
// 예전엔 EXPO_PUBLIC_MOCK_REPORT_INSUFFICIENT 환경변수 + 앱 재시작으로 전환했는데,
// 매번 재시작해야 해서 관리자님 요청으로 앱 안에서 바로 전환 가능하게 바꿨습니다.
let mockReportScenario: MockReportScenario = 'sufficient';

export function setMockReportScenario(scenario: MockReportScenario): void {
  mockReportScenario = scenario;
}

export function getMockReportScenario(): MockReportScenario {
  return mockReportScenario;
}

const METRIC_BASE_SCORE: Record<MetricKey, number> = {
  trouble: 74,
  redness: 66,
  pores: 70,
  pigmentation: 80,
};

/**
 * 3일에 한 번은 두 슬롯 모두 결측(null)을 섞고, 4일에 한 번은 나이트만 비워서
 * 화면이 "하루 중 한쪽만 기록한 날"까지 늘 마주치도록 합니다 (ADR 0012·0013).
 */
function buildMockGraph(period: ReportPeriod, base: number): GraphPoint[] {
  const points: GraphPoint[] = [];
  const today = new Date();
  for (let i = period - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
    const score = i % 3 === 0 ? null : Math.max(40, Math.min(95, base + Math.round(Math.sin(i) * 12)));
    points.push({
      date,
      morningScore: score === null ? null : Math.max(40, Math.min(95, score - 4)),
      nightScore: score === null || i % 4 === 0 ? null : score,
    });
  }
  return points;
}

const MOCK_INSIGHTS: InsightSummary[] = [
  {
    insightId: 101,
    type: 'INGREDIENT',
    title: '레티놀',
    description: '레티놀 세럼 사용 후 2일 뒤 트러블이 반복적으로 증가해요',
    confidence: 'OBSERVED',
  },
  {
    insightId: 102,
    type: 'ENVIRONMENT',
    title: '자외선',
    description: '자외선 높은 날 다음 날 홍조 수치가 높아져요',
    confidence: 'OBSERVED',
  },
  {
    insightId: 103,
    type: 'INGREDIENT',
    title: '나이아신아마이드',
    description: '재시작 후 트러블 개선 추세를 확인하는 중이에요',
    confidence: 'OBSERVING',
  },
];

/** REPORT-01 목업. 시나리오가 'insufficient'면 409를 그대로 재현합니다. */
export function buildMockReport(period: ReportPeriod, metric: MetricKey): ReportResult {
  if (mockReportScenario === 'insufficient') {
    throw new ApiError(
      ErrorCode.REPORT_DATA_INSUFFICIENT,
      '리포트를 만들 데이터가 아직 부족해요.'
    );
  }
  return {
    period,
    metric,
    graph: buildMockGraph(period, METRIC_BASE_SCORE[metric]),
    insights: MOCK_INSIGHTS,
    failedSections: [],
  };
}

// Figma 컬러 최종본(210:2437) 실측값을 그대로 씁니다 — 관리자가 화면에서 직접
// 대조할 수 있도록 목업 숫자를 임의로 바꾸지 않았습니다.
const MOCK_SUMMARY_METRICS: MetricScoreSummary[] = [
  { metric: 'trouble', score: 38, delta: -1 },
  { metric: 'redness', score: 34, delta: 1 },
  { metric: 'pigmentation', score: 47, delta: -2 },
  { metric: 'pores', score: 40, delta: 3 },
];

function buildMockTotalGraph(period: ReportPeriod): { date: string; score: number | null }[] {
  const today = new Date();
  const points: { date: string; score: number | null }[] = [];
  for (let i = period - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
    // 마지막 점을 78(Figma 실측)로 맞추고 그 앞은 완만한 사인 곡선으로 채웁니다.
    const score = i === 0 ? 78 : Math.max(50, Math.min(90, 78 + Math.round(Math.sin(i * 0.9) * 10)));
    points.push({ date, score: i % 5 === 4 ? null : score });
  }
  return points;
}

/**
 * REPORT-01 "기간 집계 종합 점수" 목업 — ⚠️ 백엔드 필드 미확정(types/report.ts
 * ReportSummaryResult 주석 참고). USE_MOCK 토글과 무관하게 항상 이 함수만 씁니다 —
 * 백엔드 필드가 실제로 생기기 전까지는 실서버를 호출할 수 없기 때문입니다.
 * 백엔드 확정 후 api/queries/report.ts의 getReportSummary에서 실 API 분기를 추가하세요.
 */
export function buildMockReportSummary(period: ReportPeriod): ReportSummaryResult {
  return {
    period,
    totalScore: 78,
    totalDelta: -2,
    metrics: MOCK_SUMMARY_METRICS,
    graph: buildMockTotalGraph(period),
  };
}

/** REPORT-02 목업. insightId로 MOCK_INSIGHTS에서 찾아 상세를 구성합니다. */
export function buildMockInsightDetail(insightId: number): InsightDetail {
  const source = MOCK_INSIGHTS.find((item) => item.insightId === insightId) ?? MOCK_INSIGHTS[0];
  return {
    insightId: source.insightId,
    type: source.type,
    metric: 'trouble',
    title: `${source.title} 추이`,
    subtitle: '최근 30일 · 이벤트와 상관관계',
    graph: buildMockGraph(30, METRIC_BASE_SCORE.trouble),
    events: [
      {
        date: '2026-07-10',
        label: '독도어성초크림 첫 사용',
        impact: '이후 2일 뒤 트러블 수치 +18',
        confidence: 'OBSERVED',
      },
      {
        date: '2026-07-22',
        label: '자외선 지수 9 이상 3일 연속',
        impact: '이후 홍조 수치 +12',
        confidence: 'OBSERVED',
      },
      {
        date: '2026-08-01',
        label: '나이아신아마이드 세럼 재시작',
        impact: '트러블 개선 추세 확인 중',
        confidence: 'OBSERVING',
      },
    ],
  };
}
