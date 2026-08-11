package com.ildangbaek.backend.api.product.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

import com.ildangbaek.backend.api.product.dto.ProductRecordResponse;
import com.ildangbaek.backend.domain.product.entity.Product;
import com.ildangbaek.backend.domain.product.entity.ProductCategory;
import com.ildangbaek.backend.domain.product.entity.ProductDataSource;
import com.ildangbaek.backend.domain.product.repository.ProductRepository;
import com.ildangbaek.backend.domain.record.entity.ProductRecord;
import com.ildangbaek.backend.domain.record.entity.ProductRecordItem;
import com.ildangbaek.backend.domain.record.entity.SourceType;
import com.ildangbaek.backend.domain.record.entity.SkinRecord;
import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import com.ildangbaek.backend.domain.record.repository.ProductRecordItemRepository;
import com.ildangbaek.backend.domain.record.repository.ProductRecordRepository;
import com.ildangbaek.backend.domain.record.repository.SkinRecordRepository;
import com.ildangbaek.backend.domain.user.entity.AuthProvider;
import com.ildangbaek.backend.domain.user.entity.User;
import com.ildangbaek.backend.domain.user.repository.UserRepository;
import com.ildangbaek.backend.global.exception.BusinessException;
import com.ildangbaek.backend.global.exception.ErrorCode;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * PRODUCT-05의 업무 규칙을 고정한다 — 빈 목록/개수 초과 · 슬롯 중복 409 · force 병합 ·
 * skinRecordSuggested 판정. DB 없이 돌도록 리포지토리는 목으로 둔다.
 */
@ExtendWith(MockitoExtension.class)
class ProductRecordServiceTest {

    @Mock
    private ProductRepository productRepository;
    @Mock
    private ProductRecordRepository productRecordRepository;
    @Mock
    private ProductRecordItemRepository productRecordItemRepository;
    @Mock
    private SkinRecordRepository skinRecordRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ProductRecordWriter productRecordWriter;

    private ProductRecordService service;

    private User user;
    private Product product;

    @BeforeEach
    void setUp() {
        service = new ProductRecordService(productRepository, productRecordRepository,
                productRecordItemRepository, skinRecordRepository, userRepository, productRecordWriter);
        user = User.builder().provider(AuthProvider.KAKAO).providerUserId("u1").build();
        product = Product.builder()
                .productName("라운드랩 자작나무 수분 토너")
                .category(ProductCategory.TONER)
                .dataSource(ProductDataSource.USER)
                .build();
        ReflectionTestUtils.setField(product, "id", 11L);
    }

    private ProductRecord savedRecord(Long id, LocalDate date, TimeSlot slot) {
        ProductRecord record = ProductRecord.builder()
                .user(user)
                .recordDate(date)
                .timeSlot(slot)
                .sourceType(SourceType.INDIVIDUAL)
                .build();
        ReflectionTestUtils.setField(record, "id", id);
        return record;
    }

    private ProductRecordItem item(ProductRecord record, Product product) {
        return ProductRecordItem.builder().productRecord(record).product(product).build();
    }

