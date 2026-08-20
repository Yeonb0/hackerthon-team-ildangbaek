package com.ildangbaek.backend.api.auth.service;

import com.ildangbaek.backend.api.auth.dto.request.EmailLoginRequest;
import com.ildangbaek.backend.api.auth.dto.request.EmailSignupRequest;
import com.ildangbaek.backend.api.auth.dto.request.EmailVerificationCodeRequest;
import com.ildangbaek.backend.api.auth.dto.request.LoginRequest;
import com.ildangbaek.backend.api.auth.dto.request.SendEmailCodeRequest;
import com.ildangbaek.backend.api.auth.dto.response.EmailVerificationResponse;
import com.ildangbaek.backend.api.auth.dto.response.LoginResponse;
import com.ildangbaek.backend.api.auth.dto.response.RefreshTokenResponse;
import com.ildangbaek.backend.api.auth.dto.response.ResendCooldownResponse;
import com.ildangbaek.backend.api.routine.service.DefaultRoutineService;
import com.ildangbaek.backend.domain.auth.PasswordHasher;
import com.ildangbaek.backend.domain.user.entity.AuthProvider;
import com.ildangbaek.backend.domain.user.entity.User;
import com.ildangbaek.backend.domain.user.repository.UserRepository;
import com.ildangbaek.backend.global.auth.MockAccessToken;
import com.ildangbaek.backend.global.exception.BusinessException;
import com.ildangbaek.backend.global.exception.ErrorCode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final String MOCK_VERIFICATION_CODE = "123456";
    private static final int RESEND_COOLDOWN_SECONDS = 54;
    private static final Duration VERIFICATION_TTL = Duration.ofMinutes(10);

    private final UserRepository userRepository;
    private final MockAccessToken mockAccessToken;
    private final PasswordHasher passwordHasher;
    private final DefaultRoutineService defaultRoutineService;
    private final Map<String, LocalDateTime> codeSentAtByEmail = new ConcurrentHashMap<>();
    private final Map<String, LocalDateTime> verifiedAtByEmail = new ConcurrentHashMap<>();

    @Transactional
    public LoginResponse login(LoginRequest request) {
        if (request.provider() == AuthProvider.EMAIL) {
            throw new BusinessException(ErrorCode.AUTH_UNSUPPORTED_PROVIDER);
        }

        String providerUserId = mockProviderUserId(request);
        User user = findMockLoginUser(request, providerUserId)
                .orElse(null);
        boolean isNewUser = user == null;

        if (isNewUser) {
            user = userRepository.save(User.builder()
                    .provider(request.provider())
                    .providerUserId(providerUserId)
                    .email(mockEmail(providerUserId))
                    .build());
        } else if (!user.isActive()) {
            throw new BusinessException(ErrorCode.AUTH_LOGIN_FAILED);
        }

        defaultRoutineService.ensureDefaultRoutines(user);

        return new LoginResponse(
                mockAccessToken.issueAccessToken(user.getId()),
                mockAccessToken.issueRefreshToken(user.getId()),
                isNewUser,
                user.isOnboardingCompleted(),
                user.isOnboardingCompleted() ? "NONE" : "BASIC_INFO"
        );
    }

    @Transactional
    public LoginResponse emailLogin(EmailLoginRequest request) {
        String email = normalizeEmail(request.email());
        User user = userRepository.findByProviderAndProviderUserId(AuthProvider.EMAIL, email)
                .filter(User::isActive)
                .filter(found -> passwordHasher.matches(request.password(), found.getPasswordHash()))
                .orElseThrow(() -> new BusinessException(ErrorCode.AUTH_LOGIN_FAILED));
        defaultRoutineService.ensureDefaultRoutines(user);
        return loginResponse(user, false);
    }

    public void sendEmailCode(SendEmailCodeRequest request) {
        codeSentAtByEmail.put(normalizeEmail(request.email()), LocalDateTime.now());
    }

    public EmailVerificationResponse verifyEmailCode(EmailVerificationCodeRequest request) {
        String email = normalizeEmail(request.email());
        boolean verified = MOCK_VERIFICATION_CODE.equals(request.code()) && isCodeSent(email);
        if (verified) {
            verifiedAtByEmail.put(email, LocalDateTime.now());
        }
        return new EmailVerificationResponse(verified);
    }

    @Transactional
    public LoginResponse emailSignup(EmailSignupRequest request) {
        String email = normalizeEmail(request.email());
        if (!isVerified(email)) {
            throw new BusinessException(ErrorCode.COMMON_VALIDATION_FAILED);
        }
        resolveExistingEmailSignupBlocker(email);

        User user = User.builder()
                .provider(AuthProvider.EMAIL)
                .providerUserId(email)
                .email(email)
                .build();
        user.updatePasswordHash(passwordHasher.hash(request.password()));
        User saved = userRepository.save(user);
        defaultRoutineService.ensureDefaultRoutines(saved);
        verifiedAtByEmail.remove(email);
        return loginResponse(saved, true);
    }

    public ResendCooldownResponse emailResendCooldown(SendEmailCodeRequest request) {
        String email = normalizeEmail(request.email());
        LocalDateTime sentAt = codeSentAtByEmail.get(email);
        if (sentAt == null) {
            return new ResendCooldownResponse(0);
        }
        long elapsedSeconds = Duration.between(sentAt, LocalDateTime.now()).toSeconds();
        int remainingSeconds = Math.max(0, RESEND_COOLDOWN_SECONDS - (int) elapsedSeconds);
        return new ResendCooldownResponse(remainingSeconds);
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

    private LoginResponse loginResponse(User user, boolean isNewUser) {
        return new LoginResponse(
                mockAccessToken.issueAccessToken(user.getId()),
                mockAccessToken.issueRefreshToken(user.getId()),
                isNewUser,
                user.isOnboardingCompleted(),
                user.isOnboardingCompleted() ? "NONE" : "BASIC_INFO"
        );
    }

    private String mockProviderUserId(LoginRequest request) {
        return request.provider().name().toLowerCase() + "-" + request.oauthAccessToken();
    }

    private Optional<User> findMockLoginUser(LoginRequest request, String providerUserId) {
        return userRepository.findByProviderAndProviderUserId(request.provider(), providerUserId);
    }

    private String mockEmail(String providerUserId) {
        return providerUserId + "@mock.ildangbaek.local";
    }

    private void resolveExistingEmailSignupBlocker(String email) {
        userRepository.findByEmail(email).ifPresent(existing -> {
            if (existing.isActive() && !existing.isLegacyEmailLoginAccount()) {
                throw new BusinessException(ErrorCode.USER_ALREADY_EXISTS);
            }
            existing.withdraw();
            userRepository.saveAndFlush(existing);
        });
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private boolean isCodeSent(String email) {
        LocalDateTime sentAt = codeSentAtByEmail.get(email);
        return sentAt != null && sentAt.plus(VERIFICATION_TTL).isAfter(LocalDateTime.now());
    }

    private boolean isVerified(String email) {
        LocalDateTime verifiedAt = verifiedAtByEmail.get(email);
        return verifiedAt != null && verifiedAt.plus(VERIFICATION_TTL).isAfter(LocalDateTime.now());
    }
}
