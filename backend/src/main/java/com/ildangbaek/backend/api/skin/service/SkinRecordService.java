package com.ildangbaek.backend.api.skin.service;

import com.ildangbaek.backend.api.skin.dto.SkinComparisonResponse;
import com.ildangbaek.backend.api.skin.dto.SkinRecordResponse;
import com.ildangbaek.backend.api.skin.dto.SkinScoresResponse;
import com.ildangbaek.backend.domain.analysis.client.SkinAnalysisClient;
import com.ildangbaek.backend.domain.analysis.client.SkinAnalysisResult;
import com.ildangbaek.backend.domain.record.entity.SkinMetricType;
import com.ildangbaek.backend.domain.record.entity.SkinRecord;
import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import com.ildangbaek.backend.domain.record.repository.SkinMetricRepository;
import com.ildangbaek.backend.domain.record.repository.SkinRecordRepository;
import com.ildangbaek.backend.domain.user.entity.User;
import com.ildangbaek.backend.domain.user.repository.UserRepository;
import com.ildangbaek.backend.global.exception.BusinessException;
import com.ildangbaek.backend.global.exception.ErrorCode;
import com.ildangbaek.backend.global.storage.ImageStorage;
import com.ildangbaek.backend.global.util.RecordDateResolver;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * SKIN-01 · 피부 기록 생성 및 분석.
 *
 * <p>업로드 · 분석 · 저장이 이 호출 하나로 모두 끝난다. 사용자가 결과 화면에서 이탈해도 기록은 남는다.
 * 의도된 동작이다 — 이미 AI 분석 비용을 치른 뒤라 유실이 사용자와 서버 양쪽에 손해다. (ADR 0001)
 *
 * <p>외부 호출(업로드 · 분석)은 트랜잭션 <strong>밖</strong>에서 하고, DB 반영은
 * {@link SkinRecordWriter}에 맡긴다. 수 초가 걸리는 외부 응답을 기다리는 동안 커넥션을 붙들고 있으면
 * 동시 요청 시 풀이 마른다.
 */
@Service
@RequiredArgsConstructor
public class SkinRecordService {

    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of("image/jpeg", "image/png");
    private static final long MAX_IMAGE_BYTES = 10L * 1024 * 1024;

    private final SkinRecordRepository skinRecordRepository;
    private final SkinMetricRepository skinMetricRepository;
    private final UserRepository userRepository;
    private final ImageStorage imageStorage;
    private final SkinAnalysisClient skinAnalysisClient;
    private final SkinRecordWriter skinRecordWriter;
    private final IngredientProfileUpdater ingredientProfileUpdater;

    public SkinRecordResponse create(Long userId, MultipartFile image, TimeSlot timeSlot) {
        validateImage(image);

        LocalDateTime capturedAt = LocalDateTime.now();
        LocalDate recordDate = RecordDateResolver.resolve(capturedAt, timeSlot);

        // 업로드·분석 전에 확인한다. 뒤에 두면 실패할 요청에 분석 비용을 먼저 치른다.
        if (skinRecordRepository.findByUserIdAndRecordDateAndTimeSlot(userId, recordDate, timeSlot).isPresent()) {
            throw new BusinessException(ErrorCode.SKIN_ALREADY_RECORDED_IN_SLOT);
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        String imageUrl = imageStorage.upload(image);
        SkinAnalysisResult analysis = skinAnalysisClient.analyze(imageUrl, userId, recordDate, timeSlot);
        int totalScore = calculateTotalScore(analysis);

        SkinComparisonResponse comparison = buildComparison(userId, recordDate, timeSlot, analysis.scores());

        SkinRecord saved = skinRecordWriter.save(user, recordDate, timeSlot, imageUrl, capturedAt,
                skinAnalysisClient.method(), analysis, totalScore);
        ingredientProfileUpdater.update(saved);

        return SkinRecordResponse.of(saved, SkinScoresResponse.from(analysis.scores()), comparison);
    }

    /**
     * SKIN-02 · 오늘 피부 결과 조회. {@code timeSlot} 미지정 시 가장 최근 기록을 반환한다.
     */
    public SkinRecordResponse getToday(Long userId, TimeSlot timeSlot) {
        SkinRecord record = (timeSlot == null
                ? skinRecordRepository.findFirstByUserIdOrderByRecordDateDescCapturedAtDesc(userId)
                : skinRecordRepository.findByUserIdAndRecordDateAndTimeSlot(userId, LocalDate.now(), timeSlot))
                .orElseThrow(() -> new BusinessException(ErrorCode.SKIN_RECORD_NOT_FOUND));
        return toResponse(userId, record);
    }

    /**
     * SKIN-03 · 피부 기록 상세 조회. 다른 사용자의 기록은 존재 여부를 숨기기 위해 404로 응답한다.
     */
    public SkinRecordResponse getDetail(Long userId, Long skinRecordId) {
        SkinRecord record = skinRecordRepository.findByIdAndUserId(skinRecordId, userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.SKIN_RECORD_NOT_FOUND));
        return toResponse(userId, record);
    }

