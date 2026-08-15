package com.ildangbaek.backend.api.productrecord.dto.request;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record UpdateProductRecordRequest(
        @NotEmpty List<Long> productIds
) {
}