    @Test
    @DisplayName("제품 목록이 비어 있으면 PRODUCT_RECORD_EMPTY를 던진다")
    void emptyProductIds() {
        assertThatThrownBy(() -> service.create(1L, TimeSlot.MORNING, List.of(), false))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.PRODUCT_RECORD_EMPTY);
    }

    @Test
    @DisplayName("제품이 30개를 초과하면 PRODUCT_RECORD_LIMIT_EXCEEDED를 던진다")
    void tooManyProductIds() {
        List<Long> ids = java.util.stream.LongStream.rangeClosed(1, 31).boxed().toList();

        assertThatThrownBy(() -> service.create(1L, TimeSlot.MORNING, ids, false))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.PRODUCT_RECORD_LIMIT_EXCEEDED);
    }

    @Test
    @DisplayName("존재하지 않는 제품 ID가 섞이면 PRODUCT_NOT_FOUND를 던진다")
    void productNotFound() {
        when(productRepository.findAllById(List.of(11L, 99L))).thenReturn(List.of(product));

        assertThatThrownBy(() -> service.create(1L, TimeSlot.MORNING, List.of(11L, 99L), false))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.PRODUCT_NOT_FOUND);
    }

    @Test
    @DisplayName("같은 슬롯에 이미 기록된 제품이 있으면 force 없이는 409를 던진다")
    void duplicateInSameSlot() {
        LocalDate today = LocalDate.now();
        when(productRepository.findAllById(List.of(11L))).thenReturn(List.of(product));
        ProductRecord existing = savedRecord(5L, today, TimeSlot.MORNING);
        when(productRecordRepository.findByUserIdAndRecordDateAndTimeSlot(1L, today, TimeSlot.MORNING))
                .thenReturn(Optional.of(existing));
        when(productRecordItemRepository.findAllByProductRecordId(5L)).thenReturn(List.of(item(existing, product)));

        assertThatThrownBy(() -> service.create(1L, TimeSlot.MORNING, List.of(11L), false))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.PRODUCT_ALREADY_RECORDED_IN_SLOT);
    }

    @Test
    @DisplayName("force=true면 중복이 있어도 저장을 진행한다")
    void forceBypassesDuplicateCheck() {
        LocalDate today = LocalDate.now();
        when(productRepository.findAllById(List.of(11L))).thenReturn(List.of(product));
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        ProductRecord saved = savedRecord(5L, today, TimeSlot.MORNING);
        when(productRecordWriter.save(any(), any(), any(), anyList())).thenReturn(saved);
        when(productRecordItemRepository.findAllByProductRecordId(5L)).thenReturn(List.of(item(saved, product)));
        when(skinRecordRepository.findByUserIdAndRecordDateAndTimeSlot(1L, today, TimeSlot.MORNING))
                .thenReturn(Optional.empty());

        ProductRecordResponse response = service.create(1L, TimeSlot.MORNING, List.of(11L), true);

        assertThat(response.recordId()).isEqualTo(5L);
        assertThat(response.productCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("같은 시간대 피부 기록이 없으면 skinRecordSuggested가 true다")
    void suggestsSkinRecordWhenMissing() {
        LocalDate today = LocalDate.now();
        when(productRepository.findAllById(List.of(11L))).thenReturn(List.of(product));
        when(productRecordRepository.findByUserIdAndRecordDateAndTimeSlot(1L, today, TimeSlot.MORNING))
                .thenReturn(Optional.empty());
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        ProductRecord saved = savedRecord(5L, today, TimeSlot.MORNING);
        when(productRecordWriter.save(any(), any(), any(), anyList())).thenReturn(saved);
        when(productRecordItemRepository.findAllByProductRecordId(5L)).thenReturn(List.of(item(saved, product)));
        when(skinRecordRepository.findByUserIdAndRecordDateAndTimeSlot(1L, today, TimeSlot.MORNING))
                .thenReturn(Optional.empty());

        ProductRecordResponse response = service.create(1L, TimeSlot.MORNING, List.of(11L), false);

        assertThat(response.skinRecordSuggested()).isTrue();
    }

    @Test
    @DisplayName("같은 시간대 피부 기록이 있으면 skinRecordSuggested가 false다")
    void doesNotSuggestSkinRecordWhenPresent() {
        LocalDate today = LocalDate.now();
        when(productRepository.findAllById(List.of(11L))).thenReturn(List.of(product));
        when(productRecordRepository.findByUserIdAndRecordDateAndTimeSlot(1L, today, TimeSlot.MORNING))
                .thenReturn(Optional.empty());
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        ProductRecord saved = savedRecord(5L, today, TimeSlot.MORNING);
        when(productRecordWriter.save(any(), any(), any(), anyList())).thenReturn(saved);
        when(productRecordItemRepository.findAllByProductRecordId(5L)).thenReturn(List.of(item(saved, product)));
        when(skinRecordRepository.findByUserIdAndRecordDateAndTimeSlot(1L, today, TimeSlot.MORNING))
                .thenReturn(Optional.of(org.mockito.Mockito.mock(SkinRecord.class)));

        ProductRecordResponse response = service.create(1L, TimeSlot.MORNING, List.of(11L), false);

        assertThat(response.skinRecordSuggested()).isFalse();
    }
}
