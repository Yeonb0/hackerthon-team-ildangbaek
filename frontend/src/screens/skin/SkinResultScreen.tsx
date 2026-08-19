// SkinResultScreen.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/base/Button';
import { Card } from '@/components/base/Card';
import { GradientNumber } from '@/components/base/GradientNumber';
import { LoadingState } from '@/components/state/LoadingState';
import { ErrorState } from '@/components/state/ErrorState';
import { MetricScoreList } from '@/components/domain/MetricScoreList';
import { RadarChart } from '@/components/chart/RadarChart';
import { IconBack } from '@/components/icons';
import { toMetricList, type MetricListItem } from '@/api/adapters';
import { getSkinRecordByDate, getSkinRecordToday } from '@/api/skin';
import { ApiError } from '@/api/unwrap';
import { DetailStackParamList, MainTabRoutes } from '@/app/routes';
import { color, metricAccent, reportCardShadow, reportColor, space } from '@/theme/tokens';
import { weightFamily, adjustFontSize, pinDisplayFont } from '@/theme/typography';
import type { SkinRecordResult } from '@/types/skin';
import {
  metricGradeOf,
  metricGradeLabel,
  metricGradeAccent,
  type MetricGrade,
} from '@/lib/metricGrade';
import { metricPhrase } from '@/lib/metricLabels';
import { formatComparedTo } from '@/lib/comparedTo';
import { buildFallbackSkinSummary } from '@/lib/skinSummary';

type NavProp = NativeStackNavigationProp<DetailStackParamList>;

/**
 * SKIN-01 기준점. 첫 기록엔 비교 대상이 없어서(comparison === null) Figma가 "기준점(50)
 * 대비"로 표기합니다 — 서버가 주는 값이 아니라 화면 표기용 상수입니다.
 */
const BASELINE_SCORE = 50;

/**
 * 지표 점수 등급. 지표 4종은 모두 **높을수록 좋음**입니다(2026-08-18 확정).
 *
 * 임계값과 판정은 `lib/metricGrade.ts`가 단독으로 갖습니다 — 쇼핑 홈의
 * "오늘 내 피부에 필요해요" 부제가 같은 경계를 쓰기 때문에, 여기서 따로 상수를
 * 들고 있으면 한쪽만 바뀌었을 때 같은 점수가 화면마다 다른 등급으로 보입니다.
 * 방향 확정 근거와 임계값 미확정 사유는 그 파일 주석을 참고하세요.
 */
function gradeOf(score: number): { label: string; accent: string } {
  return { label: metricGradeLabel(score), accent: metricGradeAccent(score) };
}

/** Figma 118:9504 등의 지표별 한 줄 설명. 등급에 따라 문구가 바뀝니다. */
// 카드 제목에 이미 지표명이 있으므로 주어를 반복하지 않습니다 — 2열 카드에서 숫자와
// 나란히 놓이면 문구 폭이 100px 남짓이라, 주어를 넣으면 대부분 두 줄로 접힙니다
// (실기기 확인, 2026-08-17).
//
// 2026-08-18 — 지표별 증상 문구(「거의 없어요」/「뚜렷해요」 등)를 걷어냈습니다.
// 카드 제목이 「트러블 안정도」로 바뀌면서(개명 A) 「트러블 안정도 · 거의 없어요」가
// 무엇이 없다는 건지 정반대로 읽히기 때문입니다. 문구는 lib/metricLabels.ts에 있습니다.
const PHRASE_INDEX: Record<MetricGrade, 0 | 1 | 2> = { good: 0, normal: 1, caution: 2 };

function phraseOf(item: MetricListItem): string {
  return metricPhrase(PHRASE_INDEX[metricGradeOf(item.score)]);
}

