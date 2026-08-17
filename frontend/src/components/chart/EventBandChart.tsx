// src/components/chart/EventBandChart.tsx
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { color, space } from '@/theme/tokens';
import { s } from '@/lib/scale';
import { weightFamily, adjustFontSize } from '@/theme/typography';

type BandPoint = { date: string; score: number | null };

type EventBandChartProps = {
  points: BandPoint[];
  /** 선/영역/점 색상 — 지표 accent(metricAccent[metric])를 넘기세요. */
  accentColor: string;
  /** 이 날짜 위치에 세로 밴드를 깔고 곡선 위에 점을 찍습니다(Figma 281:836/837 —
   * "레티놀 사용일"처럼 요인이 실제로 발생한 날). */
  eventDates?: string[];
  /** x축 라벨을 몇 개만 솎아서 보여줄지. 기본 7개(Figma는 14일치를 2일 간격 7개로 표시). */
  labelCount?: number;
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

const SCORE_MIN = 0;
const SCORE_MAX = 100;
const PADDING_X = 10;
const PADDING_Y = 14;

function buildSmoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length < 2) return '';
  if (pts.length === 2) return `M ${pts[0].x},${pts[0].y} L ${pts[1].x},${pts[1].y}`;
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
 * S-20 요인 상세 전용 차트 (Figma 컬러 최종본 281:834 실측).
 *
 * AreaTrendChart(리포트 홈)와 분리한 이유: 이 화면만 "이벤트가 있던 날"에 세로 밴드를
 * 깔아야 하는데(요인을 실제로 사용/노출한 날을 곡선 배경에 표시), 리포트 홈 차트엔
 * 그 개념이 없습니다. 곡선·그라데이션 영역 로직은 동일하지만 밴드 + x축 라벨 솎아내기
 * 규칙이 달라서 별도 컴포넌트로 뒀습니다.
 */
export function EventBandChart({
  points,
  accentColor,
  eventDates,
  labelCount = 7,
  width = s(320),
  height = s(120),
  style,
}: EventBandChartProps) {
  const chartW = width - PADDING_X * 2;
  const chartH = height - PADDING_Y * 2;
  const n = points.length;

  const xAt = (i: number) => PADDING_X + (n <= 1 ? chartW / 2 : (chartW / (n - 1)) * i);
  const yAt = (score: number) =>
    PADDING_Y + chartH - ((score - SCORE_MIN) / (SCORE_MAX - SCORE_MIN)) * chartH;

  const validPoints = points
    .map((point, i) => ({ date: point.date, i, score: point.score }))
    .filter((point): point is { date: string; i: number; score: number } => point.score !== null);

  const eventDateSet = eventDates ? new Set(eventDates) : null;
  const gradientId = `band-${accentColor.replace('#', '')}`;

  const linePath =
    validPoints.length >= 2
      ? buildSmoothPath(validPoints.map((p) => ({ x: xAt(p.i), y: yAt(p.score) })))
      : '';
  const areaPath =
    validPoints.length >= 2
      ? `${linePath} L ${xAt(validPoints[validPoints.length - 1].i)},${PADDING_Y + chartH} L ${xAt(
          validPoints[0].i
        )},${PADDING_Y + chartH} Z`
      : '';

  // x축 라벨은 labelCount개만 균등하게 솎아서 보여줍니다(14~30일치를 다 넣으면 겹칩니다).
  const labelStep = n > labelCount ? Math.ceil(n / labelCount) : 1;
  const labelPoints = points.filter((_, i) => i % labelStep === 0);

  const bandWidth = n > 1 ? Math.max(6, chartW / n * 0.7) : 12;

  return (
    <View style={[styles.container, style]}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={accentColor} stopOpacity={0.22} />
            <Stop offset="1" stopColor={accentColor} stopOpacity={0} />
          </LinearGradient>
        </Defs>

        {/* 이벤트 밴드 — 곡선보다 먼저 그려서 배경으로 깔립니다. */}
        {eventDateSet &&
          points
            .map((point, i) => ({ date: point.date, i }))
            .filter((point) => eventDateSet.has(point.date))
            .map((point) => (
              <Rect
                key={`band-${point.date}`}
                x={xAt(point.i) - bandWidth / 2}
                y={PADDING_Y * 0.5}
                width={bandWidth}
                height={chartH + PADDING_Y}
                rx={4}
                fill={accentColor}
                opacity={0.12}
              />
            ))}

        {areaPath !== '' && <Path d={areaPath} fill={`url(#${gradientId})`} />}

        {linePath !== '' && (
          <Path
            d={linePath}
            fill="none"
            stroke={accentColor}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* 이벤트가 있던 날의 곡선 위 점 */}
        {eventDateSet &&
          validPoints
            .filter((point) => eventDateSet.has(point.date))
            .map((point) => (
              <Circle
                key={`dot-${point.date}`}
                cx={xAt(point.i)}
                cy={yAt(point.score)}
                r={4}
                fill={accentColor}
                stroke={color.bg}
                strokeWidth={1.5}
              />
            ))}

        {validPoints.length === 1 && (
          <Circle cx={xAt(validPoints[0].i)} cy={yAt(validPoints[0].score)} r={4} fill={accentColor} />
        )}
      </Svg>

      {validPoints.length === 0 && <Text style={styles.emptyHint}>표시할 기록이 없어요</Text>}

      {n > 0 && (
        <View style={styles.labelRow}>
          {labelPoints.map((point) => (
            <Text key={point.date} style={styles.labelText}>
              {shortDate(point.date)}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

/** Figma x축 라벨 포맷 — '8/4', '8/16'. */
function shortDate(date: string): string {
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
    paddingHorizontal: space[3],
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
});
