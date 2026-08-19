package com.ildangbaek.backend.global.config;

import com.ildangbaek.backend.global.auth.CurrentUserIdArgumentResolver;
import java.nio.file.Path;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * 개발 단계에서 Expo(React Native) 프론트가 어느 오리진에서든 API를 호출할 수 있도록 허용한다.
 * 배포 전 allowedOriginPatterns를 실제 프론트 도메인으로 좁혀야 한다.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    private final CurrentUserIdArgumentResolver currentUserIdArgumentResolver;
    private final Path localImageDirectory;
    private final String localImageUrlPrefix;

    public WebConfig(
            CurrentUserIdArgumentResolver currentUserIdArgumentResolver,
            @Value("${app.storage.local.directory}") String localImageDirectory,
            @Value("${app.storage.local.url-prefix}") String localImageUrlPrefix) {
        this.currentUserIdArgumentResolver = currentUserIdArgumentResolver;
        this.localImageDirectory = Path.of(localImageDirectory).toAbsolutePath().normalize();
        this.localImageUrlPrefix = localImageUrlPrefix;
    }

    @Override
    public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvers) {
        resolvers.add(currentUserIdArgumentResolver);
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOriginPatterns("*")
                .allowedMethods("GET", "POST", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler(resourcePattern())
                .addResourceLocations(localImageDirectory.toUri().toString());
    }

    private String resourcePattern() {
        String prefix = localImageUrlPrefix.startsWith("/") ? localImageUrlPrefix : "/" + localImageUrlPrefix;
        prefix = prefix.endsWith("/") ? prefix : prefix + "/";
        return prefix + "**";
    }
}
