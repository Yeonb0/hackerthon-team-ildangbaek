package com.ildangbaek.backend.global.auth;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 컨트롤러 파라미터에 현재 사용자 ID를 주입한다.
 *
 * <pre>
 * public ApiResponse&lt;Foo&gt; create(&#64;CurrentUserId Long userId) { ... }
 * </pre>
 *
 * @see CurrentUserIdArgumentResolver 획득 방식(현재는 임시)
 */
@Documented
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
public @interface CurrentUserId {
}
