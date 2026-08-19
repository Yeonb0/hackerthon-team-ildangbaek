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
import type { HomeResponse, HomeType } from '@/types/home';

const SAVED_PRODUCT = /^Saved\s+product$/i;
const SKIN_ANALYSIS_READY = /^Today's\s+skin\s+analysis\s+is\s+ready\.?$/i;
const CURRENT_LOCATION = /^Current\s+location$/i;

/**
 * 밤 인사말. 백엔드 `HomeService.greeting()`(91행)이 이렇게 만듭니다.
 *
 *     homeType == DAY ? "좋은 아침이에요, " + name + "님." : "좋은 저녁이에요, " + name + "님."
 *
 * 관리자님 확정(2026-08-19, 세션 20): 밤은 「오늘도 수고했어요, ○○님!」.
 * 하루를 마무리하며 여는 화면이라 시간대 인사보다 위로하는 문구가 맞다는 판단입니다.
 *
 * 닉네임을 살려야 해서 통째로 치환하지 않고 **이름만 뽑아 다시 조립**합니다.
 */
const EVENING_GREETING = /^좋은\s*저녁이에요[,，]?\s*(.*?)님\.?$/;

/**
 * 백엔드는 프로필이나 닉네임이 없으면 `"사용자"`를 끼워 넣습니다(HomeService 92행).
 * 그대로 조립하면 「오늘도 수고했어요, 사용자님!」이 되는데, 이건 이름이 아니라
 * 자리표시자라서 이름 없는 문장으로 떨어뜨립니다.
 */
const PLACEHOLDER_NAME = '사용자';

/**
 * 홈 인사말.
 *
 * 낮은 손대지 않습니다 — `DayHomeScreen`이 greeting을 **렌더링하지 않기 때문**입니다
 * (관리자님 지시: 낮 홈 문구 삭제). 값이 남아 있어도 화면에 나오지 않으므로,
 * 여기서 지우면 오히려 나중에 낮 홈에 문구를 되살릴 때 원인을 찾기 어려워집니다.
 *
 * 아는 패턴이 아니면 원본 그대로 — 백엔드가 문구를 한국어로 다시 쓰면 자동으로 통과합니다.
 */
export function formatGreeting(greeting: string, homeType: HomeType): string {
  if (homeType !== 'NIGHT') return greeting;
  const matched = EVENING_GREETING.exec(greeting.trim());
  if (!matched) return greeting;
  const name = matched[1].trim();
  return name && name !== PLACEHOLDER_NAME
    ? `오늘도 수고했어요, ${name}님!`
    : '오늘도 수고했어요!';
}

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
    greeting: formatGreeting(response.greeting, response.homeType),
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