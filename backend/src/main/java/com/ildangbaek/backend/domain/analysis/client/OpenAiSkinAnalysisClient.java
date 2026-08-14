package com.ildangbaek.backend.domain.analysis.client;

import com.ildangbaek.backend.domain.record.entity.AnalysisMethod;
import com.ildangbaek.backend.domain.record.entity.SkinMetricType;
import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import com.ildangbaek.backend.global.exception.BusinessException;
import com.ildangbaek.backend.global.exception.ErrorCode;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.util.Base64;
import java.util.EnumMap;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * OpenAI Vision(gpt-4o 계열)으로 얼굴 이미지를 분석해 피부 지표 점수를 산출한다. (ADR 0003의 실연동 구현체)
 *
 * <p>이미지 URL은 {@link com.ildangbaek.backend.global.storage.LocalImageStorage}가 반환하는
 * 상대 경로(`/images/{file}`)라 OpenAI가 직접 가져올 수 없다. 그래서 URL의 파일명만 뽑아
 * 로컬 저장 디렉터리에서 파일을 다시 읽고 base64로 인코딩해 요청 본문에 싣는다.
 *
 * <p>프롬프트는 지표 4종(ADR 0002) 각각 0~100 점수만 담은 JSON을 요구한다. 응답 파싱에
 * 실패하거나 지표가 누락되면 {@code SKIN_ANALYSIS_FAILED}로, 얼굴을 인식하지 못했다는 응답이면
 * {@code SKIN_FACE_NOT_DETECTED}로, HTTP 타임아웃이면 {@code SKIN_ANALYSIS_TIMEOUT}으로 매핑한다.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "app.skin.analysis.provider", havingValue = "openai")
public class OpenAiSkinAnalysisClient implements SkinAnalysisClient {

    private static final String MODEL = "gpt-4o";
    private static final String SYSTEM_PROMPT = """
            너는 피부과 전문의를 보조하는 피부 분석 AI다. 얼굴 사진을 보고 아래 4개 지표를 각각
            0~100 점수로 평가해라. 점수가 높을수록 해당 항목이 좋은 상태(트러블/홍조/모공/색소잡티가
            적음)를 뜻한다.

            - TROUBLE: 트러블(여드름·뾰루지) 상태
            - REDNESS: 홍조 상태
            - PORES: 모공 상태
            - PIGMENTATION: 색소침착·잡티 상태

            반드시 아래 JSON 형식으로만 답해라. 다른 텍스트를 덧붙이지 마라.
            {"TROUBLE": 0-100, "REDNESS": 0-100, "PORES": 0-100, "PIGMENTATION": 0-100}

            사진에서 사람 얼굴을 찾을 수 없으면 다음 JSON만 반환해라.
            {"error": "FACE_NOT_DETECTED"}
            """;

    private final RestClient restClient;
    private final ObjectMapper objectMapper;
    private final Path storageDirectory;
    private final String urlPrefix;

    public OpenAiSkinAnalysisClient(
            RestClient.Builder restClientBuilder,
            ObjectMapper objectMapper,
            @Value("${app.skin.analysis.openai.api-key}") String apiKey,
            @Value("${app.skin.analysis.openai.base-url:https://api.openai.com/v1}") String baseUrl,
            @Value("${app.storage.local.directory}") String storageDirectory,
            @Value("${app.storage.local.url-prefix}") String urlPrefix) {
        this.objectMapper = objectMapper;
        this.restClient = restClientBuilder
                .baseUrl(baseUrl)
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .build();
        this.storageDirectory = Path.of(storageDirectory).toAbsolutePath().normalize();
        this.urlPrefix = urlPrefix;
    }

    @Override
    public SkinAnalysisResult analyze(String imageUrl, Long userId, LocalDate recordDate, TimeSlot timeSlot) {
        String base64Image = readImageAsBase64(imageUrl);
        JsonNode responseBody = callOpenAi(base64Image);
        return parseResult(responseBody);
    }

    @Override
    public AnalysisMethod method() {
        return AnalysisMethod.AI;
    }

    private String readImageAsBase64(String imageUrl) {
        String filename = imageUrl.startsWith(urlPrefix)
                ? imageUrl.substring(urlPrefix.length())
                : imageUrl;
        Path imagePath = storageDirectory.resolve(filename).normalize();
        if (!imagePath.startsWith(storageDirectory)) {
            throw new BusinessException(ErrorCode.SKIN_ANALYSIS_FAILED);
        }
        try {
            byte[] bytes = Files.readAllBytes(imagePath);
            return Base64.getEncoder().encodeToString(bytes);
        } catch (IOException e) {
            log.error("분석용 이미지 읽기 실패: {}", imagePath, e);
            throw new BusinessException(ErrorCode.SKIN_ANALYSIS_FAILED);
        }
    }

    private JsonNode callOpenAi(String base64Image) {
        Map<String, Object> requestBody = Map.of(
                "model", MODEL,
                "messages", new Object[] {
                        Map.of("role", "system", "content", SYSTEM_PROMPT),
                        Map.of("role", "user", "content", new Object[] {
                                Map.of(
                                        "type", "image_url",
                                        "image_url", Map.of("url", "data:image/jpeg;base64," + base64Image))
                        })
                },
                "response_format", Map.of("type", "json_object"));

        try {
            return restClient.post()
                    .uri("/chat/completions")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(JsonNode.class);
        } catch (RestClientException e) {
            log.error("OpenAI 피부 분석 호출 실패", e);
            if (isTimeout(e)) {
                throw new BusinessException(ErrorCode.SKIN_ANALYSIS_TIMEOUT);
            }
            throw new BusinessException(ErrorCode.SKIN_ANALYSIS_FAILED);
        }
    }

    private boolean isTimeout(Throwable e) {
        Throwable cause = e;
        while (cause != null) {
            if (cause instanceof java.net.SocketTimeoutException) {
                return true;
            }
            cause = cause.getCause();
        }
        return false;
    }

    private SkinAnalysisResult parseResult(JsonNode responseBody) {
        String content = extractContent(responseBody);
        JsonNode scoreNode = parseJsonContent(content);

        if (scoreNode.has("error")) {
            throw new BusinessException(ErrorCode.SKIN_FACE_NOT_DETECTED);
        }

        Map<SkinMetricType, Integer> scores = new EnumMap<>(SkinMetricType.class);
        for (SkinMetricType type : SkinMetricType.values()) {
            JsonNode value = scoreNode.get(type.name());
            if (value == null || !value.isNumber()) {
                log.error("OpenAI 응답에 지표 누락: {} body={}", type, content);
                throw new BusinessException(ErrorCode.SKIN_ANALYSIS_FAILED);
            }
            scores.put(type, clamp(value.asInt()));
        }
        return new SkinAnalysisResult(scores);
    }

    private String extractContent(JsonNode responseBody) {
        JsonNode content = responseBody == null ? null
                : responseBody.path("choices").path(0).path("message").path("content");
        if (content == null || content.isMissingNode() || !content.isString()) {
            log.error("OpenAI 응답 형식이 예상과 다름: {}", responseBody);
            throw new BusinessException(ErrorCode.SKIN_ANALYSIS_FAILED);
        }
        return content.asString();
    }

    private JsonNode parseJsonContent(String content) {
        try {
            return objectMapper.readTree(content);
        } catch (JacksonException e) {
            log.error("OpenAI 응답 JSON 파싱 실패: {}", content, e);
            throw new BusinessException(ErrorCode.SKIN_ANALYSIS_FAILED);
        }
    }

    private int clamp(int score) {
        return Math.max(0, Math.min(100, score));
    }
}
