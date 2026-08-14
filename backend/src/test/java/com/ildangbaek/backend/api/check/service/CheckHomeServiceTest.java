package com.ildangbaek.backend.api.check.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.ildangbaek.backend.api.check.dto.CheckHomeResponse;
import com.ildangbaek.backend.api.check.dto.CheckRecommendationResponse;
import com.ildangbaek.backend.domain.analysis.entity.IngredientProfile;
import com.ildangbaek.backend.domain.analysis.entity.ReactionType;
import com.ildangbaek.backend.domain.analysis.profile.ProfileCompletionCalculator;
import com.ildangbaek.backend.domain.analysis.repository.IngredientProfileRepository;
import com.ildangbaek.backend.domain.environment.repository.DailyEnvironmentRepository;
import com.ildangbaek.backend.domain.product.entity.Ingredient;
import com.ildangbaek.backend.domain.product.entity.Product;
import com.ildangbaek.backend.domain.product.entity.ProductCategory;
import com.ildangbaek.backend.domain.product.entity.ProductDataSource;
import com.ildangbaek.backend.domain.product.entity.ProductIngredient;
import com.ildangbaek.backend.domain.product.repository.ProductIngredientRepository;
import com.ildangbaek.backend.domain.record.repository.SkinMetricRepository;
import com.ildangbaek.backend.domain.record.repository.SkinRecordRepository;
import com.ildangbaek.backend.domain.user.entity.AuthProvider;
import com.ildangbaek.backend.domain.user.entity.User;
import java.math.BigDecimal;
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
 * CHECK-01 업무 규칙을 고정한다 — GOOD 성분만 추천 근거로 씀(BR 2) · 제품 단위 dedup ·
 * completionRate 위임(ADR 0011 BR 4).
 */
@ExtendWith(MockitoExtension.class)
class CheckHomeServiceTest {

    private static final Long USER_ID = 1L;

    @Mock
    private IngredientProfileRepository ingredientProfileRepository;
    @Mock
    private ProductIngredientRepository productIngredientRepository;
    @Mock
    private ProfileCompletionCalculator profileCompletionCalculator;
    @Mock
    private SkinRecordRepository skinRecordRepository;
    @Mock
    private SkinMetricRepository skinMetricRepository;
    @Mock
    private DailyEnvironmentRepository dailyEnvironmentRepository;

    private CheckHomeService service;
    private User user;

    @BeforeEach
    void setUp() {
        service = new CheckHomeService(ingredientProfileRepository, productIngredientRepository,
                profileCompletionCalculator, skinRecordRepository, skinMetricRepository, dailyEnvironmentRepository);
        user = User.builder().provider(AuthProvider.KAKAO).providerUserId("u1").build();
        ReflectionTestUtils.setField(user, "id", USER_ID);
        when(profileCompletionCalculator.calculate(USER_ID)).thenReturn(65);
        when(skinRecordRepository.findFirstByUserIdOrderByRecordDateDescCapturedAtDesc(USER_ID))
                .thenReturn(Optional.empty());
        when(dailyEnvironmentRepository.findByUserIdAndRecordDate(eq(USER_ID), any()))
                .thenReturn(Optional.empty());
    }

    @Test
    @DisplayName("GOOD 성분이 없으면 매칭 쿼리를 실행하지 않고 빈 목록을 반환한다")
    void returnsEmptyWhenNoGoodIngredient() {
        when(ingredientProfileRepository.findAllByUserIdWithIngredient(USER_ID)).thenReturn(List.of(
                profile(1L, "향료", ReactionType.CAUTION),
                profile(2L, "스쿠알란", ReactionType.INSUFFICIENT)));

        CheckHomeResponse response = service.getHome(USER_ID);

        assertThat(response.recommendations()).isEmpty();
        verifyNoInteractions(productIngredientRepository);
    }

    @Test
    @DisplayName("한 제품이 여러 GOOD 성분과 매칭돼도 추천 목록엔 한 번만 나온다")
    void dedupsByProduct() {
        when(ingredientProfileRepository.findAllByUserIdWithIngredient(USER_ID)).thenReturn(List.of(
                profile(3L, "판테놀", ReactionType.SUITABLE),
                profile(4L, "마데카소사이드", ReactionType.SUITABLE)));

        Product product = product(71L, "라로슈포제 시카플라스트", "라로슈포제");
        Ingredient panthenol = ingredient(3L, "판테놀");
        Ingredient madecassoside = ingredient(4L, "마데카소사이드");
        when(productIngredientRepository.findAllWithProductByIngredientIdInAndKeyIngredientTrue(List.of(3L, 4L)))
                .thenReturn(List.of(
                        productIngredient(product, panthenol),
                        productIngredient(product, madecassoside)));

        CheckHomeResponse response = service.getHome(USER_ID);

        assertThat(response.recommendations()).hasSize(1);
        CheckRecommendationResponse recommendation = response.recommendations().get(0);
        assertThat(recommendation.productId()).isEqualTo(71L);
        assertThat(recommendation.reason()).contains("판테놀").contains("마데카소사이드");
    }

    @Test
    @DisplayName("profileCompletion은 자체 계산하지 않고 F-ANALYSIS-05 값을 그대로 쓴다")
    void delegatesCompletionRate() {
        when(ingredientProfileRepository.findAllByUserIdWithIngredient(USER_ID)).thenReturn(List.of());

        CheckHomeResponse response = service.getHome(USER_ID);

        assertThat(response.profileCompletion()).isEqualTo(65);
    }

    @Test
    @DisplayName("failedSections는 외부 API 호출이 없으므로 항상 빈 배열이다")
    void failedSectionsAlwaysEmpty() {
        when(ingredientProfileRepository.findAllByUserIdWithIngredient(USER_ID)).thenReturn(List.of());

        CheckHomeResponse response = service.getHome(USER_ID);

        assertThat(response.failedSections()).isEmpty();
    }

    private IngredientProfile profile(Long ingredientId, String koreanName, ReactionType reactionType) {
        Ingredient ingredient = ingredient(ingredientId, koreanName);
        IngredientProfile profile = IngredientProfile.builder().user(user).ingredient(ingredient).build();
        if (reactionType != ReactionType.INSUFFICIENT) {
            profile.updateAnalysis(reactionType, BigDecimal.ZERO, BigDecimal.ZERO, 5, 5, 0, null, null);
        }
        return profile;
    }

    private Ingredient ingredient(Long id, String koreanName) {
        Ingredient ingredient = Ingredient.builder().koreanName(koreanName).build();
        ReflectionTestUtils.setField(ingredient, "id", id);
        return ingredient;
    }

    private Product product(Long id, String name, String brand) {
        Product product = Product.builder()
                .productName(name).brandName(brand)
                .category(ProductCategory.SERUM).dataSource(ProductDataSource.USER)
                .build();
        ReflectionTestUtils.setField(product, "id", id);
        return product;
    }

    private ProductIngredient productIngredient(Product product, Ingredient ingredient) {
        return ProductIngredient.builder().product(product).ingredient(ingredient).keyIngredient(true).build();
    }
}
