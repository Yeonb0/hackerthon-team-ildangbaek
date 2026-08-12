package com.ildangbaek.backend.api.user.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.Mockito.when;

import com.ildangbaek.backend.api.user.dto.MyPageResponse;
import com.ildangbaek.backend.api.user.dto.MyPageTopIngredientResponse;
import com.ildangbaek.backend.domain.analysis.entity.IngredientProfile;
import com.ildangbaek.backend.domain.analysis.entity.IngredientStatus;
import com.ildangbaek.backend.domain.analysis.entity.ReactionType;
import com.ildangbaek.backend.domain.analysis.profile.ProfileCompletionCalculator;
import com.ildangbaek.backend.domain.analysis.repository.IngredientProfileRepository;
import com.ildangbaek.backend.domain.product.entity.Ingredient;
import com.ildangbaek.backend.domain.record.repository.SkinRecordRepository;
import com.ildangbaek.backend.domain.user.entity.AuthProvider;
import com.ildangbaek.backend.domain.user.entity.NotificationSetting;
import com.ildangbaek.backend.domain.user.entity.SkinType;
import com.ildangbaek.backend.domain.user.entity.SkinTypeCode;
import com.ildangbaek.backend.domain.user.entity.User;
import com.ildangbaek.backend.domain.user.entity.UserProfile;
import com.ildangbaek.backend.domain.user.entity.UserSkinType;
import com.ildangbaek.backend.domain.user.repository.NotificationSettingRepository;
import com.ildangbaek.backend.domain.user.repository.UserProfileRepository;
import com.ildangbaek.backend.domain.user.repository.UserRepository;
import com.ildangbaek.backend.domain.user.repository.UserSkinTypeRepository;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * USER-01 업무 규칙을 고정한다 — completionRate 위임(BR 4·5) · topIngredients 상위 8건(BR 4) ·
 * USER-02와 동일한 정렬 기준 재사용.
 */
@ExtendWith(MockitoExtension.class)
class MyPageServiceTest {

    private static final Long USER_ID = 1L;

    @Mock
    private UserRepository userRepository;
    @Mock
    private UserProfileRepository userProfileRepository;
    @Mock
    private UserSkinTypeRepository userSkinTypeRepository;
    @Mock
    private NotificationSettingRepository notificationSettingRepository;
    @Mock
    private IngredientProfileRepository ingredientProfileRepository;
    @Mock
    private SkinRecordRepository skinRecordRepository;
    @Mock
    private ProfileCompletionCalculator profileCompletionCalculator;

    private MyPageService service;
    private User user;
    private UserProfile userProfile;

    @BeforeEach
    void setUp() {
        service = new MyPageService(userRepository, userProfileRepository, userSkinTypeRepository,
                notificationSettingRepository, ingredientProfileRepository, skinRecordRepository,
                profileCompletionCalculator);

        user = User.builder().provider(AuthProvider.KAKAO).providerUserId("u1").build();
        ReflectionTestUtils.setField(user, "id", USER_ID);
        ReflectionTestUtils.setField(user, "createdAt", LocalDateTime.now().minusDays(30));

        userProfile = UserProfile.builder().user(user).nickname("김민지").build();
        userProfile.updateRegion("서울 강남구");

        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(userProfileRepository.findByUserId(USER_ID)).thenReturn(Optional.of(userProfile));
        when(userSkinTypeRepository.findAllByUserId(USER_ID)).thenReturn(List.of());
        when(notificationSettingRepository.findByUserId(USER_ID)).thenReturn(Optional.empty());
        when(ingredientProfileRepository.findAllByUserIdWithIngredient(USER_ID)).thenReturn(List.of());
        when(skinRecordRepository.countByUserId(USER_ID)).thenReturn(0L);
        when(profileCompletionCalculator.calculate(USER_ID)).thenReturn(0);
    }

    @Test
    @DisplayName("completionRate는 자체 계산하지 않고 F-ANALYSIS-05 값을 그대로 쓴다")
    void delegatesCompletionRate() {
        when(profileCompletionCalculator.calculate(USER_ID)).thenReturn(65);

        MyPageResponse response = service.getMyPage(USER_ID);

        assertThat(response.ingredientProfile().completionRate()).isEqualTo(65);
    }

    @Test
    @DisplayName("topIngredients는 USER-02와 같은 순서(상태 → 노출 일수 내림차순)로 최대 8건이다")
    void limitsTopIngredientsToEightInDisplayOrder() {
        List<IngredientProfile> profiles = IntStream.rangeClosed(1, 10)
                .mapToObj(i -> profile((long) i, "성분" + i, ReactionType.SUITABLE, i))
                .toList();
        when(ingredientProfileRepository.findAllByUserIdWithIngredient(USER_ID)).thenReturn(profiles);

        MyPageResponse response = service.getMyPage(USER_ID);

        assertThat(response.ingredientProfile().topIngredients())
                .hasSize(8)
                .extracting(MyPageTopIngredientResponse::name)
                .containsExactly("성분10", "성분9", "성분8", "성분7", "성분6", "성분5", "성분4", "성분3");
    }

