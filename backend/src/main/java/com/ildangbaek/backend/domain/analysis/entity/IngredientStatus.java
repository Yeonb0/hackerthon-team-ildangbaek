package com.ildangbaek.backend.domain.analysis.entity;

import com.ildangbaek.backend.global.exception.BusinessException;
import com.ildangbaek.backend.global.exception.ErrorCode;
import java.util.Locale;

/**
 * API 표현 계층의 성분 반응 상태. DB는 {@code SUITABLE}, API는 {@code GOOD}을 쓴다(ADR 0004).
 *
 * <p>ADR 0004는 변환 로직을 도메인마다 중복 구현하지 말고 공용 매핑 한 곳을 두라고 정했다.
 * USER-02와 CHECK-02·03이 모두 이 enum을 거친다.
 *
 * <p>USER-02의 {@code status} 쿼리 파라미터 때문에 역방향 변환도 필요하다.
 */
public enum IngredientStatus {
    GOOD(ReactionType.SUITABLE),
    CAUTION(ReactionType.CAUTION),
    INSUFFICIENT(ReactionType.INSUFFICIENT);

    private final ReactionType reactionType;

    IngredientStatus(ReactionType reactionType) {
        this.reactionType = reactionType;
    }

    public ReactionType toReactionType() {
        return reactionType;
    }

    public static IngredientStatus from(ReactionType reactionType) {
        for (IngredientStatus status : values()) {
            if (status.reactionType == reactionType) {
                return status;
            }
        }
        throw new IllegalArgumentException("매핑되지 않은 ReactionType: " + reactionType);
    }

    /**
     * 클라이언트가 보낸 문자열을 상태로 바꾼다. 알 수 없는 값은 조용히 무시하지 않고 422로 알린다.
     */
    public static IngredientStatus parse(String value) {
        try {
            return valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new BusinessException(ErrorCode.COMMON_VALIDATION_FAILED);
        }
    }
}
