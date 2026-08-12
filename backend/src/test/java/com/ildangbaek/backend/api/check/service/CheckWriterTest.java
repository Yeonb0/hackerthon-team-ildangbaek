package com.ildangbaek.backend.api.check.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ildangbaek.backend.domain.analysis.entity.ReactionType;
import com.ildangbaek.backend.domain.check.ClassifiedIngredient;
import com.ildangbaek.backend.domain.check.RiskLevelCalculator.RiskOutcome;
import com.ildangbaek.backend.domain.check.entity.ProductRiskAssessment;
import com.ildangbaek.backend.domain.check.entity.ProductRiskIngredient;
import com.ildangbaek.backend.domain.check.entity.RiskLevel;
import com.ildangbaek.backend.domain.check.repository.ProductRiskAssessmentRepository;
import com.ildangbaek.backend.domain.check.repository.ProductRiskIngredientRepository;
import com.ildangbaek.backend.domain.product.entity.Ingredient;
import com.ildangbaek.backend.domain.product.entity.Product;
import com.ildangbaek.backend.domain.product.entity.ProductCategory;
import com.ildangbaek.backend.domain.product.entity.ProductDataSource;
import com.ildangbaek.backend.domain.user.entity.AuthProvider;
import com.ildangbaek.backend.domain.user.entity.User;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class CheckWriterTest {

    @Mock
    private ProductRiskAssessmentRepository productRiskAssessmentRepository;
    @Mock
    private ProductRiskIngredientRepository productRiskIngredientRepository;

    private CheckWriter writer;

    private User user;
    private Product product;

    @BeforeEach
    void setUp() {
        writer = new CheckWriter(productRiskAssessmentRepository, productRiskIngredientRepository);
        user = User.builder().provider(AuthProvider.KAKAO).providerUserId("u1").build();
        product = Product.builder()
                .productName("제품").category(ProductCategory.TONER).dataSource(ProductDataSource.USER).build();
    }

    @Test
    @DisplayName("성분 수만큼 근거 행을 남긴다")
    void savesOneRowPerIngredient() {
        Ingredient a = Ingredient.builder().koreanName("A").build();
        Ingredient b = Ingredient.builder().koreanName("B").build();
        List<ClassifiedIngredient> classified = List.of(
                new ClassifiedIngredient(a, ReactionType.CAUTION, "사유"),
                new ClassifiedIngredient(b, ReactionType.INSUFFICIENT, null));

        ProductRiskAssessment saved = ProductRiskAssessment.builder()
                .user(user).product(product).riskLevel(RiskLevel.MEDIUM).riskScore(BigDecimal.TEN)
                .cautionCount(1).suitableCount(0).insufficientCount(1).summary(null).build();
        ReflectionTestUtils.setField(saved, "id", 1L);
        when(productRiskAssessmentRepository.save(any())).thenReturn(saved);

        writer.save(user, product, new RiskOutcome(RiskLevel.MEDIUM, BigDecimal.TEN), 0, 1, 1, classified);

        verify(productRiskIngredientRepository, org.mockito.Mockito.times(2)).save(any());
    }

    @Test
    @DisplayName("summary와 contributionScore는 비운다")
    void leavesSummaryAndContributionScoreNull() {
        Ingredient a = Ingredient.builder().koreanName("A").build();
        List<ClassifiedIngredient> classified = List.of(new ClassifiedIngredient(a, ReactionType.CAUTION, "사유"));

        when(productRiskAssessmentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(productRiskIngredientRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        ArgumentCaptor<ProductRiskAssessment> assessmentCaptor = ArgumentCaptor.forClass(ProductRiskAssessment.class);
        writer.save(user, product, new RiskOutcome(RiskLevel.MEDIUM, BigDecimal.TEN), 0, 1, 0, classified);
        verify(productRiskAssessmentRepository).save(assessmentCaptor.capture());
        assertThat(assessmentCaptor.getValue().getSummary()).isNull();

        ArgumentCaptor<ProductRiskIngredient> ingredientCaptor = ArgumentCaptor.forClass(ProductRiskIngredient.class);
        verify(productRiskIngredientRepository).save(ingredientCaptor.capture());
        assertThat(ingredientCaptor.getValue().getContributionScore()).isNull();
    }
}
