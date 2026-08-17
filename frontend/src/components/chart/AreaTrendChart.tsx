// src/components/chart/AreaTrendChart.tsx
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { color, space } from '@/theme/tokens';
import { s } from '@/lib/scale';
import { weightFamily, adjustFontSize } from '@/theme/typography';

type AreaPoint = { date: string; score: number | null };

type AreaTrendChartProps = {
  points: AreaPoint[];
  /** 선/영역/마지막 점 배지 색상. 기본은 brand500 — 지표별로 쓸 땐 theme의
   * metricAccent[metric]을 넘기세요. */
  accentColor?: string;
  /** 요일/일자 라벨을 전부 보여줄지(7일 뷰) 첫/끝만 보여줄지(30일 뷰 — Figma도
   * 5/10/15/20/25/30만 보여줍니다, 30개를 다 넣으면 겹쳐서 못 읽습니다). */
  labelMode?: 'all' | 'edges';
  formatLabel?: (date: string) => string;
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

const SCORE_MIN = 0;
const SCORE_MAX = 100;
const PADDING_X = 8;
const PADDING_Y = 14;

function buildSmoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  if (pts.length === 2) {
    return `M ${pts[0].x},${pts[0].y} L ${pts[1].x},${pts[1].y}`;
  }
  let d = `M ${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
  }
  return d;
}

/**
 * 리포트 홈 종합 점수 카드 / 항목별 추이 카드 전용 미니 차트. TrendGraph(S-19 예전
 * 지표 그래프 · S-20)와 별도 컴포넌트로 뒀습니다 — Figma 실측(210:2437)이 곡선 아래
 * 그라데이션 영역 채움 + 마지막 점 강조 배지까지 요구해서, 기존 TrendGraph의
 * bar/line 두 variant에 조건을 더 얹기보다 새로 만드는 쪽이 더 단순했습니다.
 * TrendGraph는 REPORT-02(요인 상세) 이벤트 강조 로직이 남아 있어 그대로 둡니다.
 */
export function AreaTrendChart({
  points,
  accentColor = color.brand500,
  labelMode = 'edges',
  formatLabel,
  width = s(320),
  height = s(100),
  style,
}: AreaTrendChartProps) {
  const chartW = width - PADDING_X * 2;
  const chartH = height - PADDING_Y * 2;
  const n = points.length;

  const xAt = (i: number) => PADDING_X + (n <= 1 ? chartW / 2 : (chartW / (n - 1)) * i);
  const yAt = (score: number) =>
    PADDING_Y + chartH - ((score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * chartH;

  const validPoints = points
    .map((point, i) => ({ date: point.date, i, score: point.score }))
    .filter((point): point is { date: string; i: number; score: number } => point.score !== null);

  const gradientId = `area-${accentColor.replace('#', '')}`;
  const linePath =
    validPoints.length >= 2
      ? buildSmoothPath(validPoints.map((point) => ({ x: xAt(point.i), y: yAt(point.score) })))
      : '';
  const areaPath =
    validPoints.length >= 2
      ? `${linePath} L ${xAt(validPoints[validPoints.length - 1].i)},${PADDING_Y + chartH} L ${xAt(
          validPoints[0].i
        )},${PADDING_Y + chartH} Z`
      : '';

  const lastPoint = validPoints[validPoints.length - 1];

  return (
    <View style={[styles.container, style]}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={accentColor} stopOpacity={0.22} />
            <Stop offset="1" stopColor={accentColor} stopOpacity={0} />
          </LinearGradient>
        </Defs>

        {areaPath !== '' && <Path d={areaPath} fill={`url(#${gradientId})`} />}

        {linePath !== '' && (
          <Path
            d={linePath}
            fill="none"
            stroke={accentColor}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {validPoints.length === 1 && (
          <Circle cx={xAt(validPoints[0].i)} cy={yAt(validPoints[0].score)} r={5} fill={accentColor} />
        )}

        {lastPoint && (
          <Circle
            cx={xAt(lastPoint.i)}
            cy={yAt(lastPoint.score)}
            r={4}
            fill={accentColor}
            stroke={color.bg}
            strokeWidth={2}
          />
        )}
      </Svg>

      {lastPoint && (
        <View
          style={[
            styles.lastPointBadge,
            {
              backgroundColor: accentColor,
              left: `${(xAt(lastPoint.i) / width) * 100}%`,
              top: (yAt(lastPoint.score) / height) * 100 - 8,
            },
          ]}
        >
          <Text style={styles.lastPointText}>{lastPoint.score}</Text>
        </View>
      )}

      {validPoints.length === 0 && <Text style={styles.emptyHint}>표시할 기록이 없어요</Text>}

      {n > 0 && (
        <View style={styles.labelRow}>
          {labelMode === 'all'
            ? points.map((point) => (
                <Text key={point.date} style={styles.labelText}>
                  {labelFor(point.date, formatLabel)}
                </Text>
              ))
            : (
                <>
                  <Text style={styles.labelText}>{labelFor(points[0].date, formatLabel)}</Text>
                  {n > 1 && (
                    <Text style={styles.labelText}>{labelFor(points[n - 1].date, formatLabel)}</Text>
                  )}
                </>
              )}
        </View>
      )}
    </View>
  );
}

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

/** 7일 뷰에서 Figma처럼 요일(월~일)로 보여줍니다. 30일 뷰는 formatLabel로 'N일' 포맷을 넘기세요. */
export function weekdayLabel(date: string): string {
  const d = new Date(date);
  return WEEKDAY_LABELS[d.getDay()];
}

function labelFor(date: string, formatLabel?: (date: string) => string) {
  if (formatLabel) return formatLabel(date);
  const [, month, day] = date.split('-');
  return `${Number(month)}/${Number(day)}`;
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: space[1],
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  labelText: {
    fontSize: adjustFontSize(9),
    ...weightFamily('medium'),
    color: color.textMuted,
  },
  emptyHint: {
    fontSize: adjustFontSize(12),
    ...weightFamily('regular'),
    color: color.ink600,
    textAlign: 'center',
  },
  lastPointBadge: {
    position: 'absolute',
    minWidth: 22,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lastPointText: {
    fontSize: adjustFontSize(9),
    ...weightFamily('bold'),
    color: color.white,
  },
});
