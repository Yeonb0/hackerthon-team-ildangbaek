package com.ildangbaek.backend.api.check.dto;

import jakarta.validation.constraints.NotNull;

/**
 * CHECK-02 요청. (docs/api_명세서.md)
 */
public record CheckCreateRequest(
        @NotNull(message = "제품 ID는 필수입니다.") Long productId
) {
}
