// src/api/queries/home.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { unwrap } from '@/api/unwrap';
import { USE_MOCK } from '@/api/useMock';
import { buildMockHomeResponse } from '@/api/mock/home';
import { getFixedHomeType } from '@/lib/dayNight';
import type { HomeResponse, HomeType } from '@/types/home';

// 이후 만들 다른 API 함수(useSkinToday 등)도 전부 이 구조를 따릅니다.
// 1) 함수 첫 줄에서 USE_MOCK 체크
// 2) true면 mock 데이터 그대로 반환 (네트워크 호출 없음)
// 3) false면 실제 axios 호출 → unwrap()으로 봉투 해제
//
// homeType을 안 넘기면(자동 판정) mock에서도 실제 서버와 같은 규칙(06~17시=DAY)을
// getFixedHomeType()으로 흉내냅니다. 체크포인트 B의 dayNightStore가 이 값을 그대로 쓸 예정입니다.
export async function getHome(homeType?: HomeType): Promise<HomeResponse> {
  if (USE_MOCK) {
    return buildMockHomeResponse(homeType ?? getFixedHomeType());
  }
  return unwrap<HomeResponse>(
    apiClient.get('/home', { params: homeType ? { homeType } : undefined }),
  );
}

export function useHome(homeType?: HomeType) {
  return useQuery({
    queryKey: ['home', homeType ?? 'auto'],
    queryFn: () => getHome(homeType),
  });
}