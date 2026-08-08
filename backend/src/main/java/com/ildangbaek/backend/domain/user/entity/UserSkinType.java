package com.ildangbaek.backend.domain.user.entity;

import jakarta.persistence.Entity;
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
 * docs/ERD.md 3장 UserSkinType. 사용자가 선택한 복수 피부 타입(F-ONBOARD-02).
 */
@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(
        name = "user_skin_types",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "skin_type_id"})
)
public class UserSkinType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne
    @JoinColumn(name = "skin_type_id", nullable = false)
    private SkinType skinType;

    @Builder
    private UserSkinType(User user, SkinType skinType) {
        this.user = user;
        this.skinType = skinType;
    }
}
