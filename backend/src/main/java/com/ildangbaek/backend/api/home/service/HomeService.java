package com.ildangbaek.backend.api.home.service;

import com.ildangbaek.backend.api.home.dto.FailedSectionResponse;
import com.ildangbaek.backend.api.home.dto.HomeEnvironmentResponse;
import com.ildangbaek.backend.api.home.dto.HomeResponse;
import com.ildangbaek.backend.api.home.dto.HomeType;
import com.ildangbaek.backend.api.home.dto.RoutineRecommendationItemResponse;
import com.ildangbaek.backend.api.home.dto.RoutineRecommendationResponse;
import com.ildangbaek.backend.api.home.dto.TodayRecordResponse;
import com.ildangbaek.backend.api.home.dto.TodayRecordSlotResponse;
import com.ildangbaek.backend.api.home.dto.TodayReportResponse;
import com.ildangbaek.backend.api.home.dto.UvGrade;
import com.ildangbaek.backend.api.home.dto.WeeklyCalendarDayResponse;
import com.ildangbaek.backend.api.record.dto.RecordCalendarResponse;
import com.ildangbaek.backend.api.record.dto.RecordTodayResponse;
import com.ildangbaek.backend.api.record.dto.TimeSlotRecordStateResponse;
import com.ildangbaek.backend.api.record.service.RecordHubService;
import com.ildangbaek.backend.domain.environment.entity.HumidityGrade;
import com.ildangbaek.backend.domain.environment.entity.WeatherCondition;
import com.ildangbaek.backend.domain.product.entity.UsageStatus;
import com.ildangbaek.backend.domain.product.entity.UserProduct;
import com.ildangbaek.backend.domain.product.repository.UserProductRepository;
import com.ildangbaek.backend.domain.record.entity.SkinRecord;
import com.ildangbaek.backend.domain.record.entity.TimeSlot;
import com.ildangbaek.backend.domain.record.repository.SkinRecordRepository;
import com.ildangbaek.backend.domain.user.entity.UserProfile;
import com.ildangbaek.backend.domain.user.repository.UserProfileRepository;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.YearMonth;
import java.time.temporal.TemporalAdjusters;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class HomeService {

    private final UserProfileRepository userProfileRepository;
    private final UserProductRepository userProductRepository;
    private final SkinRecordRepository skinRecordRepository;
    private final RecordHubService recordHubService;

    @Transactional(readOnly = true)
    public HomeResponse getHome(Long userId, HomeType requestedHomeType, DayOfWeek weekStart) {
        HomeType homeType = requestedHomeType == null ? defaultHomeType() : requestedHomeType;
        UserProfile profile = userProfileRepository.findByUserId(userId).orElse(null);
        RecordTodayResponse today = recordHubService.getToday(userId);

        return new HomeResponse(
                homeType,
                greeting(profile, homeType),
                homeType == HomeType.NIGHT ? "지금 기록하면 내일 분석이 더 정확해져요." : null,
                homeType == HomeType.DAY ? environment(profile) : null,
                routineRecommendation(userId, homeType == HomeType.DAY ? TimeSlot.MORNING : TimeSlot.NIGHT),
                todayRecord(today),
                homeType == HomeType.NIGHT ? weeklyCalendar(userId, weekStart) : null,
                homeType == HomeType.NIGHT ? todayReport(userId) : null,
                List.of());
    }

    private HomeType defaultHomeType() {
        int hour = LocalTime.now().getHour();
        return hour >= 6 && hour < 18 ? HomeType.DAY : HomeType.NIGHT;
    }

    private String greeting(UserProfile profile, HomeType homeType) {
        String name = profile == null || profile.getNickname() == null ? "사용자" : profile.getNickname();
        return homeType == HomeType.DAY ? "좋은 아침이에요, " + name + "님." : "좋은 저녁이에요, " + name + "님.";
    }

    private HomeEnvironmentResponse environment(UserProfile profile) {
        String location = profile == null || profile.getRegionName() == null ? "Current location" : profile.getRegionName();
        return new HomeEnvironmentResponse(
                location,
                WeatherCondition.SUNNY,
                24,
                5,
                UvGrade.MODERATE,
                55,
                HumidityGrade.NORMAL);
    }

    private RoutineRecommendationResponse routineRecommendation(Long userId, TimeSlot timeSlot) {
        AtomicInteger rank = new AtomicInteger(1);
        List<RoutineRecommendationItemResponse> items = userProductRepository
                .findAllByUserIdAndUsageStatusOrderByLastUsedAtDesc(userId, UsageStatus.USING)
                .stream()
                .filter(userProduct -> userProduct.getProduct() != null)
                .limit(3)
                .map(userProduct -> toRecommendationItem(rank.getAndIncrement(), userProduct))
                .toList();
        return new RoutineRecommendationResponse(timeSlot, items);
    }

    private RoutineRecommendationItemResponse toRecommendationItem(int rank, UserProduct userProduct) {
        return new RoutineRecommendationItemResponse(
                rank,
                userProduct.getProduct().getId(),
                userProduct.getProduct().getProductName(),
                "Saved product");
    }

    private TodayRecordResponse todayRecord(RecordTodayResponse today) {
        return new TodayRecordResponse(
                slot(today.morning()),
                slot(today.night()));
    }

    private TodayRecordSlotResponse slot(TimeSlotRecordStateResponse state) {
        return new TodayRecordSlotResponse(
                state.product().completed(),
                state.skin().completed());
    }

    private List<WeeklyCalendarDayResponse> weeklyCalendar(Long userId, DayOfWeek weekStart) {
        LocalDate today = LocalDate.now();
        LocalDate weekStartDate = today.with(TemporalAdjusters.previousOrSame(weekStart));
        RecordCalendarResponse month = recordHubService.getCalendar(userId, YearMonth.from(today));
        return month.days().stream()
                .filter(day -> !day.date().isBefore(weekStartDate) && !day.date().isAfter(today))
                .map(day -> new WeeklyCalendarDayResponse(day.date(), day.morning(), day.night()))
                .toList();
    }

    private TodayReportResponse todayReport(Long userId) {
        Optional<SkinRecord> record = skinRecordRepository.findByUserIdAndRecordDateAndTimeSlot(
                userId,
                LocalDate.now(),
                TimeSlot.NIGHT);
        return record
                .filter(skinRecord -> Objects.nonNull(skinRecord.getOverallScore()))
                .map(skinRecord -> new TodayReportResponse(
                        skinRecord.getId(),
                        skinRecord.getOverallScore().intValue(),
                        null,
                        null,
                        null,
                        "Today's skin analysis is ready."))
                .orElse(null);
    }
}
