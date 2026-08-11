package com.ildangbaek.backend.api.product.service;

import com.ildangbaek.backend.api.product.dto.ProductRecordResponse;
import com.ildangbaek.backend.domain.product.entity.Product;
import com.ildangbaek.backend.domain.product.repository.ProductRepository;
import com.ildangbaek.backend.domain.record.entity.ProductRecord;
import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import com.ildangbaek.backend.domain.record.repository.ProductRecordItemRepository;
import com.ildangbaek.backend.domain.record.repository.ProductRecordRepository;
import com.ildangbaek.backend.domain.record.repository.SkinRecordRepository;
import com.ildangbaek.backend.domain.user.entity.User;
import com.ildangbaek.backend.domain.user.repository.UserRepository;
import com.ildangbaek.backend.global.exception.BusinessException;
import com.ildangbaek.backend.global.exception.ErrorCode;
import com.ildangbaek.backend.global.util.RecordDateResolver;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/**
 * PRODUCT-05 · 제품 기록 저장. (docs/api_명세서.md)
 *
 * <p>F-ANALYSIS-01(성분-피부 시차 분석) · F-ANALYSIS-04(성분 프로파일 갱신)의 실입력 경로다.
 * 이 API가 없으면 두 분석 모두 목업 시드로만 검증된 상태에 머문다. (docs/STATUS.md)
 */
@Service
@RequiredArgsConstructor
public class ProductRecordService {

    private static final int MAX_PRODUCT_COUNT = 30;

    private final ProductRepository productRepository;
    private final ProductRecordRepository productRecordRepository;
    private final ProductRecordItemRepository productRecordItemRepository;
    private final SkinRecordRepository skinRecordRepository;
    private final UserRepository userRepository;
    private final ProductRecordWriter productRecordWriter;

    public ProductRecordResponse create(Long userId, TimeSlot timeSlot, List<Long> productIds, boolean force) {
        validateProductIds(productIds);

        LocalDateTime now = LocalDateTime.now();
        LocalDate recordDate = RecordDateResolver.resolve(now, timeSlot);

        List<Product> products = productRepository.findAllById(productIds);
        if (products.size() != new LinkedHashSet<>(productIds).size()) {
            throw new BusinessException(ErrorCode.PRODUCT_NOT_FOUND);
        }

        if (!force) {
            checkDuplicates(userId, recordDate, timeSlot, productIds);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        ProductRecord record = productRecordWriter.save(user, recordDate, timeSlot, products);

        boolean skinRecordSuggested =
                skinRecordRepository.findByUserIdAndRecordDateAndTimeSlot(userId, recordDate, timeSlot).isEmpty();
        int productCount = productRecordItemRepository.findAllByProductRecordId(record.getId()).size();

        return ProductRecordResponse.of(record, productCount, skinRecordSuggested);
    }

    private void validateProductIds(List<Long> productIds) {
        if (productIds == null || productIds.isEmpty()) {
            throw new BusinessException(ErrorCode.PRODUCT_RECORD_EMPTY);
        }
        if (productIds.size() > MAX_PRODUCT_COUNT) {
            throw new BusinessException(ErrorCode.PRODUCT_RECORD_LIMIT_EXCEEDED);
        }
    }

    /**
     * 같은 날짜 + 슬롯에 이미 기록된 제품이 요청에 포함되면 409를 던진다. (PRODUCT-05 중복 처리)
     */
    private void checkDuplicates(Long userId, LocalDate recordDate, TimeSlot timeSlot, List<Long> productIds) {
        ProductRecord existing = productRecordRepository
                .findByUserIdAndRecordDateAndTimeSlot(userId, recordDate, timeSlot)
                .orElse(null);
        if (existing == null) {
            return;
        }

        Set<Long> existingProductIds = productRecordItemRepository.findAllByProductRecordId(existing.getId())
                .stream()
                .map(item -> item.getProduct().getId())
                .collect(Collectors.toSet());

        List<Long> duplicated = productIds.stream().filter(existingProductIds::contains).toList();
        if (!duplicated.isEmpty()) {
            throw new BusinessException(ErrorCode.PRODUCT_ALREADY_RECORDED_IN_SLOT,
                    new DuplicatedProductRecordResult(existing.getId(), timeSlot, duplicated));
        }
    }

    private record DuplicatedProductRecordResult(Long recordId, TimeSlot timeSlot, List<Long> duplicatedProductIds) {
    }
}
