package com.ildangbaek.backend.api.product.dto.response;

import java.util.List;

public record ProductMatchResponse(
        boolean matched,
        Long productId,
        String category,
        List<String> ingredients
) {

    public static ProductMatchResponse notMatched() {
        return new ProductMatchResponse(false, null, null, List.of());
    }
}
