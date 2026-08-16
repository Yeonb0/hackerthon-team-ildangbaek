package com.ildangbaek.backend.api.product.dto.response;

public record IngredientResponse(
        Long ingredientId,
        String name,
        String status,
        String note
) {
}
