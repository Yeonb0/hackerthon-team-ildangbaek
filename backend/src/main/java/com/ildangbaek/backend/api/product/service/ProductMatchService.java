package com.ildangbaek.backend.api.product.service;

import com.ildangbaek.backend.api.product.dto.ProductMatchResponse;
import com.ildangbaek.backend.domain.product.entity.Ingredient;
import com.ildangbaek.backend.domain.product.entity.Product;
import com.ildangbaek.backend.domain.product.entity.ProductIngredient;
import com.ildangbaek.backend.domain.product.repository.ProductIngredientRepository;
import com.ildangbaek.backend.domain.product.repository.ProductRepository;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * PRODUCT-09 · 제품 직접 등록 전 카탈로그 매칭 조회.
 *
 * <p>사용자가 제품을 직접 등록하려 할 때, 제품명+브랜드명이 이미 카탈로그(또는 스캔 확장 DB)에
 * 있는 제품이면 성분·카테고리를 자동으로 채워준다. 매칭되지 않으면 사용자가 직접 입력하는 기존
 * 흐름 그대로 둔다.
 */
@Service
@RequiredArgsConstructor
public class ProductMatchService {

    private final ProductRepository productRepository;
    private final ProductIngredientRepository productIngredientRepository;

    @Transactional(readOnly = true)
    public ProductMatchResponse match(String name, String brand) {
        Product product = productRepository.findByProductNameAndBrandNameAndActiveTrue(name, brand)
                .orElse(null);
        if (product == null) {
            return ProductMatchResponse.notMatched();
        }

        List<String> ingredientNames = productIngredientRepository
                .findAllByProductIdOrderByDisplayOrderAsc(product.getId()).stream()
                .map(ProductIngredient::getIngredient)
                .map(Ingredient::getKoreanName)
                .toList();

        return new ProductMatchResponse(true, product.getId(), product.getCategory(), ingredientNames);
    }
}
