package com.ildangbaek.backend.api.product.controller;

import com.ildangbaek.backend.api.product.dto.ProductMatchResponse;
import com.ildangbaek.backend.api.product.service.ProductMatchService;
import com.ildangbaek.backend.global.auth.CurrentUserId;
import com.ildangbaek.backend.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 제품 직접 등록 전 카탈로그 매칭 조회 API. (docs/api_명세서.md PRODUCT-09)
 *
 * <p>조회 자체는 사용자별 데이터가 아니지만, 명세상 인증이 필요한 API라 {@code @CurrentUserId}로
 * {@link com.ildangbaek.backend.global.auth.CurrentUserIdArgumentResolver}를 거치게 한다 —
 * 이 파라미터가 없으면 인증 검증 자체가 스킵된다.
 */
@RestController
@RequestMapping("/api/v1/products/match")
@RequiredArgsConstructor
public class ProductMatchController {

    private final ProductMatchService productMatchService;

    @GetMapping
    public ApiResponse<ProductMatchResponse> match(
            @CurrentUserId Long userId,
            @RequestParam String name,
            @RequestParam String brand) {
        return ApiResponse.success(productMatchService.match(name, brand));
    }
}
