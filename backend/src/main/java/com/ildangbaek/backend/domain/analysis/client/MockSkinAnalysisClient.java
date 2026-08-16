package com.ildangbaek.backend.domain.analysis.client;

import com.ildangbaek.backend.domain.record.entity.AnalysisMethod;
import com.ildangbaek.backend.domain.record.entity.SkinMetricType;
import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import com.ildangbaek.backend.global.exception.BusinessException;
import com.ildangbaek.backend.global.exception.ErrorCode;
import java.time.LocalDate;
import java.util.EnumMap;
import java.util.Map;
import java.util.Random;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * 실제 AI 서버 없이 피부 점수를 만들어내는 목업 구현. (ADR 0003)
 *
 * <p><strong>결정적이다.</strong> 시드를 {@code userId + recordDate + timeSlot}에서 유도하므로
 * 같은 입력에는 항상 같은 점수가 나온다. 단순 난수를 쓰면 "성분 사용 → N일 후 점수 변화 → 반복성 판정"으로
 * 이어지는 분석 파이프라인을 검증할 수 없기 때문이다.
 *
 * <p>이미지 내용은 보지 않는다. 시드에 이미지를 넣으면 같은 날 같은 슬롯을 다시 찍었을 때 점수가 달라져
 * 결정성이 깨진다.
 *
 * <p>실패 경로는 개발용 플래그로 재현한다. {@code app.skin.analysis.mock.failure-mode}에
 * {@code face-not-detected} · {@code timeout} · {@code failed} 중 하나를 주면 해당 예외를 던진다.
 */
@Slf4j
@Component
@ConditionalOnProperty(name = "app.skin.analysis.provider", havingValue = "mock", matchIfMissing = true)
public class MockSkinAnalysisClient implements SkinAnalysisClient {

    /** 점수 하한. 목업이 극단값만 내지 않도록 40~95 범위로 만든다. */
    private static final int MIN_SCORE = 40;
    private static final int SCORE_RANGE = 56;

    private final String failureMode;

    public MockSkinAnalysisClient(@Value("${app.skin.analysis.mock.failure-mode:}") String failureMode) {
        this.failureMode = failureMode;
    }

    @Override
    public SkinAnalysisResult analyze(String imageUrl, Long userId, LocalDate recordDate, TimeSlot timeSlot) {
        throwIfFailureModeSet();

        Random random = new Random(seedOf(userId, recordDate, timeSlot));
        Map<SkinMetricType, Integer> scores = new EnumMap<>(SkinMetricType.class);
        for (SkinMetricType type : SkinMetricType.values()) {
            scores.put(type, MIN_SCORE + random.nextInt(SCORE_RANGE));
        }

        log.debug("목업 피부 분석: userId={} date={} slot={} scores={}", userId, recordDate, timeSlot, scores);
        return new SkinAnalysisResult(scores);
    }

    @Override
    public AnalysisMethod method() {
        return AnalysisMethod.MOCK;
    }

    private long seedOf(Long userId, LocalDate recordDate, TimeSlot timeSlot) {
        return userId * 31L + recordDate.toEpochDay() * 7L + timeSlot.ordinal();
    }

    private void throwIfFailureModeSet() {
        if (failureMode == null || failureMode.isBlank()) {
            return;
        }
        log.warn("목업 분석 실패 모드가 켜져 있습니다: {}", failureMode);
        switch (failureMode) {
            case "face-not-detected" -> throw new BusinessException(ErrorCode.SKIN_FACE_NOT_DETECTED);
            case "timeout" -> throw new BusinessException(ErrorCode.SKIN_ANALYSIS_TIMEOUT);
            case "failed" -> throw new BusinessException(ErrorCode.SKIN_ANALYSIS_FAILED);
            default -> log.warn("알 수 없는 실패 모드라 무시합니다: {}", failureMode);
        }
    }
}
