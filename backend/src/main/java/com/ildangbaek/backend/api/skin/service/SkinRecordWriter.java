package com.ildangbaek.backend.api.skin.service;

import com.ildangbaek.backend.domain.analysis.client.SkinAnalysisResult;
import com.ildangbaek.backend.domain.record.entity.AnalysisMethod;
import com.ildangbaek.backend.domain.record.entity.SkinMetric;
import com.ildangbaek.backend.domain.record.entity.SkinRecord;
import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import com.ildangbaek.backend.domain.record.repository.SkinMetricRepository;
import com.ildangbaek.backend.domain.record.repository.SkinRecordRepository;
import com.ildangbaek.backend.domain.user.entity.User;
import com.ildangbaek.backend.global.exception.BusinessException;
import com.ildangbaek.backend.global.exception.ErrorCode;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * 피부 기록의 DB 반영만 담당한다.
 *
 * <p>{@link SkinRecordService}에서 분리한 이유는 트랜잭션 때문이다. 같은 클래스 안에서
 * {@code this.save(...)}로 부르면 Spring 프록시를 거치지 않아 {@code @Transactional}이
 * 조용히 무시된다. 별도 빈으로 두어야 트랜잭션이 실제로 걸린다.
 *
 * <p>업로드·분석 같은 외부 호출은 이 클래스에 두지 않는다. 트랜잭션 안에서 수 초를 기다리면
 * 커넥션 풀이 마른다. (ADR 0001)
 */
@Component
@RequiredArgsConstructor
public class SkinRecordWriter {

    private final SkinRecordRepository skinRecordRepository;
    private final SkinMetricRepository skinMetricRepository;

    @Transactional
    public SkinRecord save(User user, LocalDate recordDate, TimeSlot timeSlot, String imageUrl,
                           LocalDateTime capturedAt, AnalysisMethod analysisMethod,
                           SkinAnalysisResult analysis, int totalScore) {
        SkinRecord record = SkinRecord.builder()
                .user(user)
                .recordDate(recordDate)
                .timeSlot(timeSlot)
                .imageUrl(imageUrl)
                .analysisMethod(analysisMethod)
                .capturedAt(capturedAt)
                .build();
        record.completeAnalysis(BigDecimal.valueOf(totalScore), analysis.skinComment());

        SkinRecord saved;
        try {
            saved = skinRecordRepository.saveAndFlush(record);
        } catch (DataIntegrityViolationException e) {
            // 사전 조회를 통과한 뒤 같은 슬롯이 먼저 저장된 경우. 유니크 제약이 최종 방어선이다.
            throw new BusinessException(ErrorCode.SKIN_ALREADY_RECORDED_IN_SLOT);
        }

        List<SkinMetric> metrics = analysis.scores().entrySet().stream()
                .map(entry -> SkinMetric.builder()
                        .skinRecord(saved)
                        .metricType(entry.getKey())
                        .metricValue(BigDecimal.valueOf(entry.getValue()))
                        .rawValue(analysis.rawValues().get(entry.getKey()))
                        .confidence(analysis.confidence().get(entry.getKey()))
                        .algorithmVersion(analysis.algorithmVersion())
                        .normalizationVersion(analysis.normalizationVersion())
                        .build())
                .toList();
        skinMetricRepository.saveAll(metrics);

        return saved;
    }
}
