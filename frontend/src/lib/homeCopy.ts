// src/lib/homeCopy.ts
//
// 2026-08-19(세션 19, 관리자님 홈 화면 리포트) — 홈에 영어 문구가 그대로 노출되던 문제.
//
// ─────────────────────────────────────────────────────────────────────────────
// 원인 — 백엔드 `HomeService`의 영어 하드코딩 3곳 (origin/main 확인)
//
//   160행  location()              → 지역 미설정이면 "Current location"
//   198행  toRecommendationItem()  → reason에 항상 "Saved product"
//   240행  todayReport()           → summary에 항상 "Today's skin analysis is ready."
//
// 기록 허브의 "Analysis score 72"(lib/recordSummary.ts)와 **같은 성격의 문제**입니다.
//
// ⚠️ **이 파일은 데모 안전망일 뿐, 정답은 백엔드 수정입니다**(관리자님 지시, 세션 19).
// 목업(`api/mock/home.ts`)이 기준이고 실서버가 거기에 맞춰야 합니다 — 목업을 서버의
// 현재 동작에 맞춰 낮추면 안 됩니다. 백엔드 요청은 `backend-request-2026-08-19-home.md`.
//
// 백엔드가 한국어로 고쳐 내려주면 아래 패턴에 안 걸려서 **원본이 그대로 통과**하므로,
// 그때 이 파일과 `queries/home.ts`의 호출 한 줄만 지우면 됩니다.
//
// ⚠️ 서버 문자열 패턴 매칭은 본질적으로 취약합니다. 백엔드가 문구를 살짝만 바꿔도
// (예: "Saved Product") 조용히 영어가 다시 노출됩니다. 임시 조치임을 잊지 마세요.
//
// ─────────────────────────────────────────────────────────────────────────────
// reason을 왜 "저장해둔 제품이에요"로 옮겼나 (문구 선택의 근거)
//
// `HomeService.routineRecommendation()`은 추천 로직이 아닙니다 — `usageStatus=USING`인
// 저장 제품을 `lastUsedAt` 내림차순으로 **위에서 3개 자르는 게 전부**입니다. 근거가
// 없는데 프론트가 "모공 케어 추천" 같은 말을 지어내면 **없는 분석을 있는 것처럼** 보이게
// 만듭니다. 그래서 이 폴백은 서버가 실제로 아는 사실만 옮깁니다.
//
// 목업이 보여주는 근거 문구(자외선 지수 높음 / 모공 케어 추천 …)가 **우리가 원하는 최종
// 모습**입니다. 그건 백엔드가 실제 분석으로 채워야 하는 값이고, 프론트가 흉내 낼 수
// 있는 게 아닙니다.
import type { HomeResponse } from '@/types/home';

const SAVED_PRODUCT = /^Saved\s+product$/i;
const SKIN_ANALYSIS_READY = /^Today's\s+skin\s+analysis\s+is\s+ready\.?$/i;
const CURRENT_LOCATION = /^Current\s+location$/i;

/** 추천 항목의 근거 문구. 아는 패턴이 아니면 원본 그대로. */
export function formatRecommendationReason(reason: string): string {
  return SAVED_PRODUCT.test(reason.trim()) ? '저장해둔 제품이에요' : reason;
}

/** 오늘 리포트 요약. 아는 패턴이 아니면 원본 그대로. */
export function formatTodayReportSummary(summary: string): string {
  return SKIN_ANALYSIS_READY.test(summary.trim()) ? '오늘 피부 분석이 준비됐어요' : summary;
}

/**
 * 위치 문구. 백엔드는 지역 미설정일 때 "Current location"을 내려주는데, 이건 실제 위치가
 * 아니라 **자리표시자**입니다. 그대로 두면 사용자가 위치가 잡힌 걸로 오해합니다.
 * null로 바꿔서 호출부가 "위치 없음"으로 다루게 합니다(밤 홈은 이때 줄 자체를 안 그립니다).
 */
export function normalizeLocation(location: string | null): string | null {
  if (!location) return location;
  return CURRENT_LOCATION.test(location.trim()) ? null : location;
}

/**
 * `GET /home` 응답을 화면 문구 기준으로 다듬습니다.
 *
 * **파싱 경계에서 한 번만** 적용합니다(lib/recordSummary.ts와 같은 이유) — 홈 데이터를
 * 그리는 화면이 낮·밤 둘이라 화면마다 넣으면 하나 빠뜨렸을 때 그 화면만 영어로 남습니다.
 */
export function normalizeHomeCopy(response: HomeResponse): HomeResponse {
  return {
    ...response,
    routineRecommendation: {
      ...response.routineRecommendation,
      items: response.routineRecommendation.items.map((item) => ({
        ...item,
        reason: formatRecommendationReason(item.reason),
      })),
    },
    todayReport: response.todayReport
      ? {
          ...response.todayReport,
          summary: formatTodayReportSummary(response.todayReport.summary),
        }
      : response.todayReport,
  };
}