    private SkinRecordResponse toResponse(Long userId, SkinRecord record) {
        Map<SkinMetricType, Integer> scores = new EnumMap<>(SkinMetricType.class);
        skinMetricRepository.findAllBySkinRecordId(record.getId())
                .forEach(metric -> scores.put(metric.getMetricType(), metric.getMetricValue().intValue()));

        SkinComparisonResponse comparison =
                buildComparison(userId, record.getRecordDate(), record.getTimeSlot(), scores);

        return SkinRecordResponse.of(record, SkinScoresResponse.from(scores), comparison);
    }

    private void validateImage(MultipartFile image) {
        if (image == null || image.isEmpty()) {
            throw new BusinessException(ErrorCode.SKIN_IMAGE_INVALID_FORMAT);
        }
        String contentType = image.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new BusinessException(ErrorCode.SKIN_IMAGE_INVALID_FORMAT);
        }
        if (image.getSize() > MAX_IMAGE_BYTES) {
            throw new BusinessException(ErrorCode.SKIN_IMAGE_TOO_LARGE);
        }
    }

    /**
     * 지표 4종의 단순 평균. 가중치를 둘 근거 데이터가 아직 없어 임의 가중을 피한다. (ADR 0008)
     */
    private int calculateTotalScore(SkinAnalysisResult analysis) {
        return (int) Math.round(analysis.scores().values().stream()
                .mapToInt(Integer::intValue)
                .average()
                .orElseThrow(() -> new BusinessException(ErrorCode.SKIN_ANALYSIS_FAILED)));
    }

    /**
     * 전일 <strong>동일 시간대</strong> 기록과 비교한다. 모닝이 전일 나이트와 비교되면 안 된다. (F-SKIN-05)
     * 비교 대상이 없으면 {@code null} — 첫 기록에서 정상인 상태다.
     */
    private SkinComparisonResponse buildComparison(Long userId, LocalDate recordDate, TimeSlot timeSlot,
                                                   Map<SkinMetricType, Integer> scores) {
        LocalDate previousDate = recordDate.minusDays(1);
        Optional<SkinRecord> previous =
                skinRecordRepository.findByUserIdAndRecordDateAndTimeSlot(userId, previousDate, timeSlot);
        if (previous.isEmpty() || previous.get().getOverallScore() == null) {
            return null;
        }

        SkinRecord previousRecord = previous.get();
        Map<SkinMetricType, Integer> previousScores = new EnumMap<>(SkinMetricType.class);
        skinMetricRepository.findAllBySkinRecordId(previousRecord.getId())
                .forEach(metric -> previousScores.put(metric.getMetricType(), metric.getMetricValue().intValue()));

        Map<SkinMetricType, Integer> changes = new EnumMap<>(SkinMetricType.class);
        for (SkinMetricType type : SkinMetricType.values()) {
            Integer before = previousScores.get(type);
            changes.put(type, before == null ? 0 : scores.get(type) - before);
        }

        return new SkinComparisonResponse(
                "%s %s".formatted(previousDate, timeSlot),
                previousRecord.getOverallScore().intValue(),
                SkinScoresResponse.from(changes));
    }
}
