package com.ildangbaek.backend.domain.analysis.lag;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

import com.ildangbaek.backend.domain.analysis.entity.IngredientProfile;
import com.ildangbaek.backend.domain.analysis.entity.ReactionType;
import com.ildangbaek.backend.domain.analysis.repository.IngredientProfileRepository;
import com.ildangbaek.backend.domain.product.entity.Ingredient;
import com.ildangbaek.backend.domain.product.repository.IngredientRepository;
import com.ildangbaek.backend.domain.record.entity.SkinMetricType;
import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import com.ildangbaek.backend.domain.user.entity.AuthProvider;
import com.ildangbaek.backend.domain.user.entity.SkinType;
import com.ildangbaek.backend.domain.user.entity.SkinTypeCode;
import com.ildangbaek.backend.domain.user.entity.User;
import com.ildangbaek.backend.domain.user.entity.UserSkinType;
import com.ildangbaek.backend.domain.user.repository.UserSkinTypeRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * F-ANALYSIS-04 분류 규칙을 고정한다.
 *
 * <p>핵심은 "데이터가 부족한 성분을 임의로 맞음/주의로 판단하지 않는다"(BR 1)가 어떤 입력에서도
 * 깨지지 않는 것이다. 피부 타입 완화(BR 3)도 이 선을 넘지 못한다.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class IngredientProfileWriterTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 8, 10);
    private static final Long RETINOL = 200L;
    private static final Long PANTHENOL = 201L;

    @Mock
    private IngredientProfileRepository ingredientProfileRepository;
    @Mock
    private IngredientRepository ingredientRepository;
    @Mock
    private UserSkinTypeRepository userSkinTypeRepository;

    private IngredientProfileWriter writer;
    private User user;

    @BeforeEach
    void setUp() {
        writer = new IngredientProfileWriter(ingredientProfileRepository, ingredientRepository,
                userSkinTypeRepository);

        user = User.builder().provider(AuthProvider.KAKAO).providerUserId("u1").build();
        ReflectionTestUtils.setField(user, "id", 1L);

        when(ingredientProfileRepository.findAllByUserId(anyLong())).thenReturn(List.of());
        when(ingredientRepository.findAllById(any()))
                .thenReturn(List.of(ingredient(RETINOL, "레티놀"), ingredient(PANTHENOL, "판테놀")));
        when(userSkinTypeRepository.findAllByUserId(anyLong())).thenReturn(List.of());
        when(ingredientProfileRepository.saveAll(any())).thenAnswer(call -> call.getArgument(0));
    }

    @DisplayName("확정된 악화 패턴은 CAUTION이 된다")
    @Test
    void confirmedWorseningBecomesCaution() {
        Map<Long, IngredientProfile> profiles = write(
                exposures(RETINOL, 3),
                List.of(pattern(RETINOL, "레티놀", PatternDirection.WORSENED, 3, 3, 15.0, true)));

        IngredientProfile retinol = profiles.get(RETINOL);
        assertThat(retinol.getReactionType()).isEqualTo(ReactionType.CAUTION);
        assertThat(retinol.getNegativeCount()).isEqualTo(1);
        assertThat(retinol.getRepresentativeLagDays()).isEqualTo(2);
        assertThat(retinol.getReasonSummary()).contains("레티놀", "트러블", "증가");
    }

    @DisplayName("확정된 개선 패턴만 있으면 SUITABLE이 된다")
    @Test
    void confirmedImprovementBecomesSuitable() {
        Map<Long, IngredientProfile> profiles = write(
                exposures(PANTHENOL, 4),
                List.of(pattern(PANTHENOL, "판테놀", PatternDirection.IMPROVED, 4, 4, -8.0, true)));

        IngredientProfile panthenol = profiles.get(PANTHENOL);
        assertThat(panthenol.getReactionType()).isEqualTo(ReactionType.SUITABLE);
        assertThat(panthenol.getPositiveCount()).isEqualTo(1);
        assertThat(panthenol.getNegativeCount()).isZero();
    }

    @DisplayName("개선과 악화가 함께 확정되면 CAUTION이 이긴다 — 틀렸을 때의 비용이 한쪽으로 기운다")
    @Test
    void worseningWinsOverImprovement() {
        Map<Long, IngredientProfile> profiles = write(
                exposures(RETINOL, 5),
                List.of(
                        pattern(RETINOL, "레티놀", PatternDirection.IMPROVED, SkinMetricType.PORES,
                                2, 5, 5, -9.0, true),
                        pattern(RETINOL, "레티놀", PatternDirection.WORSENED, SkinMetricType.TROUBLE,
                                3, 5, 4, 6.0, true)));

        IngredientProfile retinol = profiles.get(RETINOL);
        assertThat(retinol.getReactionType()).isEqualTo(ReactionType.CAUTION);
        assertThat(retinol.getPositiveCount()).isEqualTo(1);
        assertThat(retinol.getNegativeCount()).isEqualTo(1);
        // 대표 패턴은 변화량이 더 큰 개선(-9.0)이 아니라 악화 쪽이어야 분류와 근거가 어긋나지 않는다.
        assertThat(retinol.getRepresentativeLagDays()).isEqualTo(3);
        assertThat(retinol.getReasonSummary()).contains("증가");
    }

    @DisplayName("확정되지 않은 패턴만 있으면 INSUFFICIENT이며 근거를 남기지 않는다")
    @Test
    void unconfirmedStaysInsufficientWithoutReason() {
        Map<Long, IngredientProfile> profiles = write(
                exposures(PANTHENOL, 3),
                List.of(pattern(PANTHENOL, "판테놀", PatternDirection.WORSENED, 3, 1, 1.0, false)));

        IngredientProfile panthenol = profiles.get(PANTHENOL);
        assertThat(panthenol.getReactionType()).isEqualTo(ReactionType.INSUFFICIENT);
        // USER-02 BR 1 — 데이터가 부족한 성분에 판단 근거를 지어내지 않는다.
        assertThat(panthenol.getReasonSummary()).isNull();
        assertThat(panthenol.getProfileScore()).isNull();
        assertThat(panthenol.getConfidenceScore()).isNull();
        // 관측 횟수는 남긴다. USER-02가 "왜 아직 부족한지"를 이 값으로 설명한다.
        assertThat(panthenol.getObservationCount()).isEqualTo(3);
    }

    @DisplayName("패턴이 전혀 없는 노출 성분도 INSUFFICIENT 행으로 남는다")
    @Test
    void exposedIngredientWithoutPatternStillGetsRow() {
        Map<Long, IngredientProfile> profiles = write(exposures(RETINOL, 2), List.of());

        assertThat(profiles).containsOnlyKeys(RETINOL);
        assertThat(profiles.get(RETINOL).getReactionType()).isEqualTo(ReactionType.INSUFFICIENT);
        assertThat(profiles.get(RETINOL).getObservationCount()).isEqualTo(2);
    }

    @DisplayName("민감성 피부는 변화량 2점대 악화도 CAUTION으로 확정한다 (BR 3)")
    @Test
    void sensitiveSkinRelaxesWorseningDelta() {
        markSensitive();

        // 변화량 2.5점 — 기본 기준(3점)에는 미달이라 분석기가 confirmed=false로 냈다.
        Map<Long, IngredientProfile> profiles = write(
                exposures(RETINOL, 3),
                List.of(pattern(RETINOL, "레티놀", PatternDirection.WORSENED, 3, 3, 2.5, false)));

        IngredientProfile retinol = profiles.get(RETINOL);
        assertThat(retinol.getReactionType()).isEqualTo(ReactionType.CAUTION);
        assertThat(retinol.getReasonSummary()).startsWith("민감성 피부 기준");
    }

    @DisplayName("민감성이어도 관측 쌍이 부족하면 확정하지 않는다 — 완화는 변화량에만 적용된다")
    @Test
    void sensitiveSkinDoesNotRelaxObservationCount() {
        markSensitive();

        Map<Long, IngredientProfile> profiles = write(
                exposures(RETINOL, 2),
                List.of(pattern(RETINOL, "레티놀", PatternDirection.WORSENED, 2, 2, 12.0, false)));

        assertThat(profiles.get(RETINOL).getReactionType()).isEqualTo(ReactionType.INSUFFICIENT);
    }

    @DisplayName("민감성이어도 개선 방향은 완화하지 않는다 — 잘 맞는다는 판단을 쉽게 내리면 안 된다")
    @Test
    void sensitiveSkinDoesNotRelaxImprovement() {
        markSensitive();

        Map<Long, IngredientProfile> profiles = write(
                exposures(PANTHENOL, 3),
                List.of(pattern(PANTHENOL, "판테놀", PatternDirection.IMPROVED, 3, 3, -2.5, false)));

        assertThat(profiles.get(PANTHENOL).getReactionType()).isEqualTo(ReactionType.INSUFFICIENT);
    }

    @DisplayName("노출도 패턴도 없으면 아무 행도 만들지 않는다 — 피부 타입만으로 분류하지 않는다 (BR 1)")
    @Test
    void writesNothingWithoutExposure() {
        markSensitive();

        assertThat(writer.write(user, List.of(), List.of())).isEmpty();
    }

    @DisplayName("재분석은 기존 행을 갱신한다 — 성분당 한 행을 유지한다")
    @Test
    void reusesExistingProfileRow() {
        IngredientProfile existing = IngredientProfile.builder()
                .user(user).ingredient(ingredient(RETINOL, "레티놀")).build();
        existing.updateAnalysis(ReactionType.SUITABLE, null, null, 2, 1, 0, 1, "이전 회차");
        ReflectionTestUtils.setField(existing, "id", 77L);
        when(ingredientProfileRepository.findAllByUserId(anyLong())).thenReturn(List.of(existing));

        Map<Long, IngredientProfile> profiles = write(
                exposures(RETINOL, 3),
                List.of(pattern(RETINOL, "레티놀", PatternDirection.WORSENED, 3, 3, 15.0, true)));

        assertThat(profiles.get(RETINOL)).isSameAs(existing);
        assertThat(existing.getId()).isEqualTo(77L);
        assertThat(existing.getReactionType()).isEqualTo(ReactionType.CAUTION);
    }

    @DisplayName("같은 날 모닝·나이트에 쓴 성분은 노출 1일로 센다 — 분석기의 계산 방식과 맞춘다")
    @Test
    void countsSameDayBothSlotsAsOneDay() {
        List<IngredientExposure> exposures = List.of(
                new IngredientExposure(RETINOL, "레티놀", TODAY, TimeSlot.MORNING),
                new IngredientExposure(RETINOL, "레티놀", TODAY, TimeSlot.NIGHT),
                new IngredientExposure(RETINOL, "레티놀", TODAY.minusDays(1), TimeSlot.NIGHT));

        Map<Long, IngredientProfile> profiles = write(exposures, List.of());

        assertThat(profiles.get(RETINOL).getObservationCount()).isEqualTo(2);
    }

    @DisplayName("민감성이 아닌 피부 타입은 완화하지 않는다")
    @Test
    void nonSensitiveSkinTypeDoesNotRelax() {
        SkinType oily = SkinType.builder().code(SkinTypeCode.OILY).name("지성").build();
        when(userSkinTypeRepository.findAllByUserId(anyLong()))
                .thenReturn(List.of(UserSkinType.builder().user(user).skinType(oily).build()));

        Map<Long, IngredientProfile> profiles = write(
                exposures(RETINOL, 3),
                List.of(pattern(RETINOL, "레티놀", PatternDirection.WORSENED, 3, 3, 2.5, false)));

        assertThat(profiles.get(RETINOL).getReactionType()).isEqualTo(ReactionType.INSUFFICIENT);
    }

    @DisplayName("성분 마스터에 없는 성분은 행을 만들지 않는다")
    @Test
    void skipsIngredientMissingFromMaster() {
        // 레티놀만 마스터에 있고 판테놀은 없는 상태.
        when(ingredientRepository.findAllById(any())).thenReturn(List.of(ingredient(RETINOL, "레티놀")));

        List<IngredientExposure> exposures = new java.util.ArrayList<>();
        exposures.addAll(exposures(RETINOL, 2));
        exposures.addAll(exposures(PANTHENOL, 2));

        assertThat(write(exposures, List.of())).containsOnlyKeys(RETINOL);
    }

    @DisplayName("같은 지표에서 시차만 다른 확정 패턴은 1건으로 센다 — 현상 하나가 근거 여러 건이 되면 안 된다")
    @Test
    void collapsesSameMetricAcrossLags() {
        // 분석기는 (성분, 지표, 시차) 조합마다 후보를 내므로 한 지표에서 시차 1~3이 모두 확정될 수 있다.
        Map<Long, IngredientProfile> profiles = write(
                exposures(RETINOL, 4),
                List.of(
                        pattern(RETINOL, "레티놀", PatternDirection.WORSENED, SkinMetricType.TROUBLE,
                                1, 4, 4, 5.0, true),
                        pattern(RETINOL, "레티놀", PatternDirection.WORSENED, SkinMetricType.TROUBLE,
                                2, 4, 4, 12.0, true),
                        pattern(RETINOL, "레티놀", PatternDirection.WORSENED, SkinMetricType.TROUBLE,
                                3, 4, 4, 7.0, true)));

        IngredientProfile retinol = profiles.get(RETINOL);
        assertThat(retinol.getNegativeCount()).isEqualTo(1);
        // 대표는 변화량이 가장 큰 시차 2일이어야 한다.
        assertThat(retinol.getRepresentativeLagDays()).isEqualTo(2);
    }

    @DisplayName("목업 시드 시나리오 — 레티놀·히알루론산 CAUTION · 판테놀 INSUFFICIENT")
    @Test
    void mockupSeedScenario() {
        // backend/README.md가 안내하는 f-analysis-01-mockup.sql의 기대 결과를 고정한다.
        // 레티놀 세럼(레티놀 + 히알루론산 동봉)은 2일 뒤 트러블 +15가 3회 반복돼 확정되고,
        // 판테놀은 뒤따르는 변화가 없어 확정되지 않는다.
        Long hyaluronic = 202L;
        when(ingredientRepository.findAllById(any())).thenReturn(List.of(
                ingredient(RETINOL, "레티놀"), ingredient(PANTHENOL, "판테놀"),
                ingredient(hyaluronic, "히알루론산")));

        List<IngredientExposure> exposures = new java.util.ArrayList<>();
        exposures.addAll(exposures(RETINOL, 3));
        exposures.addAll(exposures(hyaluronic, 3));
        exposures.addAll(exposures(PANTHENOL, 3));

        Map<Long, IngredientProfile> profiles = write(exposures, List.of(
                pattern(RETINOL, "레티놀", PatternDirection.WORSENED, 3, 3, 15.0, true),
                pattern(hyaluronic, "히알루론산", PatternDirection.WORSENED, 3, 3, 15.0, true),
                pattern(PANTHENOL, "판테놀", PatternDirection.WORSENED, 3, 1, 5.0, false)));

        assertThat(profiles.get(RETINOL).getReactionType()).isEqualTo(ReactionType.CAUTION);
        assertThat(profiles.get(hyaluronic).getReactionType()).isEqualTo(ReactionType.CAUTION);
        assertThat(profiles.get(PANTHENOL).getReactionType()).isEqualTo(ReactionType.INSUFFICIENT);
        assertThat(profiles.get(PANTHENOL).getReasonSummary()).isNull();
    }

    private void markSensitive() {
        SkinType sensitive = SkinType.builder().code(SkinTypeCode.SENSITIVE).name("민감성").build();
        when(userSkinTypeRepository.findAllByUserId(anyLong()))
                .thenReturn(List.of(UserSkinType.builder().user(user).skinType(sensitive).build()));
    }

    private Map<Long, IngredientProfile> write(List<IngredientExposure> exposures, List<LagPattern> patterns) {
        return writer.write(user, exposures, patterns).stream()
                .collect(Collectors.toMap(profile -> profile.getIngredient().getId(), Function.identity()));
    }

    private List<IngredientExposure> exposures(Long ingredientId, int days) {
        return java.util.stream.IntStream.range(0, days)
                .mapToObj(day -> new IngredientExposure(ingredientId, "성분" + ingredientId,
                        TODAY.minusDays(day * 3L), TimeSlot.NIGHT))
                .toList();
    }

    private LagPattern pattern(Long ingredientId, String name, PatternDirection direction,
                               int observations, int agreement, double averageDelta, boolean confirmed) {
        return pattern(ingredientId, name, direction, SkinMetricType.TROUBLE, 2,
                observations, agreement, averageDelta, confirmed);
    }

    private LagPattern pattern(Long ingredientId, String name, PatternDirection direction,
                               SkinMetricType metricType, int lagDays, int observations, int agreement,
                               double averageDelta, boolean confirmed) {
        return new LagPattern(ingredientId, name, metricType, lagDays, direction,
                observations, agreement, averageDelta, confirmed, 0);
    }

    private Ingredient ingredient(Long id, String koreanName) {
        Ingredient ingredient = Ingredient.builder().koreanName(koreanName).build();
        ReflectionTestUtils.setField(ingredient, "id", id);
        return ingredient;
    }
}
