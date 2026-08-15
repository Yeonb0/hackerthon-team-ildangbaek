package com.ildangbaek.backend.api.user.dto.request;

import com.ildangbaek.backend.domain.user.entity.Gender;

/**
 * API가 주고받는 성별 표기. 저장 표기({@link Gender})와 이름이 하나 다르다 —
 * 명세는 UNSPECIFIED, 엔티티는 NOT_SELECTED다.
 *
 * <p>String으로 받아 서비스에서 {@code Gender.valueOf}로 바꾸면 잘못된 값이
 * {@code IllegalArgumentException}이 되고, 이는 GlobalExceptionHandler의 마지막
 * {@code Exception} 핸들러에 잡혀 400이어야 할 응답이 500으로 나간다. enum으로 받으면
 * Jackson이 역직렬화 단계에서 걸러 400(COMMON_BAD_REQUEST)이 된다.
 */
public enum GenderRequest {
    FEMALE,
    MALE,
    UNSPECIFIED;

    public Gender toGender() {
        return this == UNSPECIFIED ? Gender.NOT_SELECTED : Gender.valueOf(name());
    }

    public static GenderRequest from(Gender gender) {
        if (gender == null) {
            return null;
        }
        return gender == Gender.NOT_SELECTED ? UNSPECIFIED : GenderRequest.valueOf(gender.name());
    }
}
