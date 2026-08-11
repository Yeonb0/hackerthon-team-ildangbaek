package com.ildangbaek.backend.api.onboard.dto.request;

import com.ildangbaek.backend.domain.user.entity.SkinTypeCode;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record SkinTypesRequest(
        @NotEmpty List<SkinTypeCode> skinTypes
) {
}
