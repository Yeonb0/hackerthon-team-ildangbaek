package com.ildangbaek.backend.api.user.controller;

import static org.assertj.core.api.Assertions.assertThat;

import com.ildangbaek.backend.domain.user.entity.AuthProvider;
import com.ildangbaek.backend.domain.user.entity.Gender;
import com.ildangbaek.backend.domain.user.entity.User;
import com.ildangbaek.backend.domain.user.entity.UserProfile;
import com.ildangbaek.backend.domain.user.repository.UserProfileRepository;
import com.ildangbaek.backend.domain.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

/**
 * USER-04(프로필 수정)의 입력 검증 응답 코드를 고정한다.
 *
 * <p>{@code gender}를 String으로 받아 서비스에서 {@code Gender.valueOf}로 바꾸면 잘못된 값이
 * {@code IllegalArgumentException}이 되고, GlobalExceptionHandler의 마지막 {@code Exception}
 * 핸들러에 잡혀 <strong>400이어야 할 응답이 500으로 나갔다</strong>. enum으로 받으면 Jackson이
 * 역직렬화 단계에서 걸러 400이 된다.
 */
@SpringBootTest
@AutoConfigureMockMvc
class ProfileUpdateValidationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;
    @Autowired private UserProfileRepository userProfileRepository;

    @Test
    @DisplayName("gender에 정의되지 않은 값이 오면 500이 아니라 400이다")
    void invalidGenderIsBadRequest() throws Exception {
        User user = userRepository.save(User.builder()
                .provider(AuthProvider.KAKAO)
                .providerUserId("kakao-invalid-gender")
                .email("invalid-gender@mock.ildangbaek.local")
                .build());
        userProfileRepository.save(UserProfile.builder()
                .user(user)
                .nickname("테스터")
                .birthYear((short) 2000)
                .gender(Gender.FEMALE)
                .build());

        MvcResult result = mockMvc.perform(MockMvcRequestBuilders.patch("/api/v1/users/me/profile")
                        .header("Authorization", "Bearer mock-access-" + user.getId() + "-uuid")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"gender\":\"NOT_A_GENDER\"}"))
                .andReturn();

        assertThat(result.getResponse().getStatus()).isEqualTo(HttpStatus.BAD_REQUEST.value());
        assertThat(result.getResponse().getContentAsString()).contains("COMMON_BAD_REQUEST");
    }
}
