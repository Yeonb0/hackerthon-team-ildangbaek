package com.ildangbaek.backend.global.exception;

/**
 * docs/공통응답포맷_예외처리코드.md 1.4 Validation 오류 result.errors 항목.
 */
public record FieldErrorDetail(String field, String reason) {
}
