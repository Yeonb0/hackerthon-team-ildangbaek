package com.ildangbaek.backend.global.auth;

import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * {@code Authorization: Bearer mock-access-{userId}-{nonce}.{signature}} 형식의 목업 액세스
 * 토큰을 발급·파싱한다. 리프레시 토큰({@code mock-refresh-*})도 같은 방식으로 서명한다.
 *
 * <p><strong>임시 방편이다.</strong> 서버가 알고 있는 {@link MockTokenSigner} 비밀키로 서명한
 * 토큰만 신뢰한다 — 서명이 없거나 다르면(즉 서버가 발급하지 않은 토큰이면) 거절한다. 이것만으로는
 * 만료·폐기 같은 실제 세션 관리가 되지 않으므로 <strong>배포 전에 반드시 실제 인증(JWT 등)으로
 * 교체해야 한다.</strong> {@link CurrentUserIdArgumentResolver}가 이 로직을 쓴다.
 */
@Component
@RequiredArgsConstructor
public class MockAccessToken {

    static final String ACCESS_PREFIX = "mock-access-";
    static final String REFRESH_PREFIX = "mock-refresh-";

    private static final String BEARER_PREFIX = "Bearer ";

    private final MockTokenSigner signer;

    public String issueAccessToken(Long userId) {
        return issue(ACCESS_PREFIX, userId);
    }

    public String issueRefreshToken(Long userId) {
        return issue(REFRESH_PREFIX, userId);
    }

    public Optional<Long> parseUserId(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith(BEARER_PREFIX)) {
            return Optional.empty();
        }
        return parseSignedUserId(authorizationHeader.substring(BEARER_PREFIX.length()), ACCESS_PREFIX);
    }

    public Optional<Long> parseRefreshUserId(String refreshTokenHeader) {
        return parseSignedUserId(refreshTokenHeader, REFRESH_PREFIX);
    }

    private String issue(String prefix, Long userId) {
        String payload = prefix + userId + "-" + UUID.randomUUID();
        return payload + "." + signer.sign(payload);
    }

    private Optional<Long> parseSignedUserId(String token, String expectedPrefix) {
        if (token == null) {
            return Optional.empty();
        }

        int signatureIndex = token.lastIndexOf('.');
        if (signatureIndex < 0) {
            return Optional.empty();
        }

        String payload = token.substring(0, signatureIndex);
        String signature = token.substring(signatureIndex + 1);
        if (!signer.matches(payload, signature)) {
            return Optional.empty();
        }

        if (!payload.startsWith(expectedPrefix)) {
            return Optional.empty();
        }

        String tail = payload.substring(expectedPrefix.length());
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
