// src/api/mock/report.ts
import { ApiError } from '@/api/unwrap';
import { ErrorCode } from '@/types/errorCodes';
import type {
  ReportPeriod,
  MetricKey,
  ReportResult,
  InsightDetail,
  InsightSummary,
  InsightEventKind,
  GraphPoint,
  ReportSummaryResult,
  MetricScoreSummary,
  Confidence,
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
 *
 * dayCount는 REPORT-01의 period(7|30)뿐 아니라 REPORT-02의 인사이트 창(14일)에도
 * 쓰이므로 ReportPeriod가 아니라 number를 받습니다.
 *
 * ⚠️ 첫날·마지막날은 항상 값을 채웁니다(2026-08-17). 곡선은 유효한 점끼리만 잇기
 * 때문에 양 끝이 결측이면 그만큼 안쪽에서 시작·끝나서, 화면마다 그래프 가로 폭이
 * 제각각으로 보였습니다(관리자 제보). 데모에서 "오늘"과 "기간 시작일"엔 기록이 있는
 * 게 자연스러운 기본 상태라 목업에서만 보정합니다 — 차트 쪽 로직(결측은 안 그림)은
 * 실데이터 규칙 그대로 둡니다.
 */
function buildMockGraph(dayCount: number, base: number): GraphPoint[] {
  const points: GraphPoint[] = [];
  const today = new Date();
  for (let i = dayCount - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
    const isEdge = i === dayCount - 1 || i === 0;
    const score =
      !isEdge && i % 3 === 0 ? null : Math.max(40, Math.min(95, base + Math.round(Math.sin(i) * 12)));
    points.push({
      date,
      morningScore: score === null ? null : Math.max(40, Math.min(95, score - 4)),
      nightScore: score === null || (!isEdge && i % 4 === 0) ? null : score,
    });
  }
  return points;
}

const MOCK_INSIGHTS: InsightSummary[] = [
  {
    insightId: 101,
    type: 'INGREDIENT',
    title: '레티놀 세럼',
    description: '레티놀 세럼 사용 후 2일 트러블이 반복적으로 증가해요',
    confidence: 'OBSERVED',
  },
  {
    insightId: 102,
    type: 'ENVIRONMENT',
    title: '자외선 지수',
    description: '자외선 높은 날 다음 날 홍조 수치가 평균 12% 높아져요',
    confidence: 'OBSERVED',
  },
  {
    insightId: 103,
    type: 'INGREDIENT',
    title: '히알루론산',
    description: '히알루론산 세럼 연속 사용 시 모공 점수가 개선돼요',
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
    summary: buildMockReportSummary(period),
  };
}

// 2026-08-18 — 점수 방향 "높을수록 좋음" 확정에 맞춰 Figma 실측값(210:2437)을 100에서
// 뺀 대칭값으로 옮기고 delta 부호를 뒤집었습니다. mock/skin.ts와 같은 처리입니다.
//   Figma 값: 트러블 38 ▼1 · 홍조 34 ▲1 · 색소잡티 47 ▼2 · 모공 40 ▲3
// ⚠️ 따라서 Figma와 숫자를 직접 대조하면 어긋납니다(그 화면은 반대 방향 전제).
//    레이아웃·색 규칙 대조에는 문제없습니다.
const MOCK_SUMMARY_METRICS: MetricScoreSummary[] = [
  { metric: 'trouble', score: 62, delta: 1 },
  { metric: 'redness', score: 66, delta: -1 },
  { metric: 'pigmentation', score: 53, delta: 2 },
  { metric: 'pores', score: 60, delta: -3 },
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
    // 첫날·마지막날은 항상 값을 채웁니다 — buildMockGraph의 같은 주석 참고
    // (양 끝 결측이면 그래프 가로 폭이 화면마다 달라 보임).
    const isEdge = i === period - 1 || i === 0;
    points.push({ date, score: !isEdge && i % 5 === 4 ? null : score });
  }
  return points;
}

