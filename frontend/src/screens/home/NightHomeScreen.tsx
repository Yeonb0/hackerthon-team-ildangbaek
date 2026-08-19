import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/base/Button';
import { RoutineRecommendationList } from '@/components/domain/RoutineRecommendationList';
import { WeeklyRecordStrip } from '@/components/domain/WeeklyRecordStrip';
import { TodayReportCard } from '@/components/domain/TodayReportCard';
import { useWeekStartStore } from '@/store/weekStartStore';
import { color, gradient, space, typography } from '@/theme';
import type { HomeResponse } from '@/types/home';
import { adjustFontSize, weightFamily } from '@/theme/typography';

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
 * - CTA 버튼: 맨 아래·그라데이션 버튼으로 최종 확정(관리자님 2026-08-14 요청 — 중간에
 *   맨 위·solid로 바꿨다가 다시 낮 화면과 통일). 완료 여부에 따른 라벨 전환은 계속 유지.
 * - "오늘의 리포트" 카드(TodayReportCard)는 Figma HOME-02엔 대응 요소가 안 보이지만
 *   관리자님 요청으로 그대로 유지합니다.
 *
 * 2026-08-16 — Figma Home-Night(59:4667, 최신본) 재대조:
 * - 위치 텍스트/안내문("지금 기록을 남기면...") 색이 회색(ink300)이라 어두운 배경 위에서
 *   묻혀 보이던 걸 흰색/반투명 흰색으로 고쳤습니다. 안내문에 붙어있던 `marginTop:
 *   -space[3]`(음수 마진 임시 처리)도 같이 제거했습니다. 인사말 폰트도 22→28(Figma
 *   실측)로 키웠습니다.
 * - Figma엔 "1~7 숫자 원" 스트릭 표시가 있는데, 관리자님 확인 결과 `WeeklyRecordStrip`
 *   (달력형 주간 스트립)이 이미 같은 역할이라 새로 안 만들고 그대로 둡니다.
 * - "밤 화장대 일러스트" placeholder 박스 제거 — Figma에 이 화면 자체엔 화장대 자리가
 *   없어서(낮 화면과 다름), 추측성으로 넣어뒀던 걸 뺐습니다.
 */
export function NightHomeScreen({
  data,
  toggle,
  location,
  onPressRecordCta,
  onPressReportCta,
}: NightHomeScreenProps) {
  const insets = useSafeAreaInsets();
  const weekStart = useWeekStartStore((s) => s.weekStart);
  const nightSlot = data.todayRecord.night;
  const nightCompleted = nightSlot.productCompleted && nightSlot.skinCompleted;
  // 공백만 들어오는 경우도 "미설정"으로 봅니다 — 서버가 빈 문자열을 줄 수도 있어서.
  const hasLocation = (location ?? '').trim().length > 0;

  return (
    <LinearGradient colors={gradient.night} style={styles.gradient}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + space[3] }]}>
        {/* 2026-08-18 — 위치 미설정(마이페이지 location이 null/빈 문자열)이면 Text 자체를
            렌더링하지 않습니다(관리자님 요청). 예전엔 `location ?? ''`로 빈 Text를 그려서
            빈 줄만큼 헤더가 내려앉아 있었습니다. 토글은 왼쪽 칸(headerLeft, flex:1)이
            자리를 지켜주기 때문에 위치가 없어도 오른쪽 정렬을 유지합니다. */}
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            {hasLocation ? <Text style={styles.location}>{location}</Text> : null}
          </View>
          {toggle}
        </View>

        {/* greeting은 관리자 메모: 추후 기획에서 빠질 수도 있어서 조건부 렌더링으로 방어 */}
        {data.greeting ? <Text style={styles.greeting}>{data.greeting}</Text> : null}
        {data.recordPrompt ? <Text style={styles.prompt}>{data.recordPrompt}</Text> : null}

        {data.weeklyCalendar && (
          <View style={[styles.weeklyStripBox, styles.section]}>
            <WeeklyRecordStrip days={data.weeklyCalendar} weekStart={weekStart} />
          </View>
        )}

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
  // 위치 텍스트가 없어도 토글이 왼쪽으로 밀려오지 않도록 잡아주는 칸입니다.
  headerLeft: {
    flex: 1,
  },
  location: {
    ...typography.caption,
    color: color.white,
    ...weightFamily('bold'),
    marginTop: space[5],
  },
  greeting: {
    ...typography.h1,
    fontSize: adjustFontSize(28),
    lineHeight: adjustFontSize(28) * 1.4,
    color: color.bg,
  },
  prompt: {
    ...typography.body,
    color: 'rgba(255,255,255,0.7)',
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
  cta: {
    width: '100%',
  },
});