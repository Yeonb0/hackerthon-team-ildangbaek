package com.ildangbaek.backend.global.response;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * 모든 API가 공통으로 사용하는 응답 envelope.
 * docs/공통응답포맷_예외처리코드.md 1.1 참고 — 필드는 4개로 고정한다.
 */
public record ApiResponse<T>(
        @JsonProperty("isSuccess") boolean isSuccess,
        String code,
        String message,
        T result
) {

    public static <T> ApiResponse<T> of(ResultCode resultCode, T result) {
        return new ApiResponse<>(resultCode instanceof SuccessCode, resultCode.getCode(), resultCode.getMessage(), result);
    }

    public static <T> ApiResponse<T> success(T result) {
        return of(SuccessCode.OK, result);
    }

    public static ApiResponse<Void> success() {
        return of(SuccessCode.OK, null);
    }

    public static <T> ApiResponse<T> created(T result) {
        return of(SuccessCode.CREATED, result);
    }

    public static <T> ApiResponse<T> error(ResultCode errorCode, T result) {
        return of(errorCode, result);
    }

    public static ApiResponse<Void> error(ResultCode errorCode) {
        return of(errorCode, null);
    }
}
