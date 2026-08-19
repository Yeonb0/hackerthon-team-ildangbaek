// src/api/emailAuth.ts
//
// AUTH-03 / AUTH-05 / AUTH-06 이메일 인증 플로우의 API 레이어.
//
// ─────────────────────────────────────────────────────────────────────────────
// 2026-08-19(세션 20) — **목업 → 실 API 교체.**
//
// Phase 11-A(2026-08-13) 시점엔 백엔드에 이메일 관련 엔드포인트가 하나도 없어서
// 이 파일 전체가 목업이었습니다. 그사이 백엔드가 AuthController에 5개를 추가했고
// (2026-08-19 main → boyeon 머지), 프론트만 목업에 머물러 있어 "가입도 로그인도 안 되는"
// 상태였습니다. 이제 USE_MOCK=false면 아래 실제 엔드포인트를 씁니다.
//
//   POST /auth/email/send-code       { email }          → -
//   POST /auth/email/resend-cooldown { email }          → { remainingSeconds }
//   POST /auth/email/verify-code     { email, code }    → { verified }
//   POST /auth/email/signup          { email, password} → LoginResponse
//   POST /auth/email/login           { email, password} → LoginResponse
//
// ⚠️ 폐기된 우회 — 세션 20 초반에 잠시 `POST /auth/login`에 provider=EMAIL로 보내
// 세션을 받던 임시 코드(api/auth.ts의 loginWithEmailIdentity)가 있었습니다. 그 경로는
// providerUserId를 `email-{이메일}`로 만들고 passwordHash를 남기지 않아, 백엔드
// emailSignup()이 만드는 계정(`providerUserId = {이메일}`)과 키가 어긋납니다.
// users.email에 unique 제약이 있어 같은 이메일이 두 경로로 들어오면 충돌합니다.
// → 우회 함수는 제거했습니다. 그 우회로 이미 생성된 계정이 DB에 있으면 정상 가입이
//   USER_ALREADY_EXISTS로 막히므로 백엔드팀에 삭제 요청이 필요합니다
//   (provider_user_id LIKE 'email-%').
//
// 백엔드 규칙(AuthService 실측) — 프론트 목업과 값은 같지만 서버에만 있는 제약이 있습니다:
//   · 인증코드 고정값 123456, 재전송 쿨다운 54초 (목업과 동일)
//   · send-code를 먼저 호출하지 않으면 verify-code는 무조건 verified=false
//   · 코드/인증 상태 유효기간 10분 — 인증 후 10분 안에 signup을 마쳐야 하고,
//     지나면 COMMON_VALIDATION_FAILED
//   · 이미 가입된 이메일 → USER_ALREADY_EXISTS (409)
//   · 인증 상태는 서버 메모리(ConcurrentHashMap)라 **서버 재시작 시 초기화**됩니다
// ─────────────────────────────────────────────────────────────────────────────
import { apiClient } from '@/api/client';
import { unwrap } from '@/api/unwrap';
import { USE_MOCK } from '@/api/useMock';
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

/**
 * 서버가 normalizeEmail(trim + toLowerCase)로 계정을 찾으므로 클라이언트도 같은 규칙을
 * 적용해서 보냅니다. 안 맞추면 대소문자만 다른 입력이 "인증은 됐는데 가입은 안 되는"
 * 상태를 만듭니다(send-code와 signup이 서로 다른 키를 보게 됨).
 */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** AUTH-03 이메일 로그인. 실패(비밀번호 불일치·미가입)는 AUTH_LOGIN_FAILED(401)입니다. */
export async function loginWithEmail(email: string, password: string): Promise<LoginResult> {
  if (USE_MOCK) {
    return mockLoginWithEmail();
  }
  return unwrap<LoginResult>(
    apiClient.post('/auth/email/login', { email: normalizeEmail(email), password }),
  );
}

/** AUTH-05 → AUTH-06 진입 시 및 AUTH-06.2 재전송 시 호출 */
export async function sendVerificationCode(email: string): Promise<void> {
  if (USE_MOCK) {
    return mockSendVerificationCode();
  }
  await unwrap<null>(apiClient.post('/auth/email/send-code', { email: normalizeEmail(email) }));
}

/**
 * AUTH-06 화면 마운트 시 남은 재전송 대기 시간(초) 조회.
 * 2026-08-19 — 서버가 이메일별로 쿨다운을 관리해서 email 인자가 생겼습니다
 * (목업은 기기 저장소에 단일 값만 두고 있어 인자를 무시합니다).
 */
export async function getResendRemainingSeconds(email: string): Promise<number> {
  if (USE_MOCK) {
    return mockGetResendRemainingSeconds();
  }
  const result = await unwrap<{ remainingSeconds: number }>(
    apiClient.post('/auth/email/resend-cooldown', { email: normalizeEmail(email) }),
  );
  return result.remainingSeconds;
}

/** AUTH-06 "인증 완료" 탭 시 호출. true면 AUTH-06.1, false면 AUTH-06.2로 이동합니다. */
export async function verifyEmailCode(email: string, code: string): Promise<boolean> {
  if (USE_MOCK) {
    return mockVerifyCode(code);
  }
  const result = await unwrap<{ verified: boolean }>(
    apiClient.post('/auth/email/verify-code', { email: normalizeEmail(email), code }),
  );
  return result.verified;
}

/**
 * AUTH-06.1 "계속하기" 탭 시 호출 — 가입을 완료하고 세션을 발급합니다.
 * 서버는 직전 verify-code 성공 기록(10분)이 있어야 가입을 받아줍니다.
 */
export async function completeEmailSignup(email: string, password: string): Promise<LoginResult> {
  if (USE_MOCK) {
    return mockCompleteEmailSignup();
  }
  return unwrap<LoginResult>(
    apiClient.post('/auth/email/signup', { email: normalizeEmail(email), password }),
  );
}
