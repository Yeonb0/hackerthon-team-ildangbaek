package com.ildangbaek.backend.domain.user.entity;

import com.ildangbaek.backend.global.entity.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * docs/ERD.md 3장 UserProfile. 이름 · 나이 · 성별 · 생활패턴 · 호르몬 정보를 보관한다.
 * 호르몬 관련 필드는 온보딩 F-ONBOARD-03에서 선택 입력되며 실제 분석 반영 여부는 PRD 14장 미확정.
 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "user_profiles")
public class UserProfile extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(nullable = false, length = 30)
    private String nickname;

    @Column(name = "birth_year")
    private Short birthYear;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private Gender gender;

    @Column(name = "sleep_time")
    private LocalTime sleepTime;

    @Column(name = "wake_time")
    private LocalTime wakeTime;

    @Enumerated(EnumType.STRING)
    @Column(name = "menstrual_status", length = 30)
    private MenstrualStatus menstrualStatus;

    @Column(name = "last_menstrual_start_date")
    private LocalDate lastMenstrualStartDate;

    @Column(name = "menstrual_cycle_days")
    private Short menstrualCycleDays;

    @Column(name = "oral_contraceptive", nullable = false)
    private boolean oralContraceptive;

    @Column(name = "progesterone_injection", nullable = false)
    private boolean progesteroneInjection;

    @Column(name = "hormone_replacement_therapy", nullable = false)
    private boolean hormoneReplacementTherapy;

    @Column(name = "region_name", length = 100)
    private String regionName;

    @Builder
    private UserProfile(User user, String nickname, Short birthYear, Gender gender) {
        this.user = user;
        this.nickname = nickname;
        this.birthYear = birthYear;
        this.gender = gender;
        this.oralContraceptive = false;
        this.progesteroneInjection = false;
        this.hormoneReplacementTherapy = false;
    }

    public void updateBasicInfo(String nickname, Short birthYear, Gender gender) {
        this.nickname = nickname;
        this.birthYear = birthYear;
        this.gender = gender;
    }

    public void updateHormoneInfo(MenstrualStatus menstrualStatus, LocalDate lastMenstrualStartDate,
                                   Short menstrualCycleDays) {
        this.menstrualStatus = menstrualStatus;
        this.lastMenstrualStartDate = lastMenstrualStartDate;
        this.menstrualCycleDays = menstrualCycleDays;
    }

    public void updateRegion(String regionName) {
        this.regionName = regionName;
    }
}
