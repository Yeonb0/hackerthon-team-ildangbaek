import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// 요청 인터셉터: 매 요청마다 accessToken을 Authorization 헤더에 자동으로 붙입니다.
apiClient.interceptors.request.use((config) => {
  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// 401(토큰 만료) 발생 시 refresh 후 원 요청을 1회 재시도합니다.
// isRefreshing/refreshSubscribers는 "동시에 여러 요청이 401을 받았을 때
// refresh를 딱 한 번만 호출하고, 나머지는 그 결과를 기다렸다가 이어서 재시도"하기 위한 큐입니다.
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // 무한 재시도 방지

      const { refreshToken, setTokens, clearAuth } = useAuthStore.getState();
      if (!refreshToken) {
        clearAuth();
        return Promise.reject(error);
      }

      if (!isRefreshing) {
        isRefreshing = true;
        try {
          const { data } = await axios.post(
            `${API_BASE_URL}/api/v1/auth/refresh`,
            null,
            { headers: { 'Refresh-Token': refreshToken } }
          );
          const newAccessToken = data.result.accessToken;
          const newRefreshToken = data.result.refreshToken;
          setTokens(newAccessToken, newRefreshToken);
          isRefreshing = false;
          onRefreshed(newAccessToken);
        } catch (refreshError) {
          isRefreshing = false;
          clearAuth(); // AUTH_REFRESH_TOKEN_EXPIRED → 로그인 화면으로 (실제 이동은 화면단에서 처리)
          return Promise.reject(refreshError);
        }
      }

      // refresh가 끝날 때까지 대기했다가, 새 토큰으로 원 요청을 재시도
      return new Promise((resolve) => {
        refreshSubscribers.push((token: string) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          resolve(apiClient(originalRequest));
        });
      });
    }

    return Promise.reject(error);
  }
);