/**
 * REPORT-01 "기간 집계 종합 점수" 목업. buildMockReport가 항상 같이 호출해서
 * ReportResult.summary로 넣습니다(실 API도 같은 응답 안에 함께 옵니다 — 2026-08-17
 * 백엔드 REPORT-01에 필드 추가 완료, api/queries/report.ts의 getReport 참고).
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

/** REPORT-02 목업 — 인사이트별로 지표·이벤트를 다르게 매핑합니다(2026-08-17, 종합
 * 점수/항목별 추이 그래프에 "이벤트 있는 날" 점을 찍는 기능 실측용). 예전엔 모든
 * insightId가 metric:'trouble' 고정 + 이벤트 3개 전부 동일했는데, 그러면 리포트 홈에서
 * 다른 지표 탭을 선택했을 때 이벤트 점이 하나도 안 찍혀서 데모가 어색했습니다.
 * 이벤트 날짜는 "오늘" 기준 상대값(daysAgo)으로 만들어서 언제 실행하든 7일/30일
 * 윈도우 안에 자연스럽게 들어오게 했습니다 — 101(2일 전)은 7일 뷰에도 보이고,
 * 102(9일 전)·103(20일 전)은 30일 뷰에서만 보입니다. */
/** REPORT-02는 period 파라미터가 없고 인사이트가 만들어진 창을 그대로 내려줍니다.
 * 목업은 그 창을 14일로 고정하고, subtitle 메타 문구도 같은 값에서 만듭니다. */
const MOCK_DETAIL_WINDOW_DAYS = 14;

const INSIGHT_DETAIL_SEED: Record<
  number,
  {
    metric: MetricKey;
    /** AI 분석 요약 — 실서버의 `summary`(ADR 0027). Figma 281:873 문구 형식. */
    summary: string;
    /** 💡 관리 팁 — 실서버는 ai-server가 생성합니다(ADR 0028). Figma 281:921. */
    tip: string;
    events: {
      daysAgo: number;
      label: string;
      impact: string;
      confidence: Confidence;
      /** ⚠️ impact와 판정을 공유합니다 — 문구가 단정하지 않으면 반드시 null(REPORT-02 BR7). */
      delta: number | null;
      eventKind: InsightEventKind;
    }[];
  }
