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
import java.util.EnumMap;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import tools.jackson.databind.JsonNode;

/**
 * 자체 규칙 기반 비전 서버(FastAPI)로 얼굴 이미지를 분석한다. (ADR 0003의 구현체 중 하나)
 *
 * <p>팀이 직접 운영하는 분석 서버(ai-server)에 이미지를 넘긴다. 얼굴 검출·피부 영역 분리·조명
 * 정규화·CIELAB 규칙 기반 1차 점수 산출을 그 서버가 담당하고, OpenAI Vision을 이용한 최종 점수
 * 확정도 그 서버 내부에서 이루어진다(ADR 0022) — Spring은 OpenAI를 직접 호출하지 않는다.
 *
 * <p>이미지는 {@link com.ildangbaek.backend.global.storage.LocalImageStorage}가 저장한 로컬 파일을
 * 다시 읽어 multipart로 전송한다. 저장 URL(`/images/{file}`)은 상대 경로라 분석 서버가 직접 가져올 수
 * 없기 때문이다.
 *
 * <p>분석 서버는 실패를 본문의 {@code code}로 알려준다. HTTP 상태만으로는 얼굴 미검출과 품질 미달을
 * 구분할 수 없어 코드로 분기한다.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "app.skin.analysis.provider", havingValue = "local-vision")
public class LocalVisionSkinAnalysisClient implements SkinAnalysisClient {

    private final RestClient restClient;
    private final Path storageDirectory;
    private final String urlPrefix;

    public LocalVisionSkinAnalysisClient(
            RestClient.Builder restClientBuilder,
            @Value("${app.skin.analysis.local-vision.base-url}") String baseUrl,
            @Value("${app.storage.local.directory}") String storageDirectory,
            @Value("${app.storage.local.url-prefix}") String urlPrefix) {
        this.restClient = restClientBuilder.baseUrl(baseUrl).build();
        this.storageDirectory = Path.of(storageDirectory).toAbsolutePath().normalize();
        this.urlPrefix = urlPrefix;
    }

    @Override
    public SkinAnalysisResult analyze(String imageUrl, Long userId, LocalDate recordDate, TimeSlot timeSlot) {
        byte[] imageBytes = readImage(imageUrl);
        JsonNode responseBody = callAnalysisServer(imageBytes);
        return parseResult(responseBody);
    }

    /**
     * 규칙 기반 자체 분석은 외부 AI 모델이 아니라 우리가 운영하는 분석 API다. 목업이 아니므로
     * {@code MOCK}과 구분되어야 하고, 외부 VLM({@code AI})과도 구분되어야 해 {@code API}로 기록한다.
     */
    @Override
    public AnalysisMethod method() {
        return AnalysisMethod.API;
    }

    private byte[] readImage(String imageUrl) {
        String filename = imageUrl.startsWith(urlPrefix)
                ? imageUrl.substring(urlPrefix.length())
                : imageUrl;
        Path imagePath = storageDirectory.resolve(filename).normalize();
        if (!imagePath.startsWith(storageDirectory)) {
            log.error("스토리지 밖 경로를 가리키는 이미지 URL: {}", imageUrl);
            throw new BusinessException(ErrorCode.SKIN_ANALYSIS_FAILED);
        }
        try {
            return Files.readAllBytes(imagePath);
        } catch (IOException e) {
            log.error("분석용 이미지 읽기 실패: {}", imagePath, e);
            throw new BusinessException(ErrorCode.SKIN_ANALYSIS_FAILED);
        }
    }

    private JsonNode callAnalysisServer(byte[] imageBytes) {
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("image", asMultipartFile(imageBytes));

        try {
            return restClient.post()
                    .uri("/analyze")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(body)
                    .retrieve()
                    // 422는 분석이 판단한 실패라 예외로 던지지 않고 본문의 code로 분기한다.
                    .onStatus(status -> status.value() == 422, (request, response) -> { })
                    .body(JsonNode.class);
        } catch (RestClientException e) {
            log.error("자체 분석 서버 호출 실패", e);
            if (isTimeout(e)) {
                throw new BusinessException(ErrorCode.SKIN_ANALYSIS_TIMEOUT);
            }
            throw new BusinessException(ErrorCode.SKIN_ANALYSIS_FAILED);
        }
    }

    /**
     * multipart 파트에 파일명을 실어야 FastAPI의 {@code UploadFile}이 파일 파트로 인식한다.
     */
    private Resource asMultipartFile(byte[] imageBytes) {
        return new ByteArrayResource(imageBytes) {
            @Override
            public String getFilename() {
                return "image.jpg";
            }
        };
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
        if (responseBody == null) {
            log.error("자체 분석 서버 응답이 비어 있음");
            throw new BusinessException(ErrorCode.SKIN_ANALYSIS_FAILED);
        }

        JsonNode errorCode = responseBody.get("code");
        if (errorCode != null && errorCode.isString()) {
            throw new BusinessException(toErrorCode(errorCode.asString()));
        }

        JsonNode scoreNode = responseBody.path("scores");
        Map<SkinMetricType, Integer> scores = new EnumMap<>(SkinMetricType.class);
        for (SkinMetricType type : SkinMetricType.values()) {
            JsonNode value = scoreNode.get(type.name());
            if (value == null || !value.isNumber()) {
                log.error("자체 분석 서버 응답에 지표 누락: {} body={}", type, responseBody);
                throw new BusinessException(ErrorCode.SKIN_ANALYSIS_FAILED);
            }
            scores.put(type, clamp(value.asInt()));
        }
        return new SkinAnalysisResult(scores);
    }

    /**
     * 분석 서버의 실패 코드를 서비스 오류 코드로 옮긴다. 품질 미달은 사용자가 다시 찍으면 해결되는
     * 상황이라 얼굴 미검출과 같은 계열(422)로 묶는다.
     */
    private ErrorCode toErrorCode(String code) {
        return switch (code) {
            case "FACE_NOT_DETECTED", "IMAGE_QUALITY_TOO_LOW" -> ErrorCode.SKIN_FACE_NOT_DETECTED;
            default -> ErrorCode.SKIN_ANALYSIS_FAILED;
        };
    }

    private int clamp(int score) {
        return Math.max(0, Math.min(100, score));
    }
}
