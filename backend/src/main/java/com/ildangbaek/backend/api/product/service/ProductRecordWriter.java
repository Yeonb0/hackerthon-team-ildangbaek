package com.ildangbaek.backend.api.product.service;

import com.ildangbaek.backend.domain.product.entity.Product;
import com.ildangbaek.backend.domain.product.entity.UserProduct;
import com.ildangbaek.backend.domain.product.repository.UserProductRepository;
import com.ildangbaek.backend.domain.record.entity.ProductRecord;
import com.ildangbaek.backend.domain.record.entity.ProductRecordItem;
import com.ildangbaek.backend.domain.record.entity.SourceType;
import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import com.ildangbaek.backend.domain.record.repository.ProductRecordItemRepository;
import com.ildangbaek.backend.domain.record.repository.ProductRecordRepository;
import com.ildangbaek.backend.domain.user.entity.User;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * PRODUCT-05의 DB 반영만 담당한다. 트랜잭션을 별도 빈으로 분리하는 이유는
 * {@code SkinRecordWriter}와 같다 — {@code this.save(...)} 호출은 프록시를 거치지 않아
 * {@code @Transactional}이 무시된다.
 */
@Component
@RequiredArgsConstructor
public class ProductRecordWriter {

    private final ProductRecordRepository productRecordRepository;
    private final ProductRecordItemRepository productRecordItemRepository;
    private final UserProductRepository userProductRepository;

    /**
     * 같은 슬롯에 기존 기록이 있으면(재요청 · {@code force}) 항목을 이어붙인다.
     * 없으면 새 {@link ProductRecord}를 만든다.
     */
    @Transactional
    public ProductRecord save(User user, LocalDate recordDate, TimeSlot timeSlot, List<Product> products) {
        ProductRecord record = productRecordRepository.findByUserIdAndRecordDateAndTimeSlot(
                        user.getId(), recordDate, timeSlot)
                .orElseGet(() -> productRecordRepository.save(ProductRecord.builder()
                        .user(user)
                        .recordDate(recordDate)
                        .timeSlot(timeSlot)
                        .sourceType(SourceType.INDIVIDUAL)
                        .build()));

        LocalDateTime now = LocalDateTime.now();
        for (Product product : products) {
            productRecordItemRepository.save(ProductRecordItem.builder()
                    .productRecord(record)
                    .product(product)
                    .usedAt(now)
                    .build());
            upsertUserProduct(user, product);
        }

        return record;
    }

    private void upsertUserProduct(User user, Product product) {
        UserProduct userProduct = userProductRepository.findByUserIdAndProductId(user.getId(), product.getId())
                .orElseGet(() -> userProductRepository.save(UserProduct.builder()
                        .user(user)
                        .product(product)
                        .build()));
        userProduct.markUsedNow();
    }
}
