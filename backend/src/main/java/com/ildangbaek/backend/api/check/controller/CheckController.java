package com.ildangbaek.backend.api.check.controller;

import com.ildangbaek.backend.api.check.dto.CheckCreateRequest;
import com.ildangbaek.backend.api.check.dto.CheckHomeResponse;
import com.ildangbaek.backend.api.check.dto.CheckResponse;
import com.ildangbaek.backend.api.check.service.CheckHomeService;
import com.ildangbaek.backend.api.check.service.CheckService;
import com.ildangbaek.backend.global.auth.CurrentUserId;
import com.ildangbaek.backend.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * 구매 전 확인 API. (docs/api_명세서.md CHECK-01 · CHECK-02 · CHECK-03)
 */
@RestController
@RequestMapping("/api/v1/checks")
@RequiredArgsConstructor
public class CheckController {

    private final CheckHomeService checkHomeService;
    private final CheckService checkService;

    /**
     * CHECK-01 · 쇼핑 홈 조회. (F-CHECK-01)
     */
    @GetMapping("/home")
    public ApiResponse<CheckHomeResponse> getHome(@CurrentUserId Long userId) {
        return ApiResponse.success(checkHomeService.getHome(userId));
    }

    /**
     * CHECK-02 · 위험도 분석. (F-CHECK-03)
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<CheckResponse> create(
            @CurrentUserId Long userId,
            @Valid @RequestBody CheckCreateRequest request) {
        return ApiResponse.created(checkService.create(userId, request.productId()));
    }

    /**
     * CHECK-03 · 확인 결과 조회.
     */
    @GetMapping("/{checkId}")
    public ApiResponse<CheckResponse> get(@CurrentUserId Long userId, @PathVariable Long checkId) {
        return ApiResponse.success(checkService.get(userId, checkId));
    }
}
