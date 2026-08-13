package com.ildangbaek.backend.domain.record.repository;

import com.ildangbaek.backend.domain.record.entity.ProductRecordItem;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductRecordItemRepository extends JpaRepository<ProductRecordItem, Long> {

    List<ProductRecordItem> findAllByProductRecordId(Long productRecordId);

    boolean existsByProductRecordIdAndProductId(Long productRecordId, Long productId);

    /**
     * 여러 제품 기록의 항목을 한 번에 읽는다. 기록마다 조회하면 30일 분석에서 쿼리가 수십 번 나간다.
     * {@code product}를 함께 가져오는 이유는 뒤이어 제품 ID를 꺼내야 하는데, 지연 로딩 프록시를
     * 건드리는 순간 항목 수만큼 추가 쿼리가 나가기 때문이다. (F-ANALYSIS-01)
     */
    @Query("select pri from ProductRecordItem pri join fetch pri.product "
            + "where pri.productRecord.id in :productRecordIds")
    List<ProductRecordItem> findAllWithProductByProductRecordIdIn(
            @Param("productRecordIds") List<Long> productRecordIds);
}
