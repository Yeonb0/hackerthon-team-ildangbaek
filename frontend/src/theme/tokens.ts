// src/theme/tokens.ts

// Checkpoint 9-D — 브랜드 컬러 방향을 스카이블루+블러시핑크에서 로고(라벤더+핑크)
// 계열로 전환 (관리자 결정, 2026-08-11).
//
// 2026-08-15 — Figma GUI 최종본(P8CmHDZp7z0dKiHByEzuLx, Hifi - GUI) 실측값으로 교체.
export const color = {
  brand50: '#F5F4FE',
  brand100: '#E7E3FD',
  brand500: '#9B8CF5', // Figma --ds-brand-purple
  brand700: '#7368B5',

  // Figma --ds-brand-pink. 기존 blush500(#FBADC7)보다 채도가 높습니다.
  brandPink: '#FF8FC7',

  blush100: '#FEF4F7',
  blush500: '#FBADC7',

  // 위험도 3단계 (맞음 / 지켜보는 중 / 주의 필요) — 디자인팀 확정값 오면 교체
  statusGood: '#4FB79A',
  statusWatch: '#F2B544',
  statusCaution: '#E8785B',

  ink900: '#1C1D1F',
  ink600: '#5F6469',
  ink300: '#B7BCC2',
  bg: '#FFFFFF',

  // --- Figma 텍스트 3단계 (--ds-text-*) ---
  textInk: '#423B5C', // 제목·본문 강조
  textSub: '#A79FC2', // 보조 설명·라벨
  textMuted: '#C9C0E0', // placeholder·비활성

  // F-RECORD-02 주간 스트립 요일 라벨(일요일) 전용 — Figma 210:699 실측값.
  // 토요일은 별도 토큰 없이 brand500을 그대로 씁니다(Figma 색상이 동일).
  calendarSunday: '#FF6B5B',
  // F-RECORD-02 주간 스트립 점(모닝) 전용 — 밤은 기존 brand500(보라)을 그대로 씁니다.
  // (관리자 결정 2026-08-15: 낮/밤 점 색상 분리)
  calendarMorningDot: '#FF8FC7', // = brandPink, 의미가 달라 별도 키로 참조

  // --- 테두리 (2026-08-15 관리자 결정: 검정/무채색 → 보라 계열) ---
  border: '#C9C0E0', // 일반 구분선·칩 테두리
  borderStrong: '#9B8CF5', // 입력창 등 강조 테두리 (Figma Input/Text)
  // 소셜 로그인(카카오/구글) 버튼처럼 흰 배경 위에 아주 옅은 경계선만 필요한 곳.
  // Figma Button - 구글로 시작하기(72:9)의 --ds-border-divider-strong 실측값.
  borderDivider: '#E3DDF5',
  // Figma --ds-border-divider(strong 아님) — S-04/S-05 리스트 행 사이 아주 옅은
  // 구분선 전용. borderDivider(strong)보다 더 연합니다.
  borderDividerFaint: '#F0EAFB',

  // Figma --ds-surface-lavender-soft. 선택된 옵션 카드 배경 등 brand50과는
  // 별개 값입니다 (S-02 피부타입 Card/Selectable 실측값).
  surfaceLavenderSoft: '#EFE9FF',
  // Figma S-05(ProfileComplete) 페이지 배경 — surfaceLavenderSoft보다 더 옅은 별도 실측값.
  surfaceLavenderPale: '#F5F2FF',
  // 마이페이지 헤더 그라데이션 시작색 (Figma 59:7183 실측, #EDE8FF → surfaceLavenderPale).
  surfaceLavenderHeader: '#EDE8FF',
  // 촬영 전 사진 자리표시자 회색 (S-15 PhotoGuide / S-17 FaceNotFound).
  // ⚠️ 세션 13에서 추가했다고 인계 문서에 적혀 있었지만 실제 커밋에는 빠져 있어
  // main이 tsc를 통과하지 못하는 상태였습니다(2026-08-17 세션 14에서 복구).
  surfacePhotoPlaceholder: '#F1EFF7',
  surfacePhotoPlaceholderDim: '#DCD7E8',

  // S-16 얼굴 촬영처럼 카메라 화면을 풀블리드로 덮는 화면 전용.
  black: '#000000',
  white: '#FFFFFF',
  scrim60: 'rgba(0, 0, 0, 0.6)',
  scrim40: 'rgba(0, 0, 0, 0.4)',
} as const;

