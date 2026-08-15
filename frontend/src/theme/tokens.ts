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

  // --- 테두리 (2026-08-15 관리자 결정: 검정/무채색 → 보라 계열) ---
  border: '#C9C0E0', // 일반 구분선·칩 테두리
  borderStrong: '#9B8CF5', // 입력창 등 강조 테두리 (Figma Input/Text)
  // 소셜 로그인(카카오/구글) 버튼처럼 흰 배경 위에 아주 옅은 경계선만 필요한 곳.
  // Figma Button - 구글로 시작하기(72:9)의 --ds-border-divider-strong 실측값.
  borderDivider: '#E3DDF5',

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
} as const;

// 탭바 아이콘 전용 색상 (Checkpoint 9-A).
export const navIcon = {
  inactive: '#A79FC2',
  active: '#9B8CF5',
} as const;

// UV·습도 배지 / 환경 팁 카드 전용 (Checkpoint 9-D, HOME01 목업 실측값).
export const environmentTint = {
  uvBg: '#F1E8DE',
  uvText: '#6B5540',
  humidityBg: '#E7F2F0',
  humidityText: '#3E6461',
  tipBg: '#F7F1EC',
  tipBorder: '#C9A484',
  tipTitle: '#6B5540',
  tipDescription: '#8A7A63',
} as const;

// xl(20)은 Figma --ds-radius-xl — CTA 버튼 전용입니다.
export const radius = { sm: 12, md: 16, xl: 20, lg: 24, pill: 999 } as const;

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32 } as const;
