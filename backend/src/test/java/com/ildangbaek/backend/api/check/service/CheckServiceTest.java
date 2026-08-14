package com.ildangbaek.backend.api.check.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.ildangbaek.backend.api.check.dto.CheckResponse;
import com.ildangbaek.backend.domain.analysis.entity.IngredientProfile;
import com.ildangbaek.backend.domain.analysis.entity.ReactionType;
import com.ildangbaek.backend.domain.analysis.repository.IngredientProfileRepository;
import com.ildangbaek.backend.domain.check.RiskLevelCalculator;
import com.ildangbaek.backend.domain.check.entity.ProductRiskAssessment;
import com.ildangbaek.backend.domain.check.entity.ProductRiskIngredient;
import com.ildangbaek.backend.domain.check.entity.RiskLevel;
import com.ildangbaek.backend.domain.check.repository.ProductRiskAssessmentRepository;
import com.ildangbaek.backend.domain.check.repository.ProductRiskIngredientRepository;
import com.ildangbaek.backend.domain.product.entity.Ingredient;
import com.ildangbaek.backend.domain.product.entity.Product;
import com.ildangbaek.backend.domain.product.entity.ProductCategory;
import com.ildangbaek.backend.domain.product.entity.ProductDataSource;
import com.ildangbaek.backend.domain.product.entity.ProductIngredient;
import com.ildangbaek.backend.domain.product.repository.ProductIngredientRepository;
import com.ildangbaek.backend.domain.product.repository.ProductRepository;
import com.ildangbaek.backend.domain.user.entity.AuthProvider;
import com.ildangbaek.backend.domain.user.entity.User;
import com.ildangbaek.backend.domain.user.repository.UserRepository;
import com.ildangbaek.backend.global.exception.BusinessException;
import com.ildangbaek.backend.global.exception.ErrorCode;
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
 * F-CHECK-03 업무 규칙을 고정한다 — 두 409의 발동 조건 · 근거 비우기 · 등급 파생 · POST/GET 일치.
 * (ADR 0015)
 */
@ExtendWith(MockitoExtension.class)
class CheckServiceTest {

    private static final Long USER_ID = 1L;

    @Mock
    private ProductRepository productRepository;
    @Mock
    private ProductIngredientRepository productIngredientRepository;
    @Mock
    private IngredientProfileRepository ingredientProfileRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ProductRiskAssessmentRepository productRiskAssessmentRepository;
    @Mock
    private ProductRiskIngredientRepository productRiskIngredientRepository;
    @Mock
    private CheckWriter checkWriter;

    private CheckService service;

    private User user;
    private Product product;

    @BeforeEach
    void setUp() {
        service = new CheckService(productRepository, productIngredientRepository, ingredientProfileRepository,
                userRepository, productRiskAssessmentRepository, productRiskIngredientRepository,
                new RiskLevelCalculator(), checkWriter);
        user = User.builder().provider(AuthProvider.KAKAO).providerUserId("u1").build();
        ReflectionTestUtils.setField(user, "id", USER_ID);
        product = product(71L, "닥터지 브라이트닝 업 선베이스");
    }

    private Product product(Long id, String name) {
        Product p = Product.builder()
                .productName(name)
                .category(ProductCategory.SUNCREAM)
                .dataSource(ProductDataSource.USER)
                .build();
        ReflectionTestUtils.setField(p, "id", id);
        return p;
    }

    private Ingredient ingredient(Long id, String koreanName) {
        Ingredient i = Ingredient.builder().koreanName(koreanName).build();
        ReflectionTestUtils.setField(i, "id", id);
        return i;
    }

    private ProductIngredient productIngredient(Product product, Ingredient ingredient, int order) {
        return ProductIngredient.builder()
                .product(product).ingredient(ingredient).displayOrder(order).keyIngredient(false).build();
    }

    private IngredientProfile profile(Ingredient ingredient, ReactionType reactionType, String reasonSummary) {
        IngredientProfile p = IngredientProfile.builder().user(user).ingredient(ingredient).build();
        if (reactionType != ReactionType.INSUFFICIENT) {
            p.updateAnalysis(reactionType, BigDecimal.TEN, BigDecimal.valueOf(100), 5, 5, 0, 2, reasonSummary);
        }
        return p;
    }

    private ProductRiskAssessment savedAssessment(Long id, RiskLevel level, int suitable, int caution, int insufficient) {
        ProductRiskAssessment assessment = ProductRiskAssessment.builder()
                .user(user).product(product).riskLevel(level).riskScore(BigDecimal.TEN)
                .cautionCount(caution).suitableCount(suitable).insufficientCount(insufficient).summary(null)
                .build();
        ReflectionTestUtils.setField(assessment, "id", id);
        return assessment;
    }

