package com.ildangbaek.backend.domain.analysis.client;

import com.ildangbaek.backend.domain.record.entity.AnalysisMethod;
import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import java.time.LocalDate;

/**
 * 얼굴 이미지를 분석해 피부 지표를 산출한다. (F-SKIN-04)
 *
 * <p>실제 AI 서버가 확정되지 않아 인터페이스로 추상화한다. 활성 구현체는
 * {@code app.skin.analysis.provider} 설정으로 고른다. 실연동 시 변경 범위는
 * 구현체 1개와 설정값이며 서비스·컨트롤러·DTO는 건드리지 않는다. (ADR 0003)
 *
 * <p>구현체가 사용한 수단은 {@code SkinRecord.analysisMethod}에 기록해 나중에
 * 실데이터와 목업 데이터를 구분할 수 있게 한다.
 */
public interface SkinAnalysisClient {

    /**
     * 분석 시드는 이미지가 아니라 (userId, recordDate, timeSlot)에서 유도한다.
     * 목업이 결정적이어야 분석 파이프라인을 검증할 수 있기 때문이다. (ADR 0003)
     *
     * @param imageUrl   업로드된 이미지 URL
     * @param userId     사용자 ID
     * @param recordDate 귀속 날짜
     * @param timeSlot   시간대
     * @return 지표별 점수
     * @throws com.ildangbaek.backend.global.exception.BusinessException
     *         얼굴 미검출(SKIN_FACE_NOT_DETECTED) · 분석 실패(SKIN_ANALYSIS_FAILED) ·
     *         타임아웃(SKIN_ANALYSIS_TIMEOUT)
     */
    SkinAnalysisResult analyze(String imageUrl, Long userId, LocalDate recordDate, TimeSlot timeSlot);

    /**
     * 이 구현체가 사용한 분석 수단. {@code SkinRecord.analysisMethod}에 그대로 저장한다.
     */
    AnalysisMethod method();
}
