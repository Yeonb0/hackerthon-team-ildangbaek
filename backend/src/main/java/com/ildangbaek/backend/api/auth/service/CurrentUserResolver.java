package com.ildangbaek.backend.api.auth.service;

import com.ildangbaek.backend.domain.user.entity.User;
import com.ildangbaek.backend.domain.user.repository.UserRepository;
import com.ildangbaek.backend.global.exception.BusinessException;
import com.ildangbaek.backend.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CurrentUserResolver {

    private static final String BEARER_PREFIX = "Bearer ";
    private static final String MOCK_ACCESS_PREFIX = "mock-access-";

    private final UserRepository userRepository;

    public User resolve(String authorizationHeader) {
        Long userId = extractUserId(authorizationHeader);
        return userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.AUTH_USER_NOT_FOUND));
    }

    private Long extractUserId(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith(BEARER_PREFIX)) {
            throw new BusinessException(ErrorCode.COMMON_UNAUTHORIZED);
        }

        String token = authorizationHeader.substring(BEARER_PREFIX.length());
        if (!token.startsWith(MOCK_ACCESS_PREFIX)) {
            throw new BusinessException(ErrorCode.AUTH_INVALID_TOKEN);
        }

        String tail = token.substring(MOCK_ACCESS_PREFIX.length());
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
