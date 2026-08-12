package com.ildangbaek.backend.api.user.controller;

import com.ildangbaek.backend.api.user.dto.IngredientProfileResponse;
import com.ildangbaek.backend.api.user.dto.MyPageResponse;
import com.ildangbaek.backend.api.user.service.MyPageService;
import com.ildangbaek.backend.api.user.service.UserIngredientProfileService;
import com.ildangbaek.backend.domain.analysis.entity.IngredientStatus;
import com.ildangbaek.backend.global.auth.CurrentUserId;
import com.ildangbaek.backend.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * User API. (docs/api_명세서.md 5장)
 */
@RestController
@RequestMapping("/api/v1/users/me")
@RequiredArgsConstructor
public class UserController {

    private final MyPageService myPageService;
    private final UserIngredientProfileService userIngredientProfileService;

    /**
     * USER-01 · 마이페이지 조회.
     */
    @GetMapping
    public ApiResponse<MyPageResponse> getMyPage(@CurrentUserId Long userId) {
        return ApiResponse.success(myPageService.getMyPage(userId));
    }

    /**
     * USER-02 · 성분 프로파일 전체 조회.
     */
    @GetMapping("/ingredient-profile")
    public ApiResponse<IngredientProfileResponse> getIngredientProfile(
            @CurrentUserId Long userId,
            @RequestParam(required = false) String status) {
        return ApiResponse.success(
                userIngredientProfileService.getIngredientProfile(userId, parseStatus(status)));
    }

    private IngredientStatus parseStatus(String status) {
        return status == null || status.isBlank() ? null : IngredientStatus.parse(status);
    }
}
