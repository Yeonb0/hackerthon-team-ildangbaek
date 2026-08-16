package com.ildangbaek.backend.global.auth;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 컨트롤러 파라미터에 현재 사용자를 주입한다. {@code Long}이면 사용자 ID를,
 * {@code User}면 조회한 엔티티를 넣는다.
 *
 * <pre>
 * public ApiResponse&lt;Foo&gt; create(&#64;CurrentUserId Long userId) { ... }
 * public ApiResponse&lt;Foo&gt; create(&#64;CurrentUserId User user) { ... }
 * </pre>
 *
 * <p>엔티티가 필요해도 컨트롤러 본문에서 인증을 직접 부르지 않는다 — 그 형태는 한 줄만
 * 빠뜨리면 인증 없이 뚫린다.
 *
 * @see CurrentUserIdArgumentResolver 획득 방식(현재는 임시)
 */
@Documented
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
public @interface CurrentUserId {
}
