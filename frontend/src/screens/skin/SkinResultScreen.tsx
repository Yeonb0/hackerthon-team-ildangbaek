// SkinResultScreen.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/base/Button';
import { Card } from '@/components/base/Card';
import { LoadingState } from '@/components/state/LoadingState';
import { ErrorState } from '@/components/state/ErrorState';
import { DeltaBadge, MetricScoreList } from '@/components/domain/MetricScoreList';
import { SkinDiamondChart } from '@/components/domain/SkinDiamondChart';
import { toMetricList } from '@/api/adapters';
import { getSkinRecordToday } from '@/api/skin';
import { ApiError } from '@/api/unwrap';
import { DetailStackParamList, MainTabRoutes } from '@/app/routes';
import { color, space, typography } from '@/theme';
import type { SkinRecordResult } from '@/types/skin';
import { adjustFontSize } from '@/theme/typography';

type NavProp = NativeStackNavigationProp<DetailStackParamList>;

/**
 * S-18 분석 결과. GET /skin-records/today를 항상 새로 호출합니다 — S-17에서 방금 분석을
 * 마치고 들어온 경우든, 기록 허브에서 이미 완료된 기록을 다시 보러 들어온 경우든
 * "오늘 이 시간대 기록을 보여준다"는 점에서 동일해서 같은 코드 경로로 처리합니다.
 *
 * 확인 버튼 → 닫기/리포트 보러가기 2버튼 (관리자님 요청, 2026-08-10): TBD-10b A안
 * (관리자 확인, 2026-08-09) — 기록은 SKIN-01 POST 시점에 이미 저장이 끝난 상태라
 * 둘 다 추가 저장은 하지 않습니다.
 * - 닫기: 그냥 화면을 닫습니다(goBack). S-17에서 replace로 넘어온 경우든 기록
 *   허브에서 navigate로 들어온 경우든, 바로 이전 화면이 항상 기록 허브(Tabs)라서
 *   goBack 하나로 충분합니다.
 * - 리포트 보러가기: S-19(리포트 탭)로 이동합니다. 이 시점부터는 촬영 플로우로
 *   돌아갈 이유가 없어서(같은 시간대 재기록은 서버가 409로 막음), navigate 대신
 *   reset으로 스택을 [Tabs(Report)] 하나로 정리합니다 — FaceCaptureScreen의 reset
 *   패턴과 동일한 이유(state 없이 'Tabs'만 넣으면 탭 내비게이터가 기본 탭인 홈으로
 *   열리는 버그가 있어서, Report 탭 상태를 명시합니다).
 *
 * ⚠️ 기록이 아예 없는 상태로 이 화면에 들어오는 건(SKIN_RECORD_NOT_FOUND) 정상 흐름상
 * 발생하지 않습니다 — 기록 허브가 completed일 때만 이 화면으로 보내기 때문입니다.
 * 혹시 발생해도(방어적 케이스) 아래 loadError 처리로 자연스럽게 재시도 화면이 뜹니다.
 */
