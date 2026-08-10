// src/api/queries/report.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { unwrap } from '@/api/unwrap';
import { USE_MOCK } from '@/api/useMock';
import { buildMockReport, buildMockInsightDetail } from '@/api/mock/report';
import type { ReportPeriod, MetricKey, ReportResult, InsightDetail } from '@/types/report';

// 서버 쿼리 파라미터/응답 필드는 대문자 enum입니다. 앱 내부(METRIC_LABELS 등)는
// 소문자로 통일해서 쓰므로, API 경계인 이 파일에서만 변환합니다.
const METRIC_TO_PARAM: Record<MetricKey, string> = {
  trouble: 'TROUBLE',
  redness: 'REDNESS',
  pores: 'PORES',
  pigmentation: 'PIGMENTATION',
};

const VALID_METRIC_KEYS: readonly MetricKey[] = ['trouble', 'redness', 'pores', 'pigmentation'];

/** 서버가 매핑에 없는 값을 보내도 화면이 죽지 않도록 'trouble'로 폴백합니다. */
function normalizeMetric(value: string): MetricKey {
  const lower = value.toLowerCase();
  return (VALID_METRIC_KEYS as string[]).includes(lower) ? (lower as MetricKey) : 'trouble';
}

type ReportApiResponse = Omit<ReportResult, 'metric'> & { metric: string };
type InsightDetailApiResponse = Omit<InsightDetail, 'metric'> & { metric: string };

/** REPORT-01 · 기간별 피부 추이 + 인사이트 조회 (S-19). 409면 ApiError(REPORT_DATA_INSUFFICIENT)를 던집니다. */
export async function getReport(period: ReportPeriod, metric: MetricKey): Promise<ReportResult> {
  if (USE_MOCK) {
    return buildMockReport(period, metric);
  }
  const result = await unwrap<ReportApiResponse>(
    apiClient.get('/reports', { params: { period, metric: METRIC_TO_PARAM[metric] } })
  );
  return { ...result, metric: normalizeMetric(result.metric) };
}

export function useReport(period: ReportPeriod, metric: MetricKey) {
  return useQuery({
    queryKey: ['report', period, metric],
    queryFn: () => getReport(period, metric),
    // REPORT_DATA_INSUFFICIENT(409)는 재시도로 해결되는 상태가 아니라서 자동 재시도를 끕니다.
    retry: false,
  });
}

/** REPORT-02 · 요인 상세 조회 (S-20) */
export async function getReportInsight(insightId: number): Promise<InsightDetail> {
  if (USE_MOCK) {
    return buildMockInsightDetail(insightId);
  }
  const result = await unwrap<InsightDetailApiResponse>(
    apiClient.get(`/reports/insights/${insightId}`)
  );
  return { ...result, metric: normalizeMetric(result.metric) };
}

export function useReportInsight(insightId: number) {
  return useQuery({
    queryKey: ['reportInsight', insightId],
    queryFn: () => getReportInsight(insightId),
    enabled: Number.isFinite(insightId),
  });
}
