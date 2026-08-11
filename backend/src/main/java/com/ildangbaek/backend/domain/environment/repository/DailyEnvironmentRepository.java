package com.ildangbaek.backend.domain.environment.repository;

import com.ildangbaek.backend.domain.environment.entity.DailyEnvironment;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DailyEnvironmentRepository extends JpaRepository<DailyEnvironment, Long> {

    Optional<DailyEnvironment> findByUserIdAndRecordDate(Long userId, LocalDate recordDate);

    /** REPORT-02가 자외선 급증 구간을 찾는다. 연속일 판정이 순서에 의존하므로 정렬해서 받는다. */
    List<DailyEnvironment> findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(
            Long userId, LocalDate startDate, LocalDate endDate);
}
