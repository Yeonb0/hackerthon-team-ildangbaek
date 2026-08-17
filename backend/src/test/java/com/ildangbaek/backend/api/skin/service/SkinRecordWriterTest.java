package com.ildangbaek.backend.api.skin.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.ildangbaek.backend.domain.analysis.client.SkinAnalysisResult;
import com.ildangbaek.backend.domain.record.entity.AnalysisMethod;
import com.ildangbaek.backend.domain.record.entity.SkinMetric;
import com.ildangbaek.backend.domain.record.entity.SkinMetricType;
import com.ildangbaek.backend.domain.record.entity.SkinRecord;
import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import com.ildangbaek.backend.domain.record.repository.SkinMetricRepository;
import com.ildangbaek.backend.domain.user.entity.AuthProvider;
import com.ildangbaek.backend.domain.user.entity.User;
import com.ildangbaek.backend.domain.user.repository.UserRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

/**
 * rawValue·confidence·algorithmVersion·normalizationVersion이 실제 DB에 저장·조회되는지 고정한다.
 *
 * <p>목 리포지토리로는 컬럼이 실제로 영속화되는지 확인할 수 없어 {@code UserProfileUpdateTest}와
 * 같은 방식으로 실제 DB(H2)와 실제 빈을 쓴다.
 */
@SpringBootTest
@Transactional
class SkinRecordWriterTest {

    @Autowired private SkinRecordWriter skinRecordWriter;
    @Autowired private SkinMetricRepository skinMetricRepository;
    @Autowired private UserRepository userRepository;

    private User persistedUser() {
        return userRepository.save(User.builder().provider(AuthProvider.KAKAO).providerUserId("writer-test").build());
    }

    @Test
    void savesRawValueConfidenceAndVersionsWhenPresent() {
        User user = persistedUser();
        SkinAnalysisResult analysis = new SkinAnalysisResult(
                allMetrics(80),
                Map.of(SkinMetricType.REDNESS, 10.2, SkinMetricType.PORES, 7.1),
                Map.of(SkinMetricType.PORES, "NORMAL"),
                "cielab-v1",
                "to-score-v1");

        SkinRecord saved = skinRecordWriter.save(user, LocalDate.now(), TimeSlot.MORNING, "/images/a.jpg",
                LocalDateTime.now(), AnalysisMethod.API, analysis, 80);

        Map<SkinMetricType, SkinMetric> metrics = indexByType(saved.getId());
        assertThat(metrics.get(SkinMetricType.REDNESS).getRawValue()).isEqualTo(10.2);
        assertThat(metrics.get(SkinMetricType.PORES).getRawValue()).isEqualTo(7.1);
        assertThat(metrics.get(SkinMetricType.PORES).getConfidence()).isEqualTo("NORMAL");
        assertThat(metrics.get(SkinMetricType.REDNESS).getConfidence()).isNull();
        assertThat(metrics.get(SkinMetricType.REDNESS).getAlgorithmVersion()).isEqualTo("cielab-v1");
        assertThat(metrics.get(SkinMetricType.REDNESS).getNormalizationVersion()).isEqualTo("to-score-v1");
    }

    @Test
    void leavesRawValueNullWhenAnalysisHasNoRawData() {
        // MockSkinAnalysisClient처럼 근거 없는 분석은 rawValue를 만들어내지 않는다 — score만 저장된다.
        User user = persistedUser();
        SkinAnalysisResult scoreOnly = SkinAnalysisResult.ofScoresOnly(allMetrics(70));

        SkinRecord saved = skinRecordWriter.save(user, LocalDate.now(), TimeSlot.MORNING, "/images/a.jpg",
                LocalDateTime.now(), AnalysisMethod.MOCK, scoreOnly, 70);

        List<SkinMetric> metrics = skinMetricRepository.findAllBySkinRecordId(saved.getId());
        assertThat(metrics).hasSize(SkinMetricType.values().length);
        assertThat(metrics).allSatisfy(metric -> {
            assertThat(metric.getRawValue()).isNull();
            assertThat(metric.getConfidence()).isNull();
            assertThat(metric.getAlgorithmVersion()).isNull();
            assertThat(metric.getNormalizationVersion()).isNull();
            assertThat(metric.getMetricValue().intValue()).isEqualTo(70);
        });
    }

    private Map<SkinMetricType, SkinMetric> indexByType(Long skinRecordId) {
        Map<SkinMetricType, SkinMetric> byType = new EnumMap<>(SkinMetricType.class);
        skinMetricRepository.findAllBySkinRecordId(skinRecordId).forEach(m -> byType.put(m.getMetricType(), m));
        return byType;
    }

    private Map<SkinMetricType, Integer> allMetrics(int value) {
        Map<SkinMetricType, Integer> scores = new EnumMap<>(SkinMetricType.class);
        for (SkinMetricType type : SkinMetricType.values()) {
            scores.put(type, value);
        }
        return scores;
    }
}
