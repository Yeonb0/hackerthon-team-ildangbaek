import { AxiosResponse } from 'axios';

type ApiEnvelope<T> = {
  isSuccess: boolean;
  code: string;
  message: string;
  result: T;
};

/** 공통응답포맷 §1.4 Validation 오류의 result 형태 */
type ValidationErrorItem = { field: string; reason: string };

export class ApiError extends Error {
  code: string;
  /** 실패 응답의 result. COMMON_VALIDATION_FAILED류는 { errors: ValidationErrorItem[] } 형태입니다. */
  result: unknown;
  constructor(code: string, message: string, result?: unknown) {
    super(message);
    this.code = code;
    this.result = result;
    this.name = 'ApiError';
  }
}

// 공통 응답 봉투({isSuccess, code, message, result})를 벗겨서 result만 반환합니다.
// 화면 코드는 isSuccess를 직접 볼 일이 없습니다.
export async function unwrap<T>(p: Promise<AxiosResponse<ApiEnvelope<T>>>): Promise<T> {
  const { data } = await p;
  if (!data.isSuccess) {
    throw new ApiError(data.code, data.message, data.result);
  }
  return data.result;
}

/**
 * COMMON_VALIDATION_FAILED / ONBOARD_SKIN_TYPE_REQUIRED 등 필드별 에러가 있는 실패 응답에서
 * { field: reason } 형태로 뽑아냅니다. 공통응답포맷 §1.4 — 필드가 하나여도 errors 배열 형태를 유지하므로
 * 어떤 실패 코드든 동일하게 처리할 수 있습니다.
 * 폼 인라인 에러 표시용입니다 (풀스크린 ErrorState를 쓰지 않는 케이스, F-SYSTEM-03 입력값 보존 원칙).
 */
export function getFieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError)) return {};
  const result = error.result as { errors?: ValidationErrorItem[] } | undefined;
  const errors = result?.errors ?? [];
  return errors.reduce<Record<string, string>>((acc, { field, reason }) => {
    acc[field] = reason;
    return acc;
  }, {});
}