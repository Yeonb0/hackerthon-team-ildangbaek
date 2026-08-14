// src/api/emailAuth.ts
//
// ⚠️ 백엔드 API 없음 (Phase 11-A, 2026-08-13 관리자 결정) — 아래 함수는 전부 목업입니다.
// 실제 API가 생기면 이 파일의 함수 내부만 axios 호출로 교체하세요. 화면 코드는 이 파일만
// import하므로 변경이 필요 없습니다. 자세한 배경은 api/mock/emailAuth.ts 상단 주석 참고.
import {
  mockCompleteEmailSignup,
  mockGetResendRemainingSeconds,
  mockLoginWithEmail,
  mockSendVerificationCode,
  mockVerifyCode,
  RESEND_COOLDOWN_SECONDS,
} from '@/api/mock/emailAuth';
import type { LoginResult } from '@/types/auth';

export { RESEND_COOLDOWN_SECONDS };

/** AUTH-03 이메일 로그인. 목업이라 형식만 맞으면 항상 성공합니다(카카오/구글 목업과 동일 원칙). */
export async function loginWithEmail(_email: string, _password: string): Promise<LoginResult> {
  return mockLoginWithEmail();
}

/** AUTH-05 → AUTH-06 진입 시 및 AUTH-06.2 재전송 시 호출 */
export async function sendVerificationCode(_email: string): Promise<void> {
  return mockSendVerificationCode();
}

/** AUTH-06 화면 마운트 시 남은 재전송 대기 시간(초) 조회 */
export async function getResendRemainingSeconds(): Promise<number> {
  return mockGetResendRemainingSeconds();
}

/** AUTH-06 "인증 완료" 탭 시 호출. true면 AUTH-06.1, false면 AUTH-06.2로 이동합니다. */
export async function verifyEmailCode(_email: string, code: string): Promise<boolean> {
  return mockVerifyCode(code);
}

/** AUTH-06.1 "계속하기" 탭 시 호출 — 가입을 완료하고 세션을 발급합니다. */
export async function completeEmailSignup(
  _email: string,
  _password: string,
): Promise<LoginResult> {
  return mockCompleteEmailSignup();
}
