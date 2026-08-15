package com.ildangbaek.backend.api.productrecord.controller;

import com.ildangbaek.backend.api.auth.service.CurrentUserResolver;
import com.ildangbaek.backend.api.productrecord.dto.request.SaveProductRecordRequest;
import com.ildangbaek.backend.api.productrecord.dto.request.UpdateProductRecordRequest;
import com.ildangbaek.backend.api.productrecord.dto.response.ProductRecordHomeResponse;
import com.ildangbaek.backend.api.productrecord.dto.response.SaveProductRecordResponse;
import com.ildangbaek.backend.api.productrecord.service.ProductRecordService;
import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import com.ildangbaek.backend.domain.user.entity.User;
import com.ildangbaek.backend.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/product-records")
public class ProductRecordController {

    private final CurrentUserResolver currentUserResolver;
    private final ProductRecordService productRecordService;

    @GetMapping("/home")
    public ApiResponse<ProductRecordHomeResponse> getHome(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @RequestParam TimeSlot timeSlot
    ) {
        User user = currentUserResolver.resolve(authorization);
        return ApiResponse.success(productRecordService.getHome(user, timeSlot));
    }

    @PostMapping
    public ApiResponse<SaveProductRecordResponse> save(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @Valid @RequestBody SaveProductRecordRequest request
    ) {
        User user = currentUserResolver.resolve(authorization);
        return ApiResponse.success(productRecordService.save(user, request));
    }

    /**
     * PRODUCT-06 · 제품 기록 수정.
     */
    @PatchMapping("/{recordId}")
    public ApiResponse<SaveProductRecordResponse> update(
            @RequestHeader(value = "Authorization", required = false) String authorization,
            @PathVariable Long recordId,
            @Valid @RequestBody UpdateProductRecordRequest request
    ) {
        User user = currentUserResolver.resolve(authorization);
        return ApiResponse.success(productRecordService.update(user, recordId, request));
    }
}
