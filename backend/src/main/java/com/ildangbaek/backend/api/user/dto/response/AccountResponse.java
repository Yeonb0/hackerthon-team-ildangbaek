package com.ildangbaek.backend.api.user.dto.response;

import java.util.List;

public record AccountResponse(
        Long userId,
        String email,
        String name,
        String gender,
        Integer age,
        String regionName,
        boolean onboardingCompleted,
        List<String> skinTypes,
        NotificationSettingResponse notification
) {
}
