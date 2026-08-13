package com.ildangbaek.backend.api.product.dto.response;

public record ProductSaveResponse(
        Long productId,
        boolean saved
) {
}
