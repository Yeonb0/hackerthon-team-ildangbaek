package com.ildangbaek.backend.api.product.dto;

import com.ildangbaek.backend.domain.product.entity.ProductCategory;
import java.util.List;

/**
 * PRODUCT-09 · 제품 직접 등록 전 카탈로그 매칭 조회 응답.
 *
 * @param matched     제품명+브랜드명으로 기존 카탈로그에서 매칭된 제품이 있는지 여부
 * @param ingredients 매칭된 제품의 성분명 목록(표시 순서). {@code matched=false}면 빈 배열
 */
public record ProductMatchResponse(
        boolean matched,
        Long productId,
        ProductCategory category,
        List<String> ingredients
) {

    public static ProductMatchResponse notMatched() {
        return new ProductMatchResponse(false, null, null, List.of());
    }
}
