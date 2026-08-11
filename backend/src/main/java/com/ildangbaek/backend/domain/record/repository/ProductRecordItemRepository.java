package com.ildangbaek.backend.domain.record.repository;

import com.ildangbaek.backend.domain.record.entity.ProductRecordItem;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductRecordItemRepository extends JpaRepository<ProductRecordItem, Long> {

    List<ProductRecordItem> findAllByProductRecordId(Long productRecordId);

    boolean existsByProductRecordIdAndProductId(Long productRecordId, Long productId);
}
