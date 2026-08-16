package com.ildangbaek.backend.domain.user.repository;

import com.ildangbaek.backend.domain.user.entity.SkinType;
import com.ildangbaek.backend.domain.user.entity.SkinTypeCode;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SkinTypeRepository extends JpaRepository<SkinType, Long> {

    Optional<SkinType> findByCode(SkinTypeCode code);
}
