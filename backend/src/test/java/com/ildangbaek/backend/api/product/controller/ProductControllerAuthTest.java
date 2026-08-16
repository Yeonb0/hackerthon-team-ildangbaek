package com.ildangbaek.backend.api.product.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.ildangbaek.backend.domain.user.entity.AuthProvider;
import com.ildangbaek.backend.domain.user.entity.User;
import com.ildangbaek.backend.domain.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

/**
 * 컨트롤러가 인증을 메서드 본문이 아니라 @CurrentUserId로 강제하는지 확인한다.
 * 토큰이 없으면 핸들러에 진입하기 전에 401이어야 한다.
 */
@SpringBootTest
@AutoConfigureMockMvc
class ProductControllerAuthTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository userRepository;

    @DisplayName("토큰이 없으면 401 COMMON_UNAUTHORIZED")
    @Test
    void rejectsMissingToken() throws Exception {
        mockMvc.perform(get("/api/v1/products").param("keyword", "세럼"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("COMMON_UNAUTHORIZED"));
    }

    @DisplayName("토큰이 있으면 정상 조회된다")
    @Test
    void acceptsValidToken() throws Exception {
        User user = userRepository.save(User.builder()
                .provider(AuthProvider.KAKAO).providerUserId("kakao-search").email("s@x.local").build());

        mockMvc.perform(get("/api/v1/products").param("keyword", "세럼")
                        .header("Authorization", "Bearer mock-access-" + user.getId() + "-uuid"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isSuccess").value(true));
    }
}
