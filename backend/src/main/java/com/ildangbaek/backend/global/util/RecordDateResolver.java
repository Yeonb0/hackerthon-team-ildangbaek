package com.ildangbaek.backend.global.util;

import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 기록의 날짜 귀속 규칙(docs/공통응답포맷_예외처리코드.md 8.1)을 계산한다.
 *
 * <p>{@code NIGHT} 슬롯은 "밤이 시작된 날짜"로 귀속한다. 18:00~23:59에 기록하면 그날 날짜,
 * 자정을 넘겨 00:00~05:59에 기록해도 전날 날짜로 저장한다. 밤 홈이 뜨는 18:00~05:59 구간
 * 전체를 하나의 밤으로 취급하기 위함이다. {@code MORNING}은 달력 날짜를 그대로 쓴다.
 *
 * <p>피부 기록(SKIN-01)과 제품 기록(PRODUCT-05)이 함께 쓰는 공용 유틸이다. 두 벌로 구현하면
 * 같은 밤에 남긴 기록이 서로 다른 날짜로 저장되어 성분-피부 시차 분석의 입력이 깨진다.
 * 규칙을 바꿔야 하면 호출부가 아니라 이 클래스를 고친다. (ADR 0005)
 *
 * <p>슬롯과 시각의 조합이 어긋나는 요청(예: 심야의 {@code MORNING})은 판정하지 않는다.
 * 슬롯은 클라이언트가 정해서 보내며, 거절 여부는 아직 정해지지 않았다. (ADR 0005 미해결 항목)
 */
public final class RecordDateResolver {

    /** 이 시각 미만에 남긴 NIGHT 기록은 전날 밤으로 귀속한다. */
    private static final int NIGHT_CARRYOVER_END_HOUR = 6;

    private RecordDateResolver() {
    }

    /**
     * @param recordedAt 기록 시각. 날짜 귀속은 서버 시간을 기준으로 계산한다 (8.1 규칙 4).
     * @param timeSlot   클라이언트가 지정한 슬롯
     * @return 기록이 귀속될 날짜
     */
    public static LocalDate resolve(LocalDateTime recordedAt, TimeSlot timeSlot) {
        if (timeSlot == TimeSlot.NIGHT && recordedAt.getHour() < NIGHT_CARRYOVER_END_HOUR) {
            return recordedAt.toLocalDate().minusDays(1);
        }
        return recordedAt.toLocalDate();
    }
}