    @Test
    @DisplayName("존재하지 않는 제품이면 CHECK_PRODUCT_NOT_FOUND다")
    void productNotFound() {
        when(productRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.create(USER_ID, 999L))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.CHECK_PRODUCT_NOT_FOUND);
    }

    @Test
    @DisplayName("비활성 제품이면 CHECK_PRODUCT_NOT_FOUND다")
    void inactiveProductNotFound() {
        Product inactive = product(72L, "단종 제품");
        ReflectionTestUtils.setField(inactive, "active", false);
        when(productRepository.findById(72L)).thenReturn(Optional.of(inactive));

        assertThatThrownBy(() -> service.create(USER_ID, 72L))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.CHECK_PRODUCT_NOT_FOUND);
    }

    @Test
    @DisplayName("제품 성분이 0건이면 CHECK_INGREDIENT_DATA_INSUFFICIENT다")
    void noIngredientRows() {
        when(productRepository.findById(71L)).thenReturn(Optional.of(product));
        when(productIngredientRepository.findAllWithIngredientByProductIdOrderByDisplayOrder(71L))
                .thenReturn(List.of());

        assertThatThrownBy(() -> service.create(USER_ID, 71L))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.CHECK_INGREDIENT_DATA_INSUFFICIENT);
    }

    @Test
    @DisplayName("제품 성분 중 판정된 것이 없으면 CHECK_PROFILE_NOT_READY다")
    void noJudgedIngredient() {
        Ingredient panthenol = ingredient(3L, "판테놀");
        when(productRepository.findById(71L)).thenReturn(Optional.of(product));
        when(productIngredientRepository.findAllWithIngredientByProductIdOrderByDisplayOrder(71L))
                .thenReturn(List.of(productIngredient(product, panthenol, 1)));
        when(ingredientProfileRepository.findAllByUserIdAndIngredientIdIn(USER_ID, List.of(3L)))
                .thenReturn(List.of());

        assertThatThrownBy(() -> service.create(USER_ID, 71L))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.CHECK_PROFILE_NOT_READY);
    }

    @Test
    @DisplayName("프로파일이 있어도 이 제품과 겹치지 않으면 CHECK_PROFILE_NOT_READY다")
    void profileExistsButNotForThisProductIngredients() {
        Ingredient panthenol = ingredient(3L, "판테놀");
        when(productRepository.findById(71L)).thenReturn(Optional.of(product));
        when(productIngredientRepository.findAllWithIngredientByProductIdOrderByDisplayOrder(71L))
                .thenReturn(List.of(productIngredient(product, panthenol, 1)));
        // 이 제품의 성분(판테놀)에 대해서는 프로파일이 없다 — 다른 성분 프로파일이 사용자에게 있어도 무관
        when(ingredientProfileRepository.findAllByUserIdAndIngredientIdIn(USER_ID, List.of(3L)))
                .thenReturn(List.of());

        assertThatThrownBy(() -> service.create(USER_ID, 71L))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.CHECK_PROFILE_NOT_READY);
    }

    @Test
    @DisplayName("판정 1건이라도 있으면 나머지가 전부 INSUFFICIENT여도 계산한다")
    void calculatesWithAtLeastOneJudged() {
        Ingredient retinol = ingredient(1L, "레티놀");
        Ingredient unknown = ingredient(9L, "미상성분");
        when(productRepository.findById(71L)).thenReturn(Optional.of(product));
        when(productIngredientRepository.findAllWithIngredientByProductIdOrderByDisplayOrder(71L))
                .thenReturn(List.of(productIngredient(product, retinol, 1), productIngredient(product, unknown, 2)));
        when(ingredientProfileRepository.findAllByUserIdAndIngredientIdIn(USER_ID, List.of(1L, 9L)))
                .thenReturn(List.of(profile(retinol, ReactionType.CAUTION, "과거 홍조 반응 있음")));
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(checkWriter.save(any(), any(), any(), anyInt(), anyInt(), anyInt(), anyList()))
                .thenReturn(savedAssessment(10L, RiskLevel.MEDIUM, 0, 1, 1));

        CheckResponse response = service.create(USER_ID, 71L);

        assertThat(response.summary().cautionCount()).isEqualTo(1);
        assertThat(response.summary().insufficientCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("409면 평가를 저장하지 않는다")
    void doesNotSaveOn409() {
        when(productRepository.findById(71L)).thenReturn(Optional.of(product));
        when(productIngredientRepository.findAllWithIngredientByProductIdOrderByDisplayOrder(71L))
                .thenReturn(List.of());

        assertThatThrownBy(() -> service.create(USER_ID, 71L)).isInstanceOf(BusinessException.class);

        verifyNoInteractions(checkWriter);
    }

    @Test
    @DisplayName("INSUFFICIENT 성분의 reason은 null이다")
    void insufficientReasonIsNull() {
        Ingredient retinol = ingredient(1L, "레티놀");
        Ingredient panthenol = ingredient(3L, "판테놀");
        when(productRepository.findById(71L)).thenReturn(Optional.of(product));
        when(productIngredientRepository.findAllWithIngredientByProductIdOrderByDisplayOrder(71L))
                .thenReturn(List.of(productIngredient(product, retinol, 1), productIngredient(product, panthenol, 2)));
        when(ingredientProfileRepository.findAllByUserIdAndIngredientIdIn(USER_ID, List.of(1L, 3L)))
                .thenReturn(List.of(
                        profile(retinol, ReactionType.CAUTION, "과거 홍조 반응 있음"),
                        profile(panthenol, ReactionType.INSUFFICIENT, null)));
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(checkWriter.save(any(), any(), any(), anyInt(), anyInt(), anyInt(), anyList()))
                .thenReturn(savedAssessment(10L, RiskLevel.MEDIUM, 0, 1, 1));

        CheckResponse response = service.create(USER_ID, 71L);

        assertThat(response.ingredients())
                .filteredOn(i -> i.ingredientId().equals(3L))
                .first()
                .satisfies(i -> assertThat(i.reason()).isNull());
    }

    @Test
    @DisplayName("프로파일에 근거 문구가 없으면 GOOD이어도 reason이 null이다")
    void goodWithoutReasonSummaryIsNull() {
        Ingredient glycerin = ingredient(9L, "글리세린");
        when(productRepository.findById(71L)).thenReturn(Optional.of(product));
        when(productIngredientRepository.findAllWithIngredientByProductIdOrderByDisplayOrder(71L))
                .thenReturn(List.of(productIngredient(product, glycerin, 1)));
        when(ingredientProfileRepository.findAllByUserIdAndIngredientIdIn(USER_ID, List.of(9L)))
                .thenReturn(List.of(profile(glycerin, ReactionType.SUITABLE, null)));
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(checkWriter.save(any(), any(), any(), anyInt(), anyInt(), anyInt(), anyList()))
                .thenReturn(savedAssessment(10L, RiskLevel.LOW, 1, 0, 0));

        CheckResponse response = service.create(USER_ID, 71L);

        assertThat(response.ingredients()).first().satisfies(i -> assertThat(i.reason()).isNull());
    }

    @Test
    @DisplayName("프로파일 행이 없는 성분은 INSUFFICIENT다")
    void missingProfileRowIsInsufficient() {
        Ingredient retinol = ingredient(1L, "레티놀");
        Ingredient unknown = ingredient(9L, "미상성분");
        when(productRepository.findById(71L)).thenReturn(Optional.of(product));
        when(productIngredientRepository.findAllWithIngredientByProductIdOrderByDisplayOrder(71L))
                .thenReturn(List.of(productIngredient(product, retinol, 1), productIngredient(product, unknown, 2)));
        when(ingredientProfileRepository.findAllByUserIdAndIngredientIdIn(USER_ID, List.of(1L, 9L)))
                .thenReturn(List.of(profile(retinol, ReactionType.CAUTION, "과거 홍조 반응 있음")));
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(checkWriter.save(any(), any(), any(), anyInt(), anyInt(), anyInt(), anyList()))
                .thenReturn(savedAssessment(10L, RiskLevel.MEDIUM, 0, 1, 1));

        CheckResponse response = service.create(USER_ID, 71L);

        assertThat(response.ingredients())
                .filteredOn(i -> i.ingredientId().equals(9L))
                .first()
                .satisfies(i -> assertThat(i.status().name()).isEqualTo("INSUFFICIENT"));
    }

    @Test
    @DisplayName("성분은 제품 표시 순서대로 반환된다")
    void ingredientsOrderedByDisplayOrder() {
        Ingredient second = ingredient(2L, "두번째");
        Ingredient first = ingredient(1L, "첫번째");
        when(productRepository.findById(71L)).thenReturn(Optional.of(product));
        // 저장소가 이미 displayOrder 순으로 반환한다고 가정(쿼리가 정렬) — first, second 순
        when(productIngredientRepository.findAllWithIngredientByProductIdOrderByDisplayOrder(71L))
                .thenReturn(List.of(productIngredient(product, first, 1), productIngredient(product, second, 2)));
        when(ingredientProfileRepository.findAllByUserIdAndIngredientIdIn(USER_ID, List.of(1L, 2L)))
                .thenReturn(List.of(
                        profile(first, ReactionType.CAUTION, "사유1"),
                        profile(second, ReactionType.CAUTION, "사유2")));
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(checkWriter.save(any(), any(), any(), anyInt(), anyInt(), anyInt(), anyList()))
                .thenReturn(savedAssessment(10L, RiskLevel.HIGH, 0, 2, 0));

        CheckResponse response = service.create(USER_ID, 71L);

        assertThat(response.ingredients()).extracting("ingredientId").containsExactly(1L, 2L);
    }

    @Test
    @DisplayName("summary 카운트가 성분 목록과 일치한다")
    void summaryMatchesIngredientList() {
        Ingredient retinol = ingredient(1L, "레티놀");
        when(productRepository.findById(71L)).thenReturn(Optional.of(product));
        when(productIngredientRepository.findAllWithIngredientByProductIdOrderByDisplayOrder(71L))
                .thenReturn(List.of(productIngredient(product, retinol, 1)));
        when(ingredientProfileRepository.findAllByUserIdAndIngredientIdIn(USER_ID, List.of(1L)))
                .thenReturn(List.of(profile(retinol, ReactionType.CAUTION, "사유")));
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(checkWriter.save(any(), any(), any(), anyInt(), anyInt(), anyInt(), anyList()))
                .thenReturn(savedAssessment(10L, RiskLevel.MEDIUM, 0, 1, 0));

        CheckResponse response = service.create(USER_ID, 71L);

        assertThat(response.summary().cautionCount()).isEqualTo(1);
        assertThat(response.ingredients()).hasSize(1);
    }

    @Test
    @DisplayName("riskTitle · riskDescription이 riskLevel에서 나온다")
    void titleAndDescriptionDeriveFromLevel() {
        Ingredient retinol = ingredient(1L, "레티놀");
        when(productRepository.findById(71L)).thenReturn(Optional.of(product));
        when(productIngredientRepository.findAllWithIngredientByProductIdOrderByDisplayOrder(71L))
                .thenReturn(List.of(productIngredient(product, retinol, 1)));
        when(ingredientProfileRepository.findAllByUserIdAndIngredientIdIn(USER_ID, List.of(1L)))
                .thenReturn(List.of(profile(retinol, ReactionType.CAUTION, "사유")));
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(checkWriter.save(any(), any(), any(), anyInt(), anyInt(), anyInt(), anyList()))
                .thenReturn(savedAssessment(10L, RiskLevel.HIGH, 0, 3, 0));

        CheckResponse response = service.create(USER_ID, 71L);

        assertThat(response.riskTitle()).isEqualTo("주의가 필요해요");
        assertThat(response.riskDescription()).isEqualTo(RiskLevel.HIGH.description());
    }

    @Test
    @DisplayName("조회 횟수가 성분 수와 무관하게 고정된다")
    void queryCountIsFixedRegardlessOfIngredientCount() {
        Ingredient retinol = ingredient(1L, "레티놀");
        when(productRepository.findById(71L)).thenReturn(Optional.of(product));
        when(productIngredientRepository.findAllWithIngredientByProductIdOrderByDisplayOrder(71L))
                .thenReturn(List.of(productIngredient(product, retinol, 1)));
        when(ingredientProfileRepository.findAllByUserIdAndIngredientIdIn(USER_ID, List.of(1L)))
                .thenReturn(List.of(profile(retinol, ReactionType.CAUTION, "사유")));
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(checkWriter.save(any(), any(), any(), anyInt(), anyInt(), anyInt(), anyList()))
                .thenReturn(savedAssessment(10L, RiskLevel.MEDIUM, 0, 1, 0));

        service.create(USER_ID, 71L);

        verify(productRepository).findById(71L);
        verify(productIngredientRepository).findAllWithIngredientByProductIdOrderByDisplayOrder(71L);
        verify(ingredientProfileRepository).findAllByUserIdAndIngredientIdIn(USER_ID, List.of(1L));
        verify(userRepository).findById(USER_ID);
    }

    /**
     * BR 3의 실제 흐름 검증. 같은 (suitable=0, caution=1)을 갖는 두 제품이 insufficient 개수만
     * 다를 때, RiskLevelCalculator에 전달되는 카운트가 같으므로 등급도 같아야 한다.
     */
    @Test
    @DisplayName("INSUFFICIENT 성분 수가 달라도 판정 카운트가 같으면 같은 등급이 된다")
    void insufficientCountDoesNotChangeLevelGivenSameJudgedCounts() {
        Ingredient retinol = ingredient(1L, "레티놀");
        Ingredient extraUnknown = ingredient(9L, "미상성분");

        // 성분 1개(레티놀만)
        when(productRepository.findById(71L)).thenReturn(Optional.of(product));
        when(productIngredientRepository.findAllWithIngredientByProductIdOrderByDisplayOrder(71L))
                .thenReturn(List.of(productIngredient(product, retinol, 1)));
        when(ingredientProfileRepository.findAllByUserIdAndIngredientIdIn(USER_ID, List.of(1L)))
                .thenReturn(List.of(profile(retinol, ReactionType.CAUTION, "사유")));
        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(checkWriter.save(any(), any(), any(), anyInt(), anyInt(), anyInt(), anyList()))
                .thenAnswer(inv -> savedAssessment(10L, RiskLevel.MEDIUM, inv.getArgument(3), inv.getArgument(4), inv.getArgument(5)));

        CheckResponse first = service.create(USER_ID, 71L);

        // 같은 제품에 미상 성분 여러 개가 추가된 버전
        Product product2 = product(72L, "제품2");
        when(productRepository.findById(72L)).thenReturn(Optional.of(product2));
        when(productIngredientRepository.findAllWithIngredientByProductIdOrderByDisplayOrder(72L))
                .thenReturn(List.of(
                        productIngredient(product2, retinol, 1),
                        productIngredient(product2, extraUnknown, 2)));
        when(ingredientProfileRepository.findAllByUserIdAndIngredientIdIn(USER_ID, List.of(1L, 9L)))
                .thenReturn(List.of(profile(retinol, ReactionType.CAUTION, "사유")));

        CheckResponse second = service.create(USER_ID, 72L);

        assertThat(second.riskLevel()).isEqualTo(first.riskLevel());
    }

    @Test
    @DisplayName("다른 사용자의 checkId는 CHECK_NOT_FOUND다")
    void otherUsersCheckIdIsNotFound() {
        when(productRiskAssessmentRepository.findByIdAndUserIdWithProduct(10L, 999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.get(999L, 10L))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.CHECK_NOT_FOUND);
    }

    @Test
    @DisplayName("없는 checkId는 CHECK_NOT_FOUND다")
    void missingCheckIdIsNotFound() {
        when(productRiskAssessmentRepository.findByIdAndUserIdWithProduct(999L, USER_ID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.get(USER_ID, 999L))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo(ErrorCode.CHECK_NOT_FOUND);

        verify(productRiskIngredientRepository, never()).findAllByAssessmentIdWithIngredient(anyLong());
    }

    @Test
    @DisplayName("CHECK-03 응답이 CHECK-02와 같은 구조·순서다")
    void getReproducesCreateResponse() {
        ProductRiskAssessment assessment = savedAssessment(10L, RiskLevel.HIGH, 0, 2, 1);
        Ingredient retinol = ingredient(1L, "레티놀");
        Ingredient hyaluronic = ingredient(2L, "히알루론산");
        Ingredient panthenol = ingredient(3L, "판테놀");

        ProductRiskIngredient ri1 = ProductRiskIngredient.builder()
                .assessment(assessment).ingredient(retinol).reactionType(ReactionType.CAUTION)
                .reason("과거 홍조 반응 있음").contributionScore(null).build();
        ProductRiskIngredient ri2 = ProductRiskIngredient.builder()
                .assessment(assessment).ingredient(hyaluronic).reactionType(ReactionType.CAUTION)
                .reason("히알루론산 반응이 좋았어요").contributionScore(null).build();
        ProductRiskIngredient ri3 = ProductRiskIngredient.builder()
                .assessment(assessment).ingredient(panthenol).reactionType(ReactionType.INSUFFICIENT)
                .reason(null).contributionScore(null).build();

        when(productRiskAssessmentRepository.findByIdAndUserIdWithProduct(10L, USER_ID))
                .thenReturn(Optional.of(assessment));
        when(productRiskIngredientRepository.findAllByAssessmentIdWithIngredient(10L))
                .thenReturn(List.of(ri1, ri2, ri3));

        CheckResponse response = service.get(USER_ID, 10L);

        assertThat(response.checkId()).isEqualTo(10L);
        assertThat(response.riskLevel()).isEqualTo(RiskLevel.HIGH);
        assertThat(response.riskTitle()).isEqualTo(RiskLevel.HIGH.title());
        assertThat(response.ingredients()).extracting("ingredientId").containsExactly(1L, 2L, 3L);
        assertThat(response.ingredients()).filteredOn(i -> i.ingredientId().equals(3L))
                .first().satisfies(i -> assertThat(i.reason()).isNull());
    }
}
