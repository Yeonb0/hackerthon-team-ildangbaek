package com.ildangbaek.backend.global.auth;

import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 목업 토큰({@link MockAccessToken})에 HMAC-SHA256 서명을 붙이고 검증한다.
 *
 * <p>실제 JWT/OAuth 교체 전까지, 서버가 발급하지 않은 토큰(클라이언트가 임의로 만든
 * {@code mock-access-{다른userId}-*})을 신뢰하지 않도록 막는 최소 조치다. 서명 비밀키는
 * {@code MOCK_TOKEN_SECRET} 환경변수로 관리하고, 로컬 개발 편의를 위한 기본값만 코드에 둔다.
 */
@Component
public class MockTokenSigner {

    private static final String HMAC_ALGORITHM = "HmacSHA256";

    private final SecretKeySpec key;

    public MockTokenSigner(@Value("${app.auth.mock-token-secret}") String secret) {
        this.key = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM);
    }

    public String sign(String payload) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(key);
            byte[] signature = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(signature);
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new IllegalStateException("HMAC 서명 생성 실패", e);
        }
    }

    public boolean matches(String payload, String signature) {
        if (signature == null || signature.isEmpty()) {
            return false;
        }
        String expected = sign(payload);
        return constantTimeEquals(expected, signature);
    }

    /**
     * 문자열 비교 시간이 불일치 위치에 따라 달라지면 타이밍 사이드채널로 서명을 추측당할 수 있어
     * 길이·내용에 상관없이 항상 같은 시간이 걸리도록 비교한다.
     */
    private boolean constantTimeEquals(String a, String b) {
        if (a.length() != b.length()) {
            return false;
        }
        int diff = 0;
        for (int i = 0; i < a.length(); i++) {
            diff |= a.charAt(i) ^ b.charAt(i);
        }
        return diff == 0;
    }
}
