// src/lib/emailAuthValidation.ts
// Phase 11-A 이메일 인증 플로우 전용 클라이언트 검증. 백엔드 API가 아직 없어서
// (files/api 명세서.md 확인 결과 없음) 서버 검증 규칙을 알 수 없습니다 — 임시로
// Figma 텍스트("영문·숫자 포함 8자 이상")와 일반적인 이메일 형식만 확인합니다.
// 실제 API 연동 시 서버 규칙에 맞춰 재확인이 필요합니다.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;

export function isValidEmail(email: string): boolean {
  return EMAIL_PATTERN.test(email.trim());
}

/** 영문 + 숫자 포함 8자 이상 (Figma AUTH-05 안내 문구 기준) */
export function isValidPassword(password: string): boolean {
  if (password.length < PASSWORD_MIN_LENGTH) return false;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  return hasLetter && hasDigit;
}

export function isValidVerificationCode(code: string): boolean {
  return /^\d{6}$/.test(code);
}
