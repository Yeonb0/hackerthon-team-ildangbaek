package com.ildangbaek.backend.api.productrecord.dto.response;

import java.time.LocalDateTime;

public record SavedProductSummaryResponse(
        Long productId,
        String name,
        String brand,
        String category,
        LocalDateTime lastUsedAt
) {
}
