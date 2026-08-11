package com.ildangbaek.backend.domain.analysis.entity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.ildangbaek.backend.global.exception.BusinessException;
import com.ildangbaek.backend.global.exception.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * ADR 0004의 양방향 변환을 고정한다 — DB {@code SUITABLE} ↔ API {@code GOOD}.
 */
class IngredientStatusTest {

    @Test
    @DisplayName("SUITABLE은 GOOD으로 나가고, GOOD은 SUITABLE로 돌아온다")
    void convertsSuitableAndGoodBothWays() {
        assertThat(IngredientStatus.from(ReactionType.SUITABLE)).isEqualTo(IngredientStatus.GOOD);
        assertThat(IngredientStatus.GOOD.toReactionType()).isEqualTo(ReactionType.SUITABLE);
    }

    @Test
    @DisplayName("CAUTION · INSUFFICIENT는 이름이 같아 그대로 대응된다")
    void keepsMatchingNames() {
        assertThat(IngredientStatus.from(ReactionType.CAUTION)).isEqualTo(IngredientStatus.CAUTION);
        assertThat(IngredientStatus.from(ReactionType.INSUFFICIENT)).isEqualTo(IngredientStatus.INSUFFICIENT);
        assertThat(IngredientStatus.CAUTION.toReactionType()).isEqualTo(ReactionType.CAUTION);
        assertThat(IngredientStatus.INSUFFICIENT.toReactionType()).isEqualTo(ReactionType.INSUFFICIENT);
    }

    @Test
    @DisplayName("쿼리 파라미터는 대소문자를 가리지 않는다")
    void parsesCaseInsensitively() {
        assertThat(IngredientStatus.parse("good")).isEqualTo(IngredientStatus.GOOD);
        assertThat(IngredientStatus.parse(" CAUTION ")).isEqualTo(IngredientStatus.CAUTION);
    }

    @Test
    @DisplayName("DB 표기인 SUITABLE을 쿼리로 보내면 422다 — API 표기만 받는다")
    void rejectsUnknownStatus() {
        assertThatThrownBy(() -> IngredientStatus.parse("SUITABLE"))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.COMMON_VALIDATION_FAILED);
    }
}
