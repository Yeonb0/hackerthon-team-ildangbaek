package com.ildangbaek.backend.api.product.controller;

import com.ildangbaek.backend.api.product.dto.request.ProductRegisterRequest;
import com.ildangbaek.backend.api.product.dto.request.ProductScanRequest;
import com.ildangbaek.backend.api.product.dto.request.ScanMode;
import com.ildangbaek.backend.api.product.dto.response.ProductDetailResponse;
import com.ildangbaek.backend.api.product.dto.response.ProductMatchResponse;
import com.ildangbaek.backend.api.product.dto.response.ProductRegisterResponse;
import com.ildangbaek.backend.api.product.dto.response.ProductSaveResponse;
import com.ildangbaek.backend.api.product.dto.response.ProductScanResponse;
import com.ildangbaek.backend.api.product.dto.response.ProductSearchResponse;
import com.ildangbaek.backend.api.product.service.ProductService;
import com.ildangbaek.backend.domain.user.entity.User;
import com.ildangbaek.backend.global.auth.CurrentUserId;
import com.ildangbaek.backend.global.response.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/products")
public class ProductController {

    private final ProductService productService;

    @GetMapping
    public ApiResponse<ProductSearchResponse> search(
            @CurrentUserId User user,
            @RequestParam String keyword
    ) {
        return ApiResponse.success(productService.search(user, keyword));
    }

    /**
     * F-PRODUCT-08 · 제품 직접 등록.
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<ProductRegisterResponse> register(
            @CurrentUserId User user,
            @RequestPart(value = "image", required = false) MultipartFile image,
            @Valid @ModelAttribute ProductRegisterRequest request
    ) {
        return ApiResponse.success(productService.registerProduct(user, request, image));
    }

    @GetMapping("/match")
    public ApiResponse<ProductMatchResponse> match(
            @CurrentUserId Long userId,
            @RequestParam String name,
            @RequestParam String brand
    ) {
        return ApiResponse.success(productService.match(name, brand));
    }

    @GetMapping("/{productId}")
    public ApiResponse<ProductDetailResponse> getDetail(
            @CurrentUserId User user,
            @PathVariable Long productId
    ) {
        return ApiResponse.success(productService.getDetail(user, productId));
    }

    @PostMapping(value = "/scan", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<ProductScanResponse> scan(
            @CurrentUserId Long userId,
            @Valid @RequestBody ProductScanRequest request
    ) {
        return ApiResponse.success(productService.scan(request));
    }

    @PostMapping(value = "/scan", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ApiResponse<ProductScanResponse> scanMultipart(
            @CurrentUserId Long userId,
            @RequestParam ScanMode scanMode,
            @RequestParam(value = "image", required = false) MultipartFile image
    ) {
        return ApiResponse.success(productService.scan(scanMode, image));
    }

    @PostMapping("/{productId}/save")
    public ApiResponse<ProductSaveResponse> saveProduct(
            @CurrentUserId User user,
            @PathVariable Long productId
    ) {
        return ApiResponse.success(productService.saveProduct(user, productId));
    }

    @DeleteMapping("/{productId}/save")
    public ApiResponse<ProductSaveResponse> unsaveProduct(
            @CurrentUserId User user,
            @PathVariable Long productId
    ) {
        return ApiResponse.success(productService.unsaveProduct(user, productId));
    }
}
