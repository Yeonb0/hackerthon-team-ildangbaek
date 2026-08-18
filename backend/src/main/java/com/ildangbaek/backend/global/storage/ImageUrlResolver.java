package com.ildangbaek.backend.global.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class ImageUrlResolver {

    private final String publicBaseUrl;

    public ImageUrlResolver(@Value("${app.storage.local.public-base-url:}") String publicBaseUrl) {
        this.publicBaseUrl = normalizeBaseUrl(publicBaseUrl);
    }

    public String resolve(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank() || isAbsoluteUrl(imageUrl) || publicBaseUrl.isBlank()) {
            return imageUrl;
        }
        String path = imageUrl.startsWith("/") ? imageUrl : "/" + imageUrl;
        return publicBaseUrl + path;
    }

    private boolean isAbsoluteUrl(String imageUrl) {
        return imageUrl.startsWith("http://") || imageUrl.startsWith("https://");
    }

    private String normalizeBaseUrl(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        String trimmed = value.trim();
        return trimmed.endsWith("/") ? trimmed.substring(0, trimmed.length() - 1) : trimmed;
    }
}
