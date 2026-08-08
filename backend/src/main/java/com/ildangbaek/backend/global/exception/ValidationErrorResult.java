package com.ildangbaek.backend.global.exception;

import java.util.List;

public record ValidationErrorResult(List<FieldErrorDetail> errors) {
}