/**
 * S-18 분석 결과. GET /skin-records/today를 항상 새로 호출합니다 — S-17에서 방금 분석을
 * 마치고 들어온 경우든, 기록 허브에서 이미 완료된 기록을 다시 보러 들어온 경우든
 * "오늘 이 시간대 기록을 보여준다"는 점에서 동일해서 같은 코드 경로로 처리합니다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 2026-08-17(세션 13) — Figma 컬러 확정본 전면 반영. **화면이 두 갈래로 나뉩니다.**
 *
 *   ① 첫 기록 (comparison === null) → `FirstSkinResult` (node 59:6527)
 *      "첫 기록이에요! 🎉" + 그라데이션 총점 원 + 지표 4종 2×2 그리드.
 *      예전엔 같은 레이아웃에서 "첫 기록입니다" 한 줄만 바뀌었는데, Figma가 축하 화면을
 *      따로 그려놨습니다 — 비교할 이전 값이 없으니 증감·등급을 보여줄 수 없고, 대신
 *      "이 값이 앞으로의 기준"이라는 맥락을 주는 화면입니다.
 *
 *   ② 그 외 (comparison 있음) → `TodaySkin` (node 118:9423)
 *      헤더 블록(총점 56px + "/100" + 기준 대비) → 레이더 카드 → 지표 카드 2×2 →
 *      전체 리포트 보기 / 홈으로 가기.
 *      다이아몬드 차트(SkinDiamondChart) → 레이더 차트로 교체됐고, 지표 카드가
 *      등급 배지 + 프로그레스 바 + 한 줄 설명 구조로 바뀌었습니다.
 *
 * ⚠️ Figma TodaySkin의 총점 56px은 그라데이션 텍스트(`bg-clip-text`)인데 **솔리드로
 * 대체**했습니다(관리자 결정). 리포트 홈 총점에서 같은 판단을 이미 내렸고, 텍스트
 * 그라데이션은 MaskedView 부팅 크래시 이력이 있습니다(GradientNumber.tsx 주석 참고).
 * 첫 기록 화면의 총점은 **원형 배경**이라 마스킹이 필요 없어 GradientNumber를 그대로
 * 씁니다 — 세션 11에서 미사용이 된 컴포넌트가 여기서 되살아납니다.
 *
 * ⚠️ Figma FirstSkinResult의 지표 색 배치(트러블=핑크, 홍조=보라, 모공=보라,
 * 색소잡티=핑크)는 `metricAccent`(트러블=caution, 홍조=pink, 색소잡티=amber,
 * 모공=purple)와 어긋납니다. 같은 파일의 TodaySkin은 metricAccent와 일치하므로,
 * **두 화면이 같은 지표를 다른 색으로 그리지 않도록 metricAccent를 정본**으로 삼았습니다.
 *
 * 하단 버튼: Figma가 "전체 리포트 보기"(Primary) + "홈으로 가기"(텍스트) 2개로 확정해서,
 * 기존 "닫기 / 리포트 보러가기" 2버튼 구성을 교체했습니다. 기록은 SKIN-01 POST 시점에
 * 이미 저장이 끝난 상태라 둘 다 추가 저장은 하지 않습니다(TBD-10b A안).
 *
 * ✅ **지표 점수 방향 확정(2026-08-18).** `scores`는 **높을수록 좋음**입니다.
 * 관리자 확정이며 백엔드도 같은 방향입니다(`ai-server/app/metrics.py`·`schema.py`·
 * `vision.py`). 이로써 SKIN-01 명세 예시(trouble 74·redness 66에 totalScore 78)와
 * `calculateTotalScore`의 4지표 단순 평균(ADR 0008)이 서로 맞아떨어집니다 —
 * 예전에 "낮을수록 좋음"으로 읽었을 때 생기던 총점과의 충돌이 사라졌습니다.
 * 임계값은 여전히 상수로 빼둬서 기획 확정 시 두 줄만 고치면 됩니다.
 *
 * ⚠️ 기록이 아예 없는 상태로 이 화면에 들어오는 건(SKIN_RECORD_NOT_FOUND) 정상 흐름상
 * 발생하지 않습니다 — 기록 허브가 completed일 때만 이 화면으로 보내기 때문입니다.
 * 혹시 발생해도(방어적 케이스) 아래 loadError 처리로 자연스럽게 재시도 화면이 뜹니다.
 */
