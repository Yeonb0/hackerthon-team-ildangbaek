// src/api/notification.ts
// USER-07 · PATCH /users/me/notification — S-06(온보딩)과 S-23(마이페이지)이 같이 씁니다.
import { apiClient } from '@/api/client';
import { unwrap } from '@/api/unwrap';
import { USE_MOCK } from '@/api/useMock';
import type { NotificationSettingInput } from '@/types/onboarding';

export async function saveNotificationSetting(input: NotificationSettingInput): Promise<void> {
  if (USE_MOCK) {
    return;
  }
  // 응답 result 형태가 명세서에 명시되어 있지 않아 값을 쓰지 않고 성공 여부만 봅니다.
  await unwrap<unknown>(apiClient.patch('/users/me/notification', input));
}
