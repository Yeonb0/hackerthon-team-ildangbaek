package com.ildangbaek.backend.api.product.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

/**
 * PRODUCT-05 요청 DTO의 역직렬화를 고정한다.
 *
 * <p>서비스 테스트는 {@code create(...)}를 직접 부르기 때문에 Jackson을 거치지 않는다. 그래서
 * "JSON이 DTO로 변환되는가"는 서비스 테스트로 잡히지 않고, 실서버 검증에서야 드러났다 —
 * {@code force}가 원시 {@code boolean}이던 시절 필드를 생략한 요청이 컨트롤러에 닿지도 못하고
 * {@code COMMON_BAD_REQUEST}(400)로 떨어졌다. 명세는 이 필드를 선택(기본 false)으로 규정한다.
 */
class ProductRecordCreateRequestTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @DisplayName("force를 생략해도 역직렬화되고 기본값 false가 된다")
    @Test
    void deserializesWithoutForce() throws Exception {
        String json = "{\"timeSlot\":\"NIGHT\",\"productIds\":[1,2]}";

        ProductRecordCreateRequest request = objectMapper.readValue(json, ProductRecordCreateRequest.class);

        assertThat(request.force()).isFalse();
        assertThat(request.toTimeSlot()).isEqualTo(TimeSlot.NIGHT);
        assertThat(request.productIds()).containsExactly(1L, 2L);
    }

    @DisplayName("force: true는 그대로 전달된다")
    @Test
    void keepsExplicitForce() throws Exception {
        String json = "{\"timeSlot\":\"MORNING\",\"productIds\":[1],\"force\":true}";

        ProductRecordCreateRequest request = objectMapper.readValue(json, ProductRecordCreateRequest.class);

        assertThat(request.force()).isTrue();
    }
}
