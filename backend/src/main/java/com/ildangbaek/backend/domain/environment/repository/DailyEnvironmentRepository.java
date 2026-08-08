package com.ildangbaek.backend.domain.environment.repository;

import com.ildangbaek.backend.domain.environment.entity.DailyEnvironment;
import java.time.LocalDate;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DailyEnvironmentRepository extends JpaRepository<DailyEnvironment, Long> {

    Optional<DailyEnvironment> findByUserIdAndRecordDate(Long userId, LocalDate recordDate);
}
