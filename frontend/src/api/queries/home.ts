// src/api/queries/home.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { unwrap } from '@/api/unwrap';
import { USE_MOCK } from '@/api/useMock';
import { buildMockHomeResponse } from '@/api/mock/home';
import { getFixedHomeType } from '@/lib/dayNight';
import { normalizeHomeCopy } from '@/lib/homeCopy';
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
// weekStart 파라미터(2026-08-15, 관리자님 요청 — 주 시작 요일 설정).
//
// ⚠️ 2026-08-18 정정 — 예전 주석은 "실서버가 아직 이 파라미터를 지원하지 않는다"였는데
// **사실이 아닙니다.** 백엔드 `HomeController.parseWeekStart()`가 이미 받고 있고,
// `HomeService.weeklyCalendar()`가 `TemporalAdjusters.previousOrSame(weekStart)`로
// 실제 주 시작일 계산에 씁니다. 즉 밤 홈 주간 스트립이 실서버에서도 설정을 따릅니다.
//
// 서버 판정은 `"SUNDAY"`(대소문자 무시)만 일요일로 보고 **나머지는 전부 월요일**입니다.
// 프론트 WeekStart가 'SUNDAY' | 'MONDAY' 두 값뿐이라 지금은 정확히 맞물리지만,
// 값을 늘릴 일이 생기면 백엔드 파싱도 함께 넓혀야 합니다.
export async function getHome(homeType?: HomeType, weekStart?: WeekStart): Promise<HomeResponse> {
  // 2026-08-19(세션 19) — 백엔드 HomeService의 영어 하드코딩을 여기서 한 번만 걷어냅니다.
  // 목업 경로에도 똑같이 적용합니다(목업이 같은 영어를 내려주도록 맞춰뒀습니다).
  // 자세한 배경은 lib/homeCopy.ts 주석 참고.
  if (USE_MOCK) {
    return normalizeHomeCopy(buildMockHomeResponse(homeType ?? getFixedHomeType(), weekStart));
  }
  return normalizeHomeCopy(
    await unwrap<HomeResponse>(
      apiClient.get('/home', { params: { ...(homeType ? { homeType } : {}), ...(weekStart ? { weekStart } : {}) } }),
    ),
  );
}

export function useHome(homeType?: HomeType) {
  const weekStart = useWeekStartStore((s) => s.weekStart);
  return useQuery({
    queryKey: ['home', homeType ?? 'auto', weekStart],
    queryFn: () => getHome(homeType, weekStart),
  });
}