export function SkinResultScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProp<DetailStackParamList, 'SkinResult'>>();
  const insets = useSafeAreaInsets();

  // 월간 기록 캘린더에서 지난 날짜를 열어 들어온 경우에만 실립니다(없으면 오늘).
  const viewingDate = route.params.date ?? null;
  const isPastRecord = viewingDate !== null;

  const [result, setResult] = useState<SkinRecordResult | null>(null);
  const [loadError, setLoadError] = useState<'network' | 'server' | null>(null);
  // 그 날짜에 피부 기록이 없는 상태. REPORT-03은 이걸 빈 배열로 주므로 에러가
  // 아닙니다 — loadError와 분리해서 "재시도" 버튼이 뜨지 않게 합니다.
  const [isEmpty, setIsEmpty] = useState(false);

  const load = useCallback(async () => {
    setLoadError(null);
    setIsEmpty(false);
    try {
      const data = viewingDate
        ? await getSkinRecordByDate(viewingDate, route.params.timeSlot)
        : await getSkinRecordToday(route.params.timeSlot);
      if (data === null) {
        setIsEmpty(true);
        return;
      }
      setResult(data);
    } catch (e) {
      setLoadError(e instanceof ApiError ? 'server' : 'network');
    }
  }, [viewingDate, route.params.timeSlot]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGoHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Tabs', state: { routes: [{ name: MainTabRoutes.Home }] } }],
    });
  };

  const handleGoToReport = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Tabs', state: { routes: [{ name: MainTabRoutes.Report }] } }],
    });
  };

  /**
   * 지난 날짜로 들어왔을 땐 하단을 "닫기" 하나로 바꿔 캘린더로 돌아갑니다
   * (관리자 결정 A안, 2026-08-18). 기존 두 버튼은 둘 다 `navigation.reset`이라
   * 스택을 통째로 갈아치우기 때문에, 그대로 두면 캘린더로 **돌아갈 방법이 없습니다.**
   * "홈으로 가기"라는 문구 자체도 방금 기록을 마친 직후 흐름 전제입니다.
   */
  const renderFooter = (footerStyle: StyleProp<ViewStyle>) =>
    isPastRecord ? (
      <View style={footerStyle}>
        <Button label="닫기" variant="primary" onPress={() => navigation.goBack()} />
      </View>
    ) : (
      <View style={footerStyle}>
        <Button label="전체 리포트 보기" variant="primary" onPress={handleGoToReport} />
        <Pressable onPress={handleGoHome} accessibilityRole="button" hitSlop={8}>
          <Text style={styles.textButton}>홈으로 가기</Text>
        </Pressable>
      </View>
    );

  if (loadError) {
    return <ErrorState variant={loadError} onRetry={load} />;
  }

  // 그 날짜에 피부 기록이 없는 경우(REPORT-03 빈 배열). 시트가 skinScore null인 날은
  // "자세히 보기"를 안 그리므로 정상 흐름에선 안 오지만, 실서버에서 시트 조회와 이
  // 조회 사이에 상태가 어긋날 수 있어 방어적으로 둡니다. 에러가 아니므로 재시도
  // 버튼 대신 닫기만 줍니다.
  if (isEmpty) {
    return (
      <View style={styles.screen}>
        <View style={[styles.emptyBody, { paddingTop: insets.top + space[6] }]}>
          <Text style={styles.emptyTitle}>이 날은 피부 기록이 없어요</Text>
          <Text style={styles.emptyDescription}>
            사진을 찍은 날만 분석 결과를 볼 수 있어요.
          </Text>
        </View>
        <View style={[styles.footer, { paddingBottom: insets.bottom + space[5] }]}>
          <Button label="닫기" variant="primary" onPress={() => navigation.goBack()} />
        </View>
      </View>
    );
  }

  if (!result) {
    return <LoadingState variant="spinner" />;
  }

  const metrics = toMetricList(result.scores, result.comparison?.changes ?? null);
  const isFirstRecord = result.comparison === null;

  // 헤더 타이틀 — 지난 날짜면 "오늘의 피부"가 거짓말이 됩니다.
  const headerTitle = viewingDate
    ? `${Number(viewingDate.split('-')[1])}월 ${Number(viewingDate.split('-')[2])}일 피부`
    : '오늘의 피부';

  // ─────────────────────────────── ① 첫 기록 ───────────────────────────────
  if (isFirstRecord) {
    return (
      <View style={styles.firstScreen}>
        <ScrollView
          contentContainerStyle={[styles.firstContent, { paddingTop: insets.top + space[6] }]}
        >
          <Text style={styles.firstTitle}>첫 기록이에요! 🎉</Text>
          <GradientNumber
            value={result.totalScore}
            fontSize={56}
            size={160}
            style={styles.firstScoreCircle}
          />
          <Text style={styles.firstLead}>이 결과가 기준 데이터로 저장돼요</Text>
          <Text style={styles.firstCaption}>앞으로 변화를 이 점수와 비교해드려요</Text>

          {/* 2026-08-19(세션 18, 관리자님 10번 항목) — Figma FirstSkinResult 확정본 반영.
              ① 라벨: 짧은 이름(「트러블」) → 긍정 라벨(「트러블 안정도」). Figma가 이
                 자리를 넓게 잡아서 item 슬롯 라벨이 들어갑니다 — metricLabels.ts의
                 axis 슬롯 주석이 이 그리드를 axis로 분류하고 있었는데, 확정본 기준으로
                 item 슬롯이 맞습니다.
              ② 점수: 숫자만 → 「42점」 + 「/ 100」. Figma 시안은 셀마다 「/ 100점」과
                 「/ 100」이 섞여 있는데, 네 칸이 같아야 읽히므로 「/ 100」으로 통일했습니다. */}
          <View style={styles.firstGridCard}>
            <View style={styles.firstGrid}>
              {metrics.map((item) => (
                <View key={item.key} style={styles.firstGridCell}>
                  <Text style={styles.firstGridLabel} numberOfLines={1}>
                    {item.label}
                  </Text>
                  <View style={styles.firstGridScoreRow}>
                    <Text
                      style={[styles.firstGridScore, { color: metricAccent[asMetricKey(item.key)] }]}
                    >
                      {item.score}점
                    </Text>
                    <Text style={styles.firstGridScoreUnit}>/ 100</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* 지난 날짜의 첫 기록(비교 대상 없음)일 수도 있습니다 — 이 화면엔 헤더 뒤로가기가
            없어서, 푸터를 "닫기"로 바꾸지 않으면 캘린더로 못 돌아가고 갇힙니다. */}
        {isPastRecord ? (
          renderFooter([styles.firstFooter, { paddingBottom: insets.bottom + space[6] }])
        ) : (
          <View style={[styles.firstFooter, { paddingBottom: insets.bottom + space[6] }]}>
            <Button label="자세한 피부 결과 보기" variant="primary" onPress={handleGoToReport} />
            <Pressable onPress={handleGoHome} accessibilityRole="button" hitSlop={8}>
              <Text style={styles.textButton}>홈으로 가기</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  }

  // ────────────────────────────── ② 오늘의 피부 ──────────────────────────────
  const totalDelta = result.comparison
    ? result.totalScore - result.comparison.previousTotalScore
    : null;
  const deltaAccent =
    totalDelta === null || totalDelta === 0
      ? color.textSub
      : totalDelta > 0
        ? reportColor.safe
        : reportColor.caution;

  /**
   * AI 코멘트 우선, 없으면 점수 기반 폴백. 백엔드 skinComment는 AI 서버의 OpenAI 단계가
   * 성공했을 때만 채워지는데 현재 자주 null입니다 — lib/skinSummary.ts 주석 참고.
   */
  const skinSummaryText = result.skinComment ?? buildFallbackSkinSummary(metrics);

  const radarItems = metrics.map((item) => ({
    key: item.key,
    // 축 라벨은 도형 바깥 좁은 자리라 짧은 이름을 씁니다(RadarChart 주석 참고).
    label: item.shortLabel,
    score: item.score,
    accent: metricAccent[asMetricKey(item.key)],
  }));

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.header, { paddingTop: insets.top + space[3] }]}>
          <View style={styles.headerNav}>
            <Pressable
              onPress={() => navigation.goBack()}
              accessibilityRole="button"
              accessibilityLabel="뒤로가기"
              hitSlop={12}
            >
              <IconBack size={18} color={color.textInk} />
            </Pressable>
            <Text style={styles.headerTitle}>{headerTitle}</Text>
          </View>

          <View style={styles.totalBlock}>
            <Text style={styles.totalLabel}>종합 피부 점수</Text>
            <View style={styles.totalRow}>
              {/* Figma는 그라데이션 텍스트지만 솔리드로 대체 — 파일 상단 주석 참고. */}
              <Text style={styles.totalValue}>{result.totalScore}</Text>
              <Text style={styles.totalUnit}>/ 100</Text>
            </View>
            <Text style={styles.totalCompare}>
              {/* 2026-08-19 — 서버 comparedTo("2026-08-18 MORNING")를 그대로 찍어서
                  ISO 날짜와 영어 enum이 노출되던 문제 수정(관리자님 지적).
                  변환 규칙은 lib/comparedTo.ts 참고. */}
              {formatComparedTo(result.comparison?.comparedTo ?? null) ??
                `기준점(${BASELINE_SCORE})`}{' '}
              대비{' '}
              <Text style={[styles.totalCompareValue, { color: deltaAccent }]}>
                {totalDelta !== null && totalDelta > 0 ? '+' : ''}
                {totalDelta ?? 0}
              </Text>
            </Text>
          </View>
        </View>

        {/* 2026-08-19(세션 18, 관리자님 7번 항목) — Figma TodaySkin "오늘의 피부 요약".
            AI 코멘트(skinComment)가 있으면 그것을, 없으면 점수에서 유도한 문장을
            보여줍니다. 왜 null이 자주 오는지는 lib/skinSummary.ts 주석 참고. */}
        {skinSummaryText ? (
          <View style={styles.commentCard}>
            <Text style={styles.commentLabel}>오늘의 피부 요약</Text>
            <Text style={styles.commentText}>{skinSummaryText}</Text>
          </View>
        ) : null}

        {radarItems.length >= 3 ? (
          <View style={styles.radarCard}>
            <RadarChart items={radarItems} size={220} showValues />
          </View>
        ) : null}

        <View style={styles.metricGrid}>
          {metrics.map((item) => {
            const accent = metricAccent[asMetricKey(item.key)];
            const grade = gradeOf(item.score);
            return (
              <View key={item.key} style={styles.metricCard}>
                <View style={styles.metricCardHead}>
                  <Text style={styles.metricCardName} numberOfLines={1}>
                    {item.label}
                  </Text>
                  <View style={[styles.gradeBadge, { backgroundColor: tint(grade.accent) }]}>
                    <Text style={[styles.gradeBadgeText, { color: grade.accent }]}>
                      {grade.label}
                    </Text>
                  </View>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.max(0, Math.min(100, item.score))}%`, backgroundColor: accent },
                    ]}
                  />
                </View>
                <View style={styles.metricCardFoot}>
                  <Text style={styles.metricPhrase} numberOfLines={2}>
                    {phraseOf(item)}
                  </Text>
                  <Text style={[styles.metricScore, { color: accent }]}>{item.score}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {radarItems.length < 3 ? (
          // 지표가 3개 미만인 예외 상황(운영 중 지표 구성이 바뀌는 등) — 레이더를 못
          // 그리므로 기존 막대바 리스트로 안전하게 폴백합니다.
          <Card style={styles.fallbackCard}>
            <MetricScoreList items={metrics} />
          </Card>
        ) : null}
      </ScrollView>

      {renderFooter([styles.footer, { paddingBottom: insets.bottom + space[5] }])}
    </View>
  );
}

/** metricAccent는 확정 4지표만 키로 갖습니다. 서버가 다른 키를 보내도 색이 없다고
 *  화면이 죽지 않게 trouble로 폴백합니다(라벨은 adapters가 이미 폴백 처리). */
function asMetricKey(key: string): keyof typeof metricAccent {
  return key in metricAccent ? (key as keyof typeof metricAccent) : 'trouble';
}

/** 등급 배지 배경 — accent의 옅은 알파(Figma rgba(...,0.13)). */
function tint(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, 0.13)`;
}

const styles = StyleSheet.create({
  // --- ① 첫 기록 (FirstSkinResult) ---
  firstScreen: { flex: 1, backgroundColor: color.surfaceLavenderPale },
  firstContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[6],
    paddingBottom: space[6],
  },
  firstTitle: {
    fontSize: adjustFontSize(22),
    lineHeight: 31,
    ...weightFamily('bold'),
    color: color.textInk,
    paddingBottom: space[4],
  },
  firstScoreCircle: { marginBottom: space[6] },
  firstLead: {
    fontSize: adjustFontSize(15),
    lineHeight: 22,
    ...weightFamily('bold'),
    color: color.textInk,
    paddingBottom: space[1],
  },
  firstCaption: {
    fontSize: adjustFontSize(12),
    lineHeight: 18,
    ...weightFamily('medium'),
    color: color.textSub,
    textAlign: 'center',
    paddingBottom: space[8],
  },
  firstGridCard: {
    alignSelf: 'stretch',
    backgroundColor: color.bg,
    borderRadius: 24,
    padding: space[5],
    ...reportCardShadow.soft,
  },
  // 셀 사이 1px 간격이 그대로 격자선이 됩니다 — 배경색이 선 색입니다(Figma 59:6543).
  firstGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: color.borderDividerFaint,
    borderRadius: 12,
    overflow: 'hidden',
    gap: 1,
  },
  firstGridCell: {
    // 2열 그리드. gap 1px을 감안해 정확히 반으로 나누면 줄바꿈이 어긋나서 살짝 줄입니다.
    width: '49.8%',
    backgroundColor: color.bg,
    padding: space[4],
  },
  firstGridLabel: {
    fontSize: adjustFontSize(11),
    lineHeight: 16,
    ...weightFamily('medium'),
    color: color.textSub,
    paddingBottom: space[1],
  },
  firstGridScore: {
    // 주아체 자리에는 adjustFontSize를 쓰지 않습니다(typography.ts 규약) —
    // 사용자 글꼴 확대 설정과 무관하게 고정되어야 하는 디스플레이 숫자입니다.
    fontSize: 28,
    lineHeight: 39,
    // 주아체는 디스플레이 숫자 전용입니다(관리자 요청, 2026-08-17). weightFamily와
    // 함께 쓰면 fontFamily가 서로 덮어써서 어느 쪽이 이길지 순서에 의존하게 되므로
    // bold를 빼고 pinDisplayFont만 둡니다 — 주아체는 단일 weight라 굵기 지정이
    // 의미가 없기도 합니다.
    ...pinDisplayFont('bmjua'),
  },
  // 「42점」과 「/ 100」을 한 줄에. 주아체는 x-height가 낮아 baseline 정렬이 어색해서
  // flex-end로 아랫선을 맞춥니다(EnvironmentCard의 온도 + 날씨 라벨과 같은 처리).
  firstGridScoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space[1],
  },
  firstGridScoreUnit: {
    fontSize: adjustFontSize(11),
    lineHeight: 20,
    ...weightFamily('medium'),
    color: color.textSub,
  },
  firstFooter: {
    paddingHorizontal: space[6],
    paddingTop: space[3],
    gap: space[3],
    alignItems: 'stretch',
  },

  // --- ② 오늘의 피부 (TodaySkin) ---
  screen: { flex: 1, backgroundColor: color.surfaceLavenderPale },
  content: { paddingBottom: space[6] },
  header: {
    backgroundColor: color.bg,
    paddingHorizontal: space[5],
    paddingBottom: space[5],
  },
  headerNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
  },
  headerTitle: {
    fontSize: adjustFontSize(17),
    lineHeight: 24,
    ...weightFamily('bold'),
    color: color.textInk,
  },
  totalBlock: { paddingTop: space[5] },
  totalLabel: {
    fontSize: adjustFontSize(12),
    lineHeight: 18,
    ...weightFamily('medium'),
    color: color.textSub,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space[2],
    paddingTop: 2,
  },
  totalValue: {
    // 주아체 자리 — adjustFontSize를 쓰지 않습니다(typography.ts 규약).
    fontSize: 56,
    lineHeight: 60,
    ...pinDisplayFont('bmjua'),
    color: color.brand500,
  },
  totalUnit: {
    fontSize: adjustFontSize(13),
    lineHeight: 20,
    ...weightFamily('medium'),
    color: color.textSub,
    paddingBottom: space[2],
  },
  totalCompare: {
    fontSize: adjustFontSize(12),
    lineHeight: 18,
    ...weightFamily('medium'),
    color: color.textSub,
  },
  totalCompareValue: { ...weightFamily('bold') },
  // "오늘의 피부 요약"(Figma TodaySkin) — 레이더 카드와 달리 그림자 없이 옅은 라벤더
  // 면으로 둡니다. 흰 카드가 위아래로 연달아 겹치면 코멘트가 지표 카드처럼 읽힙니다.
  commentCard: {
    marginHorizontal: space[4],
    marginTop: space[4],
    backgroundColor: color.surfaceLavenderPale,
    borderRadius: 16,
    paddingVertical: space[4],
    paddingHorizontal: space[4],
    gap: space[2],
  },
  commentLabel: {
    fontSize: adjustFontSize(11),
    lineHeight: 16,
    ...weightFamily('semibold'),
    color: color.brand500,
  },
  commentText: {
    fontSize: adjustFontSize(13),
    lineHeight: 20,
    ...weightFamily('medium'),
    color: color.textInk,
  },
  radarCard: {
    marginHorizontal: space[4],
    marginTop: space[4],
    backgroundColor: color.bg,
    borderRadius: 24,
    paddingVertical: space[6],
    alignItems: 'center',
    ...reportCardShadow.strong,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space[3],
    paddingHorizontal: space[4],
    paddingTop: space[4],
  },
  metricCard: {
    // 2열. gap 12px을 뺀 나머지를 반으로 나눕니다.
    width: '48%',
    flexGrow: 1,
    backgroundColor: color.bg,
    borderRadius: 20,
    padding: space[4],
    ...reportCardShadow.soft,
  },
  metricCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[2],
  },
  metricCardName: {
    fontSize: adjustFontSize(13),
    lineHeight: 20,
    ...weightFamily('bold'),
    color: color.textInk,
    flexShrink: 1,
  },
  gradeBadge: {
    paddingHorizontal: space[2],
    paddingVertical: 2,
    borderRadius: 999,
  },
  gradeBadgeText: {
    fontSize: adjustFontSize(10),
    lineHeight: 15,
    ...weightFamily('bold'),
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: color.borderDividerFaint,
    overflow: 'hidden',
    marginTop: space[3],
  },
  progressFill: { height: 8, borderRadius: 999 },
  metricCardFoot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: space[2],
    paddingTop: space[2],
  },
  metricPhrase: {
    flex: 1,
    fontSize: adjustFontSize(11),
    lineHeight: 15,
    ...weightFamily('medium'),
    color: color.textSub,
  },
  metricScore: {
    // 주아체 자리 — adjustFontSize를 쓰지 않습니다(typography.ts 규약).
    fontSize: 22,
    lineHeight: 30,
    ...pinDisplayFont('bmjua'),
  },
  fallbackCard: {
    marginHorizontal: space[4],
    marginTop: space[4],
  },
  footer: {
    paddingHorizontal: space[4],
    paddingTop: space[4],
    gap: space[3],
    alignItems: 'stretch',
  },
  textButton: {
    fontSize: adjustFontSize(13),
    lineHeight: 20,
    ...weightFamily('medium'),
    color: color.textSub,
    textAlign: 'center',
  },

  // --- 기록 없는 날(REPORT-03 빈 배열) ---
  emptyBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space[6],
    gap: space[2],
  },
  emptyTitle: {
    fontSize: adjustFontSize(16),
    ...weightFamily('bold'),
    color: color.textInk,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: adjustFontSize(13),
    lineHeight: 20,
    ...weightFamily('medium'),
    color: color.textSub,
    textAlign: 'center',
  },
});