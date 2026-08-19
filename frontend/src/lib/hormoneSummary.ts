// src/lib/hormoneSummary.ts
//
// 온보딩 완료 화면(S-05) 요약에 들어가는 **호르몬 관련 행**을 만듭니다.
//
// ⚠️ 원칙상 요약 문구는 서버가 완성합니다(ONBOARD-05 BR4 — 클라이언트가 Enum→한글
// 변환을 갖지 않는다). 그런데 백엔드 `OnboardingService.buildSummary()`는 이름 /
// 성별·나이 / 피부 타입 **3행만** 만들고 호르몬 정보를 넣지 않습니다(2026-08-19 확인).
// 데이터는 `PATCH /users/me/onboarding/hormone`으로 정상 저장되는데 요약에만 안 실립니다.
//
// 그래서 이 파일이 **임시로** 그 두 행을 클라이언트에서 만듭니다. 백엔드가 요약에
// 호르몬 행을 추가하면 OnboardingCompleteScreen의 병합 로직이 라벨 중복을 걸러내므로
// 자동으로 서버 값이 우선하고, 그 시점에 이 파일과 onboardingStore의 hormoneInput만
// 지우면 됩니다.
//
// 목업(api/mock/onboarding.ts)도 같은 함수를 씁니다 — 목업과 실서버의 요약 모양이
// 달라지면 "목업에선 보이는데 실기기에선 안 보인다"는 지금 상황이 반복됩니다.
import { HORMONE_LABEL } from '@/lib/profileLabels';
import type { HormoneInput, OnboardingSummaryRow } from '@/types/onboarding';

export function buildHormoneSummaryRows(input: HormoneInput | null): OnboardingSummaryRow[] {
  if (!input) {
    // 호르몬 단계를 건너뛴 경우(ONBOARD-04 BR3) — 보여줄 게 없습니다.
    return [];
  }

  const rows: OnboardingSummaryRow[] = [
    { label: '생리 상태', value: HORMONE_LABEL[input.hormoneStatus] },
  ];

  // 최근 시작일/휴약기 + 평균 주기를 한 줄로 합칩니다. 명세서 예시 응답도
  // { "label": "생리 주기", "value": "28일 · 생리" }처럼 한 행에 묶는 형태였습니다.
  // 라벨은 상태에 따라 묻는 의미가 달라서 갈립니다(HormoneScreen의 날짜 필드 라벨과 동일 규칙).
  const hasDate = Boolean(input.lastPeriodStartDate);
  const hasCycle = input.averageCycleDays != null;
  if (hasDate || hasCycle) {
    const parts = [
      hasDate ? input.lastPeriodStartDate : null,
      hasCycle ? `${input.averageCycleDays}일` : null,
    ].filter(Boolean);
    rows.push({
      label: input.hormoneStatus === 'HORMONE_PILL' ? '최근 휴약기' : '최근 시작일',
      value: parts.join(' · '),
    });
  }

  return rows;
}
