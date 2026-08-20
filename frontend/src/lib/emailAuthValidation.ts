// src/lib/emailAuthValidation.ts
// Phase 11-A 이메일 인증 플로우 전용 클라이언트 검증.
//
// 2026-08-19(세션 20) — 백엔드 실 API 연동 시 대조 완료. 서버 규칙과 일치합니다:
//   · 비밀번호: EmailSignupRequest의 ^(?=.*[A-Za-z])(?=.*\d).{8,}$ = 영문+숫자 8자 이상
//   · 인증코드: ^\d{6}$
//   · 이메일: 서버는 jakarta @Email, 여기선 동등한 최소 형식 검사
// 서버가 규칙을 바꾸면 여기도 같이 바꿔야 합니다(불일치 시 서버가
// COMMON_VALIDATION_FAILED를 던지는데 프론트엔 필드 에러를 붙일 자리가 없습니다).

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
