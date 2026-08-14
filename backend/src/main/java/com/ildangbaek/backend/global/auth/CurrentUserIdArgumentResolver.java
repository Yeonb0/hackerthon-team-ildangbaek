package com.ildangbaek.backend.global.auth;

import com.ildangbaek.backend.global.exception.BusinessException;
import com.ildangbaek.backend.global.exception.ErrorCode;
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
 * {@code Authorization: Bearer mock-access-{userId}-{uuid}} 형식의 목업 토큰을 그대로
 * 신뢰한다({@link MockAccessToken}). 서명 검증이 없어 위조할 수 있으므로
 * <strong>배포 전에 반드시 교체해야 한다.</strong>
 *
 * <p>사용자 ID 획득 지점을 이 한 곳에 가둬 두는 것이 목적이다. 인증이 붙으면
 * 이 클래스 내부만 토큰 검증으로 바꾸면 되고, 컨트롤러와 서비스는 건드리지 않는다.
 * (ADR 0006) AUTH-01 로그인이 발급하는 토큰과 같은 형식이라, 로그인 → 나머지 API 호출이
 * 하나의 토큰으로 이어진다.
 */
@Component
public class CurrentUserIdArgumentResolver implements HandlerMethodArgumentResolver {

    static final String AUTHORIZATION_HEADER = "Authorization";

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.hasParameterAnnotation(CurrentUserId.class)
                && Long.class.isAssignableFrom(parameter.getParameterType());
    }

    @Override
    public Long resolveArgument(MethodParameter parameter, ModelAndViewContainer mavContainer,
                                NativeWebRequest webRequest, WebDataBinderFactory binderFactory) {
        String header = webRequest.getHeader(AUTHORIZATION_HEADER);
        return MockAccessToken.parseUserId(header)
                .orElseThrow(() -> new BusinessException(ErrorCode.COMMON_UNAUTHORIZED));
    }
}
