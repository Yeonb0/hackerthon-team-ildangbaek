// src/types/report.ts
// 명세서 §11 Report API(REPORT-01/02) 기준.
//
// ⚠️ 로드맵(frontend-roadmap-phases.md) Phase 6은 S-19를 레이더 차트로 계획했지만,
// 실제 REPORT-01 응답은 "지표 하나(metric)를 골라 기간별 추이를 보여주는" 구조라
// 레이더에 필요한 "여러 지표를 한 시점에 동시 비교" 형태가 아닙니다(관리자 확인,
// 2026-08-10). 그런 스냅샷 형태는 오히려 SKIN-01/02(S-18)에만 있고, S-18은 이미
// MetricScoreList로 구현이 끝나 있습니다. RadarChart 컴포넌트는 카탈로그에만
// 등록해두고, 실제 S-19/S-20은 이 파일의 타입대로 "추이 그래프 + 인사이트 카드" /
// "추이 그래프 + 이벤트 목록"으로 구현합니다.

export type ReportPeriod = 7 | 30;

// 앱 내부에서는 소문자로 통일합니다 (adapters.ts의 METRIC_LABELS 키와 동일 규칙).
// 서버 쿼리 파라미터/응답은 대문자 enum(TROUBLE 등)이라 api/queries/report.ts
// 경계에서만 변환합니다 — 화면 코드는 이 소문자 키만 봅니다.
export type MetricKey = 'trouble' | 'redness' | 'pores' | 'pigmentation';

export interface GraphPoint {
  date: string; // 'YYYY-MM-DD'
  /**
   * 하루 2건(모닝·나이트)을 대표값으로 접지 않고 각각 받습니다 (ADR 0012·0013).
   * 해당 슬롯에 기록이 없으면 null입니다 — 0점으로 계산하지 않습니다 (REPORT-01 BR1).
   * 단일 선이 필요한 화면은 클라이언트가 둘 중 하나를 고릅니다.
   */
  morningScore: number | null;
  nightScore: number | null;
}

export type InsightType = 'INGREDIENT' | 'ENVIRONMENT';

// OBSERVED: 반복 관찰된 패턴 / OBSERVING: 확인 중 · 반복성 미확보 (단정적 문구 금지)
export type Confidence = 'OBSERVED' | 'OBSERVING';

export interface InsightSummary {
  insightId: number;
  type: InsightType;
  title: string;
  description: string;
  confidence: Confidence;
}

export interface ReportResult {
  period: ReportPeriod;
  metric: MetricKey;
  graph: GraphPoint[];
  insights: InsightSummary[];
  /** 부분 실패 영역. 실패 없으면 빈 배열 — 필드 자체는 항상 존재 (F-HOME 쪽 failedSections와 동일 패턴) */
  failedSections: string[];
  /** 기간 집계 종합 점수(리포트 홈 상단 카드, Figma 210:2437). `metric` 파라미터와
   * 무관하게 항상 지표 4종 전체를 담아 옵니다 — REPORT-01 응답에 같이 실려 옵니다
   * (백엔드 2026-08-17 추가, docs/api_명세서.md REPORT-01 BR6~9). */
  summary: ReportSummaryResult;
}

// 2026-08-17 — 백엔드가 REPORT-01 응답에 summary 필드를 추가했습니다
// (docs/api_명세서.md REPORT-01 BR6~9, ADR 0008 기간 단위 확장). 이제 ReportResult.summary로
// 실 API에서 받습니다 — api/queries/report.ts의 getReport 참고. 이 타입 자체는
// 그대로 재사용합니다(목업 시절과 필드 구조 동일).
export interface MetricScoreSummary {
  metric: MetricKey;
  score: number;
  /** 이전 기간 대비 증감. 지표 4종은 **높을수록 좋음**이라 양수가 개선입니다
   * (2026-08-18 확정). 방향 해석은 화면(ReportSummaryCard)이 담당하고
   * 이 타입은 부호 있는 원값만 갖습니다. */
  delta: number | null;
}

