import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/base/Button';
import { Card } from '@/components/base/Card';
import { RoutineRecommendationList } from '@/components/domain/RoutineRecommendationList';
import { WeeklyRecordStrip } from '@/components/domain/WeeklyRecordStrip';
import { TodayReportCard } from '@/components/domain/TodayReportCard';
import { color, gradient, space, typography } from '@/theme';
import type { HomeResponse } from '@/types/home';

type NightHomeScreenProps = {
  data: HomeResponse;
  onPressRecordCta: () => void;
  onPressReportCta: () => void;
};

// 홈 컨테이너(HomeScreen)가 낮/밤 공용 토글을 화면 위에 절대 위치로 띄우기 때문에,
// 콘텐츠 상단 여백을 그만큼 더 확보합니다 (DayHomeScreen과 동일 수치).
const TOGGLE_CLEARANCE = 72;

/**
 * S-08 밤 홈. 배경 그라데이션만 낮과 다르게 하고 나머지는 그대로 둡니다.
 * 로드맵 4-4 확정: "낮/밤은 홈 배경에만 적용되고 다른 화면은 영향받지 않는다" —
 * 그래서 ThemeProvider 없이 이 화면 안에서만 어두운 배경/밝은 텍스트를 씁니다.
 *
 * Checkpoint 9-D: 원래 목업(HOME02)은 밝은 라벤더→흰색 배경 + 어두운 글자였지만,
 * 그렇게 가려면 이 화면의 글자색을 전부 다시 손봐야 해서 지금은 작은 변경만
 * 적용했습니다 — 배경만 무채색(ink900→ink600)에서 진한 보라(gradient.night)로 교체,
 * 다크모드 구조(흰 글자)는 그대로 유지. 라이트 배경으로 완전히 바꾸는 건 디자인
 * 최종 확정 때 다시 진행하기로 함 (관리자 결정, 2026-08-11).
 */
export function NightHomeScreen({
  data,
  onPressRecordCta,
  onPressReportCta,
}: NightHomeScreenProps) {
  const insets = useSafeAreaInsets();
  const nightSlot = data.todayRecord.night;
  const nightCompleted = nightSlot.productCompleted && nightSlot.skinCompleted;

  return (
    <LinearGradient colors={gradient.night} style={styles.gradient}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + TOGGLE_CLEARANCE }]}
      >
        {/* greeting은 관리자 메모: 추후 기획에서 빠질 수도 있어서 조건부 렌더링으로 방어 */}
        {data.greeting ? <Text style={styles.greeting}>{data.greeting}</Text> : null}
        {data.recordPrompt ? <Text style={styles.prompt}>{data.recordPrompt}</Text> : null}

        {data.weeklyCalendar && (
          <Card style={styles.section}>
            <Text style={styles.cardTitle}>이번 주 기록</Text>
            <WeeklyRecordStrip days={data.weeklyCalendar} />
          </Card>
        )}

        {data.todayReport && (
          <TodayReportCard
            report={data.todayReport}
            onPress={onPressReportCta}
            style={styles.section}
          />
        )}

        <RoutineRecommendationList
          timeSlot={data.routineRecommendation.timeSlot}
          items={data.routineRecommendation.items}
          darkBackground
          style={styles.section}
        />

        <Button
          label={nightCompleted ? '오늘 나이트루틴 완료!' : '나이트루틴 기록하러 가기'}
          onPress={onPressRecordCta}
          variant="gradient"
          style={styles.cta}
        />
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  content: {
    padding: space[5],
    paddingBottom: space[8],
    gap: space[5],
  },
  greeting: {
    ...typography.h1,
    color: color.bg,
  },
  prompt: {
    ...typography.body,
    color: color.ink300,
    marginTop: -space[3],
  },
  cardTitle: {
    ...typography.h2,
    color: color.ink900,
    marginBottom: space[2],
  },
  section: {
    width: '100%',
  },
  cta: {
    marginTop: space[2],
  },
});