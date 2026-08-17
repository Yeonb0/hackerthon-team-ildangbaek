package com.ildangbaek.backend.domain.analysis.client;

import com.ildangbaek.backend.domain.product.client.ProductCommentClient;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import tools.jackson.databind.JsonNode;

/**
 * ai-server(FastAPI)의 {@code POST /insight-tips}를 호출해 요인 상세(REPORT-02)의 관리 팁을
 * 받아온다(ADR 0028).
 *
 * <p>패턴 판정·수치는 {@code ReportService}가 저장된 분석 결과에서 이미 확정한 뒤이므로, 이
 * 클라이언트는 그 근거를 조언 문장으로 옮기는 부가 기능만 담당한다. {@link ProductCommentClient}와
 * 같이 호출 실패를 예외로 전파하지 않고 빈 값으로 흡수한다 — 팁이 없어도 상세 조회 자체는 정상
 * 응답이어야 하기 때문이다.
 */
@Slf4j
@Component
public class InsightTipClient {

    // ProductCommentClient와 같은 값을 쓴다 — 같은 서버(ai-server)를 호출한다.
    private static final int CONNECT_TIMEOUT_MILLIS = 5_000;
    private static final int READ_TIMEOUT_MILLIS = 15_000;

    private final RestClient restClient;

    public InsightTipClient(
            RestClient.Builder restClientBuilder,
            @Value("${app.skin.analysis.local-vision.base-url}") String baseUrl) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(CONNECT_TIMEOUT_MILLIS);
        requestFactory.setReadTimeout(READ_TIMEOUT_MILLIS);

        this.restClient = restClientBuilder.baseUrl(baseUrl).requestFactory(requestFactory).build();
    }

    /** @return 생성된 관리 팁. 호출이 실패했거나 응답에 팁이 없으면 empty. */
    public Optional<String> generateTip(InsightTipRequest request) {
        try {
            JsonNode response = restClient.post()
                    .uri("/insight-tips")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(toPayload(request))
                    .retrieve()
                    .body(JsonNode.class);
            if (response == null || !response.has("tip")) {
                return Optional.empty();
            }
            return Optional.of(response.get("tip").asString());
        } catch (RestClientException e) {
            log.warn("인사이트 관리 팁 생성 실패, 팁 없이 진행", e);
            return Optional.empty();
        }
    }

    /** nullable 필드가 있어 {@code Map.of()}를 쓸 수 없다 — {@code null} 값을 허용하지 않는다. */
    private Map<String, Object> toPayload(InsightTipRequest request) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("title", request.title());
        payload.put("metric", request.metric());
        payload.put("summary", request.summary());
        payload.put("confidence", request.confidence());
        payload.put("lag_days", request.lagDays());
        payload.put("average_delta", request.averageDelta());
        return payload;
    }

    public record InsightTipRequest(
            String title,
            String metric,
            String summary,
            String confidence,
            Integer lagDays,
            BigDecimal averageDelta
    ) {
    }
}
