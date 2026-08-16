package com.ildangbaek.backend.domain.user.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import java.time.LocalTime;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * docs/ERD.md 3장 NotificationSetting. 아침 · 밤 기록 알림 설정(F-ONBOARD-06).
 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "notification_settings")
public class NotificationSetting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "morning_enabled", nullable = false)
    private boolean morningEnabled;

    @Column(name = "night_enabled", nullable = false)
    private boolean nightEnabled;

    @Column(name = "morning_time")
    private LocalTime morningTime;

    @Column(name = "night_time")
    private LocalTime nightTime;

    @Column(name = "push_token", length = 500)
    private String pushToken;

    @Builder
    private NotificationSetting(User user, boolean morningEnabled, boolean nightEnabled,
                                 LocalTime morningTime, LocalTime nightTime, String pushToken) {
        this.user = user;
        this.morningEnabled = morningEnabled;
        this.nightEnabled = nightEnabled;
        this.morningTime = morningTime;
        this.nightTime = nightTime;
        this.pushToken = pushToken;
    }

    public void updatePushToken(String pushToken) {
        this.pushToken = pushToken;
    }

    public void updateEnabled(boolean enabled) {
        this.morningEnabled = enabled;
        this.nightEnabled = enabled;
    }
}
