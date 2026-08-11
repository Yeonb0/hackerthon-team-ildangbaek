// src/api/notification.ts
// USER-07 · PATCH /users/me/notification — S-06(온보딩)과 S-23(마이페이지)이 같이 씁니다.
import { apiClient } from '@/api/client';
import { unwrap } from '@/api/unwrap';
import { USE_MOCK } from '@/api/useMock';
import { setMockNotificationEnabled } from '@/api/mock/user';
import type { NotificationSettingInput } from '@/types/onboarding';

export async function saveNotificationSetting(input: NotificationSettingInput): Promise<void> {
  if (USE_MOCK) {
    // Phase 8 수정: 예전엔 여기서 성공만 흉내 내고 아무 상태도 안 남겼는데, S-23 마이페이지가
    // useMyPage()로 값을 다시 읽어와 스위치에 반영하기 때문에 세션 상태를 실제로 갱신해야
    // 토글이 꺼진 채로 유지됩니다(관리자 실기기 확인, 2026-08-11).
    // Phase 8 재수정: 메모리 변수 대신 platformStorage에 실제로 저장합니다(아래 함수가
    // 이제 비동기입니다) — mockPersistence.ts와 동일한 이유(JS 런타임 재시작 시
    // 메모리 변수가 초기화되는 문제, 관리자 실기기 확인 2026-08-11 재발).
    await setMockNotificationEnabled(input.enabled);
    return;
  }
  // 응답 result 형태가 명세서에 명시되어 있지 않아 값을 쓰지 않고 성공 여부만 봅니다.
  await unwrap<unknown>(apiClient.patch('/users/me/notification', input));
}

