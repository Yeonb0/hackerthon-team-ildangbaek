package com.ildangbaek.backend.api.user.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.ildangbaek.backend.api.onboard.dto.request.HormoneStatus;
import com.ildangbaek.backend.api.user.dto.request.GenderRequest;
import com.ildangbaek.backend.api.user.dto.request.ProfileUpdateRequest;
import com.ildangbaek.backend.domain.user.entity.AuthProvider;
import com.ildangbaek.backend.domain.user.entity.Gender;
import com.ildangbaek.backend.domain.user.entity.SkinTypeCode;
import com.ildangbaek.backend.domain.user.entity.User;
import com.ildangbaek.backend.domain.user.entity.UserProfile;
import com.ildangbaek.backend.domain.user.repository.UserProfileRepository;
import com.ildangbaek.backend.domain.user.repository.UserRepository;
import com.ildangbaek.backend.domain.user.repository.UserSkinTypeRepository;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

/**
 * USER-04(프로필 수정)의 저장 규칙을 실제 DB에 대해 고정한다.
 *
 * <p>{@code user_skin_types}에는 {@code (user_id, skin_type_id)} 유니크 제약이 있다.
 * {@code deleteAllByUserId}는 bulk delete가 아니라 select 후 개별 remove라서 삭제가 커밋까지
 * 미뤄지는 반면, IDENTITY 전략인 {@code save}는 즉시 INSERT를 날린다. 그래서 삭제를 flush로
 * 먼저 반영하지 않으면 실행 순서가 INSERT → DELETE가 되어 제약 위반으로 500이 난다.
 *
 * <p>목 리포지토리로는 제약이 재현되지 않으므로 실제 DB(H2)와 실제 서비스 빈을 쓴다.
 */
@SpringBootTest
@Transactional
class UserProfileUpdateTest {

    @Autowired private UserService userService;
    @Autowired private UserRepository userRepository;
    @Autowired private UserProfileRepository userProfileRepository;
    @Autowired private UserSkinTypeRepository userSkinTypeRepository;

    private Long userId;

    @BeforeEach
    void setUp() {
        User user = userRepository.save(User.builder()
                .provider(AuthProvider.KAKAO)
                .providerUserId("kakao-skin-type")
                .email("skin-type@mock.ildangbaek.local")
                .build());
        userProfileRepository.save(UserProfile.builder()
                .user(user)
                .nickname("테스터")
                .birthYear((short) 2000)
                .gender(Gender.FEMALE)
                .build());
        userId = user.getId();

        userService.updateProfile(userId, skinTypeRequest(List.of(SkinTypeCode.DRY)));
    }

    @Test
    @DisplayName("기존과 겹치는 스킨타입으로 교체해도 유니크 제약에 걸리지 않는다")
    void replaceWithOverlappingSkinType() {
        userService.updateProfile(userId,
                skinTypeRequest(List.of(SkinTypeCode.DRY, SkinTypeCode.SENSITIVE)));

        assertThat(savedCodes()).containsExactlyInAnyOrder(SkinTypeCode.DRY, SkinTypeCode.SENSITIVE);
    }

    @Test
    @DisplayName("요청 안에 같은 스킨타입이 중복돼도 한 번만 저장된다")
    void deduplicatesWithinRequest() {
        userService.updateProfile(userId,
                skinTypeRequest(List.of(SkinTypeCode.OILY, SkinTypeCode.OILY)));

        assertThat(savedCodes()).containsExactly(SkinTypeCode.OILY);
    }

    @Test
    @DisplayName("성별을 여성이 아닌 값으로 바꾸면 호르몬 정보를 지운다")
    void clearsHormoneInfoWhenGenderIsNotFemale() {
        userService.updateProfile(userId, new ProfileUpdateRequest(
                null, null, null, null, HormoneStatus.MENSTRUATING, LocalDate.now().minusDays(3), 28));
        assertThat(profile().getMenstrualStatus()).isNotNull();

        userService.updateProfile(userId, new ProfileUpdateRequest(
                null, GenderRequest.MALE, null, null, null, null, null));

        assertThat(profile().getMenstrualStatus()).isNull();
        assertThat(profile().getLastMenstrualStartDate()).isNull();
        assertThat(profile().getMenstrualCycleDays()).isNull();
    }

    @Test
    @DisplayName("성별을 여성으로 유지한 채 호르몬 정보만 보내면 갱신된다")
    void updatesHormoneInfoWhenStillFemale() {
        LocalDate lastPeriod = LocalDate.now().minusDays(5);

        userService.updateProfile(userId, new ProfileUpdateRequest(
                null, GenderRequest.FEMALE, null, null, HormoneStatus.MENSTRUATING, lastPeriod, 30));

        assertThat(profile().getLastMenstrualStartDate()).isEqualTo(lastPeriod);
        assertThat(profile().getMenstrualCycleDays()).isEqualTo((short) 30);
    }

    private UserProfile profile() {
        userProfileRepository.flush();
        return userProfileRepository.findByUserId(userId).orElseThrow();
    }

    private List<SkinTypeCode> savedCodes() {
        userSkinTypeRepository.flush();
        return userSkinTypeRepository.findAllByUserId(userId).stream()
                .map(userSkinType -> userSkinType.getSkinType().getCode())
                .toList();
    }

    private ProfileUpdateRequest skinTypeRequest(List<SkinTypeCode> skinTypes) {
        return new ProfileUpdateRequest(null, null, null, skinTypes, null, null, null);
    }
}
