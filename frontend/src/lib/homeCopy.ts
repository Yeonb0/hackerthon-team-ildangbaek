// src/lib/homeCopy.ts
//
// 홈 응답의 문구를 화면 기준으로 다듬는 파싱 경계 레이어.
//
// ─────────────────────────────────────────────────────────────────────────────
// 2026-08-20(세션 22) — 영어 하드코딩 폴백 3종 제거
//
// 세션 19에 넣었던 임시 폴백은 백엔드 `HomeService`의 영어 하드코딩 3곳을 프론트에서
// 걷어내는 데모 안전망이었습니다. 백엔드 `39ffe40`이 `origin/main`에 병합되면서
// 세 곳이 모두 해소돼 정규식이 아무것도 잡지 못하는 죽은 코드가 됐고, 이번에 제거합니다.
//
//   location()             → `null` 반환 (HomeService:160~162). "Current location" 없음
//   toRecommendationItem() → "최근에 사용한 제품이에요" (HomeService:202)
//   todayReportSummary()   → change 부호별 한국어 4분기 (HomeService:264~276)
//
// ⚠️ `boyeon` 브랜치에 포함된 `backend/` 사본은 아직 이전 상태(영어)입니다.
// 판단 근거는 `origin/main`의 `HomeService`이며, 배포 기준도 main입니다.
//
// ─────────────────────────────────────────────────────────────────────────────
// 남은 것 — 밤 인사말 재조립
//
// 백엔드 `HomeService.greeting()`(93행)은 여전히 시간대 인사를 만듭니다.
//
//     homeType == DAY ? "좋은 아침이에요, " + name + "님." : "좋은 저녁이에요, " + name + "님."
//
// 관리자님 확정(2026-08-19, 세션 20): 밤은 「오늘도 수고했어요, ○○님!」.
// 하루를 마무리하며 여는 화면이라 시간대 인사보다 위로하는 문구가 맞다는 판단입니다.
// 닉네임을 살려야 해서 통째로 치환하지 않고 **이름만 뽑아 다시 조립**합니다.
import type { HomeResponse, HomeType } from '@/types/home';

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
 * 아는 패턴이 아니면 원본 그대로 — 백엔드가 문구를 다시 쓰면 자동으로 통과합니다.
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

/**
 * `GET /home` 응답을 화면 문구 기준으로 다듬습니다.
 *
 * **파싱 경계에서 한 번만** 적용합니다(lib/recordSummary.ts와 같은 이유) — 홈 데이터를
 * 그리는 화면이 낮·밤 둘이라 화면마다 넣으면 하나 빠뜨렸을 때 그 화면만 어긋납니다.
 */
export function normalizeHomeCopy(response: HomeResponse): HomeResponse {
  return {
    ...response,
    greeting: formatGreeting(response.greeting, response.homeType),
  };
}