package com.ildangbaek.backend.api.user.dto.request;

import jakarta.validation.constraints.NotNull;

public record NotificationSettingRequest(
        @NotNull Boolean enabled
) {
}
