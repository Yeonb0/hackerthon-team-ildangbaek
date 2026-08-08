package com.ildangbaek.backend.global.exception;

import lombok.Getter;

/**
 * 도메인 규칙 위반 시 던지는 공통 예외.
 * ErrorCode 하나만으로 HTTP 상태 · 응답 코드 · 사용자 메시지가 함께 결정된다.
 */
@Getter
public class BusinessException extends RuntimeException {

    private final ErrorCode errorCode;
    private final Object result;

    public BusinessException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
        this.result = null;
    }

    public BusinessException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
        this.result = null;
    }

    /**
     * PRODUCT_ALREADY_RECORDED_IN_SLOT처럼 result에 추가 데이터(예: duplicatedProductIds)를
     * 함께 내려야 하는 예외에 사용한다.
     */
    public BusinessException(ErrorCode errorCode, Object result) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
        this.result = result;
    }
}
