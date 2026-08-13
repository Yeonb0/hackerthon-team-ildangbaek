package com.ildangbaek.backend.api.product.dto.response;

import java.util.List;

public record ProductDetailResponse(
        Long productId,
        String name,
        String brand,
        String category,
        String imageUrl,
        boolean saved,
        int ingredientCount,
        List<IngredientResponse> keyIngredients,
        List<IngredientResponse> ingredients
) {
}
