package com.ildangbaek.backend.api.product.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ildangbaek.backend.api.product.dto.request.ProductRegisterRequest;
import com.ildangbaek.backend.domain.product.entity.Ingredient;
import com.ildangbaek.backend.domain.product.entity.Product;
import com.ildangbaek.backend.domain.product.entity.ProductCategory;
import com.ildangbaek.backend.domain.product.entity.ProductIngredient;
import com.ildangbaek.backend.domain.product.repository.IngredientRepository;
import com.ildangbaek.backend.domain.product.repository.ProductIngredientRepository;
import com.ildangbaek.backend.domain.product.repository.ProductRepository;
import com.ildangbaek.backend.domain.product.repository.UserProductRepository;
import com.ildangbaek.backend.global.exception.BusinessException;
import com.ildangbaek.backend.global.exception.ErrorCode;
import com.ildangbaek.backend.global.storage.ImageStorage;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.multipart.MultipartFile;

/**
 * PRODUCT-10(제품 직접 등록)의 저장 규칙을 고정한다.
 *
 * <p>{@code product_ingredients}에 {@code (product_id, ingredient_id)} 유니크 제약이 있어, 같은
 * 성분명을 두 번 받은 뒤 그대로 INSERT하면 flush에서 500이 난다. 리포지토리가 목이라 제약 자체는
 * 재현되지 않으므로, 중복이 <strong>저장 호출까지 가지 않는지</strong>를 검증한다.
 */
@ExtendWith(MockitoExtension.class)
class ProductRegisterTest {

    @Mock private ProductRepository productRepository;
    @Mock private ProductIngredientRepository productIngredientRepository;
    @Mock private IngredientRepository ingredientRepository;
    @Mock private UserProductRepository userProductRepository;
    @Mock private ImageStorage imageStorage;

    @InjectMocks private ProductService productService;

    private Product givenSavedProduct() {
        Product product = Product.builder()
                .productName("홈메이드세럼")
                .category(ProductCategory.SERUM)
                .build();
        ReflectionTestUtils.setField(product, "id", 1L);
        when(productRepository.save(any())).thenReturn(product);
        return product;
    }

    private ProductRegisterRequest request(List<String> ingredientNames) {
        return new ProductRegisterRequest("홈메이드세럼", "우리집", ProductCategory.SERUM, ingredientNames);
    }

    @Test
    @DisplayName("같은 성분명이 공백만 다르게 들어와도 연결은 한 번만 저장한다")
    void deduplicatesIngredientNames() {
        givenSavedProduct();
        Ingredient water = Ingredient.builder().koreanName("정제수").build();
        ReflectionTestUtils.setField(water, "id", 7L);
        when(ingredientRepository.findByKoreanName("정제수")).thenReturn(Optional.of(water));

        productService.registerProduct(null, request(List.of("정제수", " 정제수 ")), null);

        verify(productIngredientRepository, times(1)).save(any());
    }

    @Test
    @DisplayName("서로 다른 성분은 입력 순서대로 displayOrder를 매긴다")
    void assignsDisplayOrderInInputOrder() {
        givenSavedProduct();
        Ingredient water = Ingredient.builder().koreanName("정제수").build();
        ReflectionTestUtils.setField(water, "id", 7L);
        Ingredient glycerin = Ingredient.builder().koreanName("글리세린").build();
        ReflectionTestUtils.setField(glycerin, "id", 8L);
        when(ingredientRepository.findByKoreanName("정제수")).thenReturn(Optional.of(water));
        when(ingredientRepository.findByKoreanName("글리세린")).thenReturn(Optional.of(glycerin));

        productService.registerProduct(null, request(List.of("정제수", "글리세린")), null);

        ArgumentCaptor<ProductIngredient> captor = ArgumentCaptor.forClass(ProductIngredient.class);
        verify(productIngredientRepository, times(2)).save(captor.capture());
        assertThat(captor.getAllValues())
                .extracting(pi -> pi.getIngredient().getId(), ProductIngredient::getDisplayOrder)
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(7L, 1),
                        org.assertj.core.groups.Tuple.tuple(8L, 2));
    }

    @Test
    @DisplayName("허용하지 않는 형식의 사진은 업로드하지 않고 거절한다")
    void rejectsUnsupportedImageFormat() {
        MultipartFile image = new MockMultipartFile(
                "image", "malware.exe", "application/octet-stream", "x".getBytes());

        assertThatThrownBy(() -> productService.registerProduct(null, request(null), image))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.SKIN_IMAGE_INVALID_FORMAT);

        verify(imageStorage, never()).upload(any());
        verify(productRepository, never()).save(any());
    }

    @Test
    @DisplayName("사진을 생략하면 imageUrl은 null이고 업로드도 하지 않는다")
    void allowsMissingImage() {
        givenSavedProduct();

        var response = productService.registerProduct(null, request(null), null);

        assertThat(response.imageUrl()).isNull();
        verify(imageStorage, never()).upload(any());
    }
}
