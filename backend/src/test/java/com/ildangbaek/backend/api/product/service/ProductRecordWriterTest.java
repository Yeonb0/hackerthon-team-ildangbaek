package com.ildangbaek.backend.api.product.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ildangbaek.backend.domain.product.entity.Product;
import com.ildangbaek.backend.domain.product.entity.ProductCategory;
import com.ildangbaek.backend.domain.product.entity.ProductDataSource;
import com.ildangbaek.backend.domain.product.repository.UserProductRepository;
import com.ildangbaek.backend.domain.record.entity.ProductRecord;
import com.ildangbaek.backend.domain.record.entity.ProductRecordItem;
import com.ildangbaek.backend.domain.record.entity.SourceType;
import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import com.ildangbaek.backend.domain.record.repository.ProductRecordItemRepository;
import com.ildangbaek.backend.domain.record.repository.ProductRecordRepository;
import com.ildangbaek.backend.domain.user.entity.AuthProvider;
import com.ildangbaek.backend.domain.user.entity.User;
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
 * PRODUCT-05의 DB 반영 규칙을 고정한다.
 *
 * <p>{@code force} 재요청은 기존 기록에 항목을 <strong>이어붙이는</strong> 것이지 같은 제품을 다시
 * 넣는 게 아니다. {@code product_record_items}에 {@code (product_record_id, product_id)} 유니크
 * 제약이 있어, 이미 있는 제품을 그대로 INSERT하면 실서버에서 500이 났다. 서비스 테스트는
 * 리포지토리가 목이라 제약이 없어 이 경로를 잡지 못한다.
 */
@ExtendWith(MockitoExtension.class)
class ProductRecordWriterTest {

    @Mock
    private ProductRecordRepository productRecordRepository;
    @Mock
    private ProductRecordItemRepository productRecordItemRepository;
    @Mock
    private UserProductRepository userProductRepository;

    private ProductRecordWriter writer;

    private User user;
    private Product retinol;

    @BeforeEach
    void setUp() {
        writer = new ProductRecordWriter(
                productRecordRepository, productRecordItemRepository, userProductRepository);
        user = User.builder().provider(AuthProvider.KAKAO).providerUserId("u1").build();
        ReflectionTestUtils.setField(user, "id", 1L);
        retinol = product("레티놀 세럼", 9001L);
    }

    @DisplayName("이미 기록된 제품은 항목을 다시 만들지 않는다 — force 재요청의 유니크 제약 위반 방지")
    @Test
    void skipsAlreadyRecordedProduct() {
        ProductRecord existing = existingRecord();
        when(productRecordRepository.findByUserIdAndRecordDateAndTimeSlot(any(), any(), any()))
                .thenReturn(Optional.of(existing));
        when(productRecordItemRepository.findAllByProductRecordId(existing.getId()))
                .thenReturn(List.of(item(existing, retinol)));
        when(userProductRepository.findByUserIdAndProductId(any(), any())).thenReturn(Optional.empty());
        when(userProductRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        writer.save(user, LocalDate.now(), TimeSlot.NIGHT, List.of(retinol));

        verify(productRecordItemRepository, never()).save(any());
    }

    @DisplayName("기존 기록에 없던 제품만 항목으로 추가한다")
    @Test
    void appendsOnlyNewProducts() {
        Product panthenol = product("판테놀 토너", 9002L);
        ProductRecord existing = existingRecord();
        when(productRecordRepository.findByUserIdAndRecordDateAndTimeSlot(any(), any(), any()))
                .thenReturn(Optional.of(existing));
        when(productRecordItemRepository.findAllByProductRecordId(existing.getId()))
                .thenReturn(List.of(item(existing, retinol)));
        when(productRecordItemRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(userProductRepository.findByUserIdAndProductId(any(), any())).thenReturn(Optional.empty());
        when(userProductRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        writer.save(user, LocalDate.now(), TimeSlot.NIGHT, List.of(retinol, panthenol));

        verify(productRecordItemRepository, org.mockito.Mockito.times(1)).save(any());
    }

    private ProductRecord existingRecord() {
        ProductRecord record = ProductRecord.builder()
                .user(user)
                .recordDate(LocalDate.now())
                .timeSlot(TimeSlot.NIGHT)
                .sourceType(SourceType.INDIVIDUAL)
                .build();
        ReflectionTestUtils.setField(record, "id", 10L);
        return record;
    }

    private ProductRecordItem item(ProductRecord record, Product product) {
        return ProductRecordItem.builder().productRecord(record).product(product).build();
    }

    private Product product(String name, Long id) {
        Product product = Product.builder()
                .productName(name)
                .category(ProductCategory.SERUM)
                .dataSource(ProductDataSource.USER)
                .build();
        ReflectionTestUtils.setField(product, "id", id);
        return product;
    }
}
