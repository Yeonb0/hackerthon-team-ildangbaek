package com.ildangbaek.backend.domain.analysis.profile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ildangbaek.backend.domain.analysis.entity.ReactionType;
import com.ildangbaek.backend.domain.analysis.repository.IngredientProfileRepository;
import com.ildangbaek.backend.domain.record.repository.SkinRecordRepository;
import java.util.Collection;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/**
 * F-ANALYSIS-05 산출식을 고정한다. (ADR 0011)
 *
 * <p>Business Rule이 전부 "하지 말 것"으로 쓰여 있어, 테스트도 그 금지선을 지키는지에 맞춘다 —
 * 가입 기간이 값을 올리지 않을 것(BR 1), 판단되지 않은 성분이 값을 올리지 않을 것(BR 2),
 * 성분 몇 종만으로 100%가 되지 않을 것(BR 3).
 */
@ExtendWith(MockitoExtension.class)
class ProfileCompletionCalculatorTest {

    private static final Long USER_ID = 1L;

    @Mock
    private SkinRecordRepository skinRecordRepository;
    @Mock
    private IngredientProfileRepository ingredientProfileRepository;

    private ProfileCompletionCalculator calculator;

    @BeforeEach
    void setUp() {
        calculator = new ProfileCompletionCalculator(skinRecordRepository, ingredientProfileRepository);
    }

    @DisplayName("기록도 확정 성분도 없으면 0%다")
    @Test
    void emptyProfileIsZero() {
        given(0, 0);

        assertThat(calculator.calculate(USER_ID)).isZero();
    }

    @DisplayName("두 축이 모두 목표치에 도달하면 100%다")
    @Test
    void bothAxesSaturatedIsHundred() {
        given(30, 20);

        assertThat(calculator.calculate(USER_ID)).isEqualTo(100);
    }

    @DisplayName("두 축이 각각 절반이면 50%다")
    @Test
    void halfOnBothAxes() {
        given(15, 10);

        assertThat(calculator.calculate(USER_ID)).isEqualTo(50);
    }

    @DisplayName("한 축만 채워지면 최대 50%다 — 기록만 있고 확정 성분이 없는 경우")
    @Test
    void recordsOnlyCapsAtHalf() {
        given(30, 0);

        assertThat(calculator.calculate(USER_ID)).isEqualTo(50);
    }

    @DisplayName("한 축만 채워지면 최대 50%다 — 확정 성분만 있고 기록이 없는 경우")
    @Test
    void ingredientsOnlyCapsAtHalf() {
        given(0, 20);

        assertThat(calculator.calculate(USER_ID)).isEqualTo(50);
    }

    /** BR 3. 노출 성분 수를 분모로 뒀다면 여기서 100%가 나온다. 그 안을 쓰지 않은 이유다. */
    @DisplayName("성분 2종만 확정돼도 100%가 되지 않는다")
    @Test
    void fewConfirmedIngredientsDoNotReachHundred() {
        given(0, 2);

        assertThat(calculator.calculate(USER_ID)).isEqualTo(5);
    }

    /** BR 3. 목표치를 넘겨도 100을 넘지 않는다. */
    @DisplayName("목표치를 초과해도 100%를 넘지 않는다")
    @Test
    void saturatesAtHundred() {
        given(365, 500);

        assertThat(calculator.calculate(USER_ID)).isEqualTo(100);
    }

    /**
     * BR 1. 계산에 쓰는 것은 가입 후 경과일이 아니라 기록이 존재하는 날의 수다. 리포지토리가 세는
     * 대상이 distinct record_date라는 것으로 이 성질이 보장된다.
     */
    @DisplayName("가입 기간이 아니라 기록 일수를 센다")
    @Test
    void countsRecordDaysNotMembershipDuration() {
        given(0, 0);

        calculator.calculate(USER_ID);

        verify(skinRecordRepository).countDistinctRecordDatesByUserId(USER_ID);
        verify(skinRecordRepository, never()).count();
    }

    /** BR 2. INSUFFICIENT를 세면 제품을 등록하는 것만으로 게이지가 오른다. */
    @DisplayName("INSUFFICIENT 성분은 완성도에 세지 않는다")
    @Test
    void insufficientIsNotCounted() {
        given(0, 0);

        calculator.calculate(USER_ID);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Collection<ReactionType>> captor = ArgumentCaptor.forClass(Collection.class);
        verify(ingredientProfileRepository).countByUserIdAndReactionTypeIn(anyLong(), captor.capture());
        assertThat(captor.getValue())
                .containsExactlyInAnyOrder(ReactionType.SUITABLE, ReactionType.CAUTION)
                .doesNotContain(ReactionType.INSUFFICIENT);
    }

    @DisplayName("반올림해 정수 퍼센트를 반환한다")
    @Test
    void roundsToInteger() {
        // A축 1/30, B축 0 → 1.666...%
        given(1, 0);

        assertThat(calculator.calculate(USER_ID)).isEqualTo(2);
    }

    private void given(long recordDays, long confirmedIngredients) {
        when(skinRecordRepository.countDistinctRecordDatesByUserId(USER_ID)).thenReturn(recordDays);
        when(ingredientProfileRepository.countByUserIdAndReactionTypeIn(anyLong(), any()))
                .thenReturn(confirmedIngredients);
    }
}
