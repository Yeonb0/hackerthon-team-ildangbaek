package com.ildangbaek.backend.api.product.dto.response;

public record ProductScanResponse(
        Long productId,
        String name,
        String brand,
        String category,
        String imageUrl,
        double confidence
) {
}
