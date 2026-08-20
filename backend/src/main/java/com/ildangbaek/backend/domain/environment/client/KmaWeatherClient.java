package com.ildangbaek.backend.domain.environment.client;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.ildangbaek.backend.domain.environment.entity.WeatherCondition;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Slf4j
@Component
public class KmaWeatherClient {

    private static final String DEFAULT_BASE_URL = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0";
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.BASIC_ISO_DATE;
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HHmm");

    private final RestClient restClient;
    private final String serviceKey;

    public KmaWeatherClient(
            RestClient.Builder restClientBuilder,
            @Value("${app.weather.kma.base-url:" + DEFAULT_BASE_URL + "}") String baseUrl,
            @Value("${app.weather.kma.service-key:}") String serviceKey
    ) {
        this.restClient = restClientBuilder.baseUrl(baseUrl).build();
        this.serviceKey = serviceKey == null ? "" : serviceKey.trim();
    }

    public Optional<WeatherSnapshot> getCurrent(double latitude, double longitude, LocalDateTime now) {
        if (serviceKey.isBlank()) {
            return Optional.empty();
        }

        Grid grid = Grid.from(latitude, longitude);
        LocalDateTime baseDateTime = now.minusMinutes(40).withMinute(0).withSecond(0).withNano(0);
        try {
            KmaCurrentWeatherResponse response = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/getUltraSrtNcst")
                            .queryParam("serviceKey", serviceKey)
                            .queryParam("pageNo", 1)
                            .queryParam("numOfRows", 1000)
                            .queryParam("dataType", "JSON")
                            .queryParam("base_date", baseDateTime.toLocalDate().format(DATE_FORMATTER))
                            .queryParam("base_time", baseDateTime.toLocalTime().format(TIME_FORMATTER))
                            .queryParam("nx", grid.x())
                            .queryParam("ny", grid.y())
                            .build())
                    .retrieve()
                    .body(KmaCurrentWeatherResponse.class);

            Map<String, String> values = itemValues(response);
            WeatherCondition weatherCondition = toWeatherCondition(values.get("PTY"), values.get("SKY"));
            BigDecimal temperature = decimal(values.get("T1H")).orElse(null);
            BigDecimal humidity = decimal(values.get("REH")).orElse(null);

            if (weatherCondition == null && temperature == null && humidity == null) {
                return Optional.empty();
            }
            return Optional.of(new WeatherSnapshot(weatherCondition, temperature, humidity, baseDateTime));
        } catch (RuntimeException exception) {
            log.warn("기상청 초단기실황 조회 실패: latitude={}, longitude={}", latitude, longitude, exception);
            return Optional.empty();
        }
    }

    private Map<String, String> itemValues(KmaCurrentWeatherResponse response) {
        Map<String, String> values = new HashMap<>();
        List<KmaCurrentWeatherItem> items = response == null
                || response.response() == null
                || response.response().body() == null
                || response.response().body().items() == null
                ? List.of()
                : response.response().body().items().item();
        if (items == null || items.isEmpty()) {
            return values;
        }
        for (KmaCurrentWeatherItem item : items) {
            if (item.category() != null && item.obsrValue() != null) {
                values.put(item.category(), item.obsrValue());
            }
        }
        return values;
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

    private WeatherCondition toWeatherCondition(String precipitationType, String sky) {
        return switch (precipitationType == null ? "0" : precipitationType) {
            case "1", "2", "5", "6" -> WeatherCondition.RAIN;
            case "3", "7" -> WeatherCondition.SNOW;
            default -> toSkyCondition(sky);
        };
    }

    private WeatherCondition toSkyCondition(String sky) {
        return switch (sky == null ? "" : sky) {
            case "1" -> WeatherCondition.SUNNY;
            case "3" -> WeatherCondition.CLOUDY;
            case "4" -> WeatherCondition.OVERCAST;
            default -> null;
        };
    }

    public record WeatherSnapshot(
            WeatherCondition weatherCondition,
            BigDecimal temperature,
            BigDecimal humidity,
            LocalDateTime baseDateTime
    ) {
    }

    private record KmaCurrentWeatherResponse(
            KmaResponse response
    ) {
    }

    private record KmaResponse(
            KmaBody body
    ) {
    }

    private record KmaBody(
            KmaItems items
    ) {
    }

    private record KmaItems(
            List<KmaCurrentWeatherItem> item
    ) {
    }

    private record KmaCurrentWeatherItem(
            String category,
            @JsonProperty("obsrValue") String obsrValue
    ) {
    }

    private record Grid(int x, int y) {

        private static final double RE = 6371.00877;
        private static final double GRID = 5.0;
        private static final double SLAT1 = 30.0;
        private static final double SLAT2 = 60.0;
        private static final double OLON = 126.0;
        private static final double OLAT = 38.0;
        private static final double XO = 43.0;
        private static final double YO = 136.0;

        static Grid from(double latitude, double longitude) {
            double degrad = Math.PI / 180.0;
            double re = RE / GRID;
            double slat1 = SLAT1 * degrad;
            double slat2 = SLAT2 * degrad;
            double olon = OLON * degrad;
            double olat = OLAT * degrad;

            double sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
            sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
            double sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
            sf = Math.pow(sf, sn) * Math.cos(slat1) / sn;
            double ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
            ro = re * sf / Math.pow(ro, sn);

            double ra = Math.tan(Math.PI * 0.25 + latitude * degrad * 0.5);
            ra = re * sf / Math.pow(ra, sn);
            double theta = longitude * degrad - olon;
            if (theta > Math.PI) {
                theta -= 2.0 * Math.PI;
            }
            if (theta < -Math.PI) {
                theta += 2.0 * Math.PI;
            }
            theta *= sn;

            int x = (int) Math.floor(ra * Math.sin(theta) + XO + 0.5);
            int y = (int) Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);
            return new Grid(x, y);
        }
    }
}
