package com.ildangbaek.backend.api.record.service;

import com.ildangbaek.backend.api.record.dto.ProductSlotStateResponse;
import com.ildangbaek.backend.api.record.dto.RecordCalendarDayResponse;
import com.ildangbaek.backend.api.record.dto.RecordCalendarResponse;
import com.ildangbaek.backend.api.record.dto.RecordDotStatus;
import com.ildangbaek.backend.api.record.dto.RecordMonthlySummaryResponse;
import com.ildangbaek.backend.api.record.dto.RecordTodayResponse;
import com.ildangbaek.backend.api.record.dto.SkinSlotStateResponse;
import com.ildangbaek.backend.api.record.dto.TimeSlotRecordStateResponse;
import com.ildangbaek.backend.domain.record.entity.ProductRecord;
import com.ildangbaek.backend.domain.record.entity.SkinRecord;
import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import com.ildangbaek.backend.domain.record.repository.ProductRecordItemRepository;
import com.ildangbaek.backend.domain.record.repository.ProductRecordRepository;
import com.ildangbaek.backend.domain.record.repository.SkinRecordRepository;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class RecordHubService {

    private final ProductRecordRepository productRecordRepository;
    private final ProductRecordItemRepository productRecordItemRepository;
    private final SkinRecordRepository skinRecordRepository;

    @Transactional(readOnly = true)
    public RecordCalendarResponse getCalendar(Long userId, YearMonth yearMonth) {
        YearMonth targetMonth = yearMonth == null ? YearMonth.now() : yearMonth;
        LocalDate start = targetMonth.atDay(1);
        LocalDate end = targetMonth.atEndOfMonth();

        List<ProductRecord> productRecords =
                productRecordRepository.findAllByUserIdAndRecordDateBetween(userId, start, end);
        List<SkinRecord> skinRecords =
                skinRecordRepository.findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(userId, start, end);

        Map<LocalDate, EnumMap<TimeSlot, Boolean>> productMap = toProductSlotMap(productRecords);
        Map<LocalDate, EnumMap<TimeSlot, Boolean>> skinMap = toSkinSlotMap(skinRecords);
        LocalDate today = LocalDate.now();

        List<RecordCalendarDayResponse> days = start.datesUntil(end.plusDays(1))
                .map(date -> new RecordCalendarDayResponse(
                        date,
                        dotStatus(date, TimeSlot.MORNING, productMap, skinMap),
                        dotStatus(date, TimeSlot.NIGHT, productMap, skinMap),
                        date.equals(today)))
                .toList();

        return new RecordCalendarResponse(
                targetMonth.toString(),
                days,
                new RecordMonthlySummaryResponse(productRecords.size(), skinRecords.size()));
    }

    @Transactional(readOnly = true)
    public RecordTodayResponse getToday(Long userId) {
        LocalDate today = LocalDate.now();
        return new RecordTodayResponse(
                today,
                defaultTab(),
                getSlotState(userId, today, TimeSlot.MORNING),
                getSlotState(userId, today, TimeSlot.NIGHT));
    }

    @Transactional(readOnly = true)
    public TimeSlotRecordStateResponse getSlotState(Long userId, LocalDate date, TimeSlot timeSlot) {
        Optional<ProductRecord> productRecord =
                productRecordRepository.findByUserIdAndRecordDateAndTimeSlot(userId, date, timeSlot);
        Optional<SkinRecord> skinRecord =
                skinRecordRepository.findByUserIdAndRecordDateAndTimeSlot(userId, date, timeSlot);

        return new TimeSlotRecordStateResponse(
                productRecord.map(this::toProductSlot).orElseGet(() -> new ProductSlotStateResponse(false, null, null)),
                skinRecord.map(this::toSkinSlot).orElseGet(() -> new SkinSlotStateResponse(false, null, null)));
    }

    private ProductSlotStateResponse toProductSlot(ProductRecord record) {
        List<String> names = productRecordItemRepository.findAllByProductRecordId(record.getId()).stream()
                .map(item -> item.getProduct().getProductName())
                .limit(3)
                .toList();
        String summary = names.isEmpty() ? "Product record completed" : String.join(", ", names);
        return new ProductSlotStateResponse(true, record.getId(), summary);
    }

    private SkinSlotStateResponse toSkinSlot(SkinRecord record) {
        String summary = record.getOverallScore() == null
                ? "Skin record completed"
                : "Analysis score " + record.getOverallScore().stripTrailingZeros().toPlainString();
        return new SkinSlotStateResponse(true, record.getId(), summary);
    }

    private TimeSlot defaultTab() {
        int hour = java.time.LocalTime.now().getHour();
        return hour >= 18 || hour < 6 ? TimeSlot.NIGHT : TimeSlot.MORNING;
    }

    private RecordDotStatus dotStatus(LocalDate date, TimeSlot timeSlot,
                                      Map<LocalDate, EnumMap<TimeSlot, Boolean>> productMap,
                                      Map<LocalDate, EnumMap<TimeSlot, Boolean>> skinMap) {
        boolean product = productMap.getOrDefault(date, new EnumMap<>(TimeSlot.class))
                .getOrDefault(timeSlot, false);
        boolean skin = skinMap.getOrDefault(date, new EnumMap<>(TimeSlot.class))
                .getOrDefault(timeSlot, false);
        if (product && skin) {
            return RecordDotStatus.FULL;
        }
        return product || skin ? RecordDotStatus.PARTIAL : RecordDotStatus.NONE;
    }

    private Map<LocalDate, EnumMap<TimeSlot, Boolean>> toProductSlotMap(List<ProductRecord> records) {
        Map<LocalDate, EnumMap<TimeSlot, Boolean>> result = new HashMap<>();
        for (ProductRecord record : records) {
            result.computeIfAbsent(record.getRecordDate(), ignored -> new EnumMap<>(TimeSlot.class))
                    .put(record.getTimeSlot(), true);
        }
        return result;
    }

    private Map<LocalDate, EnumMap<TimeSlot, Boolean>> toSkinSlotMap(List<SkinRecord> records) {
        Map<LocalDate, EnumMap<TimeSlot, Boolean>> result = new HashMap<>();
        for (SkinRecord record : records) {
            result.computeIfAbsent(record.getRecordDate(), ignored -> new EnumMap<>(TimeSlot.class))
                    .put(record.getTimeSlot(), true);
        }
        return result;
    }
}
