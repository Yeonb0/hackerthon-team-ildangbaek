package com.ildangbaek.backend.api.product.dto.request;

import com.ildangbaek.backend.domain.product.entity.ProductCategory;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record ProductRegisterRequest(
        @NotBlank @Size(max = 200) String name,
        @Size(max = 100) String brand,
        @NotNull ProductCategory category,
        List<String> ingredientNames
) {
}
