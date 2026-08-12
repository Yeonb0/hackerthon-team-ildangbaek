package com.ildangbaek.backend.api.auth.service;

import com.ildangbaek.backend.domain.user.entity.User;
import com.ildangbaek.backend.domain.user.repository.UserRepository;
import com.ildangbaek.backend.global.auth.MockAccessToken;
import com.ildangbaek.backend.global.exception.BusinessException;
import com.ildangbaek.backend.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CurrentUserResolver {

    private final UserRepository userRepository;

    public User resolve(String authorizationHeader) {
        Long userId = MockAccessToken.parseUserId(authorizationHeader)
                .orElseThrow(() -> new BusinessException(ErrorCode.COMMON_UNAUTHORIZED));
        return userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.AUTH_USER_NOT_FOUND));
    }
}
