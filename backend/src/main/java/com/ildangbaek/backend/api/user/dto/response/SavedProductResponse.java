package com.ildangbaek.backend.api.user.dto.response;

import java.time.LocalDateTime;

public record SavedProductResponse(
        Long productId,
        String name,
        String brand,
        String category,
        String imageUrl,
        LocalDateTime firstSavedAt,
        LocalDateTime lastUsedAt
) {
}
