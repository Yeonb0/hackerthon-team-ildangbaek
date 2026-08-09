package com.ildangbaek.backend.domain.analysis.repository;

import com.ildangbaek.backend.domain.analysis.entity.AnalysisInsight;
import com.ildangbaek.backend.domain.analysis.entity.InsightType;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnalysisInsightRepository extends JpaRepository<AnalysisInsight, Long> {

    List<AnalysisInsight> findAllByUserIdAndStartDateGreaterThanEqualOrderByConfidenceScoreDesc(
            Long userId, LocalDate startDate);

    /**
     * 분석은 매 기록마다 다시 돌기 때문에, 이전 회차 결과를 지우지 않으면 같은 인사이트가 쌓인다.
     * F-ANALYSIS-01은 매번 전체 기간을 다시 계산하므로 최신 회차만 남기는 게 맞다.
     */
    void deleteAllByUserIdAndInsightType(Long userId, InsightType insightType);
}
