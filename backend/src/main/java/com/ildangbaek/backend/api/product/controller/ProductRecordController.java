package com.ildangbaek.backend.api.product.controller;

import com.ildangbaek.backend.api.product.dto.ProductRecordCreateRequest;
import com.ildangbaek.backend.api.product.dto.ProductRecordResponse;
import com.ildangbaek.backend.api.product.service.ProductRecordService;
import com.ildangbaek.backend.global.auth.CurrentUserId;
import com.ildangbaek.backend.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * 제품 기록 API. (docs/api_명세서.md PRODUCT-05)
 */
@RestController
@RequestMapping("/api/v1/product-records")
@RequiredArgsConstructor
public class ProductRecordController {

    private final ProductRecordService productRecordService;

    /**
     * PRODUCT-05 · 제품 기록 저장. S-14 `기록 완료` 버튼의 저장 지점. (F-PRODUCT-04)
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ProductRecordResponse> create(
            @CurrentUserId Long userId,
            @Valid @RequestBody ProductRecordCreateRequest request) {
        return ApiResponse.created(productRecordService.create(
                userId, request.toTimeSlot(), request.productIds(), request.force()));
    }
}
