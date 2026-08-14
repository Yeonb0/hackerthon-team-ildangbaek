import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/base/Button';
import { RoutineRecommendationList } from '@/components/domain/RoutineRecommendationList';
import { WeeklyRecordStrip } from '@/components/domain/WeeklyRecordStrip';
import { TodayReportCard } from '@/components/domain/TodayReportCard';
import { color, gradient, space, typography } from '@/theme';
import type { HomeResponse } from '@/types/home';

type NightHomeScreenProps = {
  data: HomeResponse;
  /** 낮/밤 토글 — HomeScreen(부모)이 만들어서 내려줍니다. Figma HOME-02 기준으로 헤더 행
   * 오른쪽 정렬로 여기서 렌더링합니다 (Phase 12, 관리자님 확인 2026-08-14). */
  toggle: React.ReactNode;
  /** 마이페이지 API에서 가져온 값 — HomeResponse.environment가 밤엔 null이라 여기 없습니다
   * (HomeScreen.tsx 주석 참고, 2026-08-14). 값이 없으면(위치 미설정) 빈 문자열로 표시. */
  location: string | null;
  onPressRecordCta: () => void;
  onPressReportCta: () => void;
};

/**
 * S-08 밤 홈. 배경 그라데이션만 낮과 다르게 하고 나머지는 그대로 둡니다.
 * 로드맵 4-4 확정: "낮/밤은 홈 배경에만 적용되고 다른 화면은 영향받지 않는다" —
 * 그래서 ThemeProvider 없이 이 화면 안에서만 어두운 배경/밝은 텍스트를 씁니다.
 *
 * Checkpoint 9-D: 원래 목업(HOME02)은 밝은 라벤더→흰색 배경 + 어두운 글자였지만,
 * 그렇게 가려면 이 화면의 글자색을 전부 다시 손봐야 해서 지금은 작은 변경만
 * 적용했습니다 — 배경만 무채색(ink900→ink600)에서 진한 보라(gradient.night)로 교체,
 * 다크모드 구조(흰 글자)는 그대로 유지. 라이트 배경으로 완전히 바꾸는 건 디자인
 * 최종 확정 때 다시 진행하기로 함 (관리자 결정, 2026-08-11). Phase 12에서도 색상은
 * 건드리지 않고 구조만 대조했습니다 — 그래서 아래 변경들은 전부 배치·컴포넌트
 * 종류에 관한 것이고, 다크 테마 자체는 유지됩니다.
 *
 * Phase 12(2026-08-13~14) — Figma HOME-02 대조 + 관리자님 후속 요청 반영:
 * - 위치 텍스트: 처음엔 데이터가 없어서(HomeResponse.environment가 밤엔 항상 null) 못
 *   넣었는데, 마이페이지 API의 location 필드를 대신 받아와서 낮 화면과 동일하게 표시합니다
 *   (HomeScreen.tsx에서 useMyPage로 조회해 prop으로 내려줌).
 * - 주간 기록 스트립: Card 래핑·제목 텍스트 제거, 반투명 흰 박스로(관리자님 요청으로
 *   0.92까지 밝게 조정).
 * - 밤 화장대 일러스트 자리 추가 (낮과 동일한 점선 placeholder 패턴).
 * - CTA 버튼: 맨 아래·그라데이션 버튼으로 최종 확정(관리자님 2026-08-14 요청 — 중간에
 *   맨 위·solid로 바꿨다가 다시 낮 화면과 통일). 완료 여부에 따른 라벨 전환은 계속 유지.
 * - "오늘의 리포트" 카드(TodayReportCard)는 Figma HOME-02엔 대응 요소가 안 보이지만
 *   관리자님 요청으로 그대로 유지합니다.
 */
export function NightHomeScreen({
  data,
  toggle,
  location,
  onPressRecordCta,
  onPressReportCta,
}: NightHomeScreenProps) {
  const insets = useSafeAreaInsets();
  const nightSlot = data.todayRecord.night;
  const nightCompleted = nightSlot.productCompleted && nightSlot.skinCompleted;

  return (
    <LinearGradient colors={gradient.night} style={styles.gradient}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + space[3] }]}>
        <View style={styles.headerRow}>
          <Text style={styles.location}>{location ?? ''}</Text>
          {toggle}
        </View>

        {/* greeting은 관리자 메모: 추후 기획에서 빠질 수도 있어서 조건부 렌더링으로 방어 */}
        {data.greeting ? <Text style={styles.greeting}>{data.greeting}</Text> : null}
        {data.recordPrompt ? <Text style={styles.prompt}>{data.recordPrompt}</Text> : null}

        {data.weeklyCalendar && (
          <View style={[styles.weeklyStripBox, styles.section]}>
            <WeeklyRecordStrip days={data.weeklyCalendar} />
          </View>
        )}

        {/* Figma HOME-02의 밤 화장대 일러스트 자리 — 낮 화면과 동일한 패턴(점선 박스),
            에셋 없어서 텍스트 자리표시자만 둡니다. */}
        <View style={styles.illustrationPlaceholder}>
          <Text style={styles.illustrationPlaceholderText}>(화장대 일러스트)</Text>
        </View>

        {/* 관리자님 요청(2026-08-14): 나이트루틴을 완료(제품+피부기록 둘 다)해야만 노출.
            data.todayReport 자체는 백엔드가 "오늘 피부기록" 기준으로만 null을 판단해서
            (제품기록은 안 봄), 여기서 nightCompleted를 추가 조건으로 걸었습니다. */}
        {data.todayReport && nightCompleted && (
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

        {/* 2026-08-14 관리자님 요청으로 다시 맨 아래(그라데이션 버튼)로 되돌렸습니다 —
            S-07 낮 화면의 CTA와 같은 패턴을 유지합니다. */}
        <Button
          label={nightCompleted ? '오늘 나이트루틴 완료!' : '저장된 나이트루틴 바로 기록하기'}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  location: {
    ...typography.caption,
    color: color.ink300,
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
  section: {
    width: '100%',
  },
  // 2026-08-14 관리자님 요청으로 훨씬 더 하얗게 조정 (0.12 → 0.92) — 이 컴포넌트 안 텍스트
  // 색(ink600/brand700)이 원래 밝은 배경 기준이라, 배경을 밝게 할수록 오히려 더 잘 보입니다.
  weeklyStripBox: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 10,
    padding: space[3],
  },
  illustrationPlaceholder: {
    height: 140,
    width: '100%',
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationPlaceholderText: {
    ...typography.caption,
    color: color.ink300,
  },
  cta: {
    width: '100%',
  },
});