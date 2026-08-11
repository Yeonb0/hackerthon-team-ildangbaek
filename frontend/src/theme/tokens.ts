// src/theme/tokens.ts

// Checkpoint 9-D — 브랜드 컬러 방향을 스카이블루+블러시핑크에서 로고(라벤더+핑크)
// 계열로 전환 (관리자 결정, 2026-08-11). brand500은 Checkpoint 9-A의 navIcon.active와
// 동일값(#9B8CF5)이라 탭바와도 자연스럽게 이어집니다. 50/100/700은 500 기준 계산값.
// blush는 로고 실측 핑크(#FBADC7)에 맞춰 미세 조정. 정확한 최종값은 Figma 확정 시 교체 예정.
export const color = {
  brand50: '#F5F4FE',
  brand100: '#E7E3FD',
  brand500: '#9B8CF5',
  brand700: '#7368B5',

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

  // S-16 얼굴 촬영처럼 카메라 화면을 풀블리드로 덮는 화면 전용. ink/bg 톤과 별개로
  // 항상 순수 검정 배경 + 흰 글자가 필요해서 분리했습니다 — 디자인 확정 전 placeholder.
  black: '#000000',
  white: '#FFFFFF',
  scrim60: 'rgba(0, 0, 0, 0.6)',
  scrim40: 'rgba(0, 0, 0, 0.4)',
} as const;

// 그라데이션 전용 토큰 (Checkpoint 9-D). 단색 color.brand*와 별개로 두 색 배열이 필요한
// 곳(LinearGradient)에서만 씁니다.
export const gradient = {
  // CTA 버튼·루틴 1순위 배지("우선"/"권장") — 디자이너 레퍼런스 이미지 실측값
  // (관리자 제공, 2026-08-11). 홈 화면 한정으로만 적용, 로그인 등 다른 버튼은 그대로 둡니다.
  brand: ['#A58DE8', '#E794C9'] as const,
  // 밤 홈 배경 — 기존 [ink900, ink600](무채색 다크모드)에서 톤만 진한 보라로 교체한
  // 작은 변경입니다. 라이트 배경+어두운 글자로 가는 전체 재작업은 디자인 확정 때 진행
  // 예정이라 지금은 다크모드 구조(흰 글자) 그대로 유지합니다 (관리자 결정, 2026-08-11).
  night: ['#1F1C31', '#474071'] as const,
} as const;

// 탭바 아이콘 전용 색상 (Checkpoint 9-A). Checkpoint 9-D에서 brand500이 이 값(#9B8CF5)과
// 동일하게 통일됐습니다 — 계속 별도 네임스페이스로 두는 이유는 탭 비활성색(inactive)이
// brand 스케일에 없는 중간 톤이라서입니다.
export const navIcon = {
  inactive: '#A79FC2',
  active: '#9B8CF5',
} as const;

// UV·습도 배지 / 환경 팁 카드 전용 (Checkpoint 9-D, HOME01 목업 실측값). brand 스케일이
// 보라로 바뀌면서 날씨 정보엔 안 어울려서, 목업 그대로 웜톤(UV)/쿨톤(습도) 별도 팔레트로
// 둡니다. Figma 최종 색상표 오면 교체 예정.
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

export const radius = { sm: 12, md: 16, lg: 24, pill: 999 } as const;

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32 } as const;