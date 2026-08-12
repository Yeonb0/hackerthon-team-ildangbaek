package com.ildangbaek.backend.domain.product.repository;

import com.ildangbaek.backend.domain.product.entity.ProductIngredient;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductIngredientRepository extends JpaRepository<ProductIngredient, Long> {

    List<ProductIngredient> findAllByProductIdOrderByDisplayOrderAsc(Long productId);

    /**
     * 여러 제품의 성분을 한 번에 읽는다. {@code ingredient}까지 함께 가져오는 이유는 성분명이 필요한데,
     * 지연 로딩이면 성분 수만큼 쿼리가 추가로 나가기 때문이다. 제품 하나에 성분이 수십 개인 게
     * 보통이라 이 차이가 크다. (F-ANALYSIS-01)
     */
    @Query("select pi from ProductIngredient pi join fetch pi.ingredient "
            + "where pi.product.id in :productIds")
    List<ProductIngredient> findAllWithIngredientByProductIdIn(@Param("productIds") List<Long> productIds);

    /**
     * CHECK-02는 성분을 제품 표시 순서대로 내려준다. 위 메서드는 fetch join은 있으나 정렬이 없고,
     * {@code findAllByProductIdOrderByDisplayOrderAsc}는 정렬은 있으나 fetch join이 없어 성분명
     * 접근마다 추가 쿼리가 나간다.
     */
    @Query("select pi from ProductIngredient pi join fetch pi.ingredient "
            + "where pi.product.id = :productId order by pi.displayOrder asc")
    List<ProductIngredient> findAllWithIngredientByProductIdOrderByDisplayOrder(@Param("productId") Long productId);

    /**
     * CHECK-01. GOOD 성분을 핵심 성분으로 가진 제품을 추천 후보로 찾는다. 제품·성분을 함께 가져와
     * 서비스 계층에서 제품 ID로 묶어 dedup하고 {@code reason} 문구를 조립한다.
     */
    @Query("select pi from ProductIngredient pi join fetch pi.product join fetch pi.ingredient "
            + "where pi.ingredient.id in :ingredientIds and pi.keyIngredient = true "
            + "and pi.product.active = true")
    List<ProductIngredient> findAllWithProductByIngredientIdInAndKeyIngredientTrue(
            @Param("ingredientIds") List<Long> ingredientIds);
}
