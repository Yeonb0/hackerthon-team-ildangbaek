package com.ildangbaek.backend.domain.analysis.profile;

import com.ildangbaek.backend.domain.analysis.entity.ReactionType;
import com.ildangbaek.backend.domain.analysis.repository.IngredientProfileRepository;
import com.ildangbaek.backend.domain.record.repository.SkinRecordRepository;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * F-ANALYSIS-05 · 프로파일 완성도 계산.
 *
 * <p>기록 충분성(A축)과 성분 커버리지(B축)를 각각 목표치에서 포화시킨 뒤 동일 가중으로 평균한다.
 * 산출식과 목표치의 근거는 ADR 0011에 있다.
 *
 * <h2>100%의 의미 (BR 3)</h2>
 * "모든 화장품 성분을 판단했다"가 아니라 <strong>"개인화된 판단을 하기에 충분한 데이터가 모였다"</strong>다.
 * 분모가 성분 마스터 전체가 아니므로 "전체 성분 대비"라는 의미는 애초에 성립하지 않는다.
 *
 * <h2>가입 기간은 쓰지 않는다 (BR 1)</h2>
 * A축은 가입 후 경과일이 아니라 <strong>기록이 실제로 존재하는 날의 수</strong>다. 가입만 하고
 * 기록하지 않으면 몇 달이 지나도 0이다. 둘은 혼동하기 쉬워 여기 적어 둔다.
 *
 * <p>값을 저장하지 않고 매번 계산한다. 두 입력이 모두 이미 저장돼 있는 파생값이라, 컬럼을 두면
 * 갱신 누락 시 게이지만 낡은 값을 보여주게 된다.
 *
 * <p><strong>소비처(USER-01 · USER-02 · F-CHECK-01)가 아직 없어 현재 호출자가 없다.</strong>
 * 세 API가 같은 값을 써야 하므로(BR 4) 각 구현 시 이 컴포넌트를 호출해야 한다.
 */
@Component
@RequiredArgsConstructor
public class ProfileCompletionCalculator {

    /** A축이 1.0에 도달하는 기록 일수. 근거 없는 초기값 — ADR 0011 결정 2. */
    static final int TARGET_RECORD_DAYS = 30;

    /** B축이 1.0에 도달하는 확정 성분 수. 근거 없는 초기값 — ADR 0011 결정 2. */
    static final int TARGET_CONFIRMED_INGREDIENTS = 20;

    /**
     * 판정이 확정된 상태. {@link ReactionType#INSUFFICIENT}는 제외한다 — 노출만으로 게이지가 오르면
     * "분석 가능한 축적량"이 아니라 제품 등록량을 세는 것이 된다. (ADR 0011 근거 5)
     */
    private static final Set<ReactionType> CONFIRMED =
            Set.of(ReactionType.SUITABLE, ReactionType.CAUTION);

    private final SkinRecordRepository skinRecordRepository;
    private final IngredientProfileRepository ingredientProfileRepository;

    /**
     * 완성도 퍼센트.
     *
     * @return 0~100 정수
     */
    @Transactional(readOnly = true)
    public int calculate(Long userId) {
        long recordDays = skinRecordRepository.countDistinctRecordDatesByUserId(userId);
        long confirmedIngredients =
                ingredientProfileRepository.countByUserIdAndReactionTypeIn(userId, CONFIRMED);

        double recordAxis = saturate(recordDays, TARGET_RECORD_DAYS);
        double ingredientAxis = saturate(confirmedIngredients, TARGET_CONFIRMED_INGREDIENTS);

        return (int) Math.round((recordAxis * 0.5 + ingredientAxis * 0.5) * 100);
    }

    /** 목표치에서 1.0으로 포화시킨다. 분모가 상수라 기록이 늘 때 값이 내려가지 않는다. */
    private double saturate(long value, int target) {
        return Math.min((double) value / target, 1.0);
    }
}