    @Test
    @DisplayName("GOOD → CAUTION → INSUFFICIENT 순으로 정렬한다")
    void sortsByStatusFirst() {
        when(ingredientProfileRepository.findAllByUserIdWithIngredient(USER_ID)).thenReturn(List.of(
                profile(1L, "스쿠알란", ReactionType.INSUFFICIENT, 1),
                profile(2L, "향료", ReactionType.CAUTION, 7),
                profile(3L, "나이아신아마이드", ReactionType.SUITABLE, 12)));

        MyPageResponse response = service.getMyPage(USER_ID);

        assertThat(response.ingredientProfile().topIngredients())
                .extracting(MyPageTopIngredientResponse::name, MyPageTopIngredientResponse::status)
                .containsExactly(
                        tuple("나이아신아마이드", IngredientStatus.GOOD),
                        tuple("향료", IngredientStatus.CAUTION),
                        tuple("스쿠알란", IngredientStatus.INSUFFICIENT));
    }

    @Test
    @DisplayName("상태별 카운트는 GOOD·CAUTION·INSUFFICIENT를 각각 센다")
    void countsByStatus() {
        when(ingredientProfileRepository.findAllByUserIdWithIngredient(USER_ID)).thenReturn(List.of(
                profile(1L, "a", ReactionType.SUITABLE, 1),
                profile(2L, "b", ReactionType.SUITABLE, 1),
                profile(3L, "c", ReactionType.CAUTION, 1),
                profile(4L, "d", ReactionType.INSUFFICIENT, 1)));

        MyPageResponse response = service.getMyPage(USER_ID);

        assertThat(response.ingredientProfile().goodCount()).isEqualTo(2);
        assertThat(response.ingredientProfile().cautionCount()).isEqualTo(1);
        assertThat(response.ingredientProfile().insufficientCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("totalRecordCount는 SkinRecord 행 수를 그대로 쓴다 — 모닝·나이트 각각 1회")
    void usesSkinRecordRowCount() {
        when(skinRecordRepository.countByUserId(USER_ID)).thenReturn(22L);

        MyPageResponse response = service.getMyPage(USER_ID);

        assertThat(response.totalRecordCount()).isEqualTo(22L);
    }

    @Test
    @DisplayName("알림 설정이 없으면 notificationEnabled는 false다")
    void notificationDisabledWhenSettingMissing() {
        MyPageResponse response = service.getMyPage(USER_ID);

        assertThat(response.notificationEnabled()).isFalse();
    }

    @Test
    @DisplayName("모닝·나이트 중 하나라도 켜져 있으면 notificationEnabled는 true다")
    void notificationEnabledWhenEitherChannelOn() {
        NotificationSetting setting = NotificationSetting.builder()
                .user(user).morningEnabled(false).nightEnabled(true).build();
        when(notificationSettingRepository.findByUserId(USER_ID)).thenReturn(Optional.of(setting));

        MyPageResponse response = service.getMyPage(USER_ID);

        assertThat(response.notificationEnabled()).isTrue();
    }

    @Test
    @DisplayName("skinTypes는 사용자가 선택한 피부 타입 코드 목록이다")
    void returnsSelectedSkinTypeCodes() {
        SkinType oily = SkinType.builder().code(SkinTypeCode.OILY).name("지성").build();
        SkinType sensitive = SkinType.builder().code(SkinTypeCode.SENSITIVE).name("민감성").build();
        when(userSkinTypeRepository.findAllByUserId(USER_ID)).thenReturn(List.of(
                UserSkinType.builder().user(user).skinType(oily).build(),
                UserSkinType.builder().user(user).skinType(sensitive).build()));

        MyPageResponse response = service.getMyPage(USER_ID);

        assertThat(response.skinTypes()).containsExactly(SkinTypeCode.OILY, SkinTypeCode.SENSITIVE);
    }

    private IngredientProfile profile(Long ingredientId, String koreanName, ReactionType reactionType,
                                       int observationCount) {
        Ingredient ingredient = Ingredient.builder().koreanName(koreanName).build();
        ReflectionTestUtils.setField(ingredient, "id", ingredientId);

        IngredientProfile profile = IngredientProfile.builder().user(user).ingredient(ingredient).build();
        profile.updateAnalysis(reactionType, BigDecimal.ZERO, BigDecimal.ZERO, observationCount, 0, 0, null, null);
        return profile;
    }
}
