package com.ildangbaek.backend.api.product.dto.response;

public record ProductSummaryResponse(
        Long productId,
        String name,
        String brand,
        String category,
        String imageUrl,
        boolean saved
) {
}
