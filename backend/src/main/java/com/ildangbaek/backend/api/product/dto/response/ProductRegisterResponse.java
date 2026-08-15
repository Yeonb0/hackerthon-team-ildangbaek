package com.ildangbaek.backend.api.product.dto.response;

public record ProductRegisterResponse(
        Long productId,
        String name,
        String brand,
        String category,
        String imageUrl
) {
}
