package com.ildangbaek.backend.global.exception;

import com.ildangbaek.backend.global.response.ApiResponse;
import jakarta.validation.ConstraintViolationException;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;
import org.springframework.web.servlet.resource.NoResourceFoundException;

/**
 * 모든 컨트롤러의 예외를 공통 응답 envelope(ApiResponse)으로 변환한다.
 * docs/공통응답포맷_예외처리코드.md 기준.
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Object>> handleBusinessException(BusinessException e) {
        ErrorCode errorCode = e.getErrorCode();
        log.warn("BusinessException: {} - {}", errorCode.getCode(), e.getMessage());
        return ResponseEntity.status(errorCode.getHttpStatus())
                .body(ApiResponse.error(errorCode, e.getResult()));
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiResponse<ValidationErrorResult>> handleConstraintViolation(ConstraintViolationException e) {
        List<FieldErrorDetail> errors = e.getConstraintViolations().stream()
                .map(violation -> new FieldErrorDetail(
                        violation.getPropertyPath().toString(),
                        violation.getMessage()))
                .toList();
        return ResponseEntity.status(ErrorCode.COMMON_VALIDATION_FAILED.getHttpStatus())
                .body(ApiResponse.error(ErrorCode.COMMON_VALIDATION_FAILED, new ValidationErrorResult(errors)));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleUnexpectedException(Exception e) {
        log.error("Unhandled exception", e);
        return ResponseEntity.status(ErrorCode.COMMON_SERVER_ERROR.getHttpStatus())
                .body(ApiResponse.error(ErrorCode.COMMON_SERVER_ERROR));
    }

    @Override
    protected ResponseEntity<Object> handleMethodArgumentNotValid(
            MethodArgumentNotValidException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        List<FieldErrorDetail> errors = ex.getBindingResult().getFieldErrors().stream()
                .map(this::toFieldErrorDetail)
                .toList();
        return ResponseEntity.status(ErrorCode.COMMON_VALIDATION_FAILED.getHttpStatus())
                .body(ApiResponse.error(ErrorCode.COMMON_VALIDATION_FAILED, new ValidationErrorResult(errors)));
    }

    @Override
    protected ResponseEntity<Object> handleHttpMessageNotReadable(
            HttpMessageNotReadableException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        return badRequest();
    }

    @Override
    protected ResponseEntity<Object> handleMissingServletRequestParameter(
            MissingServletRequestParameterException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        return badRequest();
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ApiResponse<Void>> handleTypeMismatch(MethodArgumentTypeMismatchException e) {
        return ResponseEntity.status(ErrorCode.COMMON_BAD_REQUEST.getHttpStatus())
                .body(ApiResponse.error(ErrorCode.COMMON_BAD_REQUEST));
    }

    @Override
    protected ResponseEntity<Object> handleNoResourceFoundException(
            NoResourceFoundException ex, HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        return ResponseEntity.status(ErrorCode.COMMON_NOT_FOUND.getHttpStatus())
                .body(ApiResponse.error(ErrorCode.COMMON_NOT_FOUND));
    }

    private FieldErrorDetail toFieldErrorDetail(FieldError fieldError) {
        return new FieldErrorDetail(fieldError.getField(), fieldError.getDefaultMessage());
    }

    private ResponseEntity<Object> badRequest() {
        return ResponseEntity.status(ErrorCode.COMMON_BAD_REQUEST.getHttpStatus())
                .body(ApiResponse.error(ErrorCode.COMMON_BAD_REQUEST));
    }
}
