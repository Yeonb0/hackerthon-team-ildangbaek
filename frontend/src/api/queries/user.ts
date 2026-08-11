// src/api/queries/user.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { unwrap } from '@/api/unwrap';
import { USE_MOCK } from '@/api/useMock';
import { saveNotificationSetting } from '@/api/notification';
import {
  buildMockIngredientProfile,
  buildMockMyPage,
  searchMockLocations,
  updateMockLocation,
} from '@/api/mock/user';
import { useAuthStore } from '@/store/authStore';
import type {
  IngredientProfileResult,
  IngredientStatus,
  LocationItem,
  MyPageResult,
  UpdateLocationInput,
} from '@/types/user';
import type { NotificationSettingInput } from '@/types/onboarding';

// ---------------------------------------------------------------------------
// USER-01 · GET /users/me (S-23)
// ---------------------------------------------------------------------------

export async function getMyPage(): Promise<MyPageResult> {
  if (USE_MOCK) {
    return await buildMockMyPage();
  }
  return unwrap<MyPageResult>(apiClient.get('/users/me'));
}

export function useMyPage() {
  return useQuery({ queryKey: ['myPage'], queryFn: getMyPage });
}

// ---------------------------------------------------------------------------
// USER-02 · GET /users/me/ingredient-profile (성분 전체 보기)
// ---------------------------------------------------------------------------

export async function getIngredientProfile(status?: IngredientStatus): Promise<IngredientProfileResult> {
  if (USE_MOCK) {
    return buildMockIngredientProfile(status);
  }
  return unwrap<IngredientProfileResult>(
    apiClient.get('/users/me/ingredient-profile', { params: status ? { status } : undefined })
  );
}

export function useIngredientProfile(status?: IngredientStatus) {
  return useQuery({
    queryKey: ['ingredientProfile', status ?? 'all'],
    queryFn: () => getIngredientProfile(status),
  });
}

// ---------------------------------------------------------------------------
// USER-05 · GET /locations?keyword= (S-24 검색)
// F-PRODUCT-02와 동일하게 300ms 디바운스는 화면에서 useDebouncedValue로 처리하고,
// 여기서는 빈 키워드일 때도 "기본 목록"을 그대로 요청합니다(USER-05: 미지정 시 기본 목록).
// ---------------------------------------------------------------------------

export async function searchLocations(keyword: string): Promise<LocationItem[]> {
  if (USE_MOCK) {
    return searchMockLocations(keyword);
  }
  return unwrap<LocationItem[]>(
    apiClient.get('/locations', { params: keyword ? { keyword } : undefined })
  );
}

export function useLocationSearch(keyword: string) {
  const trimmed = keyword.trim();
  return useQuery({
    queryKey: ['locationSearch', trimmed],
    queryFn: () => searchLocations(trimmed),
  });
}

// ---------------------------------------------------------------------------
// USER-06 · PATCH /users/me/location (S-24 저장 · GPS 자동 갱신)
// ---------------------------------------------------------------------------

export async function updateLocation(input: UpdateLocationInput): Promise<void> {
  if (USE_MOCK) {
    updateMockLocation(input);
    return;
  }
  // 응답 result 형태가 명세서에 문서화되어 있지 않아(AUTH-03처럼 null일 가능성이 높음)
  // 값을 쓰지 않고 성공 여부만 봅니다. 갱신된 지역명은 useMyPage 무효화로 다시 받습니다.
  await unwrap<unknown>(apiClient.patch('/users/me/location', input));
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateLocation,
    onSuccess: () => {
      // 저장 후 다음 환경 조회부터 이 위치를 기준으로 동작한다(USER-06 BR2) —
      // 마이페이지 표시용 location과, 홈 화면 날씨(위치 기반)도 함께 갱신 대상입니다.
      queryClient.invalidateQueries({ queryKey: ['myPage'] });
      queryClient.invalidateQueries({ queryKey: ['home'] });
    },
  });
}

// ---------------------------------------------------------------------------
// F-MY-05 · PATCH /users/me/notification (S-23) — S-06 온보딩과 함수 자체는 공유하고
// (api/notification.ts 주석 참고), 여기서는 TanStack Query 뮤테이션 형태로만 감쌉니다.
//
// ⚠️ Phase 8 수정(2026-08-11): 알림 상태를 platformStorage(SecureStore)에 저장하도록
// 고친 뒤로 "저장 → 다시 조회"를 순서대로 기다리는 구조라 스위치 반응이 눈에 띄게
// 느려졌습니다(관리자 실기기 확인). 스위치처럼 누르는 즉시 반응해야 하는 컨트롤은
// 저장이 끝나길 기다리지 않고 먼저 화면부터 바꾸는 게(optimistic update) 맞아서,
// onMutate에서 캐시를 직접 미리 바꿔두고 실패하면 onError에서 되돌리는 방식으로
// 바꿨습니다. 이 코드베이스의 다른 뮤테이션들(성공 후 invalidate만)과 패턴이
// 다른 이유는 "탭 즉시 반응"이 필요한 스위치류가 이번이 처음이기 때문입니다.
// ---------------------------------------------------------------------------

export function useUpdateNotificationSetting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NotificationSettingInput) => saveNotificationSetting(input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ['myPage'] });
      const previous = queryClient.getQueryData<MyPageResult>(['myPage']);
      if (previous) {
        queryClient.setQueryData<MyPageResult>(['myPage'], {
          ...previous,
          notificationEnabled: input.enabled,
        });
      }
      return { previous };
    },
    onError: (_error, _input, context) => {
      // 저장 실패 시(실제 서버 연동 후 네트워크 오류 등) 낙관적으로 바꿔둔 값을 되돌립니다.
      if (context?.previous) {
        queryClient.setQueryData(['myPage'], context.previous);
      }
    },
    onSettled: () => {
      // 성공하든 실패하든 실제 저장된 값으로 다시 맞춥니다.
      queryClient.invalidateQueries({ queryKey: ['myPage'] });
    },
  });
}

// ---------------------------------------------------------------------------
// F-AUTH-03 · POST /auth/logout (S-23)
// ---------------------------------------------------------------------------

export async function logout(): Promise<void> {
  if (!USE_MOCK) {
    // BR3: 서버 Refresh Token 폐기. 실패해도(네트워크 끊김 등) 클라이언트 인증 정보는
    // 반드시 지워야 하므로, 이 호출 실패를 상위로 던지지 않고 무시합니다 —
    // "로그아웃이 절반만 되는" 상태(서버는 유효한데 화면은 로그인으로 빠진 상태)가
    // 로그인 화면 진입 자체를 막는 것보다 사용자에게 덜 위험합니다.
    try {
      await unwrap<unknown>(apiClient.post('/auth/logout'));
    } catch {
      // 무시 — 아래에서 클라이언트 인증 정보는 항상 제거합니다.
    }
  }
}

export function useLogout() {
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      // RootNavigator가 accessToken === null을 감지해서 자동으로 S-00(로그인)으로 전환합니다.
      // (명시적 navigation 호출이 필요 없는 구조 — RootNavigator.tsx 참고)
      clearAuth();
      queryClient.clear();
    },
  });
}