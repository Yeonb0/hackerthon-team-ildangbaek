import axios, { AxiosResponse } from 'axios';
import { ErrorCode } from '@/types/errorCodes';

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
  /** 응답이 있었던 경우의 HTTP 상태. 네트워크 오류 등 응답 자체가 없으면 undefined입니다. */
  status?: number;
  constructor(code: string, message: string, result?: unknown, status?: number) {
    super(message);
    this.code = code;
    this.result = result;
    this.status = status;
    this.name = 'ApiError';
  }
}

/**
 * ⚠️ 백엔드 연동 대비 수정 (2026-08-14)
 *
 * 기존 unwrap은 `if (!data.isSuccess)` 분기만 갖고 있었는데, 이 분기는 **HTTP 200으로
 * 실패 봉투가 내려올 때만** 동작합니다. 실제 백엔드(GlobalExceptionHandler)는 실패를
 * HTTP 4xx/5xx + 봉투로 내리고, axios는 4xx/5xx에서 Promise를 reject하므로 이 분기에
 * 애초에 도달하지 못했습니다. 즉 목업에서는 잘 돌던 아래 코드들이 실서버에서 전부
 * 무력화될 상황이었습니다.
 *
 *   - `error instanceof ApiError && error.code === PRODUCT_ALREADY_RECORDED_IN_SLOT`
 *     → false가 되어 409 확인 팝업 · force 재요청 플로우가 통째로 죽음
 *   - EMPTY_STATE_CODES 판정 실패 → REPORT_DATA_INSUFFICIENT 같은 "정상 빈 상태"가
 *     빨간 ErrorState로 표시됨
 *   - getFieldErrors() → 항상 {} → 온보딩 인라인 검증 표시 무력화
 *
 * 그래서 axios 에러를 잡아 ApiError로 다시 던집니다. 화면 코드는 한 줄도 바꿀 필요가 없습니다.
 *
 * 네트워크 오류(응답 자체가 없는 경우)는 **의도적으로 원본 에러를 그대로 던집니다.**
 * 서버가 준 코드가 없으니 임의의 ErrorCode를 붙이면 화면이 "서버가 판단한 실패"와
 * "연결 실패"를 구분할 수 없게 됩니다. 화면들은 이미 ApiError가 아닌 에러를
 * 일반 실패 문구 / ErrorState variant="network"로 처리하고 있습니다.
 */
const STATUS_FALLBACK_CODE: Record<number, string> = {
  400: ErrorCode.COMMON_BAD_REQUEST,
  401: ErrorCode.COMMON_UNAUTHORIZED,
  403: ErrorCode.COMMON_FORBIDDEN,
  404: ErrorCode.COMMON_NOT_FOUND,
  409: ErrorCode.COMMON_CONFLICT,
  422: ErrorCode.COMMON_VALIDATION_FAILED,
  503: ErrorCode.COMMON_EXTERNAL_API_ERROR,
  504: ErrorCode.COMMON_EXTERNAL_API_TIMEOUT,
};

function isEnvelopeLike(data: unknown): data is Partial<ApiEnvelope<unknown>> {
  return typeof data === 'object' && data !== null && typeof (data as { code?: unknown }).code === 'string';
}

/**
 * axios가 reject한 에러를 ApiError로 변환합니다. 변환할 수 없으면(응답 없음 = 네트워크 오류)
 * null을 반환하고, 호출부가 원본 에러를 그대로 다시 던집니다.
 */
export function toApiError(error: unknown): ApiError | null {
  if (error instanceof ApiError) return error;
  if (!axios.isAxiosError(error)) return null;

  const response = error.response;
  if (!response) return null; // 네트워크 끊김 · 타임아웃 · CORS 등 — 원본 유지

  const data: unknown = response.data;

  // 정상 경로: 백엔드가 공통 봉투로 실패를 내려준 경우
  if (isEnvelopeLike(data)) {
    return new ApiError(
      data.code as string,
      data.message ?? '요청을 처리하지 못했어요.',
      data.result,
      response.status,
    );
  }

  // 봉투가 아닌 응답(프록시 HTML 404, 게이트웨이 502 등). 상태 코드로만 판정합니다.
  return new ApiError(
    STATUS_FALLBACK_CODE[response.status] ?? ErrorCode.COMMON_SERVER_ERROR,
    '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.',
    undefined,
    response.status,
  );
}

// 공통 응답 봉투({isSuccess, code, message, result})를 벗겨서 result만 반환합니다.
// 화면 코드는 isSuccess를 직접 볼 일이 없습니다.
export async function unwrap<T>(p: Promise<AxiosResponse<ApiEnvelope<T>>>): Promise<T> {
  let data: ApiEnvelope<T>;
  try {
    ({ data } = await p);
  } catch (error) {
    const apiError = toApiError(error);
    if (apiError) throw apiError;
    throw error; // 네트워크 오류는 원본 그대로
  }

  // HTTP 200인데 isSuccess=false인 경우 (기존 동작 유지)
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
