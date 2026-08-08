package com.ildangbaek.backend.domain.user.repository;

import com.ildangbaek.backend.domain.user.entity.NotificationSetting;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NotificationSettingRepository extends JpaRepository<NotificationSetting, Long> {

    Optional<NotificationSetting> findByUserId(Long userId);
}
