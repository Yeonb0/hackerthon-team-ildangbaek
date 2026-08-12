// src/api/mock/emailAuth.ts
//
// ⚠️ 임시 (Phase 11-A, 2026-08-13 관리자 결정)
// 이메일 회원가입/인증 관련 백엔드 API가 아직 없습니다. files/api 명세서.md 확인 결과
// Auth API는 AUTH-01(로그인) / AUTH-02(토큰 재발급) / AUTH-03(로그아웃) 3개뿐이고,
// 회원가입·비밀번호 설정·인증코드 발송/확인 엔드포인트는 전혀 없습니다.
// (로그인 API의 provider=EMAIL도 oauthAccessToken을 요구해서 실제 이메일+비밀번호 방식과 구조가 안 맞습니다.)
//
// 그래서 이 파일 전체가 목업이며, USE_MOCK 여부와 무관하게 항상 이 로직을 씁니다.
// 백엔드 API가 나오면 src/api/emailAuth.ts의 함수 내부만 실제 axios 호출로 교체하면 됩니다
// (기존 getOAuthToken과 동일한 패턴 — 호출부/화면 코드는 변경 불필요).
import { getItem, setItem } from '@/lib/platformStorage';
import { getMockOnboardingCompleted } from '@/api/mock/mockPersistence';
import type { LoginResult } from '@/types/auth';

const CODE_SENT_AT_KEY = 'skinteller.mock.emailAuth.codeSentAt';

/**
 * 목업 인증코드. 이 값을 입력하면 항상 성공(AUTH-06.1), 형식이 맞는 다른 6자리는
 * 항상 실패(AUTH-06.2)로 처리합니다 — 관리자님이 실기기에서 성공/실패 화면을
 * 둘 다 테스트할 수 있도록 하기 위한 목업 전용 규칙입니다. 실제 API 연동 시 사라집니다.
 */
export const MOCK_VERIFICATION_CODE = '123456';

export const RESEND_COOLDOWN_SECONDS = 54;

export async function mockSendVerificationCode(): Promise<void> {
  await setItem(CODE_SENT_AT_KEY, String(Date.now()));
}

/** 화면 마운트 시 잔여 재전송 대기 시간(초)을 계산합니다. 발송 기록이 없으면 0(즉시 재전송 가능). */
export async function mockGetResendRemainingSeconds(): Promise<number> {
  const sentAt = await getItem(CODE_SENT_AT_KEY);
  if (!sentAt) return 0;
  const elapsedSeconds = Math.floor((Date.now() - Number(sentAt)) / 1000);
  return Math.max(0, RESEND_COOLDOWN_SECONDS - elapsedSeconds);
}

export async function mockVerifyCode(code: string): Promise<boolean> {
  return code === MOCK_VERIFICATION_CODE;
}

/** AUTH-03 이메일 로그인 — 기존 카카오/구글 목업과 동일하게 "매번 같은 가짜 사용자"를 흉내냅니다. */
export async function mockLoginWithEmail(): Promise<LoginResult> {
  const completed = await getMockOnboardingCompleted();
  return {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    isNewUser: !completed,
    onboardingCompleted: completed,
    nextStep: completed ? 'NONE' : 'BASIC_INFO',
  };
}

/** AUTH-06.1에서 "계속하기" 탭 시 — 신규 가입 완료 처리. 항상 신규 사용자로 취급합니다. */
export async function mockCompleteEmailSignup(): Promise<LoginResult> {
  return {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    isNewUser: true,
    onboardingCompleted: false,
    nextStep: 'BASIC_INFO',
  };
}
