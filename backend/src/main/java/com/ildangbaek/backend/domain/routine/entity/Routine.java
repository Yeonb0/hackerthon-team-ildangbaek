package com.ildangbaek.backend.domain.routine.entity;

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
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * docs/ERD.md 5장 Routine. MVP에서는 사용자당 모닝 1개 · 나이트 1개로 제한한다.
 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(
        name = "routines",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "time_period"})
)
public class Routine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "routine_name", nullable = false, length = 50)
    private String routineName;

    @Enumerated(EnumType.STRING)
    @Column(name = "time_period", nullable = false, length = 20)
    private RoutineType timePeriod;

    @Column(nullable = false)
    private boolean active;

    @Builder
    private Routine(User user, String routineName, RoutineType timePeriod) {
        this.user = user;
        this.routineName = routineName;
        this.timePeriod = timePeriod;
        this.active = true;
    }

    public void rename(String routineName) {
        this.routineName = routineName;
    }

    public void deactivate() {
        this.active = false;
    }
}
