package com.ildangbaek.backend.global.auth;

import com.ildangbaek.backend.domain.user.entity.User;
import com.ildangbaek.backend.domain.user.repository.UserRepository;
import com.ildangbaek.backend.global.exception.BusinessException;
import com.ildangbaek.backend.global.exception.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.core.MethodParameter;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

/**
 * {@link CurrentUserId} 파라미터에 현재 사용자 ID를 주입한다.
 *
 * <p><strong>임시 방편이다.</strong> 실제 인증(JWT · Spring Security)이 아직 없어
 * {@code Authorization: Bearer mock-access-{userId}-{nonce}.{signature}} 형식의 목업
 * 토큰을 쓴다({@link MockAccessToken}). 서버가 발급한 서명이 있는 토큰만 신뢰하지만
 * 만료·폐기 같은 실제 세션 관리는 없으므로 <strong>배포 전에 반드시 교체해야 한다.</strong>
 *
 * <p>사용자 ID 획득 지점을 이 한 곳에 가둬 두는 것이 목적이다. 인증이 붙으면
 * 이 클래스 내부만 토큰 검증으로 바꾸면 되고, 컨트롤러와 서비스는 건드리지 않는다.
 * (ADR 0006) AUTH-01 로그인이 발급하는 토큰과 같은 형식이라, 로그인 → 나머지 API 호출이
 * 하나의 토큰으로 이어진다.
 */
@Component
@RequiredArgsConstructor
public class CurrentUserIdArgumentResolver implements HandlerMethodArgumentResolver {

    static final String AUTHORIZATION_HEADER = "Authorization";

    private final UserRepository userRepository;
    private final MockAccessToken mockAccessToken;

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        if (!parameter.hasParameterAnnotation(CurrentUserId.class)) {
            return false;
        }
        Class<?> type = parameter.getParameterType();
        return Long.class.isAssignableFrom(type) || User.class.isAssignableFrom(type);
    }

    /**
     * {@code Long}이면 활성 사용자 ID를, {@code User}면 조회한 활성 엔티티를 넣는다.
     * 엔티티가 필요한 컨트롤러도 인증을 메서드 본문에서 직접 부르지 않게 하려는 것이다 —
     * 한 줄을 빠뜨리면 인증 없이 뚫리는 형태를 남기지 않는다.
     */
    @Override
    public Object resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
                                  NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
        String header = webRequest.getHeader(AUTHORIZATION_HEADER);
        Long userId = mockAccessToken.parseUserId(header)
                .orElseThrow(() -> new BusinessException(ErrorCode.COMMON_UNAUTHORIZED));

        User user = userRepository.findById(userId)
                .filter(User::isActive)
                .orElseThrow(() -> new BusinessException(ErrorCode.AUTH_USER_NOT_FOUND));

        if (Long.class.isAssignableFrom(parameter.getParameterType())) {
            return user.getId();
        }
        return user;
    }
}
