package com.ildangbaek.backend.domain.user.entity;

import com.ildangbaek.backend.global.entity.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * docs/ERD.md 3장 User. 로그인 계정 및 인증 상태의 기준 엔티티.
 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(
        name = "users",
        uniqueConstraints = @UniqueConstraint(columnNames = {"provider", "provider_user_id"})
)
public class User extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AuthProvider provider;

    @Column(name = "provider_user_id")
    private String providerUserId;

    @Column(unique = true)
    private String email;

    @Column(name = "password_hash", length = 255)
    private String passwordHash;

    @Column(name = "onboarding_completed", nullable = false)
    private boolean onboardingCompleted;

    @Enumerated(EnumType.STRING)
    @Column(name = "account_status", nullable = false, length = 20)
    private AccountStatus accountStatus;

    @Builder
    private User(AuthProvider provider, String providerUserId, String email) {
        this.provider = provider;
        this.providerUserId = providerUserId;
        this.email = email;
        this.onboardingCompleted = false;
        this.accountStatus = AccountStatus.ACTIVE;
    }

    public void updatePasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public void completeOnboarding() {
        this.onboardingCompleted = true;
    }

    public void withdraw() {
        this.accountStatus = AccountStatus.WITHDRAWN;
    }

    public boolean isActive() {
        return this.accountStatus == AccountStatus.ACTIVE;
    }
}
