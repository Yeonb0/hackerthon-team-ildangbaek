package com.ildangbaek.backend.domain.record.entity;

import com.ildangbaek.backend.domain.user.entity.User;
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
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * docs/ERD.md 7장 SkinRecord. 하루 모닝 1건 · 나이트 1건의 얼굴 사진 기반 피부 기록.
 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(
        name = "skin_records",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "record_date", "time_period"})
)
public class SkinRecord {

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

    @Column(name = "image_url", length = 500)
    private String imageUrl;

    @Column(name = "overall_score", precision = 5, scale = 2)
    private BigDecimal overallScore;

    @Enumerated(EnumType.STRING)
    @Column(name = "analysis_status", nullable = false, length = 20)
    private AnalysisStatus analysisStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "analysis_method", nullable = false, length = 20)
    private AnalysisMethod analysisMethod;

    @Column(name = "captured_at", nullable = false)
    private LocalDateTime capturedAt;

    @Column(name = "analyzed_at")
    private LocalDateTime analyzedAt;

    @Builder
    private SkinRecord(User user, LocalDate recordDate, TimeSlot timeSlot, String imageUrl,
                        AnalysisMethod analysisMethod, LocalDateTime capturedAt) {
        this.user = user;
        this.recordDate = recordDate;
        this.timeSlot = timeSlot;
        this.imageUrl = imageUrl;
        this.analysisStatus = AnalysisStatus.PROCESSING;
        this.analysisMethod = analysisMethod;
        this.capturedAt = capturedAt;
    }

    public void completeAnalysis(BigDecimal overallScore) {
        this.overallScore = overallScore;
        this.analysisStatus = AnalysisStatus.COMPLETED;
        this.analyzedAt = LocalDateTime.now();
    }

    public void failAnalysis() {
        this.analysisStatus = AnalysisStatus.FAILED;
        this.analyzedAt = LocalDateTime.now();
    }
}
