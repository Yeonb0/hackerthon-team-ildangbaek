package com.ildangbaek.backend.api.product.controller;

import com.ildangbaek.backend.api.product.dto.ProductMatchResponse;
import com.ildangbaek.backend.api.product.service.ProductMatchService;
import com.ildangbaek.backend.global.response.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 제품 직접 등록 전 카탈로그 매칭 조회 API. (docs/api_명세서.md PRODUCT-09)
 */
@RestController
@RequestMapping("/api/v1/products/match")
@RequiredArgsConstructor
public class ProductMatchController {

    private final ProductMatchService productMatchService;

    @GetMapping
    public ApiResponse<ProductMatchResponse> match(
            @RequestParam String name,
            @RequestParam String brand) {
        return ApiResponse.success(productMatchService.match(name, brand));
    }
}
