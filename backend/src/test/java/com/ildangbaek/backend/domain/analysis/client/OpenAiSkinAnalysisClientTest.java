package com.ildangbaek.backend.domain.analysis.client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.ildangbaek.backend.domain.record.entity.AnalysisMethod;
import com.ildangbaek.backend.domain.record.entity.SkinMetricType;
import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import com.ildangbaek.backend.global.exception.BusinessException;
import com.ildangbaek.backend.global.exception.ErrorCode;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import tools.jackson.databind.json.JsonMapper;

/**
 * OpenAI Vision 호출부의 요청 조립 · 응답 파싱 · 에러 매핑을 고정한다.
 *
 * <p>실제 네트워크 호출 없이 {@link MockRestServiceServer}로 HTTP 계층만 가짜로 세운다.
 * 이미지 파일은 임시 디렉터리에 두고 {@code app.storage.local.directory}로 넘긴다 —
 * 저장된 URL(`/images/{file}`)에서 파일명을 뽑아 그 디렉터리에서 다시 읽는 실제 경로를 그대로 태운다.
 */
class OpenAiSkinAnalysisClientTest {

    private static final LocalDate DATE = LocalDate.of(2026, 8, 13);
    private static final String URL_PREFIX = "/images/";

    @TempDir
    Path tempDir;

    private RestClient.Builder restClientBuilder;
    private MockRestServiceServer mockServer;

    @BeforeEach
    void setUp() throws IOException {
        Files.writeString(tempDir.resolve("a.jpg"), "fake-image-bytes");

        restClientBuilder = RestClient.builder();
        mockServer = MockRestServiceServer.bindTo(restClientBuilder).build();
    }

    private OpenAiSkinAnalysisClient client() {
        return new OpenAiSkinAnalysisClient(
                restClientBuilder,
                new JsonMapper(),
                "test-api-key",
                "https://api.openai.com/v1",
                tempDir.toString(),
                URL_PREFIX);
    }

    @DisplayName("정상 응답이면 지표 4종 점수를 그대로 담는다")
    @Test
    void parsesAllMetrics() {
        mockServer.expect(requestTo("https://api.openai.com/v1/chat/completions"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(openAiResponse(
                        "{\"TROUBLE\": 70, \"REDNESS\": 80, \"PORES\": 60, \"PIGMENTATION\": 90}"),
                        MediaType.APPLICATION_JSON));

        SkinAnalysisResult result = client().analyze(URL_PREFIX + "a.jpg", 1L, DATE, TimeSlot.MORNING);

        assertThat(result.scores())
                .containsEntry(SkinMetricType.TROUBLE, 70)
                .containsEntry(SkinMetricType.REDNESS, 80)
                .containsEntry(SkinMetricType.PORES, 60)
                .containsEntry(SkinMetricType.PIGMENTATION, 90);
    }

    @DisplayName("얼굴 미검출 응답이면 SKIN_FACE_NOT_DETECTED를 던진다")
    @Test
    void mapsFaceNotDetected() {
        mockServer.expect(requestTo("https://api.openai.com/v1/chat/completions"))
                .andRespond(withSuccess(openAiResponse("{\"error\": \"FACE_NOT_DETECTED\"}"),
                        MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> client().analyze(URL_PREFIX + "a.jpg", 1L, DATE, TimeSlot.MORNING))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.SKIN_FACE_NOT_DETECTED);
    }

    @DisplayName("지표가 누락된 JSON이면 SKIN_ANALYSIS_FAILED를 던진다")
    @Test
    void mapsMissingMetric() {
        mockServer.expect(requestTo("https://api.openai.com/v1/chat/completions"))
                .andRespond(withSuccess(openAiResponse("{\"TROUBLE\": 70}"), MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> client().analyze(URL_PREFIX + "a.jpg", 1L, DATE, TimeSlot.MORNING))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.SKIN_ANALYSIS_FAILED);
    }

    @DisplayName("content가 JSON으로 파싱되지 않으면 SKIN_ANALYSIS_FAILED를 던진다")
    @Test
    void mapsUnparsableContent() {
        mockServer.expect(requestTo("https://api.openai.com/v1/chat/completions"))
                .andRespond(withSuccess(openAiResponse("이건 JSON이 아니다"), MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> client().analyze(URL_PREFIX + "a.jpg", 1L, DATE, TimeSlot.MORNING))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.SKIN_ANALYSIS_FAILED);
    }

    @DisplayName("0~100 범위를 벗어난 점수는 경계로 잘린다")
    @Test
    void clampsOutOfRangeScores() {
        mockServer.expect(requestTo("https://api.openai.com/v1/chat/completions"))
                .andRespond(withSuccess(openAiResponse(
                        "{\"TROUBLE\": -5, \"REDNESS\": 150, \"PORES\": 50, \"PIGMENTATION\": 50}"),
                        MediaType.APPLICATION_JSON));

        SkinAnalysisResult result = client().analyze(URL_PREFIX + "a.jpg", 1L, DATE, TimeSlot.MORNING);

        assertThat(result.scores())
                .containsEntry(SkinMetricType.TROUBLE, 0)
                .containsEntry(SkinMetricType.REDNESS, 100);
    }

    @DisplayName("HTTP 호출이 실패하면 SKIN_ANALYSIS_FAILED를 던진다")
    @Test
    void mapsHttpFailure() {
        mockServer.expect(requestTo("https://api.openai.com/v1/chat/completions"))
                .andRespond(withServerError());

        assertThatThrownBy(() -> client().analyze(URL_PREFIX + "a.jpg", 1L, DATE, TimeSlot.MORNING))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.SKIN_ANALYSIS_FAILED);
    }

    @DisplayName("저장 디렉터리를 벗어난 파일명은 거부한다")
    @Test
    void rejectsPathTraversal() {
        assertThatThrownBy(() -> client().analyze(URL_PREFIX + "../../etc/passwd", 1L, DATE, TimeSlot.MORNING))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.SKIN_ANALYSIS_FAILED);
    }

    @DisplayName("분석 수단은 AI로 기록된다")
    @Test
    void reportsAiMethod() {
        assertThat(client().method()).isEqualTo(AnalysisMethod.AI);
    }

    private String openAiResponse(String contentJson) {
        String escaped = contentJson.replace("\\", "\\\\").replace("\"", "\\\"");
        return """
                {"choices": [{"message": {"content": "%s"}}]}
                """.formatted(escaped);
    }
}