export function SkinResultScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProp<DetailStackParamList, 'SkinResult'>>();
  const insets = useSafeAreaInsets();

  const [result, setResult] = useState<SkinRecordResult | null>(null);
  const [loadError, setLoadError] = useState<'network' | 'server' | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const data = await getSkinRecordToday(route.params.timeSlot);
      setResult(data);
    } catch (e) {
      setLoadError(e instanceof ApiError ? 'server' : 'network');
    }
  }, [route.params.timeSlot]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = () => {
    navigation.goBack();
  };

  const handleGoToReport = () => {
    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'Tabs',
          state: {
            routes: [{ name: MainTabRoutes.Report }],
          },
        },
      ],
    });
  };

  if (loadError) {
    return <ErrorState variant={loadError} onRetry={load} />;
  }

  if (!result) {
    return <LoadingState variant="spinner" />;
  }

  const metrics = toMetricList(result.scores, result.comparison?.changes ?? null);
  const totalDelta = result.comparison
    ? result.totalScore - result.comparison.previousTotalScore
    : null;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + space[5] }]}>
        <Text style={styles.title}>오늘의 피부 분석</Text>

        <View style={styles.totalScoreBlock}>
          <Text style={styles.totalScoreValue}>{result.totalScore}</Text>
          <Text style={styles.totalScoreUnit}>점</Text>
        </View>

        {totalDelta === null ? (
          <Text style={styles.totalComparison}>첫 기록입니다</Text>
        ) : (
          <Text style={styles.totalComparison}>
            {result.comparison?.comparedTo}보다 {Math.abs(totalDelta)}점{' '}
            {totalDelta > 0 ? '올랐어요' : totalDelta < 0 ? '낮아졌어요' : '똑같아요'}
          </Text>
        )}

        {metrics.length === 4 ? (
          <>
            <SkinDiamondChart items={metrics} style={styles.chart} />
            {/* 관리자님 요청(2026-08-14) — 카드 형태로 변경(테두리+배경). 증감
                화살표(▲/▼)는 기존 막대바 리스트의 DeltaBadge를 그대로 재사용합니다. */}
            <View style={styles.summaryRow}>
              {metrics.map((item) => (
                <View key={item.key} style={styles.summaryCard}>
                  <Text style={styles.summaryScore}>{item.score}</Text>
                  <Text style={styles.summaryLabel}>{item.label}</Text>
                  <DeltaBadge delta={item.delta} />
                </View>
              ))}
            </View>
          </>
        ) : (
          // 지표가 4개가 아닌 예외적인 경우(운영 중 지표 개수가 바뀌는 등) — 다이아몬드
          // 차트는 4축 고정이라 못 그리므로 기존 막대바 리스트로 안전하게 폴백합니다.
          <Card style={styles.metricsCard}>
            <MetricScoreList items={metrics} />
          </Card>
        )}
      </ScrollView>

      {/* 관리자님 요청(2026-08-14) — 버튼이 콘텐츠 짧을 때 화면 위쪽에 붙어있던 문제를
          고치기 위해 스크롤 영역 밖으로 빼서 화면 하단에 고정합니다. */}
      <View style={[styles.buttonRow, { paddingBottom: insets.bottom + space[5] }]}>
        <Button label="닫기" variant="secondary" onPress={handleClose} style={styles.buttonHalf} />
        <Button
          label="리포트 보러가기"
          variant="primary"
          onPress={handleGoToReport}
          style={styles.buttonHalf}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.bg,
  },
  content: {
    padding: space[5],
    gap: space[4],
    backgroundColor: color.bg,
  },
  title: {
    ...typography.h1,
    color: color.ink900,
    textAlign: 'center',
  },
  totalScoreBlock: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: space[1],
    marginTop: space[3],
  },
  totalScoreValue: {
    ...typography.display,
    fontSize: adjustFontSize(56),
    lineHeight: 60,
    color: color.brand700,
  },
  totalScoreUnit: {
    ...typography.h2,
    color: color.ink600,
    marginBottom: space[2],
  },
  totalComparison: {
    ...typography.caption,
    color: color.ink600,
    textAlign: 'center',
  },
  metricsCard: {
    marginTop: space[3],
  },
  chart: {
    marginTop: space[3],
  },
  summaryRow: {
    flexDirection: 'row',
    gap: space[2],
    marginTop: space[2],
  },
  // 관리자님 요청(2026-08-14) — 카드 형태로 변경. 테두리+배경으로 각 지표를 구분되는
  // 하나의 블록처럼 보이게 합니다.
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    paddingVertical: space[3],
    paddingHorizontal: space[1],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: color.brand500,
    backgroundColor: color.bg,
  },
  summaryScore: {
    ...typography.h2,
    color: color.ink900,
  },
  summaryLabel: {
    ...typography.caption,
    color: color.ink600,
    fontSize: adjustFontSize(12),
  },
  // 스크롤 영역 밖, 화면 하단에 고정되는 버튼 바 (관리자님 요청, 2026-08-14).
  buttonRow: {
    flexDirection: 'row',
    gap: space[3],
    paddingHorizontal: space[5],
    paddingTop: space[3],
    borderTopWidth: 1,
    borderTopColor: color.ink300 + '40',
  },
  buttonHalf: {
    flex: 1,
  },
});