// 그라데이션 전용 토큰. 단색 color.brand*와 별개로 두 색 배열이 필요한
// 곳(LinearGradient)에서만 씁니다.
export const gradient = {
  // CTA 버튼 — Figma Button/Primary 실측값 [brand-purple, brand-pink].
  brand: ['#9B8CF5', '#FF8FC7'] as const,
  night: ['#1F1C31', '#474071'] as const,
  // F-RECORD-02(Frame 10, 210:766) 슬롯 카드 아이콘 박스 전용 — brand보다 훨씬
  // 옅은 톤(연라벤더→연핑크). CTA 그라데이션과 색상 자체가 다른 별도 실측값입니다.
  iconBoxSoft: ['#EDE9FF', '#FCE8F4'] as const,
} as const;

// CTA 그라데이션 방향.
//
// 2026-08-15 — 재조정 (관리자 지적: "보라색이 너무 적음").
// 1차 시도(start 0,0 → end 0.16,1)는 CSS 171deg를 그대로 좌표로 옮긴 값이었는데,
// RN LinearGradient의 start/end는 버튼의 실제 px가 아니라 폭/높이 각각 0~1
// 비율입니다. 폭 342 × 높이 54처럼 가로로 매우 긴 버튼에서는 이 비율 좌표가
// 실제 대각선을 급격하게 꺾어버려서, 화면에는 핑크 비중이 훨씬 커 보이는
// 착시가 생겼습니다. 좌상단→우하단 단순 대각선(0,0 → 1,1)으로 바꾸면 가로로
// 긴 버튼일수록 오히려 자연스럽게 좌(보라)→우(핑크)로 고르게 읽힙니다.
export const gradientDirection = {
  cta: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  // S-05 체크 배지(80×80, 정사각형에 가까움) 전용. CSS 150deg를 좌표로 변환한 값 —
  // CTA 버튼(가로로 아주 긴 342×54)용 좌표를 그대로 재사용하면 착시가 생긴다고
  // 위에서 이미 겪었으므로, 정사각형 요소는 매번 따로 계산합니다.
  // 변환식: x2=0.5+0.5·sin(θ), y2=0.5-0.5·cos(θ), start=(1-x2,1-y2), end=(x2,y2)
  badge: { start: { x: 0.25, y: 0.07 }, end: { x: 0.75, y: 0.93 } },
  // 기록 홈 주간 스트립 선택 요일 원(32×32, 정사각형) 및 슬롯 카드 아이콘 박스(44×44,
  // 정사각형) 공용 — Figma 135deg 실측값을 위 변환식으로 좌표화.
  iconBox: { start: { x: 0.1464, y: 0.1464 }, end: { x: 0.8536, y: 0.8536 } },
} as const;

// CTA 전용 그림자 (Figma shadow/cta: #9B8CF559, offset 0/8, blur 20).
export const shadow = {
  cta: {
    shadowColor: '#9B8CF5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 6,
  },
  // S-05 체크 배지 전용 (Figma opacity 0.4 — cta의 0.35와 별개 실측값).
  badge: {
    shadowColor: '#9B8CF5',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 8,
  },
} as const;

