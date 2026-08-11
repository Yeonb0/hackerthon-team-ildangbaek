package com.ildangbaek.backend.api.product.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ProductScanRequest(
        @NotNull ScanMode scanMode,
        @NotBlank String barcode
) {
}
