package com.ildangbaek.backend.domain.record.entity;

import com.ildangbaek.backend.domain.user.entity.User;
import com.ildangbaek.backend.global.entity.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * docs/ERD.md 6장 ProductRecord. 하루 모닝 1건 · 나이트 1건(F-RECORD-02 슬롯 구조).
 * NIGHT 슬롯의 날짜 귀속 규칙은 docs/공통응답포맷_예외처리코드.md 8.1을 따른다.
 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(
        name = "product_records",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "record_date", "time_period"})
)
public class ProductRecord extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "record_date", nullable = false)
    private LocalDate recordDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "time_period", nullable = false, length = 20)
    private TimeSlot timeSlot;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 20)
    private SourceType sourceType;

    @Column(name = "recorded_at", nullable = false)
    private LocalDateTime recordedAt;

    @Builder
    private ProductRecord(User user, LocalDate recordDate, TimeSlot timeSlot, SourceType sourceType) {
        this.user = user;
        this.recordDate = recordDate;
        this.timeSlot = timeSlot;
        this.sourceType = sourceType;
        this.recordedAt = LocalDateTime.now();
    }
}
