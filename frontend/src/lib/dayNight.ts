// src/lib/dayNight.ts
//
// 낮/밤 판정을 이 파일 하나로 격리합니다 (F-HOME-01 BR5, 명세서 HOME-01과 동일한 원칙).
// 이후 루틴 기록 데이터가 쌓여서 개인화 판정으로 바뀌더라도 이 함수 내부만 교체하면 됩니다.
//
// 실제 판정은 서버(GET /home)가 내려주는 homeType을 그대로 씁니다 — 이 함수는
// ① USE_MOCK일 때 서버 판정을 흉내내기 위해, ② 체크포인트 B의 dayNightStore가
// "자동 모드일 때 몇 시인지" 재확인할 때 씁니다. 클라이언트가 이 결과로 서버 판정을
// 덮어쓰지 않습니다 — 서버 응답이 항상 최종 판단입니다.
//
// lib/date.ts와 동일한 원칙: 로컬 시간 기준입니다 (UTC 변환 금지).
import type { HomeType } from '@/types/home';

/** 06:00~17:59 → DAY, 18:00~05:59 → NIGHT (전 사용자 동일 고정 시각) */
export function getFixedHomeType(date: Date = new Date()): HomeType {
  const hour = date.getHours();
  return hour >= 6 && hour < 18 ? 'DAY' : 'NIGHT';
}
