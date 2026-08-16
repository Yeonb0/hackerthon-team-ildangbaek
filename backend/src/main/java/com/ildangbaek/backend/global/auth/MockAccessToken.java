package com.ildangbaek.backend.global.auth;

import java.util.Optional;

/**
 * {@code Authorization: Bearer mock-access-{userId}-{uuid}} 형식의 목업 토큰을 파싱한다.
 *
 * <p><strong>임시 방편이다.</strong> 서명 검증이 없어 위조할 수 있으므로
 * <strong>배포 전에 반드시 실제 인증(JWT 등)으로 교체해야 한다.</strong>
 * {@link CurrentUserIdArgumentResolver}가 이 로직을 쓴다.
 */
public final class MockAccessToken {

    private static final String BEARER_PREFIX = "Bearer ";
    private static final String ACCESS_PREFIX = "mock-access-";

    private MockAccessToken() {
    }

    public static Optional<Long> parseUserId(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith(BEARER_PREFIX)) {
            return Optional.empty();
        }

        String token = authorizationHeader.substring(BEARER_PREFIX.length());
        if (!token.startsWith(ACCESS_PREFIX)) {
            return Optional.empty();
        }

        String tail = token.substring(ACCESS_PREFIX.length());
        int delimiterIndex = tail.indexOf("-");
        if (delimiterIndex < 0) {
            return Optional.empty();
        }

        try {
            return Optional.of(Long.parseLong(tail.substring(0, delimiterIndex)));
        } catch (NumberFormatException e) {
            return Optional.empty();
        }
    }
}