export interface ReportSummaryResult {
  period: ReportPeriod;
  totalScore: number;
  /** 총점은 높을수록 좋음(SKIN-01 totalScore와 동일 방향). */
  totalDelta: number | null;
  metrics: MetricScoreSummary[]; // 4개(trouble/redness/pigmentation/pores) 고정
  /** 기간 동안의 총점 추이. 결측 규칙은 GraphPoint와 다르게 단일값입니다(총점은
   * 모닝/나이트 구분 없이 그날의 대표 총점 하나만 필요 — Figma 실측 기준). */
  graph: { date: string; score: number | null }[];
}

/**
 * 이벤트 도출 유형 (REPORT-02 BR7, ADR 0027). 백엔드가 도출할 수 있는 유형은 이 둘이
 * 전부입니다 — "성분 재시작"에 해당하는 값은 **의도적으로 없습니다.** 제품 기록이 없는
 * 날은 "쓰지 않았다"가 아니라 "기록하지 않았다"라서 중단을 판정할 수 없기 때문입니다
 * (ADR 0013 §2). 프론트가 요청했던 `ABSTINENCE`는 그래서 거절됐습니다 — 오지 않는
 * 분기를 만들지 않습니다.
 */
export type InsightEventKind = 'INGREDIENT_USAGE' | 'UV_SPIKE';

export interface InsightEvent {
  date: string;
  label: string;
  impact: string;
  confidence: Confidence;
  /**
   * `impact` 문구에 실린 지표 변화량을 부호 있는 정수로 그대로 낸 값(ADR 0027).
   *
   * **`impact`와 같은 판정을 공유합니다** — 서버의 `firstUsageDelta()` 하나가 판정하고
   * 문구가 그 결과를 받는 구조라, 문구가 "확인 중"으로 폴백했는데 여기에 숫자가 실리는
   * 상태는 구조적으로 불가능합니다(REPORT-02 BR7). 즉 이 값이 있으면 단정해도 되는
   * 자리이고, null이면 배지에 수치를 띄우면 안 됩니다(BR2).
   *
   * 자외선 이벤트(`UV_SPIKE`)는 변화량 근거가 없어 **항상 null**입니다.
   */
  delta: number | null;
  /** 도출 유형. 아이콘 분기에 씁니다 — `impact` 문구를 파싱해 추정하지 않습니다. */
  eventKind: InsightEventKind;
}

export interface InsightDetail {
  insightId: number;
  type: InsightType;
  metric: MetricKey;
  title: string;
  /**
   * 기간 길이를 알리는 **메타 문구**입니다("최근 30일 · 이벤트와 상관관계").
   *
   * ⚠️ 분석 요약 문장이 아닙니다 — 세션 11까지는 이 필드를 "AI 분석 요약" 카드에
   * 그렸지만, ADR 0027이 `subtitle`(메타) / `summary`(요약)로 의미를 갈랐습니다.
   * 화면에서는 차트 카드 제목 아래 메타 줄로 씁니다(관리자 결정, 2026-08-17).
   */
  subtitle: string;
  /**
   * F-ANALYSIS-01이 인사이트에 저장해 둔 분석 요약 문장(ADR 0027). REPORT-01
   * `insights[].description`과 **같은 값**이며 새로 생성하지 않습니다. 저장된 값이
   * 없으면 null이고, 그때는 "AI 분석 요약" 카드를 그리지 않습니다.
   */
  summary: string | null;
  graph: GraphPoint[];
  /** 날짜 오름차순 (REPORT-02 BR1) */
  events: InsightEvent[];
  /**
   * 💡 관리 팁 (Figma 281:917). ai-server가 인사이트의 근거(요인·지표·신뢰도·시차·
   * 변화량)를 받아 생성합니다(ADR 0028). 호출이 실패·타임아웃되면 null이며, 그때도
   * 상세 조회 자체는 200입니다 — 팁은 상세 화면의 전제 조건이 아니라서 값이 없으면
   * 화면이 섹션을 감춥니다(REPORT-02 BR9).
   */
  tip: string | null;
}
