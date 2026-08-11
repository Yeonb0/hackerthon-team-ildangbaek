package com.ildangbaek.backend.api.skin.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ildangbaek.backend.api.skin.dto.SkinRecordResponse;
import com.ildangbaek.backend.domain.analysis.client.MockSkinAnalysisClient;
import com.ildangbaek.backend.domain.analysis.client.SkinAnalysisResult;
import com.ildangbaek.backend.domain.record.entity.AnalysisMethod;
import com.ildangbaek.backend.domain.record.entity.SkinMetric;
import com.ildangbaek.backend.domain.record.entity.SkinMetricType;
import com.ildangbaek.backend.domain.record.entity.SkinRecord;
import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import com.ildangbaek.backend.domain.record.repository.SkinMetricRepository;
import com.ildangbaek.backend.domain.record.repository.SkinRecordRepository;
import com.ildangbaek.backend.domain.user.entity.AuthProvider;
import com.ildangbaek.backend.domain.user.entity.User;
import com.ildangbaek.backend.domain.user.repository.UserRepository;
import com.ildangbaek.backend.global.exception.BusinessException;
import com.ildangbaek.backend.global.exception.ErrorCode;
import com.ildangbaek.backend.global.storage.ImageStorage;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * SKIN-01의 업무 규칙을 고정한다 — 슬롯 중복 · 같은 시간대 비교 · 종합 점수 · 이미지 검증.
 * DB 없이 돌도록 리포지토리는 목으로 둔다.
 */
@ExtendWith(MockitoExtension.class)
class SkinRecordServiceTest {

    @Mock
    private SkinRecordRepository skinRecordRepository;
    @Mock
    private SkinMetricRepository skinMetricRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private ImageStorage imageStorage;
    @Mock
    private SkinRecordWriter skinRecordWriter;
    @Mock
    private IngredientProfileUpdater ingredientProfileUpdater;

    private SkinRecordService service;

    private final MockSkinAnalysisClient analysisClient = new MockSkinAnalysisClient("");

    private MockMultipartFile image;
    private User user;

    @BeforeEach
    void setUp() {
        service = new SkinRecordService(skinRecordRepository, skinMetricRepository, userRepository,
                imageStorage, analysisClient, skinRecordWriter, ingredientProfileUpdater);
        image = new MockMultipartFile("image", "face.jpg", "image/jpeg", "content".getBytes());
        user = User.builder().provider(AuthProvider.KAKAO).providerUserId("u1").build();
    }

    private SkinRecord savedRecord(Long id, LocalDate date, TimeSlot slot, int totalScore) {
        SkinRecord record = SkinRecord.builder()
                .user(user)
                .recordDate(date)
                .timeSlot(slot)
                .imageUrl("/images/x.jpg")
                .analysisMethod(AnalysisMethod.MOCK)
                .capturedAt(LocalDateTime.of(2026, 8, 8, 8, 30))
                .build();
        record.completeAnalysis(BigDecimal.valueOf(totalScore));
        ReflectionTestUtils.setField(record, "id", id);
        return record;
    }

