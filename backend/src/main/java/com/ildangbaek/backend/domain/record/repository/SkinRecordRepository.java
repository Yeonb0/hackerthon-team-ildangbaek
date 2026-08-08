package com.ildangbaek.backend.domain.record.repository;

import com.ildangbaek.backend.domain.record.entity.SkinRecord;
import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SkinRecordRepository extends JpaRepository<SkinRecord, Long> {

    Optional<SkinRecord> findByUserIdAndRecordDateAndTimeSlot(Long userId, LocalDate recordDate, TimeSlot timeSlot);

    List<SkinRecord> findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(
            Long userId, LocalDate startDate, LocalDate endDate);

    Optional<SkinRecord> findFirstByUserIdOrderByRecordDateDescCapturedAtDesc(Long userId);

    Optional<SkinRecord> findByIdAndUserId(Long id, Long userId);
}
