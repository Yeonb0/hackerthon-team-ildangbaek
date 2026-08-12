package com.ildangbaek.backend.global.auth;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.ildangbaek.backend.global.config.WebConfig;
import com.ildangbaek.backend.global.exception.GlobalExceptionHandler;
import com.ildangbaek.backend.global.response.ApiResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
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

    @RestController
    static class TestController {
        @GetMapping("/api/v1/test/current-user")
        ApiResponse<Long> currentUser(@CurrentUserId Long userId) {
            return ApiResponse.success(userId);
        }
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
