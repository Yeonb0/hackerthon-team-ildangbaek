// src/api/queries/check.ts
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { unwrap } from '@/api/unwrap';
import { USE_MOCK } from '@/api/useMock';
import { buildMockCheckHome, computeMockCheckResult, getMockCheckResult } from '@/api/mock/check';
import type { CheckHomeResult, CheckResult } from '@/types/check';

/** CHECK-01 · GET /checks/home (S-21) */
export async function getCheckHome(): Promise<CheckHomeResult> {
  if (USE_MOCK) {
    return buildMockCheckHome();
  }
  return unwrap<CheckHomeResult>(apiClient.get('/checks/home'));
}

export function useCheckHome() {
  return useQuery({ queryKey: ['checkHome'], queryFn: getCheckHome });
}

/**
 * CHECK-02 · POST /checks (S-21 → S-22). Idempotency-Key 권장 항목이지만, 스캔/검색으로
 * 매번 새로 고른 제품 하나에 대해 한 번만 호출하는 흐름이라(재시도 버튼도 매번 신규 분석
 * 의도) 지금은 별도 키를 안 붙였습니다 — 실서버 연동 시 필요하면 헤더만 추가하면 됩니다.
 */
export async function computeCheck(productId: number): Promise<CheckResult> {
  if (USE_MOCK) {
    return computeMockCheckResult(productId);
  }
  return unwrap<CheckResult>(apiClient.post('/checks', { productId }));
}

export function useComputeCheck() {
  return useMutation({ mutationFn: computeCheck });
}

/** CHECK-03 · GET /checks/{checkId} (S-22 — 새로고침·재진입 시 재조회) */
export async function getCheckResult(checkId: number): Promise<CheckResult> {
  if (USE_MOCK) {
    return getMockCheckResult(checkId);
  }
  return unwrap<CheckResult>(apiClient.get(`/checks/${checkId}`));
}

export function useCheckResult(checkId: number) {
  return useQuery({ queryKey: ['checkResult', checkId], queryFn: () => getCheckResult(checkId) });
}
