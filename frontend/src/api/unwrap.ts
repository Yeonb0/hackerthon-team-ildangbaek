import { AxiosResponse } from 'axios';

type ApiEnvelope<T> = {
  isSuccess: boolean;
  code: string;
  message: string;
  result: T;
};

export class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'ApiError';
  }
}

// 공통 응답 봉투({isSuccess, code, message, result})를 벗겨서 result만 반환합니다.
// 화면 코드는 isSuccess를 직접 볼 일이 없습니다.
export async function unwrap<T>(p: Promise<AxiosResponse<ApiEnvelope<T>>>): Promise<T> {
  const { data } = await p;
  if (!data.isSuccess) {
    throw new ApiError(data.code, data.message);
  }
  return data.result;
}