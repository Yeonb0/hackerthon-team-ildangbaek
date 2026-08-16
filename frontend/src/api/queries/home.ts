// src/api/queries/home.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { unwrap } from '@/api/unwrap';
import { USE_MOCK } from '@/api/useMock';
import { buildMockHomeResponse } from '@/api/mock/home';
import { getFixedHomeType } from '@/lib/dayNight';
import type { WeekStart } from '@/lib/date';
import { useWeekStartStore } from '@/store/weekStartStore';
import type { HomeResponse, HomeType } from '@/types/home';

// 이후 만들 다른 API 함수(useSkinToday 등)도 전부 이 구조를 따릅니다.
// 1) 함수 첫 줄에서 USE_MOCK 체크
// 2) true면 mock 데이터 그대로 반환 (네트워크 호출 없음)
// 3) false면 실제 axios 호출 → unwrap()으로 봉투 해제
//
// homeType을 안 넘기면(자동 판정) mock에서도 실제 서버와 같은 규칙(06~17시=DAY)을
// getFixedHomeType()으로 흉내냅니다. 체크포인트 B의 dayNightStore가 이 값을 그대로 쓸 예정입니다.
//
// weekStart 파라미터 추가(2026-08-15, 관리자님 요청 — 주 시작 요일 설정): 실서버(/home)는
// 아직 이 파라미터를 지원하지 않습니다(백엔드 요청서 별도 전달 예정) — 보내도 무해하게
// 무시될 뿐이라 미리 얹어뒀고, 백엔드가 지원하는 순간 추가 프론트 변경 없이 바로 동작합니다.
// USE_MOCK=true일 때는 지금 바로 밤 홈 주간 스트립에 반영됩니다.
export async function getHome(homeType?: HomeType, weekStart?: WeekStart): Promise<HomeResponse> {
  if (USE_MOCK) {
    return buildMockHomeResponse(homeType ?? getFixedHomeType(), weekStart);
  }
  return unwrap<HomeResponse>(
    apiClient.get('/home', { params: { ...(homeType ? { homeType } : {}), ...(weekStart ? { weekStart } : {}) } }),
  );
}

export function useHome(homeType?: HomeType) {
  const weekStart = useWeekStartStore((s) => s.weekStart);
  return useQuery({
    queryKey: ['home', homeType ?? 'auto', weekStart],
    queryFn: () => getHome(homeType, weekStart),
  });
}