> = {
  101: {
    metric: 'trouble',
    summary: '레티놀 세럼 사용 후 평균 2일 뒤 트러블 수치가 반복적으로 올라가는 패턴이 감지됐어요.',
    tip: '레티놀은 처음에 피부 장벽을 약화시킬 수 있어요. 주 2–3회로 줄이거나, 보습제를 함께 쓰는 버퍼링 방식을 시도해 보세요.',
    events: [
      {
        daysAgo: 11,
        label: '레티놀 이 기간 첫 사용',
        // 2026-08-18 방향 확정 — 점수가 높을수록 좋으므로, "레티놀 사용 후 트러블이
        // 나빠졌다"는 기존 시나리오를 유지하려면 delta가 음수여야 합니다.
        impact: '이후 2일 뒤 트러블 수치 -16',
        confidence: 'OBSERVED',
        delta: -16,
        eventKind: 'INGREDIENT_USAGE',
      },
      // 성분 인사이트의 신뢰도는 그 성분에 대한 것이라, 자외선 이벤트는 항상 OBSERVING입니다
      // (ReportService.uvSpikeEvents). delta도 산출 근거가 없어 항상 null입니다.
      {
        daysAgo: 4,
        label: '자외선 지수 8 이상 3일 연속',
        impact: '이 기간 트러블 변화를 확인 중이에요',
        confidence: 'OBSERVING',
        delta: null,
        eventKind: 'UV_SPIKE',
      },
    ],
  },
  102: {
    metric: 'redness',
    summary: '자외선 지수가 7 이상인 날의 다음 날, 홍조 수치가 평균 12포인트 높아지는 패턴이 반복돼요.',
    tip: 'SPF 50+ 선크림을 외출 30분 전에 바르고, 자외선 지수가 높은 날은 자외선 차단 의류나 모자를 함께 사용하는 게 좋아요.',
    // 환경 인사이트라 성분 첫 사용 이벤트가 없습니다 — buildEvents는 INGREDIENT 타입에만
    // 성분 이벤트를 답니다. 환경 인사이트의 자외선 이벤트는 인사이트 신뢰도를 그대로 씁니다.
    events: [
      {
        daysAgo: 11,
        label: '자외선 지수 8 이상 2일 연속',
        impact: '이 기간 홍조 변화를 확인 중이에요',
        confidence: 'OBSERVED',
        delta: null,
        eventKind: 'UV_SPIKE',
      },
      {
        daysAgo: 5,
        label: '자외선 지수 8 이상 4일 연속',
        impact: '이 기간 홍조 변화를 확인 중이에요',
        confidence: 'OBSERVED',
        delta: null,
        eventKind: 'UV_SPIKE',
      },
    ],
  },
  103: {
    metric: 'pores',
    summary: '히알루론산 세럼을 연속으로 사용한 기간에 모공 점수가 개선되는 추세를 확인하는 중이에요.',
    tip: '히알루론산은 건조한 환경에서 오히려 수분을 뺏길 수 있어요. 토너로 피부를 적신 뒤 바르고, 위에 크림으로 덮어 마무리해 보세요.',
    events: [
      // OBSERVING이라 firstUsageDelta가 null을 내고, impact도 같은 판정으로 "확인 중"
      // 문구가 됩니다 — 둘이 어긋나는 조합은 실서버에서 나오지 않습니다(REPORT-02 BR7).
      {
        daysAgo: 20,
        label: '히알루론산 이 기간 첫 사용',
        impact: '이후 모공 변화를 확인 중이에요',
        confidence: 'OBSERVING',
        delta: null,
        eventKind: 'INGREDIENT_USAGE',
      },
    ],
  },
};

function daysAgoDate(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(
    2,
    '0'
  )}`;
}

/** REPORT-02 목업. insightId로 MOCK_INSIGHTS에서 찾아 상세를 구성합니다. */
export function buildMockInsightDetail(insightId: number): InsightDetail {
  const source = MOCK_INSIGHTS.find((item) => item.insightId === insightId) ?? MOCK_INSIGHTS[0];
  const seed = INSIGHT_DETAIL_SEED[source.insightId] ?? INSIGHT_DETAIL_SEED[101];
  return {
    insightId: source.insightId,
    type: source.type,
    metric: seed.metric,
    // 화면 헤더는 요인명(=REPORT-01 title)을 그대로 씁니다 — Figma 281:815 "레티놀 세럼".
    title: source.title,
    // subtitle은 기간 길이를 알리는 메타 문구입니다 — 분석 요약은 summary로 따로
    // 나갑니다(ADR 0027). 예전 목업은 여기에 요약문을 넣었는데, 그러면 실서버 응답이
    // 올 때 요약 카드에 메타 문구가 떠서 어긋납니다.
    subtitle: `최근 ${MOCK_DETAIL_WINDOW_DAYS}일 · 이벤트와 상관관계`,
    summary: seed.summary,
    // Figma는 "최근 14일" 창을 씁니다(리포트 홈의 7/30일 토글과 별개 — REPORT-02엔
    // period 파라미터 자체가 없고 인사이트가 만들어진 창을 그대로 내려줍니다).
    graph: buildMockGraph(MOCK_DETAIL_WINDOW_DAYS, METRIC_BASE_SCORE[seed.metric]),
    events: seed.events
      .map((event) => ({
        date: daysAgoDate(event.daysAgo),
        label: event.label,
        impact: event.impact,
        confidence: event.confidence,
        delta: event.delta,
        eventKind: event.eventKind,
      }))
      // REPORT-02 BR1 — events는 날짜 오름차순.
      .sort((a, b) => a.date.localeCompare(b.date)),
    tip: seed.tip,
  };
}
