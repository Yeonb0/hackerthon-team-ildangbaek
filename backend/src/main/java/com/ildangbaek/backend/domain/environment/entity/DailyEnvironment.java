package com.ildangbaek.backend.domain.environment.entity;

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
 * docs/ERD.md 8장 DailyEnvironment. 날짜별 날씨 · 자외선 · 습도(F-HOME-03).
 * uv_index_max는 F-ANALYSIS-02 환경 보정의 입력값으로 재사용된다.
 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(
        name = "daily_environments",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "record_date"})
)
public class DailyEnvironment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "record_date", nullable = false)
    private LocalDate recordDate;

    @Column(name = "region_name", nullable = false, length = 100)
    private String regionName;

    @Enumerated(EnumType.STRING)
    @Column(name = "weather_condition", length = 50)
    private WeatherCondition weatherCondition;

    @Column(precision = 5, scale = 2)
    private BigDecimal temperature;

    @Column(precision = 5, scale = 2)
    private BigDecimal humidity;

    @Column(name = "uv_index_current", precision = 5, scale = 2)
    private BigDecimal uvIndexCurrent;

    @Column(name = "uv_index_max", precision = 5, scale = 2)
    private BigDecimal uvIndexMax;

    @Enumerated(EnumType.STRING)
    @Column(name = "data_source", nullable = false, length = 30)
    private EnvironmentDataSource dataSource;

    @Column(name = "fetched_at", nullable = false)
    private LocalDateTime fetchedAt;

    @Builder
    private DailyEnvironment(User user, LocalDate recordDate, String regionName, WeatherCondition weatherCondition,
                              BigDecimal temperature, BigDecimal humidity, BigDecimal uvIndexCurrent,
                              BigDecimal uvIndexMax, EnvironmentDataSource dataSource) {
        this.user = user;
        this.recordDate = recordDate;
        this.regionName = regionName;
        this.weatherCondition = weatherCondition;
        this.temperature = temperature;
        this.humidity = humidity;
        this.uvIndexCurrent = uvIndexCurrent;
        this.uvIndexMax = uvIndexMax;
        this.dataSource = dataSource;
        this.fetchedAt = LocalDateTime.now();
    }

    public void updateUvIndexMax(BigDecimal uvIndexMax) {
        this.uvIndexMax = uvIndexMax;
    }
}
