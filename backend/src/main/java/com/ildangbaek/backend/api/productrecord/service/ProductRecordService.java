package com.ildangbaek.backend.api.productrecord.service;

import com.ildangbaek.backend.api.productrecord.dto.request.SaveProductRecordRequest;
import com.ildangbaek.backend.api.productrecord.dto.request.UpdateProductRecordRequest;
import com.ildangbaek.backend.api.productrecord.dto.response.ProductRecordHomeResponse;
import com.ildangbaek.backend.api.productrecord.dto.response.RoutineSummaryResponse;
import com.ildangbaek.backend.api.productrecord.dto.response.SaveProductRecordResponse;
import com.ildangbaek.backend.api.productrecord.dto.response.SavedProductSummaryResponse;
import com.ildangbaek.backend.domain.product.entity.Product;
import com.ildangbaek.backend.domain.product.entity.UserProduct;
import com.ildangbaek.backend.domain.product.repository.ProductRepository;
import com.ildangbaek.backend.domain.product.repository.UserProductRepository;
import com.ildangbaek.backend.domain.record.entity.ProductRecord;
import com.ildangbaek.backend.domain.record.entity.ProductRecordItem;
import com.ildangbaek.backend.domain.record.entity.SourceType;
import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import com.ildangbaek.backend.domain.record.repository.ProductRecordItemRepository;
import com.ildangbaek.backend.domain.record.repository.ProductRecordRepository;
import com.ildangbaek.backend.domain.record.repository.SkinRecordRepository;
import com.ildangbaek.backend.domain.routine.entity.Routine;
import com.ildangbaek.backend.domain.routine.entity.RoutineProduct;
import com.ildangbaek.backend.domain.routine.repository.RoutineProductRepository;
import com.ildangbaek.backend.domain.routine.repository.RoutineRepository;
import com.ildangbaek.backend.domain.user.entity.User;
import com.ildangbaek.backend.global.exception.BusinessException;
import com.ildangbaek.backend.global.exception.ErrorCode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProductRecordService {

    private final ProductRecordRepository productRecordRepository;
    private final ProductRecordItemRepository productRecordItemRepository;
    private final ProductRepository productRepository;
    private final UserProductRepository userProductRepository;
    private final RoutineRepository routineRepository;
    private final RoutineProductRepository routineProductRepository;
    private final SkinRecordRepository skinRecordRepository;

    @Transactional(readOnly = true)
    public ProductRecordHomeResponse getHome(User user, TimeSlot timeSlot) {
        LocalDate today = LocalDate.now();
        boolean alreadyRecorded = productRecordRepository
                .findByUserIdAndRecordDateAndTimeSlot(user.getId(), today, timeSlot)
                .isPresent();

        List<RoutineSummaryResponse> routines = routineRepository.findAllByUserIdAndActiveTrue(user.getId()).stream()
                .filter(routine -> routine.getTimePeriod().name().equals(timeSlot.name()))
                .map(this::toRoutineSummary)
                .toList();
        List<SavedProductSummaryResponse> savedProducts =
                userProductRepository.findAllByUserIdOrderByLastUsedAtDesc(user.getId()).stream()
                        .map(this::toSavedProductSummary)
                        .toList();

        return new ProductRecordHomeResponse(timeSlot, alreadyRecorded, routines, savedProducts);
    }

    @Transactional
    public SaveProductRecordResponse save(User user, SaveProductRecordRequest request) {
        return saveProducts(user, request.timeSlot(), request.productIds(), request.forceEnabled(), SourceType.INDIVIDUAL);
    }

    @Transactional
    public SaveProductRecordResponse saveProducts(
            User user, TimeSlot timeSlot, List<Long> productIds, boolean force, SourceType sourceType
    ) {
        if (productIds == null || productIds.isEmpty()) {
            throw new BusinessException(ErrorCode.PRODUCT_RECORD_EMPTY);
        }
        if (productIds.size() > 30) {
            throw new BusinessException(ErrorCode.PRODUCT_RECORD_LIMIT_EXCEEDED);
        }

        LocalDate today = LocalDate.now();
        ProductRecord record = productRecordRepository
                .findByUserIdAndRecordDateAndTimeSlot(user.getId(), today, timeSlot)
                .orElse(null);
        if (record != null && !force) {
            throw new BusinessException(ErrorCode.PRODUCT_ALREADY_RECORDED_IN_SLOT);
        }
        if (record == null) {
            record = productRecordRepository.save(ProductRecord.builder()
                    .user(user)
                    .recordDate(today)
                    .timeSlot(timeSlot)
                    .sourceType(sourceType)
                    .build());
        }

        List<Product> products = findActiveProducts(productIds);
        int usageOrder = productRecordItemRepository.findAllByProductRecordId(record.getId()).size() + 1;
        LocalDateTime now = LocalDateTime.now();
        for (Product product : products) {
            saveUserProduct(user, product);
            if (productRecordItemRepository.existsByProductRecordIdAndProductId(record.getId(), product.getId())) {
                continue;
            }
            productRecordItemRepository.save(ProductRecordItem.builder()
                    .productRecord(record)
                    .product(product)
                    .usageOrder(usageOrder++)
                    .usedAt(now)
                    .build());
        }

        int productCount = productRecordItemRepository.findAllByProductRecordId(record.getId()).size();
        boolean skinRecordSuggested = skinRecordRepository
                .findByUserIdAndRecordDateAndTimeSlot(user.getId(), today, timeSlot)
                .isEmpty();
        return new SaveProductRecordResponse(
                record.getId(),
                record.getTimeSlot(),
                record.getRecordedAt(),
                productCount,
                skinRecordSuggested
        );
    }

    @Transactional
    public SaveProductRecordResponse update(User user, Long recordId, UpdateProductRecordRequest request) {
        List<Long> productIds = request.productIds();
        if (productIds == null || productIds.isEmpty()) {
            throw new BusinessException(ErrorCode.PRODUCT_RECORD_EMPTY);
        }
        if (productIds.size() > 30) {
            throw new BusinessException(ErrorCode.PRODUCT_RECORD_LIMIT_EXCEEDED);
        }

        ProductRecord record = productRecordRepository.findById(recordId)
                .filter(found -> found.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.PRODUCT_RECORD_NOT_FOUND));
        if (!record.getRecordDate().equals(LocalDate.now())) {
            throw new BusinessException(ErrorCode.PRODUCT_RECORD_NOT_EDITABLE);
        }

        List<Product> products = findActiveProducts(productIds);
        productRecordItemRepository.deleteAllByProductRecordId(record.getId());

        int usageOrder = 1;
        LocalDateTime now = LocalDateTime.now();
        for (Product product : products) {
            saveUserProduct(user, product);
            productRecordItemRepository.save(ProductRecordItem.builder()
                    .productRecord(record)
                    .product(product)
                    .usageOrder(usageOrder++)
                    .usedAt(now)
                    .build());
        }

        boolean skinRecordSuggested = skinRecordRepository
                .findByUserIdAndRecordDateAndTimeSlot(user.getId(), record.getRecordDate(), record.getTimeSlot())
                .isEmpty();
        return new SaveProductRecordResponse(
                record.getId(),
                record.getTimeSlot(),
                record.getRecordedAt(),
                products.size(),
                skinRecordSuggested
        );
    }

    private List<Product> findActiveProducts(List<Long> productIds) {
        Set<Long> uniqueProductIds = new LinkedHashSet<>(productIds);
        List<Product> products = new ArrayList<>();
        for (Long productId : uniqueProductIds) {
            Product product = productRepository.findById(productId)
                    .filter(Product::isActive)
                    .orElseThrow(() -> new BusinessException(ErrorCode.PRODUCT_NOT_FOUND));
            products.add(product);
        }
        return products;
    }

    private void saveUserProduct(User user, Product product) {
        UserProduct userProduct = userProductRepository.findByUserIdAndProductId(user.getId(), product.getId())
                .orElseGet(() -> userProductRepository.save(UserProduct.builder()
                        .user(user)
                        .product(product)
                        .build()));
        userProduct.markUsedNow();
    }

    private RoutineSummaryResponse toRoutineSummary(Routine routine) {
        List<RoutineProduct> routineProducts =
                routineProductRepository.findAllByRoutineIdOrderBySequenceOrderAsc(routine.getId());
        String productSummary = routineProducts.stream()
                .map(routineProduct -> routineProduct.getUserProduct().getProduct().getProductName())
                .limit(3)
                .reduce((left, right) -> left + ", " + right)
                .orElse("");
        return new RoutineSummaryResponse(
                routine.getId(),
                routine.getRoutineName(),
                TimeSlot.valueOf(routine.getTimePeriod().name()),
                routineProducts.size(),
                productSummary
        );
    }

    private SavedProductSummaryResponse toSavedProductSummary(UserProduct userProduct) {
        Product product = userProduct.getProduct();
        return new SavedProductSummaryResponse(
                product.getId(),
                product.getProductName(),
                product.getBrandName(),
                product.getCategory().name(),
                userProduct.getLastUsedAt()
        );
    }
}
