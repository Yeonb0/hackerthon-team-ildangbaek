// src/api/mock/mockPersistence.ts
//
// ⚠️ 목업(USE_MOCK=true) 전용입니다. 실제 백엔드에서는 온보딩 완료 여부를 서버 DB가 기억하지만,
// 목업 모드엔 서버가 없으니 "이 기기에서 목업 로그인으로 온보딩을 완료했었는지"를
// secureTokenStorage와 같은 방식(웹은 localStorage, 네이티브는 SecureStore)으로 저장해둡니다.
// 이게 없으면 브라우저 새로고침처럼 JS 런타임이 완전히 재시작될 때마다
// GET /users/me/onboarding 목업 응답이 항상 고정값(미완료)을 반환해서, 완료 후에도
// 새로고침하면 다시 온보딩으로 튕기는 문제가 생깁니다.
import { deleteItem, getItem, setItem } from '@/lib/platformStorage';

const MOCK_ONBOARDING_COMPLETED_KEY = 'skinteller.mock.onboardingCompleted';

export async function getMockOnboardingCompleted(): Promise<boolean> {
  return (await getItem(MOCK_ONBOARDING_COMPLETED_KEY)) === 'true';
}

export async function setMockOnboardingCompleted(completed: boolean): Promise<void> {
  if (completed) {
    await setItem(MOCK_ONBOARDING_COMPLETED_KEY, 'true');
  } else {
    await deleteItem(MOCK_ONBOARDING_COMPLETED_KEY);
  }
}
