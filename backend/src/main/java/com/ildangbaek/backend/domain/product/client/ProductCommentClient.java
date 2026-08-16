package com.ildangbaek.backend.domain.product.client;

import com.ildangbaek.backend.domain.analysis.client.LocalVisionSkinAnalysisClient;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import tools.jackson.databind.JsonNode;

/**
 * ai-server(FastAPI)의 {@code POST /product-comments}를 호출해 추천 제품별 AI 코멘트를
 * 배치로 받아온다(ADR 0025).
 *
 * <p>추천 여부·순서는 {@code CheckHomeService}가 이미 규칙 기반으로 정한 뒤이므로, 이 클라이언트는
 * 그 결과를 자연스러운 문구로 다듬는 부가 기능만 담당한다. {@link LocalVisionSkinAnalysisClient}와
 * 달리 호출 실패를 예외로 전파하지 않고 빈 맵으로 흡수한다 — AI 코멘트가 없어도 추천 자체는
 * 정상 응답이어야 하기 때문이다(ADR 0025).
 */
@Slf4j
@Component
public class ProductCommentClient {

    // 분석 서버가 멈추거나 느려져도 요청이 무한정 걸려 있지 않도록 상한을 둔다.
    // LocalVisionSkinAnalysisClient와 같은 값을 쓴다 — 같은 서버(ai-server)를 호출한다.
    private static final int CONNECT_TIMEOUT_MILLIS = 5_000;
    private static final int READ_TIMEOUT_MILLIS = 15_000;

    private final RestClient restClient;

    public ProductCommentClient(
            RestClient.Builder restClientBuilder,
            @Value("${app.skin.analysis.local-vision.base-url}") String baseUrl) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(CONNECT_TIMEOUT_MILLIS);
        requestFactory.setReadTimeout(READ_TIMEOUT_MILLIS);

        this.restClient = restClientBuilder.baseUrl(baseUrl).requestFactory(requestFactory).build();
    }

    /**
     * @return productId → 생성된 코멘트. 호출이 실패했거나 특정 제품의 코멘트를 받지 못했다면
     *     그 제품은 결과 맵에서 빠진다.
     */
    public Map<Long, String> generateComments(List<ProductCommentRequest> products) {
        if (products.isEmpty()) {
            return Map.of();
        }

        try {
            JsonNode response = restClient.post()
                    .uri("/product-comments")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("products", products.stream().map(this::toPayload).toList()))
                    .retrieve()
                    .body(JsonNode.class);
            return parseComments(response);
        } catch (RestClientException e) {
            log.warn("제품 AI 코멘트 생성 실패, 코멘트 없이 진행", e);
            return Map.of();
        }
    }

    private Map<String, Object> toPayload(ProductCommentRequest request) {
        return Map.of(
                "product_id", request.productId(),
                "name", request.name(),
                "brand", request.brand(),
                "matched_ingredients", request.matchedIngredients(),
                "category", request.category());
    }

    private Map<Long, String> parseComments(JsonNode response) {
        if (response == null || !response.has("comments")) {
            return Map.of();
        }
        return response.get("comments").valueStream()
                .collect(Collectors.toMap(
                        node -> node.get("product_id").asLong(),
                        node -> node.get("comment").asString()));
    }

    public record ProductCommentRequest(
            Long productId,
            String name,
            String brand,
            List<String> matchedIngredients,
            String category
    ) {
    }
}
