package com.ildangbaek.backend.api.product.dto.response;

import java.util.List;

public record ProductSearchResponse(
        String keyword,
        int totalCount,
        List<ProductSummaryResponse> products
) {
}