    private void givenNoDuplicateAndSaves() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(imageStorage.upload(any())).thenReturn("/images/x.jpg");
        when(skinRecordWriter.save(any(), any(), any(), any(), any(), any(), any(), anyInt()))
                .thenAnswer(inv -> savedRecord(1L, inv.getArgument(1), inv.getArgument(2), inv.getArgument(7)));
    }

    @DisplayName("첫 기록이면 comparison이 null이다 — 오류가 아니다")
    @Test
    void returnsNullComparisonOnFirstRecord() {
        when(skinRecordRepository.findByUserIdAndRecordDateAndTimeSlot(anyLong(), any(), any()))
                .thenReturn(Optional.empty());
        givenNoDuplicateAndSaves();

        SkinRecordResponse response = service.create(1L, image, TimeSlot.MORNING);

        assertThat(response.comparison()).isNull();
        assertThat(response.scores()).isNotNull();
    }

    @DisplayName("같은 슬롯에 이미 기록이 있으면 409 — 업로드·분석 전에 막는다")
    @Test
    void rejectsDuplicateSlot() {
        when(skinRecordRepository.findByUserIdAndRecordDateAndTimeSlot(anyLong(), any(), eq(TimeSlot.MORNING)))
                .thenReturn(Optional.of(savedRecord(9L, LocalDate.now(), TimeSlot.MORNING, 70)));

        assertThatThrownBy(() -> service.create(1L, image, TimeSlot.MORNING))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.SKIN_ALREADY_RECORDED_IN_SLOT);

        verify(imageStorage, never()).upload(any());
        verify(skinRecordWriter, never()).save(any(), any(), any(), any(), any(), any(), any(), anyInt());
    }

    @DisplayName("종합 점수는 지표 4종의 단순 평균이다")
    @Test
    void totalScoreIsAverageOfMetrics() {
        when(skinRecordRepository.findByUserIdAndRecordDateAndTimeSlot(anyLong(), any(), any()))
                .thenReturn(Optional.empty());
        givenNoDuplicateAndSaves();

        SkinRecordResponse response = service.create(1L, image, TimeSlot.MORNING);

        int expected = (int) Math.round((response.scores().trouble() + response.scores().redness()
                + response.scores().pores() + response.scores().pigmentation()) / 4.0);
        assertThat(response.totalScore()).isEqualTo(expected);
    }

    @DisplayName("전일 동일 시간대 기록이 있으면 증감을 계산한다")
    @Test
    void comparesWithPreviousSameSlot() {
        LocalDate today = LocalDate.now();
        SkinRecord previous = savedRecord(9L, today.minusDays(1), TimeSlot.MORNING, 70);

        when(skinRecordRepository.findByUserIdAndRecordDateAndTimeSlot(1L, today, TimeSlot.MORNING))
                .thenReturn(Optional.empty());
        when(skinRecordRepository.findByUserIdAndRecordDateAndTimeSlot(1L, today.minusDays(1), TimeSlot.MORNING))
                .thenReturn(Optional.of(previous));
        when(skinMetricRepository.findAllBySkinRecordId(9L)).thenReturn(previousMetrics(previous, 50));
        givenNoDuplicateAndSaves();

        SkinRecordResponse response = service.create(1L, image, TimeSlot.MORNING);

        assertThat(response.comparison()).isNotNull();
        assertThat(response.comparison().previousTotalScore()).isEqualTo(70);
        assertThat(response.comparison().comparedTo())
                .isEqualTo("%s MORNING".formatted(today.minusDays(1)));
        assertThat(response.comparison().changes().trouble())
                .isEqualTo(response.scores().trouble() - 50);
    }

    @DisplayName("모닝은 전일 나이트와 비교되지 않는다 (F-SKIN-05 AC)")
    @Test
    void morningNeverComparesWithPreviousNight() {
        LocalDate today = LocalDate.now();
        when(skinRecordRepository.findByUserIdAndRecordDateAndTimeSlot(anyLong(), any(), any()))
                .thenReturn(Optional.empty());
        givenNoDuplicateAndSaves();

        service.create(1L, image, TimeSlot.MORNING);

        // 조회는 오늘 MORNING(중복 확인)과 전일 MORNING(비교)에만 일어난다
        verify(skinRecordRepository).findByUserIdAndRecordDateAndTimeSlot(1L, today, TimeSlot.MORNING);
        verify(skinRecordRepository).findByUserIdAndRecordDateAndTimeSlot(1L, today.minusDays(1), TimeSlot.MORNING);
        verify(skinRecordRepository, never())
                .findByUserIdAndRecordDateAndTimeSlot(anyLong(), any(), eq(TimeSlot.NIGHT));
    }

    @DisplayName("jpg · png가 아니면 422 SKIN_IMAGE_INVALID_FORMAT")
    @Test
    void rejectsUnsupportedFormat() {
        MockMultipartFile gif = new MockMultipartFile("image", "a.gif", "image/gif", "x".getBytes());

        assertThatThrownBy(() -> service.create(1L, gif, TimeSlot.MORNING))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.SKIN_IMAGE_INVALID_FORMAT);
    }

    @DisplayName("빈 파일이면 422 SKIN_IMAGE_INVALID_FORMAT")
    @Test
    void rejectsEmptyFile() {
        MockMultipartFile empty = new MockMultipartFile("image", "a.jpg", "image/jpeg", new byte[0]);

        assertThatThrownBy(() -> service.create(1L, empty, TimeSlot.MORNING))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.SKIN_IMAGE_INVALID_FORMAT);
    }

    @DisplayName("10MB를 넘으면 422 SKIN_IMAGE_TOO_LARGE")
    @Test
    void rejectsTooLargeImage() {
        MockMultipartFile large = new MockMultipartFile(
                "image", "a.jpg", "image/jpeg", new byte[10 * 1024 * 1024 + 1]);

        assertThatThrownBy(() -> service.create(1L, large, TimeSlot.MORNING))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.SKIN_IMAGE_TOO_LARGE);
    }

    @DisplayName("저장 후 성분 프로파일 갱신 훅을 호출한다")
    @Test
    void callsProfileUpdater() {
        when(skinRecordRepository.findByUserIdAndRecordDateAndTimeSlot(anyLong(), any(), any()))
                .thenReturn(Optional.empty());
        givenNoDuplicateAndSaves();

        service.create(1L, image, TimeSlot.MORNING);

        verify(ingredientProfileUpdater).update(any(SkinRecord.class));
    }

    private List<SkinMetric> previousMetrics(SkinRecord record, int value) {
        Map<SkinMetricType, Integer> scores = new EnumMap<>(SkinMetricType.class);
        for (SkinMetricType type : SkinMetricType.values()) {
            scores.put(type, value);
        }
        return scores.entrySet().stream()
                .map(e -> SkinMetric.builder()
                        .skinRecord(record)
                        .metricType(e.getKey())
                        .metricValue(BigDecimal.valueOf(e.getValue()))
                        .build())
                .toList();
    }

    @DisplayName("분석 결과는 목업 클라이언트와 동일하다 — 결정성 확인")
    @Test
    void usesAnalysisClientScores() {
        when(skinRecordRepository.findByUserIdAndRecordDateAndTimeSlot(anyLong(), any(), any()))
                .thenReturn(Optional.empty());
        givenNoDuplicateAndSaves();

        SkinRecordResponse response = service.create(1L, image, TimeSlot.MORNING);

        SkinAnalysisResult expected = analysisClient.analyze(
                "/images/x.jpg", 1L, LocalDate.now(), TimeSlot.MORNING);
        assertThat(response.scores().trouble()).isEqualTo(expected.score(SkinMetricType.TROUBLE));
    }

    @DisplayName("SKIN-02: timeSlot 미지정 시 가장 최근 기록을 반환한다")
    @Test
    void getTodayReturnsMostRecentWhenSlotOmitted() {
        SkinRecord record = savedRecord(5L, LocalDate.now(), TimeSlot.NIGHT, 80);
        when(skinRecordRepository.findFirstByUserIdOrderByRecordDateDescCapturedAtDesc(1L))
                .thenReturn(Optional.of(record));
        when(skinMetricRepository.findAllBySkinRecordId(5L)).thenReturn(previousMetrics(record, 80));
        when(skinRecordRepository.findByUserIdAndRecordDateAndTimeSlot(
                anyLong(), any(), eq(TimeSlot.NIGHT))).thenReturn(Optional.empty());

        SkinRecordResponse response = service.getToday(1L, null);

        assertThat(response.skinRecordId()).isEqualTo(5L);
        verify(skinRecordRepository, never())
                .findByUserIdAndRecordDateAndTimeSlot(eq(1L), eq(LocalDate.now()), eq(TimeSlot.NIGHT));
    }

    @DisplayName("SKIN-02: timeSlot 지정 시 오늘 해당 슬롯 기록을 반환한다")
    @Test
    void getTodayReturnsRecordForGivenSlot() {
        LocalDate today = LocalDate.now();
        SkinRecord record = savedRecord(6L, today, TimeSlot.MORNING, 60);
        when(skinRecordRepository.findByUserIdAndRecordDateAndTimeSlot(1L, today, TimeSlot.MORNING))
                .thenReturn(Optional.of(record));
        when(skinMetricRepository.findAllBySkinRecordId(6L)).thenReturn(previousMetrics(record, 60));
        when(skinRecordRepository.findByUserIdAndRecordDateAndTimeSlot(1L, today.minusDays(1), TimeSlot.MORNING))
                .thenReturn(Optional.empty());

        SkinRecordResponse response = service.getToday(1L, TimeSlot.MORNING);

        assertThat(response.skinRecordId()).isEqualTo(6L);
    }

    @DisplayName("SKIN-02: 기록이 없으면 404 SKIN_RECORD_NOT_FOUND")
    @Test
    void getTodayThrowsWhenNotFound() {
        when(skinRecordRepository.findFirstByUserIdOrderByRecordDateDescCapturedAtDesc(1L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getToday(1L, null))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.SKIN_RECORD_NOT_FOUND);
    }

    @DisplayName("SKIN-03: 소유자의 기록을 상세 조회한다")
    @Test
    void getDetailReturnsOwnedRecord() {
        LocalDate date = LocalDate.now().minusDays(3);
        SkinRecord record = savedRecord(7L, date, TimeSlot.NIGHT, 55);
        when(skinRecordRepository.findByIdAndUserId(7L, 1L)).thenReturn(Optional.of(record));
        when(skinMetricRepository.findAllBySkinRecordId(7L)).thenReturn(previousMetrics(record, 55));
        when(skinRecordRepository.findByUserIdAndRecordDateAndTimeSlot(1L, date.minusDays(1), TimeSlot.NIGHT))
                .thenReturn(Optional.empty());

        SkinRecordResponse response = service.getDetail(1L, 7L);

        assertThat(response.skinRecordId()).isEqualTo(7L);
    }

    @DisplayName("SKIN-03: 다른 사용자의 기록이거나 존재하지 않으면 404 SKIN_RECORD_NOT_FOUND")
    @Test
    void getDetailThrowsWhenNotOwnedOrMissing() {
        when(skinRecordRepository.findByIdAndUserId(7L, 1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getDetail(1L, 7L))
                .isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).getErrorCode())
                .isEqualTo(ErrorCode.SKIN_RECORD_NOT_FOUND);
    }
}
