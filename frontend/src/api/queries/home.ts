import { apiClient } from '@/api/client';
import { unwrap } from '@/api/unwrap';
import { USE_MOCK } from '@/api/useMock';
import { mockHomeResponse } from '@/api/mock/home';

// 이후 만들 다른 API 함수(useSkinToday 등)도 전부 이 구조를 따릅니다.
// 1) 함수 첫 줄에서 USE_MOCK 체크
// 2) true면 mock 데이터 그대로 반환 (네트워크 호출 없음)
// 3) false면 실제 axios 호출 → unwrap()으로 봉투 해제
export async function getHome(homeType?: 'DAY' | 'NIGHT') {
  if (USE_MOCK) {
    return mockHomeResponse;
  }
  return unwrap(apiClient.get('/home', { params: { homeType } }));
}