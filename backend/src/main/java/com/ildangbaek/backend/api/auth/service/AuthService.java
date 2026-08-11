package com.ildangbaek.backend.api.auth.service;

import com.ildangbaek.backend.api.auth.dto.request.LoginRequest;
import com.ildangbaek.backend.api.auth.dto.response.LoginResponse;
import com.ildangbaek.backend.api.auth.dto.response.RefreshTokenResponse;
import com.ildangbaek.backend.domain.user.entity.User;
import com.ildangbaek.backend.domain.user.repository.UserRepository;
import com.ildangbaek.backend.global.exception.BusinessException;
import com.ildangbaek.backend.global.exception.ErrorCode;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;

    @Transactional
    public LoginResponse login(LoginRequest request) {
        String providerUserId = mockProviderUserId(request);
        User user = userRepository.findByProviderAndProviderUserId(request.provider(), providerUserId)
                .orElse(null);
        boolean isNewUser = user == null;

        if (isNewUser) {
            user = userRepository.save(User.builder()
                    .provider(request.provider())
                    .providerUserId(providerUserId)
                    .email(mockEmail(request, providerUserId))
                    .build());
        }

        return new LoginResponse(
                mockToken("access", user.getId()),
                mockToken("refresh", user.getId()),
                isNewUser,
                user.isOnboardingCompleted(),
                user.isOnboardingCompleted() ? "NONE" : "BASIC_INFO"
        );
    }

    @Transactional(readOnly = true)
    public RefreshTokenResponse refresh(String refreshTokenHeader) {
        Long userId = extractMockRefreshUserId(refreshTokenHeader);
        userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.AUTH_USER_NOT_FOUND));
        return new RefreshTokenResponse(mockToken("access", userId));
    }

    private String mockProviderUserId(LoginRequest request) {
        return request.provider().name().toLowerCase() + "-" + request.oauthAccessToken();
    }

    private String mockEmail(LoginRequest request, String providerUserId) {
        if (request.provider().name().equals("EMAIL")) {
            return request.oauthAccessToken();
        }
        return providerUserId + "@mock.ildangbaek.local";
    }

    private String mockToken(String type, Long userId) {
        return "mock-" + type + "-" + userId + "-" + UUID.randomUUID();
    }

    private Long extractMockRefreshUserId(String refreshTokenHeader) {
        if (refreshTokenHeader == null || !refreshTokenHeader.startsWith("mock-refresh-")) {
            throw new BusinessException(ErrorCode.AUTH_INVALID_TOKEN);
        }

        String tail = refreshTokenHeader.substring("mock-refresh-".length());
        int delimiterIndex = tail.indexOf("-");
        if (delimiterIndex < 0) {
            throw new BusinessException(ErrorCode.AUTH_INVALID_TOKEN);
        }

        try {
            return Long.parseLong(tail.substring(0, delimiterIndex));
        } catch (NumberFormatException exception) {
            throw new BusinessException(ErrorCode.AUTH_INVALID_TOKEN);
        }
    }
}
