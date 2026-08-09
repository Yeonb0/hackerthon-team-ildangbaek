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
}
