package com.ildangbaek.backend.domain.user.repository;

import com.ildangbaek.backend.domain.user.entity.UserSkinType;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserSkinTypeRepository extends JpaRepository<UserSkinType, Long> {

    List<UserSkinType> findAllByUserId(Long userId);

    void deleteAllByUserId(Long userId);
}
