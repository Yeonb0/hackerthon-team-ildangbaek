// src/lib/ingredientStatus.ts
//
// 성분 반응 상태(GOOD / CAUTION / INSUFFICIENT)의 표기·아이콘·색 **단일 정의**.
//
// ─────────────────────────────────────────────────────────────────────────────
// 2026-08-17 (세션 14) — 관리자 지시로 전 화면을 통일했습니다.
//
// 그전까지는 화면마다 자기 매핑을 들고 있어서 같은 상태가 다르게 불렸습니다:
//
//   화면              GOOD      CAUTION       INSUFFICIENT
//   성분 전체 목록     잘 맞음    주의          데이터부족
//   제품 상세          잘 맞음    지켜보는 중    정보 부족
//   성분 확인          맞음      주의          데이터부족
//
// 특히 제품 상세는 **CAUTION을 "지켜보는 중"**이라고 불렀는데, 이번에 관리자가
// INSUFFICIENT의 표기를 "지켜보는 중"으로 확정하면서 한 이름에 두 상태가 걸렸습니다.
// CAUTION은 원래 이름인 "주의"로 되돌리고, 색도 statusWatch → statusCaution으로
// 맞췄습니다(라벨이 "주의"인데 색만 완곡하면 경고가 약해 보입니다).
//
// INSUFFICIENT는 "판정할 데이터가 아직 부족한 상태"이고, 사용자 언어로는
// "지켜보는 중"입니다(관리자 정의) — 두 표현은 같은 상태를 가리킵니다.
// ─────────────────────────────────────────────────────────────────────────────
//
// ⚠️ 새 화면에서 이 세 상태를 표시할 때는 자체 매핑을 만들지 말고 여기서 가져오세요.
// 매핑이 흩어지면 위 표 같은 상황이 다시 생깁니다.
import type { AppIconName } from '@/components/icons';
import { color } from '@/theme/tokens';
import type { IngredientStatus } from '@/types/user';

export const INGREDIENT_STATUS_LABEL: Record<IngredientStatus, string> = {
  GOOD: '잘 맞음',
  CAUTION: '주의',
  INSUFFICIENT: '지켜보는 중',
};

/** 표정 아이콘 3종. 상태가 "내 피부가 어땠는지"를 말하므로 심볼보다 표정이 맞습니다. */
export const INGREDIENT_STATUS_ICON: Record<IngredientStatus, AppIconName> = {
  GOOD: 'faceGood',
  CAUTION: 'faceCaution',
  INSUFFICIENT: 'faceNeutral',
};

export const INGREDIENT_STATUS_COLOR: Record<IngredientStatus, string> = {
  GOOD: color.statusGood,
  CAUTION: color.statusCaution,
  // 앰버 — 판정 전 단계라 좋음/나쁨 어느 쪽도 아닌 중간 톤입니다.
  INSUFFICIENT: color.statusWatch,
};
