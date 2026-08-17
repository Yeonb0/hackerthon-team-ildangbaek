package com.ildangbaek.backend.api.user.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.Mockito.when;

import com.ildangbaek.backend.api.user.dto.IngredientProfileItemResponse;
import com.ildangbaek.backend.api.user.dto.IngredientProfileResponse;
import com.ildangbaek.backend.domain.analysis.entity.IngredientProfile;
import com.ildangbaek.backend.domain.analysis.entity.IngredientStatus;
import com.ildangbaek.backend.domain.analysis.entity.ReactionType;
import com.ildangbaek.backend.domain.analysis.profile.ProfileCompletionCalculator;
import com.ildangbaek.backend.domain.analysis.repository.IngredientProfileRepository;
import com.ildangbaek.backend.domain.product.entity.Ingredient;
import com.ildangbaek.backend.domain.user.entity.AuthProvider;
import com.ildangbaek.backend.domain.user.entity.User;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * USER-02의 업무 규칙을 고정한다 — INSUFFICIENT 근거 비우기(BR 1) · 정렬(BR 3) · GOOD 변환(ADR 0004).
 */
@ExtendWith(MockitoExtension.class)
class UserIngredientProfileServiceTest {

    private static final Long USER_ID = 1L;

    @Mock
    private IngredientProfileRepository ingredientProfileRepository;
    @Mock
    private ProfileCompletionCalculator profileCompletionCalculator;

    private UserIngredientProfileService service;
    private User user;

    @BeforeEach
    void setUp() {
        service = new UserIngredientProfileService(ingredientProfileRepository, profileCompletionCalculator);
        user = User.builder().provider(AuthProvider.KAKAO).providerUserId("u1").build();
        ReflectionTestUtils.setField(user, "id", USER_ID);
    }

    @Test
    @DisplayName("GOOD → CAUTION → INSUFFICIENT 순, 그룹 안에서는 노출 일수 내림차순이다")
    void sortsByStatusThenRecordCount() {
        when(ingredientProfileRepository.findAllByUserIdWithIngredient(USER_ID)).thenReturn(List.of(
                profile(44L, "스쿠알란", ReactionType.INSUFFICIENT, 1, null),
                profile(3L, "나이아신아마이드", ReactionType.SUITABLE, 12, "피부 톤 개선 이력"),
                profile(27L, "향료", ReactionType.CAUTION, 7, "과거 홍조 반응 있음"),
                profile(8L, "히알루론산", ReactionType.SUITABLE, 20, "보습 개선 이력")));

        IngredientProfileResponse response = service.getIngredientProfile(USER_ID, null);

        assertThat(response.ingredients())
                .extracting(IngredientProfileItemResponse::name, IngredientProfileItemResponse::status)
                .containsExactly(
                        tuple("히알루론산", IngredientStatus.GOOD),
                        tuple("나이아신아마이드", IngredientStatus.GOOD),
                        tuple("향료", IngredientStatus.CAUTION),
                        tuple("스쿠알란", IngredientStatus.INSUFFICIENT));
    }

    @Test
    @DisplayName("같은 상태끼리는 노출 일수가 많은 성분이 앞에 온다")
    void sortsByRecordCountDescendingWithinGroup() {
        when(ingredientProfileRepository.findAllByUserIdWithIngredient(USER_ID)).thenReturn(List.of(
                profile(27L, "향료", ReactionType.CAUTION, 2, "근거"),
                profile(21L, "레티놀", ReactionType.CAUTION, 9, "근거"),
                profile(44L, "알코올", ReactionType.CAUTION, 5, "근거")));

        IngredientProfileResponse response = service.getIngredientProfile(USER_ID, null);

        assertThat(response.ingredients())
                .extracting(IngredientProfileItemResponse::recordCount)
                .containsExactly(9, 5, 2);
    }

    @Test
    @DisplayName("INSUFFICIENT 성분은 근거가 저장돼 있어도 reason을 null로 내린다")
    void blanksReasonForInsufficient() {
        when(ingredientProfileRepository.findAllByUserIdWithIngredient(USER_ID)).thenReturn(List.of(
                profile(44L, "스쿠알란", ReactionType.INSUFFICIENT, 1, "남아 있던 근거 문구")));

        IngredientProfileResponse response = service.getIngredientProfile(USER_ID, null);

        assertThat(response.ingredients())
                .singleElement()
                .satisfies(item -> {
                    assertThat(item.description()).isEqualTo("피부 보습에 도움을 주는 성분");
                    assertThat(item.reason()).isNull();
                    assertThat(item.recordCount()).isEqualTo(1);
                });
    }

    @Test
    @DisplayName("status=GOOD은 DB의 SUITABLE 행만 남긴다")
    void filtersGoodByReactionType() {
        when(ingredientProfileRepository.findAllByUserIdWithIngredient(USER_ID)).thenReturn(List.of(
                profile(3L, "나이아신아마이드", ReactionType.SUITABLE, 12, "피부 톤 개선 이력"),
                profile(27L, "향료", ReactionType.CAUTION, 7, "과거 홍조 반응 있음")));

        IngredientProfileResponse response = service.getIngredientProfile(USER_ID, IngredientStatus.GOOD);

        assertThat(response.ingredients())
                .extracting(IngredientProfileItemResponse::name)
                .containsExactly("나이아신아마이드");
    }

    @Test
    @DisplayName("completionRate는 필터와 무관하게 F-ANALYSIS-05 값을 그대로 쓴다")
    void delegatesCompletionRate() {
        when(ingredientProfileRepository.findAllByUserIdWithIngredient(USER_ID)).thenReturn(List.of(
                profile(3L, "나이아신아마이드", ReactionType.SUITABLE, 12, "피부 톤 개선 이력"),
                profile(27L, "향료", ReactionType.CAUTION, 7, "과거 홍조 반응 있음")));
        when(profileCompletionCalculator.calculate(USER_ID)).thenReturn(65);

        IngredientProfileResponse response = service.getIngredientProfile(USER_ID, IngredientStatus.CAUTION);

        assertThat(response.completionRate()).isEqualTo(65);
    }

    @Test
    @DisplayName("프로파일이 비어 있으면 오류가 아니라 빈 배열이다")
    void returnsEmptyListWhenNoProfile() {
        when(ingredientProfileRepository.findAllByUserIdWithIngredient(USER_ID)).thenReturn(List.of());
        when(profileCompletionCalculator.calculate(USER_ID)).thenReturn(0);

        IngredientProfileResponse response = service.getIngredientProfile(USER_ID, null);

        assertThat(response.ingredients()).isEmpty();
        assertThat(response.completionRate()).isZero();
    }

    private IngredientProfile profile(Long ingredientId, String koreanName, ReactionType reactionType,
                                       int observationCount, String reasonSummary) {
        Ingredient ingredient = Ingredient.builder()
                .koreanName(koreanName)
                .description("피부 보습에 도움을 주는 성분")
                .build();
        ReflectionTestUtils.setField(ingredient, "id", ingredientId);

        IngredientProfile profile = IngredientProfile.builder().user(user).ingredient(ingredient).build();
        profile.updateAnalysis(reactionType, BigDecimal.ZERO, BigDecimal.ZERO,
                observationCount, 0, 0, null, reasonSummary);
        return profile;
    }
}
