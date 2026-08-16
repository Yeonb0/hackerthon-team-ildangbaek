package com.ildangbaek.backend.domain.record.repository;

import com.ildangbaek.backend.domain.record.entity.SkinRecord;
import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SkinRecordRepository extends JpaRepository<SkinRecord, Long> {

    /**
     * 기록이 존재하는 날의 수. 모닝·나이트 2건은 1일로 센다. (F-ANALYSIS-05 A축 · ADR 0011)
     */
    @Query("select count(distinct r.recordDate) from SkinRecord r where r.user.id = :userId")
    long countDistinctRecordDatesByUserId(@Param("userId") Long userId);

    /** USER-01. 모닝·나이트가 각각 별도 행이므로 단순 행 수가 곧 기록 횟수다(BR 3). */
    long countByUserId(Long userId);

    Optional<SkinRecord> findByUserIdAndRecordDateAndTimeSlot(Long userId, LocalDate recordDate, TimeSlot timeSlot);

    List<SkinRecord> findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(
            Long userId, LocalDate startDate, LocalDate endDate);

    /** REPORT-03. 하루치 기록을 모닝 → 나이트 순으로 읽는다 (enum 선언 순서). */
    List<SkinRecord> findAllByUserIdAndRecordDateOrderByTimeSlotAsc(Long userId, LocalDate recordDate);

    Optional<SkinRecord> findFirstByUserIdOrderByRecordDateDescCapturedAtDesc(Long userId);

    Optional<SkinRecord> findByIdAndUserId(Long id, Long userId);
}
