package com.ildangbaek.backend.domain.location.client;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

@Slf4j
@Component
public class KakaoRegionClient {

    private static final String DEFAULT_BASE_URL = "https://dapi.kakao.com";
    private static final String ADMIN_REGION_TYPE = "H";

    private final RestClient restClient;
    private final String restApiKey;

    public KakaoRegionClient(
            RestClient.Builder restClientBuilder,
            @Value("${app.location.kakao.base-url:" + DEFAULT_BASE_URL + "}") String baseUrl,
            @Value("${app.location.kakao.rest-api-key:}") String restApiKey
    ) {
        this.restClient = restClientBuilder.baseUrl(baseUrl).build();
        this.restApiKey = restApiKey == null ? "" : restApiKey.trim();
    }

    public Optional<String> findDistrict(double latitude, double longitude) {
        if (restApiKey.isBlank()) {
            return Optional.empty();
        }

        try {
            KakaoRegionResponse response = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/v2/local/geo/coord2regioncode.json")
                            .queryParam("x", longitude)
                            .queryParam("y", latitude)
                            .queryParam("input_coord", "WGS84")
                            .build())
                    .header("Authorization", "KakaoAK " + restApiKey)
                    .retrieve()
                    .body(KakaoRegionResponse.class);

            if (response == null || response.documents() == null) {
                return Optional.empty();
            }

            return response.documents().stream()
                    .filter(KakaoRegionDocument::hasDistrict)
                    .min(Comparator.comparing(KakaoRegionDocument::regionTypePriority))
                    .map(KakaoRegionDocument::displayName);
        } catch (RestClientException exception) {
            log.warn("카카오 지역 변환 실패: latitude={}, longitude={}", latitude, longitude, exception);
            return Optional.empty();
        }
    }

    private record KakaoRegionResponse(
            List<KakaoRegionDocument> documents
    ) {
    }

    private record KakaoRegionDocument(
            @JsonProperty("region_type") String regionType,
            @JsonProperty("region_1depth_name") String region1DepthName,
            @JsonProperty("region_2depth_name") String region2DepthName
    ) {

        boolean hasDistrict() {
            return hasText(region1DepthName) && hasText(region2DepthName);
        }

        int regionTypePriority() {
            return ADMIN_REGION_TYPE.equals(regionType) ? 0 : 1;
        }

        String displayName() {
            return region1DepthName.trim() + " " + region2DepthName.trim();
        }

        private boolean hasText(String value) {
            return value != null && !value.isBlank();
        }
    }
}
