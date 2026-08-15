package com.ildangbaek.backend.global.auth;

import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.ildangbaek.backend.domain.user.entity.AuthProvider;
import com.ildangbaek.backend.domain.user.entity.User;
import com.ildangbaek.backend.domain.user.repository.UserRepository;
import com.ildangbaek.backend.global.config.WebConfig;
import com.ildangbaek.backend.global.exception.GlobalExceptionHandler;
import com.ildangbaek.backend.global.response.ApiResponse;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 임시 인증(Authorization: Bearer mock-access-*)의 주입과 거절을 고정한다. (ADR 0006)
 * DB가 필요 없도록 @WebMvcTest 슬라이스로 검증한다.
 */
@WebMvcTest(controllers = CurrentUserIdArgumentResolverTest.TestController.class)
@Import({CurrentUserIdArgumentResolverTest.TestController.class, WebConfig.class,
        CurrentUserIdArgumentResolver.class, GlobalExceptionHandler.class})
class CurrentUserIdArgumentResolverTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private UserRepository userRepository;

    @RestController
    static class TestController {
        @GetMapping("/api/v1/test/current-user")
        ApiResponse<Long> currentUser(@CurrentUserId Long userId) {
            return ApiResponse.success(userId);
        }

        @GetMapping("/api/v1/test/current-user-entity")
        ApiResponse<Long> currentUserEntity(@CurrentUserId User user) {
            return ApiResponse.success(user.getId());
        }
    }

    @DisplayName("User 파라미터에는 조회한 엔티티가 주입된다")
    @Test
    void resolvesUserEntity() throws Exception {
        User user = User.builder()
                .provider(AuthProvider.KAKAO).providerUserId("kakao-42").email("u@x.local").build();
        ReflectionTestUtils.setField(user, "id", 42L);
        given(userRepository.findById(42L)).willReturn(Optional.of(user));

        mockMvc.perform(get("/api/v1/test/current-user-entity")
                        .header("Authorization", "Bearer mock-access-42-abcd1234"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result").value(42));
    }

    @DisplayName("토큰의 사용자가 없으면 404 AUTH_USER_NOT_FOUND")
    @Test
    void rejectsUnknownUser() throws Exception {
        given(userRepository.findById(42L)).willReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/test/current-user-entity")
                        .header("Authorization", "Bearer mock-access-42-abcd1234"))
                .andExpect(jsonPath("$.code").value("AUTH_USER_NOT_FOUND"));
    }

    @DisplayName("User 파라미터도 헤더가 없으면 401 — 사용자 조회 전에 막는다")
    @Test
    void rejectsMissingHeaderForUserEntity() throws Exception {
        mockMvc.perform(get("/api/v1/test/current-user-entity"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("COMMON_UNAUTHORIZED"));
    }

    @DisplayName("Authorization 헤더에 목업 토큰이 있으면 userId로 주입된다")
    @Test
    void resolvesHeader() throws Exception {
        mockMvc.perform(get("/api/v1/test/current-user")
                        .header("Authorization", "Bearer mock-access-42-abcd1234"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result").value(42));
    }

    @DisplayName("헤더가 없으면 401 COMMON_UNAUTHORIZED")
    @Test
    void rejectsMissingHeader() throws Exception {
        mockMvc.perform(get("/api/v1/test/current-user"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.isSuccess").value(false))
                .andExpect(jsonPath("$.code").value("COMMON_UNAUTHORIZED"));
    }

    @DisplayName("Bearer 접두어가 없으면 401 COMMON_UNAUTHORIZED")
    @Test
    void rejectsNonBearerHeader() throws Exception {
        mockMvc.perform(get("/api/v1/test/current-user").header("Authorization", "42"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("COMMON_UNAUTHORIZED"));
    }

    @DisplayName("목업 토큰 형식이 아니면 401 COMMON_UNAUTHORIZED")
    @Test
    void rejectsNonMockToken() throws Exception {
        mockMvc.perform(get("/api/v1/test/current-user")
                        .header("Authorization", "Bearer eyJhbGciOi..."))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("COMMON_UNAUTHORIZED"));
    }

    @DisplayName("토큰의 userId 부분이 숫자가 아니면 401 COMMON_UNAUTHORIZED")
    @Test
    void rejectsNonNumericUserId() throws Exception {
        mockMvc.perform(get("/api/v1/test/current-user")
                        .header("Authorization", "Bearer mock-access-abc-1234"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("COMMON_UNAUTHORIZED"));
    }
}
