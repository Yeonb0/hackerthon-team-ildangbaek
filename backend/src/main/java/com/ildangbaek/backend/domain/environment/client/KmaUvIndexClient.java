package com.ildangbaek.backend.domain.environment.client;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Slf4j
@Component
public class KmaUvIndexClient {

    private static final String DEFAULT_BASE_URL = "https://apis.data.go.kr/1360000/LivingWthrIdxServiceV5";
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMddHH");

    private final RestClient restClient;
    private final String baseUrl;
    private final String serviceKey;

    public KmaUvIndexClient(
            RestClient.Builder restClientBuilder,
            @Value("${app.weather.kma.uv-base-url:" + DEFAULT_BASE_URL + "}") String baseUrl,
            @Value("${app.weather.kma.service-key:}") String serviceKey
    ) {
        this.restClient = restClientBuilder.build();
        this.baseUrl = trimTrailingSlash(baseUrl);
        this.serviceKey = encodeServiceKey(serviceKey);
    }

    public Optional<BigDecimal> getCurrent(String areaNo, LocalDateTime now) {
        if (serviceKey.isBlank() || areaNo == null || areaNo.isBlank()) {
            return Optional.empty();
        }

        LocalDateTime baseDateTime = latestBaseDateTime(now);
        try {
            KmaUvIndexResponse response = restClient.get()
                    .uri(URI.create(baseUrl + "/getUVIdxV5"
                            + "?serviceKey=" + serviceKey
                            + "&pageNo=1"
                            + "&numOfRows=10"
                            + "&dataType=JSON"
                            + "&areaNo=" + areaNo
                            + "&time=" + baseDateTime.format(TIME_FORMATTER)))
                    .retrieve()
                    .body(KmaUvIndexResponse.class);
            return firstItem(response).flatMap(item -> decimal(item.h0()));
        } catch (RuntimeException exception) {
            log.warn("기상청 자외선지수 조회 실패: areaNo={}", areaNo, exception);
            return Optional.empty();
        }
    }

    private String trimTrailingSlash(String value) {
        if (value == null || value.isBlank()) {
            return DEFAULT_BASE_URL;
        }
        String trimmed = value.trim();
        return trimmed.endsWith("/") ? trimmed.substring(0, trimmed.length() - 1) : trimmed;
    }

    private String encodeServiceKey(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        String trimmed = value.trim();
        return trimmed.contains("%") ? trimmed : URLEncoder.encode(trimmed, StandardCharsets.UTF_8);
    }

    private LocalDateTime latestBaseDateTime(LocalDateTime now) {
        LocalDateTime shifted = now.minusHours(1);
        int hour = shifted.getHour() / 3 * 3;
        return shifted.withHour(hour).withMinute(0).withSecond(0).withNano(0);
    }

    private Optional<KmaUvIndexItem> firstItem(KmaUvIndexResponse response) {
        List<KmaUvIndexItem> items = response == null
                || response.response() == null
                || response.response().body() == null
                || response.response().body().items() == null
                ? List.of()
                : response.response().body().items().item();
        return items == null || items.isEmpty() ? Optional.empty() : Optional.of(items.get(0));
    }

    private Optional<BigDecimal> decimal(String value) {
        if (value == null || value.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.of(new BigDecimal(value).setScale(2, RoundingMode.HALF_UP));
        } catch (NumberFormatException exception) {
            return Optional.empty();
        }
    }

    private record KmaUvIndexResponse(
            KmaUvResponse response
    ) {
    }

    private record KmaUvResponse(
            KmaUvBody body
    ) {
    }

    private record KmaUvBody(
            KmaUvItems items
    ) {
    }

    private record KmaUvItems(
            List<KmaUvIndexItem> item
    ) {
    }

    private record KmaUvIndexItem(
            @JsonProperty("h0") String h0
    ) {
    }
}
