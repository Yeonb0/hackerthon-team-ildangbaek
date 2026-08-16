package com.ildangbaek.backend.api.user.dto;

import com.ildangbaek.backend.domain.user.entity.SkinTypeCode;
import java.util.List;

/**
 * USER-01 · 마이페이지 조회 응답. (docs/api_명세서.md 5장, F-MY-01·F-MY-02)
 */
public record MyPageResponse(
        String name,
        long joinedDays,
        long totalRecordCount,
        List<SkinTypeCode> skinTypes,
        MyPageIngredientProfileResponse ingredientProfile,
        String location,
        boolean notificationEnabled
) {
}
