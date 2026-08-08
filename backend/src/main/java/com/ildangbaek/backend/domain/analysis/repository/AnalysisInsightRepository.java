package com.ildangbaek.backend.domain.analysis.repository;

import com.ildangbaek.backend.domain.analysis.entity.AnalysisInsight;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AnalysisInsightRepository extends JpaRepository<AnalysisInsight, Long> {

    List<AnalysisInsight> findAllByUserIdAndStartDateGreaterThanEqualOrderByGeneratedAtDesc(
            Long userId, LocalDate startDate);
}
