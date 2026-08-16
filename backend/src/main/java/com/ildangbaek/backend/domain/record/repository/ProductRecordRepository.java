package com.ildangbaek.backend.domain.record.repository;

import com.ildangbaek.backend.domain.record.entity.ProductRecord;
import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductRecordRepository extends JpaRepository<ProductRecord, Long> {

    long countByUserId(Long userId);

    Optional<ProductRecord> findByUserIdAndRecordDateAndTimeSlot(Long userId, LocalDate recordDate, TimeSlot timeSlot);

    List<ProductRecord> findAllByUserIdAndRecordDateBetween(Long userId, LocalDate startDate, LocalDate endDate);
}
