import axios, { InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/authStore';
import { ErrorCode } from '@/types/errorCodes';

// ⚠️ EXPO_PUBLIC_API_BASE_URL에는 '/api/v1'까지 포함합니다.
//    예) http://192.168.0.10:8080/api/v1
//    아래 모든 호출은 이 전제로 상대경로만 씁니다(.env.example 참고).
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

// 요청 인터셉터: 매 요청마다 accessToken을 Authorization 헤더에 자동으로 붙입니다.
//
// ⚠️ 2026-08-18(백엔드 연동일) — `X-User-Id` 헤더를 제거했습니다.
//    백엔드가 ADR 0017로 임시 인증을 토큰 하나로 통합하면서
//    CurrentUserIdArgumentResolver가 **Authorization 헤더만** 읽도록 바뀌었습니다.
//    형식: `Bearer mock-access-{userId}-{nonce}.{signature}` — 서버 비밀키(MockTokenSigner)
//    서명이 맞는 토큰만 신뢰하므로, X-User-Id를 아무리 붙여도 서버는 보지 않습니다.
//    즉 로그인 없이 .env 값만으로 API를 찔러보던 경로는 더 이상 동작하지 않습니다
//    (반드시 POST /auth/login을 먼저 통과해야 합니다).
apiClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// ---------------------------------------------------------------------------
// 401 → refresh → 원 요청 1회 재시도
//
// ⚠️ 버그 수정 (2026-08-14, 백엔드 연동 대비) — 기존 구현에 hang 버그가 둘 있었습니다.
//   1) 401을 "가장 먼저" 받은 요청은 await refresh가 끝나고 onRefreshed()가 큐를 비운
//      **뒤에** 자기 콜백을 push했습니다. 그 콜백은 영원히 호출되지 않아 원 요청
//      Promise가 무한 대기했습니다(로딩 스피너가 안 끝나는 증상).
//   2) refresh가 실패하면 큐에 이미 쌓인 대기자들이 resolve도 reject도 되지 않아
//      역시 전부 hang했습니다.
//   → 이제 모든 요청이 refresh를 트리거하기 **전에** 대기열에 등록하고,
//      성공/실패 어느 쪽이든 대기열을 반드시 비웁니다.
// ---------------------------------------------------------------------------
type Waiter = { resolve: (token: string) => void; reject: (error: unknown) => void };

let isRefreshing = false;
let waiters: Waiter[] = [];

function flushSuccess(token: string) {
  const pending = waiters;
  waiters = [];
  pending.forEach((w) => w.resolve(token));
}

function flushFailure(error: unknown) {
  const pending = waiters;
  waiters = [];
  pending.forEach((w) => w.reject(error));
}

async function refreshAccessToken(): Promise<string> {
  const { refreshToken, setTokens } = useAuthStore.getState();
  if (!refreshToken) {
    throw new Error('NO_REFRESH_TOKEN');
  }

  // 다른 모든 호출과 동일하게 baseURL에 '/api/v1'이 포함되어 있다는 전제로 상대경로를 씁니다.
  // (여기만 raw axios를 쓰는 이유: apiClient를 쓰면 이 요청의 401이 다시 이 인터셉터로 들어옵니다.)
  const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, null, {
    headers: { 'Refresh-Token': refreshToken },
    timeout: 10000,
  });

  const newAccessToken: string | undefined = data?.result?.accessToken;
  if (!newAccessToken) {
    throw new Error('REFRESH_NO_ACCESS_TOKEN');
  }

  // ⚠️ AUTH-02 응답에는 accessToken만 있습니다(명세 · 백엔드 RefreshTokenResponse 모두 확인).
  // 기존 코드는 data.result.refreshToken을 그대로 읽어 setTokens에 넘겼는데, 그러면
  // refreshToken이 undefined로 덮어써져 **두 번째 만료부터 무조건 재로그인으로 튕겼습니다.**
  // 백엔드가 나중에 rotation을 도입해 refreshToken을 같이 주면 그때는 새 값이 쓰입니다.
  const nextRefreshToken: string = data?.result?.refreshToken ?? refreshToken;
  setTokens(newAccessToken, nextRefreshToken);
  return newAccessToken;
}

// refresh를 시도하면 안 되는 엔드포인트. 특히 /auth/login의 401(AUTH_LOGIN_FAILED)까지
// refresh를 태우면, 로그인 실패가 엉뚱하게 "세션 만료"로 처리됩니다.
//
// 2026-08-19(세션 20) — '/auth/email/'을 추가했습니다. POST /auth/email/login 실패도
// AUTH_LOGIN_FAILED(401)라서, 비밀번호를 틀렸을 뿐인데 refresh를 태우고 그 실패로
// clearAuth()까지 도는 경로가 열려 있었습니다(재로그인 중인 사용자의 남은 세션을
// 지워버림). includes 매칭이라 접두사 하나로 email 5개 엔드포인트가 모두 걸립니다.
const NO_REFRESH_PATHS = ['/auth/login', '/auth/refresh', '/auth/email/'];

/** 이 401이 "액세스 토큰 만료"인지 판정합니다. 코드가 없으면(봉투가 아닌 응답) 만료로 간주합니다. */
function isExpiredAccessToken(code: string | undefined): boolean {
  return (
    code === undefined ||
    code === ErrorCode.AUTH_TOKEN_EXPIRED ||
    code === ErrorCode.AUTH_INVALID_TOKEN ||
    code === ErrorCode.COMMON_UNAUTHORIZED
  );
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error);

    const originalRequest = error.config as RetriableConfig | undefined;
    const status = error.response?.status;
    const code = (error.response?.data as { code?: string } | undefined)?.code;
    const url = originalRequest?.url ?? '';
    const isAuthEndpoint = NO_REFRESH_PATHS.some((path) => url.includes(path));

    if (
      status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      isAuthEndpoint ||
      !isExpiredAccessToken(code)
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true; // 무한 재시도 방지

    const { refreshToken, clearAuth } = useAuthStore.getState();
    if (!refreshToken) {
      clearAuth();
      return Promise.reject(error);
    }

    // ★ refresh를 트리거하기 전에 먼저 대기열에 등록합니다 (위 버그 1 수정).
    const retryPromise = new Promise<string>((resolve, reject) => {
      waiters.push({ resolve, reject });
    }).then((token) => {
      originalRequest.headers.Authorization = `Bearer ${token}`;
      return apiClient(originalRequest);
    });

    if (!isRefreshing) {
      isRefreshing = true;
      void refreshAccessToken()
        .then((token) => {
          flushSuccess(token);
        })
        .catch((refreshError) => {
          // AUTH_REFRESH_TOKEN_EXPIRED 등 → 로그인 화면으로 (실제 이동은 RootNavigator가
          // accessToken === null을 감지해 처리합니다).
          useAuthStore.getState().clearAuth();
          flushFailure(refreshError);
        })
        .finally(() => {
          isRefreshing = false;
        });
    }

    return retryPromise;
  },
);
