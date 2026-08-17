package com.ildangbaek.backend.api.auth.service;

import com.ildangbaek.backend.api.auth.dto.request.LoginRequest;
import com.ildangbaek.backend.api.auth.dto.response.LoginResponse;
import com.ildangbaek.backend.api.auth.dto.response.RefreshTokenResponse;
import com.ildangbaek.backend.domain.user.entity.User;
import com.ildangbaek.backend.domain.user.repository.UserRepository;
import com.ildangbaek.backend.global.auth.MockAccessToken;
import com.ildangbaek.backend.global.exception.BusinessException;
import com.ildangbaek.backend.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final MockAccessToken mockAccessToken;

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
        } else if (!user.isActive()) {
            throw new BusinessException(ErrorCode.AUTH_LOGIN_FAILED);
        }

        return new LoginResponse(
                mockAccessToken.issueAccessToken(user.getId()),
                mockAccessToken.issueRefreshToken(user.getId()),
                isNewUser,
                user.isOnboardingCompleted(),
                user.isOnboardingCompleted() ? "NONE" : "BASIC_INFO"
        );
    }

    @Transactional(readOnly = true)
    public RefreshTokenResponse refresh(String refreshTokenHeader) {
        Long userId = mockAccessToken.parseRefreshUserId(refreshTokenHeader)
                .orElseThrow(() -> new BusinessException(ErrorCode.AUTH_INVALID_TOKEN));
        userRepository.findById(userId)
                .filter(User::isActive)
                .orElseThrow(() -> new BusinessException(ErrorCode.AUTH_USER_NOT_FOUND));
        return new RefreshTokenResponse(mockAccessToken.issueAccessToken(userId));
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
}
