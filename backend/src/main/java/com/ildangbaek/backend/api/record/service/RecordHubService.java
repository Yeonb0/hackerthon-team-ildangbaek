package com.ildangbaek.backend.api.record.service;

import com.ildangbaek.backend.api.record.dto.ProductSlotStateResponse;
import com.ildangbaek.backend.api.record.dto.RecordCalendarDayResponse;
import com.ildangbaek.backend.api.record.dto.RecordCalendarResponse;
import com.ildangbaek.backend.api.record.dto.RecordDailyProductItemResponse;
import com.ildangbaek.backend.api.record.dto.RecordDailyResponse;
import com.ildangbaek.backend.api.record.dto.RecordDailySlotResponse;
import com.ildangbaek.backend.api.record.dto.RecordDotStatus;
import com.ildangbaek.backend.api.record.dto.RecordMonthlySummaryResponse;
import com.ildangbaek.backend.api.record.dto.RecordTodayResponse;
import com.ildangbaek.backend.api.record.dto.SkinSlotStateResponse;
import com.ildangbaek.backend.api.record.dto.TimeSlotRecordStateResponse;
import com.ildangbaek.backend.domain.record.entity.ProductRecord;
import com.ildangbaek.backend.domain.record.entity.ProductRecordItem;
import com.ildangbaek.backend.domain.record.entity.SkinRecord;
import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import com.ildangbaek.backend.domain.record.repository.ProductRecordItemRepository;
import com.ildangbaek.backend.domain.record.repository.ProductRecordRepository;
import com.ildangbaek.backend.domain.record.repository.SkinRecordRepository;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.Comparator;
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

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    private final ProductRecordRepository productRecordRepository;
    private final ProductRecordItemRepository productRecordItemRepository;
    private final SkinRecordRepository skinRecordRepository;

    @Transactional(readOnly = true)
    public RecordCalendarResponse getCalendar(Long userId, YearMonth yearMonth) {
        YearMonth targetMonth = yearMonth == null ? YearMonth.now(KST) : yearMonth;
        LocalDate start = targetMonth.atDay(1);
        LocalDate end = targetMonth.atEndOfMonth();

        List<ProductRecord> productRecords =
                productRecordRepository.findAllByUserIdAndRecordDateBetween(userId, start, end);
        List<SkinRecord> skinRecords =
                skinRecordRepository.findAllByUserIdAndRecordDateBetweenOrderByRecordDateAsc(userId, start, end);

        Map<LocalDate, EnumMap<TimeSlot, Boolean>> productMap = toProductSlotMap(productRecords);
        Map<LocalDate, EnumMap<TimeSlot, Boolean>> skinMap = toSkinSlotMap(skinRecords);
        LocalDate today = LocalDate.now(KST);

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
        LocalDate today = LocalDate.now(KST);
        return new RecordTodayResponse(
                today,
                defaultTab(),
                getSlotState(userId, today, TimeSlot.MORNING),
                getSlotState(userId, today, TimeSlot.NIGHT));
    }

    @Transactional(readOnly = true)
    public RecordDailyResponse getDaily(Long userId, LocalDate date) {
        return new RecordDailyResponse(
                date,
                skinScore(userId, date),
                productSlot(userId, date, TimeSlot.MORNING),
                productSlot(userId, date, TimeSlot.NIGHT));
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

    private Integer skinScore(Long userId, LocalDate date) {
        return skinRecordRepository.findAllByUserIdAndRecordDateOrderByTimeSlotAsc(userId, date).stream()
                .filter(record -> record.getOverallScore() != null)
                .map(record -> record.getOverallScore().intValue())
                .reduce((ignored, latest) -> latest)
                .orElse(null);
    }

    private RecordDailySlotResponse productSlot(Long userId, LocalDate date, TimeSlot timeSlot) {
        Optional<ProductRecord> productRecord =
                productRecordRepository.findByUserIdAndRecordDateAndTimeSlot(userId, date, timeSlot);
        if (productRecord.isEmpty()) {
            return new RecordDailySlotResponse(false, null, List.of());
        }

        ProductRecord record = productRecord.get();
        List<RecordDailyProductItemResponse> items = productRecordItemRepository
                .findAllByProductRecordId(record.getId())
                .stream()
                .sorted(Comparator.comparing(
                        ProductRecordItem::getUsageOrder,
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .map(item -> new RecordDailyProductItemResponse(item.getProduct().getProductName()))
                .toList();
        return new RecordDailySlotResponse(true, record.getId(), items);
    }

    private ProductSlotStateResponse toProductSlot(ProductRecord record) {
        List<String> names = productRecordItemRepository.findAllByProductRecordId(record.getId()).stream()
                .map(item -> item.getProduct().getProductName())
                .limit(3)
                .toList();
        String summary = names.isEmpty() ? "제품 기록 완료" : String.join(", ", names);
        return new ProductSlotStateResponse(true, record.getId(), summary);
    }

    private SkinSlotStateResponse toSkinSlot(SkinRecord record) {
        String summary = record.getOverallScore() == null
                ? "피부 기록 완료"
                : "분석 점수 " + record.getOverallScore().stripTrailingZeros().toPlainString() + "점";
        return new SkinSlotStateResponse(true, record.getId(), summary);
    }

    private TimeSlot defaultTab() {
        int hour = LocalTime.now(KST).getHour();
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
