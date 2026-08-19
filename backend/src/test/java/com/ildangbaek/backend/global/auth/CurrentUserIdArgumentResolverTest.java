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
import org.springframework.test.context.TestPropertySource;
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
        CurrentUserIdArgumentResolver.class, MockAccessToken.class, MockTokenSigner.class,
        GlobalExceptionHandler.class})
@TestPropertySource(properties = "app.auth.mock-token-secret=test-secret")
class CurrentUserIdArgumentResolverTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MockAccessToken mockAccessToken;

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
                        .header("Authorization", "Bearer " + mockAccessToken.issueAccessToken(42L)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result").value(42));
    }

    @DisplayName("토큰의 사용자가 없으면 404 AUTH_USER_NOT_FOUND")
    @Test
    void rejectsUnknownUser() throws Exception {
        given(userRepository.findById(42L)).willReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/test/current-user-entity")
                        .header("Authorization", "Bearer " + mockAccessToken.issueAccessToken(42L)))
                .andExpect(jsonPath("$.code").value("AUTH_USER_NOT_FOUND"));
    }

    @DisplayName("토큰의 사용자가 탈퇴 상태면 404 AUTH_USER_NOT_FOUND")
    @Test
    void rejectsWithdrawnUser() throws Exception {
        User user = User.builder()
                .provider(AuthProvider.KAKAO).providerUserId("kakao-42").email("u@x.local").build();
        ReflectionTestUtils.setField(user, "id", 42L);
        user.withdraw();
        given(userRepository.findById(42L)).willReturn(Optional.of(user));

        mockMvc.perform(get("/api/v1/test/current-user")
                        .header("Authorization", "Bearer " + mockAccessToken.issueAccessToken(42L)))
                .andExpect(status().isNotFound())
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
        User user = User.builder()
                .provider(AuthProvider.KAKAO).providerUserId("kakao-42").email("u@x.local").build();
        ReflectionTestUtils.setField(user, "id", 42L);
        given(userRepository.findById(42L)).willReturn(Optional.of(user));

        mockMvc.perform(get("/api/v1/test/current-user")
                        .header("Authorization", "Bearer " + mockAccessToken.issueAccessToken(42L)))
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

    @DisplayName("서버가 발급하지 않은(서명 없는) 위조 토큰은 401 COMMON_UNAUTHORIZED — 다른 사용자로 위장 불가")
    @Test
    void rejectsForgedTokenWithoutSignature() throws Exception {
        mockMvc.perform(get("/api/v1/test/current-user")
                        .header("Authorization", "Bearer mock-access-999-forged-uuid"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("COMMON_UNAUTHORIZED"));
    }

    @DisplayName("서명이 다른 비밀키로 만들어졌으면 401 COMMON_UNAUTHORIZED")
    @Test
    void rejectsTokenSignedWithWrongSecret() throws Exception {
        MockTokenSigner otherSigner = new MockTokenSigner("different-secret");
        String payload = "mock-access-999-forged-uuid";
        String forgedToken = payload + "." + otherSigner.sign(payload);

        mockMvc.perform(get("/api/v1/test/current-user")
                        .header("Authorization", "Bearer " + forgedToken))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("COMMON_UNAUTHORIZED"));
    }
}
