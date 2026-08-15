package com.ildangbaek.backend.domain.analysis.client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
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
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

/**
 * 자체 분석 서버 호출부의 응답 파싱 · 에러 매핑을 고정한다.
 *
 * <p>{@link MockRestServiceServer}를 써서 실제 FastAPI 서버 없이 HTTP 계층만 가짜로 세운다.
 */
class LocalVisionSkinAnalysisClientTest {

    private static final LocalDate DATE = LocalDate.of(2026, 8, 13);
    private static final String URL_PREFIX = "/images/";
    private static final String BASE_URL = "http://localhost:8000";

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

    private LocalVisionSkinAnalysisClient client() {
        return new LocalVisionSkinAnalysisClient(
                restClientBuilder,
                BASE_URL,
                tempDir.toString(),
                URL_PREFIX);
    }

    private SkinAnalysisResult analyze() {
        return client().analyze(URL_PREFIX + "a.jpg", 1L, DATE, TimeSlot.MORNING);
    }

    @Test
    @DisplayName("정상 응답의 지표 4종을 그대로 옮긴다")
    void parsesScores() {
        mockServer.expect(requestTo(BASE_URL + "/analyze"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess("""
                        {"scores":{"TROUBLE":81,"REDNESS":62,"PORES":47,"PIGMENTATION":90}}
                        """, MediaType.APPLICATION_JSON));

        SkinAnalysisResult result = analyze();

        assertThat(result.score(SkinMetricType.TROUBLE)).isEqualTo(81);
        assertThat(result.score(SkinMetricType.REDNESS)).isEqualTo(62);
        assertThat(result.score(SkinMetricType.PORES)).isEqualTo(47);
        assertThat(result.score(SkinMetricType.PIGMENTATION)).isEqualTo(90);
        mockServer.verify();
    }

    @Test
    @DisplayName("범위를 벗어난 점수는 0~100으로 자른다")
    void clampsOutOfRangeScores() {
        mockServer.expect(requestTo(BASE_URL + "/analyze"))
                .andRespond(withSuccess("""
                        {"scores":{"TROUBLE":140,"REDNESS":-20,"PORES":50,"PIGMENTATION":50}}
                        """, MediaType.APPLICATION_JSON));

        SkinAnalysisResult result = analyze();

        assertThat(result.score(SkinMetricType.TROUBLE)).isEqualTo(100);
        assertThat(result.score(SkinMetricType.REDNESS)).isZero();
    }

    @Test
    @DisplayName("얼굴 미검출 코드는 SKIN_FACE_NOT_DETECTED로 옮긴다")
    void mapsFaceNotDetected() {
        mockServer.expect(requestTo(BASE_URL + "/analyze"))
                .andRespond(withStatus(HttpStatus.UNPROCESSABLE_ENTITY)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                                {"code":"FACE_NOT_DETECTED","message":"얼굴을 찾지 못했습니다."}
                                """));

        assertThatThrownBy(this::analyze)
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.SKIN_FACE_NOT_DETECTED);
    }

    @Test
    @DisplayName("품질 미달 코드도 재촬영을 유도하도록 SKIN_FACE_NOT_DETECTED로 옮긴다")
    void mapsQualityTooLow() {
        mockServer.expect(requestTo(BASE_URL + "/analyze"))
                .andRespond(withStatus(HttpStatus.UNPROCESSABLE_ENTITY)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                                {"code":"IMAGE_QUALITY_TOO_LOW","message":"사진이 흐립니다."}
                                """));

        assertThatThrownBy(this::analyze)
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.SKIN_FACE_NOT_DETECTED);
    }

    @Test
    @DisplayName("알 수 없는 실패 코드는 SKIN_ANALYSIS_FAILED로 옮긴다")
    void mapsUnknownErrorCode() {
        mockServer.expect(requestTo(BASE_URL + "/analyze"))
                .andRespond(withStatus(HttpStatus.UNPROCESSABLE_ENTITY)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("""
                                {"code":"ANALYSIS_FAILED","message":"실패"}
                                """));

        assertThatThrownBy(this::analyze)
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.SKIN_ANALYSIS_FAILED);
    }

    @Test
    @DisplayName("지표가 누락된 응답은 SKIN_ANALYSIS_FAILED로 처리한다")
    void rejectsMissingMetric() {
        mockServer.expect(requestTo(BASE_URL + "/analyze"))
                .andRespond(withSuccess("""
                        {"scores":{"TROUBLE":50,"REDNESS":50,"PORES":50}}
                        """, MediaType.APPLICATION_JSON));

        assertThatThrownBy(this::analyze)
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.SKIN_ANALYSIS_FAILED);
    }

    @Test
    @DisplayName("서버 오류는 SKIN_ANALYSIS_FAILED로 처리한다")
    void mapsServerError() {
        mockServer.expect(requestTo(BASE_URL + "/analyze"))
                .andRespond(withServerError());

        assertThatThrownBy(this::analyze)
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.SKIN_ANALYSIS_FAILED);
    }

    @Test
    @DisplayName("스토리지 밖을 가리키는 경로는 읽지 않는다")
    void rejectsPathTraversal() {
        assertThatThrownBy(() ->
                client().analyze(URL_PREFIX + "../secret.jpg", 1L, DATE, TimeSlot.MORNING))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.SKIN_ANALYSIS_FAILED);
    }

    @Test
    @DisplayName("분석 수단은 API로 기록한다")
    void reportsApiMethod() {
        assertThat(client().method()).isEqualTo(AnalysisMethod.API);
    }
}