// 리포트 카드 그림자 (Figma 281:824/281:875 실측 — drop-shadow rgba(155,140,245,0.08|0.06)).
// shadow.cta/badge는 CTA 버튼용이라 훨씬 진합니다 — 카드용은 별도 값입니다.
export const reportCardShadow = {
  strong: {
    shadowColor: '#9B8CF5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  soft: {
    shadowColor: '#9B8CF5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
} as const;

// 탭바 아이콘 전용 색상 (Checkpoint 9-A).
export const navIcon = {
  inactive: '#A79FC2',
  active: '#9B8CF5',
} as const;

// 리포트 홈(종합 점수 카드/항목별 추이) 전용 색상.
// 2026-08-17 — Figma 컬러 최종본(P8CmHDZp7z0dKiHByEzuLx, node 210:2437 "Frame 11")
// 실측값. 기존 공용 statusCaution(#E8785B)/statusGood(#4FB79A)와 값이 달라 — 그
// 토큰들은 SHOP-02 위험도 뱃지·마이페이지 성분 반응 뱃지 등 다른 화면에서 이미 쓰고
// 있어서 값을 바꾸면 그 화면들 색도 같이 바뀝니다(관리자 확인, 2026-08-17: 리포트
// 전용 새 토큰으로 분리, 기존 화면 영향 없음).
export const reportColor = {
  caution: '#FF6B5B', // --ds-status-caution (트러블/홍조 등 나쁜 방향)
  safe: '#3FAE8B', // --ds-status-safe (개선 방향)
  amber: '#FFB648', // --ds-status-amber (색소잡티 등)
  purple: '#9B8CF5', // --ds-brand-purple (모공 등) — brand500과 값은 같지만 의미가 달라 별도 키
  purpleDeep: '#7C6AE8', // --ds-brand-purple-deep (선택된 pill 텍스트 등)
  pink: '#FF8FC7', // --ds-brand-pink (홍조 등) — brandPink와 값은 같음
} as const;

// 리포트 지표별 accent 색상 매핑. Figma가 지표마다 고정 색을 씁니다(트러블=caution,
// 홍조=pink, 색소잡티=amber, 모공=purple) — 값의 좋고나쁨과 무관한 "지표 정체성" 색입니다.
export const metricAccent: Record<'trouble' | 'redness' | 'pigmentation' | 'pores', string> = {
  trouble: reportColor.caution,
  redness: reportColor.pink,
  pigmentation: reportColor.amber,
  pores: reportColor.purple,
} as const;

// UV·습도 배지 / 환경 팁 카드 전용.
// 2026-08-16 — Figma Home-Day(229:2571, 최신본) 실측값으로 교체. 기존 값(Checkpoint 9-D)은
// 히어로 이미지가 생기기 전, 카드 배경 위에 배지가 있던 시절 값이라 지금은 안 맞습니다.
// 마이페이지 성분 프로파일 pill (Figma MyPage 59:7243 / 59:7264 실측).
// Tag 컴포넌트를 쓰지 않는 이유: Figma의 이 pill은 아이콘 없이 성분명만 담고, 묶음
// 제목("✓ 잘 맞는 성분 목록")이 이미 상태를 말해줍니다. Tag는 아이콘이 항상 붙는
// 판정 배지라 여기 쓰면 한 줄에 체크 아이콘이 5개씩 반복됩니다.
export const ingredientPillTint = {
  good: { bg: '#E1F5EE', fg: '#3FAE8B' },
  caution: { bg: '#FFE6E1', fg: '#FF6B5B' },
  watching: { bg: '#FFF1D8', fg: '#FFB648' },
} as const;

export const environmentTint = {
  tipBg: '#FFF1D8', // --ds-status-amber-soft
  tipText: '#B4600A', // --ds-status-amber-text
} as const;

// 히어로(날씨 배경 이미지) 위에 얹는 UI 전용 반투명 흰색 — Figma --ds-overlay-white-*.
export const overlayWhite = {
  28: 'rgba(255, 255, 255, 0.28)', // 낮/밤 토글 배경
  90: 'rgba(255, 255, 255, 0.9)', // UV·습도 칩 배경
} as const;

// SHOP-01 추천 카드의 근거 태그 칩(CHECK-01 `tags`, ADR 0027) 전용.
// 2026-08-17 관리자 결정 — 1번 칩은 `category`별로 색을 갈라 섹션 정체성을 따라가고,
// 2번 칩("주의 성분 미포함")은 분류와 무관한 안전 근거라 초록 하나로 고정합니다.
//
// ⚠️ humidityCare(파랑)는 **Figma 실측값이 아닙니다.** 이 프로젝트 팔레트에 파랑 계열이
// 아예 없어서 "보습/수분"에 맞춰 새로 잡은 잠정값입니다 — 컬러 토큰 최종본 수령 시
// 교체 대상입니다.
//
// ⚠️ todayNeeded(코랄)는 reportColor.caution(#FF6B5B, 리포트에서 "트러블 = 나쁜 방향")과
// 인접한 색입니다. 두 화면이 같이 보이지 않아 실사용 혼동은 없다는 판단이지만, 값을
// 일부러 다르게(#C0442F 계열) 잡아 리포트 지표색과 겹치지 않게 했습니다.
export const shopTagTint = {
  todayNeeded: { bg: '#FFE9E5', fg: '#C0442F' },
  humidityCare: { bg: '#E4F0FA', fg: '#1F6C9E' },
  matchedIngredient: { bg: '#EFE9FF', fg: '#6250C8' },
  /** 분류와 무관한 안전 근거 — 어느 섹션에서든 같은 색입니다. */
  noCaution: { bg: '#E1F5EE', fg: '#2F8A6C' },
} as const;

// xl(20)은 Figma --ds-radius-xl — CTA 버튼 전용입니다.
export const radius = { sm: 12, md: 16, xl: 20, lg: 24, pill: 999 } as const;

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32 } as const;