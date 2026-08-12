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
import java.util.Set;
import java.util.stream.Collectors;
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

        // 이미 있는 항목은 건너뛴다. (product_record_id, product_id)에 유니크 제약이 있어
        // force 재요청처럼 같은 제품이 다시 들어오면 INSERT가 터진다 — 이어붙이기가 목적이지
        // 중복 행을 만드는 게 아니다.
        Set<Long> recordedProductIds = productRecordItemRepository.findAllByProductRecordId(record.getId())
                .stream()
                .map(item -> item.getProduct().getId())
                .collect(Collectors.toSet());

        LocalDateTime now = LocalDateTime.now();
        for (Product product : products) {
            if (recordedProductIds.add(product.getId())) {
                productRecordItemRepository.save(ProductRecordItem.builder()
                        .productRecord(record)
                        .product(product)
                        .usedAt(now)
                        .build());
            }
            // 중복 항목이어도 "최근 사용"은 갱신한다 — 사용자가 실제로 다시 썼다고 보고한 요청이다.
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
