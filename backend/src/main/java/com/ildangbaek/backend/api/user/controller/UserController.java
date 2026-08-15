package com.ildangbaek.backend.api.user.controller;

import com.ildangbaek.backend.api.user.dto.IngredientProfileResponse;
import com.ildangbaek.backend.api.user.dto.MyPageResponse;
import com.ildangbaek.backend.api.user.dto.request.LocationUpdateRequest;
import com.ildangbaek.backend.api.user.dto.request.NotificationSettingRequest;
import com.ildangbaek.backend.api.user.dto.request.ProfileUpdateRequest;
import com.ildangbaek.backend.api.user.dto.response.NotificationSettingResponse;
import com.ildangbaek.backend.api.user.dto.response.ProfileResponse;
import com.ildangbaek.backend.api.user.dto.response.SavedProductResponse;
import com.ildangbaek.backend.api.user.service.MyPageService;
import com.ildangbaek.backend.api.user.service.UserIngredientProfileService;
import com.ildangbaek.backend.api.user.service.UserService;
import com.ildangbaek.backend.domain.analysis.entity.IngredientStatus;
import com.ildangbaek.backend.domain.user.entity.User;
import com.ildangbaek.backend.global.auth.CurrentUserId;
import com.ildangbaek.backend.global.response.ApiResponse;
import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * User API. (docs/api_명세서.md 5장)
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/users/me")
public class UserController {

    private final MyPageService myPageService;
    private final UserService userService;
    private final UserIngredientProfileService userIngredientProfileService;

    @GetMapping("/account")
    public ApiResponse<com.ildangbaek.backend.api.user.dto.response.MyPageResponse> getAccount(
            @CurrentUserId User user
    ) {
        return ApiResponse.success(userService.getMe(user));
    }

    @PatchMapping("/notification")
    public ApiResponse<NotificationSettingResponse> updateNotification(
            @CurrentUserId User user,
            @Valid @RequestBody NotificationSettingRequest request
    ) {
        return ApiResponse.success(userService.updateNotification(user, request));
    }

    @GetMapping("/products")
    public ApiResponse<List<SavedProductResponse>> getSavedProducts(
            @CurrentUserId User user
    ) {
        return ApiResponse.success(userService.getSavedProducts(user));
    }

    @PatchMapping("/location")
    public ApiResponse<Void> updateLocation(
            @CurrentUserId Long userId,
            @Valid @RequestBody LocationUpdateRequest request
    ) {
        userService.updateLocation(userId, request);
        return ApiResponse.success(null);
    }

    /**
     * USER-01 · 마이페이지 조회.
     */
    @GetMapping
    public ApiResponse<MyPageResponse> getMyPage(@CurrentUserId Long userId) {
        return ApiResponse.success(myPageService.getMyPage(userId));
    }

    /**
     * USER-03 · 프로필 조회.
     */
    @GetMapping("/profile")
    public ApiResponse<ProfileResponse> getProfile(@CurrentUserId Long userId) {
        return ApiResponse.success(userService.getProfile(userId));
    }

    /**
     * USER-04 · 프로필 수정.
     */
    @PatchMapping("/profile")
    public ApiResponse<ProfileResponse> updateProfile(
            @CurrentUserId Long userId,
            @Valid @RequestBody ProfileUpdateRequest request
    ) {
        return ApiResponse.success(userService.updateProfile(userId, request));
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
