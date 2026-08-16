package com.ildangbaek.backend.domain.record.repository;

import com.ildangbaek.backend.domain.record.entity.SkinMetric;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SkinMetricRepository extends JpaRepository<SkinMetric, Long> {

    List<SkinMetric> findAllBySkinRecordId(Long skinRecordId);

    List<SkinMetric> findAllBySkinRecordIdIn(List<Long> skinRecordIds);
}
